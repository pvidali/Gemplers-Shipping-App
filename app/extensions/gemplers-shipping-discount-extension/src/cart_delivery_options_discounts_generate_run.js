/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  operations: [],
};

// Hardcoded configuration - only minimum subtotal is configurable via admin
const DISCOUNT_PERCENTAGE = 100;
const EXCLUDED_STATES = ["AK", "HI"];
const VALID_SHIPPING_RATES = [
  "Standard Ground (Your order will arrive with FedEx or UPS)",
  "Standard Ground (Your order will ship with FedEx or UPS)",
  "Economy (Your order will arrive with USPS or UPS SurePost)",
  "Economy (Your order will ship with USPS or UPS SurePost)",
  "Ground",
  "Standard Truck/Freight (Your order will arrive by semi truck. Gemplers will call for delivery information)",
  "Flat Rate Shipping on Select Tools",
  "Multiple Carriers"
];

// Default minimum subtotal - configurable via admin
const DEFAULT_MINIMUM_SUBTOTAL = 149.00;

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // Parse configuration from metafield to get minimum subtotal
  let configuration;
  try {
    configuration = JSON.parse(
      input?.discount?.metafield?.value ?? "{}"
    );
  } catch (error) {
    console.log("Error parsing configuration, using defaults:", error);
    configuration = {};
  }

  // Get minimum subtotal from configuration or use default
  const minimumSubtotal = configuration.minimumSubtotal ?? DEFAULT_MINIMUM_SUBTOTAL;

  const { cart } = input;

  // Check if cart exists and has required data
  if (!cart || !cart.cost || !cart.lines || !cart.deliveryGroups) {
    console.log("Cart validation failed");
    return EMPTY_DISCOUNT;
  }

  // Check cart subtotal
  const subtotalAmount = parseFloat(cart.cost.subtotalAmount.amount);
  console.log("Subtotal:", subtotalAmount, "Min required:", minimumSubtotal);

  if (subtotalAmount < minimumSubtotal) {
    console.log("Cart subtotal too low");
    return EMPTY_DISCOUNT;
  }

  // Check shipping address state
  const deliveryGroup = cart.deliveryGroups[0];
  if (!deliveryGroup || !deliveryGroup.deliveryAddress) {
    console.log("No delivery address found");
    return EMPTY_DISCOUNT;
  }

  const provinceCode = deliveryGroup.deliveryAddress.provinceCode;
  console.log("Province:", provinceCode, "Excluded states:", EXCLUDED_STATES);

  if (EXCLUDED_STATES.includes(provinceCode)) {
    console.log("State is excluded:", provinceCode);
    return EMPTY_DISCOUNT;
  }

  // Check if any products have NOFREESHIP tag
  const hasNoFreeShipProduct = cart.lines.some(line => {
    const merchandise = line.merchandise;
    return merchandise && 
           merchandise.__typename === "ProductVariant" && 
           merchandise.product && 
           merchandise.product.hasAnyTag;
  });

  console.log("Has NOFREESHIP product:", hasNoFreeShipProduct);

  if (hasNoFreeShipProduct) {
    console.log("Product with NOFREESHIP tag found");
    return EMPTY_DISCOUNT;
  }

  // Find matching shipping rate
  console.log("Available options:", deliveryGroup.deliveryOptions.map(o => o.title));
  console.log("Valid rates:", VALID_SHIPPING_RATES);

  const matchingDeliveryOption = deliveryGroup.deliveryOptions.find(option => {
    const matches = VALID_SHIPPING_RATES.includes(option.title);
    console.log(`"${option.title}" matches: ${matches}`);
    return matches;
  });

  if (!matchingDeliveryOption) {
    console.log("No matching shipping rate found");
    return EMPTY_DISCOUNT;
  }

  // Apply hardcoded discount percentage to the matching shipping rate
  console.log("Applying discount to:", matchingDeliveryOption.title, "with percentage:", DISCOUNT_PERCENTAGE);
  const result = {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: [
            {
              targets: [
                {
                  deliveryOption: {
                    handle: matchingDeliveryOption.handle
                  }
                }
              ],
              value: {
                percentage: {
                  value: DISCOUNT_PERCENTAGE
                }
              }
            }
          ],
          selectionStrategy: "ALL"
        }
      }
    ]
  };
  
  return result;
};

// Export with the name expected by the extension configuration
export const cartDeliveryOptionsDiscountsGenerateRun = run;