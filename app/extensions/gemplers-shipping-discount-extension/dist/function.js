// node_modules/@shopify/shopify_function/run.ts
function run_default(userfunction) {
  try {
    ShopifyFunction;
  } catch (e) {
    throw new Error(
      "ShopifyFunction is not defined. Please rebuild your function using the latest version of Shopify CLI."
    );
  }
  const input_obj = ShopifyFunction.readInput();
  const output_obj = userfunction(input_obj);
  ShopifyFunction.writeOutput(output_obj);
}

// extensions/gemplers-shipping-discount-extension/src/cart_delivery_options_discounts_generate_run.js
var EMPTY_DISCOUNT = {
  operations: []
};
var DISCOUNT_PERCENTAGE = 100;
var EXCLUDED_STATES = ["AK", "HI"];
var VALID_SHIPPING_RATES = [
  "Standard Ground (Your order will arrive with FedEx or UPS)",
  "Standard Ground (Your order will ship with FedEx or UPS)",
  "Economy (Your order will arrive with USPS or UPS SurePost)",
  "Economy (Your order will ship with USPS or UPS SurePost)",
  "Ground",
  "Standard Truck/Freight (Your order will arrive by semi truck. Gemplers will call for delivery information)",
  "Flat Rate Shipping on Select Tools",
  "Multiple Carriers"
];
var DEFAULT_MINIMUM_SUBTOTAL = 149;
function run(input) {
  let configuration;
  try {
    configuration = JSON.parse(
      input?.discount?.metafield?.value ?? "{}"
    );
  } catch (error) {
    console.log("Error parsing configuration, using defaults:", error);
    configuration = {};
  }
  const minimumSubtotal = configuration.minimumSubtotal ?? DEFAULT_MINIMUM_SUBTOTAL;
  const { cart } = input;
  if (!cart || !cart.cost || !cart.lines || !cart.deliveryGroups) {
    console.log("Cart validation failed");
    return EMPTY_DISCOUNT;
  }
  const subtotalAmount = parseFloat(cart.cost.subtotalAmount.amount);
  console.log("Subtotal:", subtotalAmount, "Min required:", minimumSubtotal);
  if (subtotalAmount < minimumSubtotal) {
    console.log("Cart subtotal too low");
    return EMPTY_DISCOUNT;
  }
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
  const hasNoFreeShipProduct = cart.lines.some((line) => {
    const merchandise = line.merchandise;
    return merchandise && merchandise.__typename === "ProductVariant" && merchandise.product && merchandise.product.hasAnyTag;
  });
  console.log("Has NOFREESHIP product:", hasNoFreeShipProduct);
  if (hasNoFreeShipProduct) {
    console.log("Product with NOFREESHIP tag found");
    return EMPTY_DISCOUNT;
  }
  console.log("Available options:", deliveryGroup.deliveryOptions.map((o) => o.title));
  console.log("Valid rates:", VALID_SHIPPING_RATES);
  const matchingDeliveryOption = deliveryGroup.deliveryOptions.find((option) => {
    const matches = VALID_SHIPPING_RATES.includes(option.title);
    console.log(`"${option.title}" matches: ${matches}`);
    return matches;
  });
  if (!matchingDeliveryOption) {
    console.log("No matching shipping rate found");
    return EMPTY_DISCOUNT;
  }
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
}
var cartDeliveryOptionsDiscountsGenerateRun = run;

// <stdin>
function cartDeliveryOptionsDiscountsGenerateRun2() {
  return run_default(cartDeliveryOptionsDiscountsGenerateRun);
}
export {
  cartDeliveryOptionsDiscountsGenerateRun2 as cartDeliveryOptionsDiscountsGenerateRun
};
