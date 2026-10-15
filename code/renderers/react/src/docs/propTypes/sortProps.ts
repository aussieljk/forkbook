import type { PropDef } from 'storybook/internal/docs-tools';

type Component = any;

// Docgen does not always return the props in the order of the "propTypes" object of the component.
// This function re-order them by their original definition order.
export function keepOriginalDefinitionOrder(
  extractedProps: PropDef[],
  component: Component
): PropDef[] {
  const { propTypes } = component;

  if (propTypes != null) {
    return Object.keys(propTypes)
      .map((x) => extractedProps.find((y) => y.name === x))
      .filter(Boolean) as PropDef[];
  }

  return extractedProps;
}
