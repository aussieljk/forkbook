import { generatorRegistry } from './GeneratorRegistry.ts';
import nextjsGenerator from './NEXTJS/index.ts';
import reactGenerator from './REACT/index.ts';
import reactNativeGenerator from './REACT_NATIVE/index.ts';
import type { GeneratorModule } from './types.ts';

const setOfGenerators = new Set<GeneratorModule>([
  reactGenerator,
  reactNativeGenerator,
  nextjsGenerator,
]);

/** Register all framework generators with the central registry */
export function registerAllGenerators(): void {
  setOfGenerators.forEach((generator) => {
    generatorRegistry.register(generator);
  });
}
