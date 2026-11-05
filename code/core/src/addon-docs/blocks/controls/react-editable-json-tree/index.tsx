import type { ReactElement } from 'react';
import React, { Component } from 'react';

import { JsonNode } from './JsonNode.tsx';
import type { ClickableElement } from './types/ClickableElement.ts';
import type {
  BeforeAction,
  EditorElementProps,
  ElementGenerator,
  IsCollapsed,
  Logger,
  OnDeltaUpdate,
  ReadOnly,
  SubmitValueParser,
} from './types/callbacks.ts';
import * as DATA_TYPES from './types/dataTypes.ts';
import { ADD_DELTA_TYPE, REMOVE_DELTA_TYPE, UPDATE_DELTA_TYPE } from './types/deltaTypes.ts';
import * as INPUT_USAGE_TYPES from './types/inputUsageTypes.ts';
import { getObjectType } from './utils/objectTypes.ts';
import { parse } from './utils/parse.ts';
import { array, object, value } from './utils/styles.ts';

type ElementOrGenerator = ReactElement<EditorElementProps> | ElementGenerator;

// `defaultProps` sets both elements, so `element` is always set here.
const toGenerator = (element?: ElementOrGenerator): ElementGenerator =>
  typeof element === 'function' ? element : () => element!;

interface JsonTreeState {
  data: JsonTreeProps['data'];
  rootName: JsonTreeProps['rootName'];
}
export class JsonTree extends Component<JsonTreeProps, JsonTreeState> {
  static defaultProps: Partial<JsonTreeProps> = {
    rootName: 'root',
    isCollapsed: (_keyPath: string[], deep: number) => deep !== -1,
    readOnly: () => false,
    onFullyUpdate: () => {},
    onDeltaUpdate: () => {},
    beforeRemoveAction: () => Promise.resolve(),
    beforeAddAction: () => Promise.resolve(),
    beforeUpdateAction: () => Promise.resolve(),
    logger: { error: () => {} },
    onSubmitValueParser: (
      _isEditMode: boolean,
      _keyPath: string[],
      _deep: number,
      _name: string | undefined,
      rawValue: string
    ) => parse(rawValue),
    inputElement: () => <input />,
    textareaElement: () => <textarea />,
  };

  constructor(props: JsonTreeProps) {
    super(props);
    this.state = {
      data: props.data,
      rootName: props.rootName,
    };
    // Bind
    this.onUpdate = this.onUpdate.bind(this);
    this.removeRoot = this.removeRoot.bind(this);
  }

  static getDerivedStateFromProps(props: JsonTreeProps, state: JsonTreeState) {
    if (props.data !== state.data || props.rootName !== state.rootName) {
      return {
        data: props.data,
        rootName: props.rootName,
      };
    }
    return null;
  }

  onUpdate(key: string | null, data: unknown) {
    this.setState({ data });
    this.props.onFullyUpdate?.(data);
  }

  removeRoot() {
    this.onUpdate(null, null);
  }

  render() {
    const { data, rootName } = this.state;
    const {
      isCollapsed,
      onDeltaUpdate,
      readOnly,
      addButtonElement,
      cancelButtonElement,
      inputElement,
      textareaElement,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger,
      onSubmitValueParser,
      fallback = null,
    } = this.props;

    // Node type
    const dataType = getObjectType(data);

    const readOnlyFunction = typeof readOnly === 'function' ? readOnly : () => Boolean(readOnly);
    const inputElementFunction = toGenerator(inputElement);
    const textareaElementFunction = toGenerator(textareaElement);

    if (dataType === 'Object' || dataType === 'Array') {
      return (
        <div className="rejt-tree">
          <JsonNode
            data={data}
            name={rootName || 'root'}
            deep={-1}
            isCollapsed={isCollapsed ?? (() => false)}
            onUpdate={this.onUpdate}
            onDeltaUpdate={onDeltaUpdate ?? (() => {})}
            readOnly={readOnlyFunction}
            addButtonElement={addButtonElement}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementFunction}
            textareaElementGenerator={textareaElementFunction}
            minusMenuElement={minusMenuElement}
            plusMenuElement={plusMenuElement}
            handleRemove={this.removeRoot}
            beforeRemoveAction={beforeRemoveAction}
            beforeAddAction={beforeAddAction}
            beforeUpdateAction={beforeUpdateAction}
            logger={logger ?? {}}
            onSubmitValueParser={onSubmitValueParser ?? ((val) => val)}
          />
        </div>
      );
    }

    return fallback;
  }
}

interface JsonTreeProps {
  data: unknown;
  rootName?: string;
  isCollapsed?: IsCollapsed;
  onFullyUpdate?: (data: unknown) => void;
  onDeltaUpdate?: OnDeltaUpdate;
  readOnly?: boolean | ReadOnly;
  addButtonElement?: ClickableElement;
  cancelButtonElement?: ClickableElement;
  inputElement?: ElementOrGenerator;
  textareaElement?: ElementOrGenerator;
  minusMenuElement?: ClickableElement;
  plusMenuElement?: ClickableElement;
  fallback?: ReactElement;
  beforeRemoveAction?: BeforeAction;
  beforeAddAction?: BeforeAction;
  beforeUpdateAction?: BeforeAction;
  logger?: Logger;
  onSubmitValueParser?: SubmitValueParser;
}

export {
  getObjectType,
  ADD_DELTA_TYPE,
  REMOVE_DELTA_TYPE,
  UPDATE_DELTA_TYPE,
  DATA_TYPES,
  INPUT_USAGE_TYPES,
};
