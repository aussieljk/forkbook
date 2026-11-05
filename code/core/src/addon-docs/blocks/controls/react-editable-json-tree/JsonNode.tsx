import React, { Component } from 'react';

import { JsonArray } from './JsonArray.tsx';
import { JsonFunctionValue } from './JsonFunctionValue.tsx';
import { JsonObject } from './JsonObject.tsx';
import { JsonValue } from './JsonValue.tsx';
import type { ClickableElement } from './types/ClickableElement.ts';
import type {
  BeforeAction,
  ElementGenerator,
  HandleUpdateValue,
  IsCollapsed,
  Logger,
  OnDeltaUpdate,
  OnUpdate,
  ReadOnly,
  SubmitValueParser,
} from './types/callbacks.ts';
import * as dataTypes from './types/dataTypes.ts';
import { getObjectType } from './utils/objectTypes.ts';

interface JsonNodeState {
  data: JsonNodeProps['data'];
  name: JsonNodeProps['name'];
  keyPath: Exclude<JsonNodeProps['keyPath'], undefined>;
  deep: Exclude<JsonNodeProps['deep'], undefined>;
}

export class JsonNode extends Component<JsonNodeProps, JsonNodeState> {
  static defaultProps = {
    keyPath: [],
    deep: 0,
  };

  constructor(props: JsonNodeProps) {
    super(props);
    this.state = {
      data: props.data,
      name: props.name,
      keyPath: props.keyPath ?? [],
      deep: props.deep ?? 0,
    };
  }

  static getDerivedStateFromProps(props: JsonNodeProps, state: JsonNodeState) {
    return props.data !== state.data ? { data: props.data } : null;
  }

  render() {
    const { data, name, keyPath, deep } = this.state;
    const {
      isCollapsed,
      handleRemove,
      handleUpdateValue,
      onUpdate,
      onDeltaUpdate,
      readOnly,
      addButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      textareaElementGenerator,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger,
      onSubmitValueParser,
    } = this.props;
    const readOnlyTrue = () => true;

    const dataType = getObjectType(data);
    switch (dataType) {
      case dataTypes.ERROR:
        return (
          <JsonObject
            data={data as Record<string, unknown>}
            name={name}
            isCollapsed={isCollapsed}
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            onUpdate={onUpdate}
            onDeltaUpdate={onDeltaUpdate}
            readOnly={readOnlyTrue}
            dataType={dataType}
            addButtonElement={addButtonElement}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementGenerator}
            textareaElementGenerator={textareaElementGenerator}
            minusMenuElement={minusMenuElement}
            plusMenuElement={plusMenuElement}
            beforeRemoveAction={beforeRemoveAction}
            beforeAddAction={beforeAddAction}
            beforeUpdateAction={beforeUpdateAction}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      case dataTypes.OBJECT:
        return (
          <JsonObject
            data={data as Record<string, unknown>}
            name={name}
            isCollapsed={isCollapsed}
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            onUpdate={onUpdate}
            onDeltaUpdate={onDeltaUpdate}
            readOnly={readOnly}
            dataType={dataType}
            addButtonElement={addButtonElement}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementGenerator}
            textareaElementGenerator={textareaElementGenerator}
            minusMenuElement={minusMenuElement}
            plusMenuElement={plusMenuElement}
            beforeRemoveAction={beforeRemoveAction}
            beforeAddAction={beforeAddAction}
            beforeUpdateAction={beforeUpdateAction}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      case dataTypes.ARRAY:
        return (
          <JsonArray
            data={data as unknown[]}
            name={name}
            isCollapsed={isCollapsed}
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            onUpdate={onUpdate}
            onDeltaUpdate={onDeltaUpdate}
            readOnly={readOnly}
            dataType={dataType}
            addButtonElement={addButtonElement}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementGenerator}
            textareaElementGenerator={textareaElementGenerator}
            minusMenuElement={minusMenuElement}
            plusMenuElement={plusMenuElement}
            beforeRemoveAction={beforeRemoveAction}
            beforeAddAction={beforeAddAction}
            beforeUpdateAction={beforeUpdateAction}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      case dataTypes.STRING:
        return (
          <JsonValue
            name={name}
            value={`"${data}"`}
            originalValue={data}
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            handleUpdateValue={handleUpdateValue}
            readOnly={readOnly}
            dataType={dataType}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementGenerator}
            minusMenuElement={minusMenuElement}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      case dataTypes.NUMBER:
        return (
          <JsonValue
            name={name}
            value={data}
            originalValue={data}
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            handleUpdateValue={handleUpdateValue}
            readOnly={readOnly}
            dataType={dataType}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementGenerator}
            minusMenuElement={minusMenuElement}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      case dataTypes.BOOLEAN:
        return (
          <JsonValue
            name={name}
            value={data ? 'true' : 'false'}
            originalValue={data}
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            handleUpdateValue={handleUpdateValue}
            readOnly={readOnly}
            dataType={dataType}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementGenerator}
            minusMenuElement={minusMenuElement}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      case dataTypes.DATE:
        return (
          <JsonValue
            name={name}
            value={(data as Date).toISOString()}
            originalValue={data}
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            handleUpdateValue={handleUpdateValue}
            readOnly={readOnlyTrue}
            dataType={dataType}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementGenerator}
            minusMenuElement={minusMenuElement}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      case dataTypes.NULL:
        return (
          <JsonValue
            name={name}
            value="null"
            originalValue="null"
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            handleUpdateValue={handleUpdateValue}
            readOnly={readOnly}
            dataType={dataType}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementGenerator}
            minusMenuElement={minusMenuElement}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      case dataTypes.UNDEFINED:
        return (
          <JsonValue
            name={name}
            value="undefined"
            originalValue="undefined"
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            handleUpdateValue={handleUpdateValue}
            readOnly={readOnly}
            dataType={dataType}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementGenerator}
            minusMenuElement={minusMenuElement}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      case dataTypes.FUNCTION:
        return (
          <JsonFunctionValue
            name={name}
            value={String(data)}
            originalValue={data}
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            handleUpdateValue={handleUpdateValue}
            readOnly={readOnly}
            dataType={dataType}
            cancelButtonElement={cancelButtonElement}
            textareaElementGenerator={textareaElementGenerator}
            minusMenuElement={minusMenuElement}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      case dataTypes.SYMBOL:
        return (
          <JsonValue
            name={name}
            value={String(data)}
            originalValue={data}
            keyPath={keyPath}
            deep={deep}
            handleRemove={handleRemove}
            handleUpdateValue={handleUpdateValue}
            readOnly={readOnlyTrue}
            dataType={dataType}
            cancelButtonElement={cancelButtonElement}
            inputElementGenerator={inputElementGenerator}
            minusMenuElement={minusMenuElement}
            logger={logger}
            onSubmitValueParser={onSubmitValueParser}
          />
        );
      default:
        return null;
    }
  }
}

interface JsonNodeProps {
  name: string;
  data?: unknown;
  isCollapsed: IsCollapsed;
  keyPath?: string[];
  deep?: number;
  handleRemove?: () => void;
  handleUpdateValue?: HandleUpdateValue;
  onUpdate: OnUpdate;
  onDeltaUpdate: OnDeltaUpdate;
  readOnly: ReadOnly;
  addButtonElement?: ClickableElement;
  cancelButtonElement?: ClickableElement;
  inputElementGenerator: ElementGenerator;
  textareaElementGenerator: ElementGenerator;
  minusMenuElement?: ClickableElement;
  plusMenuElement?: ClickableElement;
  beforeRemoveAction?: BeforeAction;
  beforeAddAction?: BeforeAction;
  beforeUpdateAction?: BeforeAction;
  logger: Logger;
  onSubmitValueParser: SubmitValueParser;
}
