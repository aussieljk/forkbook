import type {
  ArgTypesEnhancer,
  BeforeAll,
  ModuleExports,
  NormalizedProjectAnnotations,
  Parameters,
  StepRunner,
} from '@aussieljk/forkbook/internal/types';
import type { Renderer } from '@aussieljk/forkbook/internal/types';

import { combineParameters } from '../parameters.ts';
import { composeBeforeAllHooks } from './beforeAll.ts';
import { normalizeArrays } from './normalizeArrays.ts';
import { composeStepRunners } from './stepRunners.ts';

/** Gets the value of a field from each module. The caller names the type of the field. */
export function getField<TFieldType = unknown>(
  moduleExportList: ModuleExports[],
  field: string
): TFieldType[] {
  return moduleExportList.map((xs) => xs.default?.[field] ?? xs[field]).filter(Boolean);
}

export function getArrayField<TFieldType = unknown>(
  moduleExportList: ModuleExports[],
  field: string
): TFieldType[] {
  return getField<TFieldType | TFieldType[]>(moduleExportList, field).reduce<TFieldType[]>(
    (prev, cur) => [...prev, ...normalizeArrays(cur)],
    []
  );
}

export function getObjectField<TFieldType = Record<string, unknown>>(
  moduleExportList: ModuleExports[],
  field: string
): TFieldType {
  return Object.assign({}, ...getField(moduleExportList, field));
}

export function getSingletonField<TFieldType = unknown>(
  moduleExportList: ModuleExports[],
  field: string
): TFieldType {
  return getField<TFieldType>(moduleExportList, field).pop() as TFieldType;
}

export function composeConfigs<TRenderer extends Renderer>(
  moduleExportList: ModuleExports[]
): NormalizedProjectAnnotations<TRenderer> {
  const allArgTypeEnhancers = getArrayField<ArgTypesEnhancer<TRenderer>>(
    moduleExportList,
    'argTypesEnhancers'
  );
  const stepRunners = getField<StepRunner<TRenderer>>(moduleExportList, 'runStep');
  const beforeAllHooks = getArrayField<BeforeAll>(moduleExportList, 'beforeAll');

  return {
    parameters: combineParameters(...getField<Parameters>(moduleExportList, 'parameters')),
    decorators: getArrayField([...moduleExportList].reverse(), 'decorators'),
    args: getObjectField(moduleExportList, 'args'),
    argsEnhancers: getArrayField(moduleExportList, 'argsEnhancers'),
    argTypes: getObjectField(moduleExportList, 'argTypes'),
    argTypesEnhancers: [
      ...allArgTypeEnhancers.filter((e) => !e.secondPass),
      ...allArgTypeEnhancers.filter((e) => e.secondPass),
    ],
    initialGlobals: getObjectField(moduleExportList, 'initialGlobals'),
    globalTypes: getObjectField(moduleExportList, 'globalTypes'),
    loaders: getArrayField(moduleExportList, 'loaders'),
    beforeAll: composeBeforeAllHooks(beforeAllHooks),
    beforeEach: getArrayField(moduleExportList, 'beforeEach'),
    afterEach: getArrayField(moduleExportList, 'afterEach'),
    render: getSingletonField(moduleExportList, 'render'),
    renderToCanvas: getSingletonField(moduleExportList, 'renderToCanvas'),
    applyDecorators: getSingletonField(moduleExportList, 'applyDecorators'),
    runStep: composeStepRunners<TRenderer>(stepRunners),
    tags: getArrayField(moduleExportList, 'tags'),
    mount: getSingletonField(moduleExportList, 'mount'),
    testingLibraryRender: getSingletonField(moduleExportList, 'testingLibraryRender'),
  };
}
