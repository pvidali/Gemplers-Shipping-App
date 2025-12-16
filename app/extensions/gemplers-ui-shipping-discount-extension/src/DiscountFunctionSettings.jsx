import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

export default async () => {
  const existingDefinition = await getMetafieldDefinition();
  if (!existingDefinition) {
    // Create a metafield definition for persistence if no pre-existing definition exists
    const metafieldDefinition = await createMetafieldDefinition();

    if (!metafieldDefinition) {
      throw new Error("Failed to create metafield definition");
    }
  }

  render(<App />, document.body);
};



function App() {
  const {
    loading,
    applyExtensionMetafieldChange,
    resetForm,
    configValues,
    setConfigValues,
  } = useExtensionData();

  if (loading) {
    return (
      <s-stack direction="inline" gap="base" justifyContent="center" padding="base">
        <s-text>Loading...</s-text>
      </s-stack>
    );
  }

  return (
    <s-function-settings onSubmit={(event) => event.waitUntil(applyExtensionMetafieldChange())} onReset={resetForm}>
      <s-stack gap="base">
        <s-heading level="1">
          Free Shipping Discount Configuration
        </s-heading>
        
        <s-section>
          <s-stack gap="base">
            <s-heading level="2">
              Minimum Cart Subtotal
            </s-heading>
            <s-number-field
              label="Minimum cart subtotal for free shipping"
              name="minimumSubtotal"
              value={configValues.minimumSubtotal}
              onChange={(event) => setConfigValues(prev => ({...prev, minimumSubtotal: parseFloat(event.currentTarget.value) || 0}))}
              prefix="$"
            />
            <s-text tone="subdued">
              Cart must meet this minimum amount to qualify for free shipping. Other settings (discount percentage, excluded states, and valid shipping rates) are configured in the code.
            </s-text>
          </s-stack>
        </s-section>
      </s-stack>
    </s-function-settings>
  );
}

function useExtensionData() {
  const { applyMetafieldChange, data, query } = shopify;
  const initialMetafields = data?.metafields || [];
  const [loading, setLoading] = useState(false);
  const [savedMetafields] = useState(initialMetafields);
  
  const [initialConfigValues, setInitialConfigValues] = useState({
    minimumSubtotal: 149.00
  });
  
  const [configValues, setConfigValues] = useState({
    minimumSubtotal: 149.00
  });

  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      
      const configMetafield = savedMetafields.find(
        (metafield) => metafield.key === 'function-configuration'
      )?.value;

      try {
        const parsedConfig = JSON.parse(configMetafield || '{}');
        const newConfigValues = {
          minimumSubtotal: parsedConfig.minimumSubtotal || 149.00
        };
        setInitialConfigValues(newConfigValues);
        setConfigValues(newConfigValues);
      } catch (error) {
        console.error('Error parsing configuration:', error);
      }
      
      setLoading(false);
    }
    fetchInitialData();
  }, [initialMetafields]);

  async function applyExtensionMetafieldChange() {
    const commitFormValues = {
      minimumSubtotal: configValues.minimumSubtotal
    };
    
    await applyMetafieldChange({
      type: 'updateMetafield',
      namespace: '$app:gemplers-shipping-discount',
      key: 'function-configuration',
      value: JSON.stringify(commitFormValues),
      valueType: 'json',
    });
  }

  const resetForm = () => {
    setConfigValues(initialConfigValues);
  };

  return {
    loading,
    applyExtensionMetafieldChange,
    resetForm,
    configValues,
    setConfigValues,
  };
}

const METAFIELD_NAMESPACE = '$app:gemplers-shipping-discount';
const METAFIELD_KEY = 'function-configuration';

async function getMetafieldDefinition() {
  const query = `#graphql
    query GetMetafieldDefinition {
      metafieldDefinitions(first: 1, ownerType: DISCOUNT, namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
        nodes {
          id
        }
      }
    }
  `;

  const result = await shopify.query(query);

  return result?.data?.metafieldDefinitions?.nodes[0];
}

async function createMetafieldDefinition() {
  const definition = {
    access: {
      admin: 'MERCHANT_READ_WRITE',
    },
    key: METAFIELD_KEY,
    name: 'Shipping Discount Configuration',
    namespace: METAFIELD_NAMESPACE,
    ownerType: 'DISCOUNT',
    type: 'json',
  };

  const query = `#graphql
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
            id
          }
        }
      }
  `;

  const variables = { definition };
  const result = await shopify.query(query, { variables });

  return result?.data?.metafieldDefinitionCreate?.createdDefinition;
}



