import React, { Component, cloneElement } from 'react';

import { JsonAddValue } from './JsonAddValue.tsx';
import { JsonNode } from './JsonNode.tsx';
import { JsonNodeAccordion } from './JsonNodeAccordion.tsx';
import type { ClickableElement } from './types/ClickableElement.ts';
import * as deltaTypes from './types/deltaTypes.ts';

interface JsonObjectState {
  name: string;
  collapsed: ReturnType<JsonObjectProps['isCollapsed']>;
  data: JsonObjectProps['data'];
  keyPath: Exclude<JsonObjectProps['keyPath'], undefined>;
  deep: Exclude<JsonObjectProps['deep'], undefined>;
  nextDeep: number;
  addFormVisible: boolean;
}

export class JsonObject extends Component<JsonObjectProps, JsonObjectState> {
  static defaultProps = {
    keyPath: [],
    deep: 0,
    minusMenuElement: <span> - </span>,
    plusMenuElement: <span> + </span>,
  };

  constructor(props: JsonObjectProps) {
    super(props);
    const keyPath = props.deep === -1 ? [] : [...(props.keyPath || []), props.name];
    this.state = {
      name: props.name,
      data: props.data,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      nextDeep: (props.deep ?? 0) + 1,
      collapsed: props.isCollapsed(keyPath, props.deep ?? 0, props.data),
      addFormVisible: false,
    };

    // Bind
    this.handleCollapseMode = this.handleCollapseMode.bind(this);
    this.handleRemoveValue = this.handleRemoveValue.bind(this);
    this.handleAddMode = this.handleAddMode.bind(this);
    this.handleAddValueAdd = this.handleAddValueAdd.bind(this);
    this.handleAddValueCancel = this.handleAddValueCancel.bind(this);
    this.handleEditValue = this.handleEditValue.bind(this);
    this.onChildUpdate = this.onChildUpdate.bind(this);
    this.renderCollapsed = this.renderCollapsed.bind(this);
    this.renderNotCollapsed = this.renderNotCollapsed.bind(this);
  }

  static getDerivedStateFromProps(props: JsonObjectProps, state: JsonObjectState) {
    return props.data !== state.data ? { data: props.data } : null;
  }

  onChildUpdate(childKey: string, childData: any) {
    const { data, keyPath = [] } = this.state;
    // Update data
    (data as Record<string, any>)[childKey] = childData;
    // Put new data
    this.setState({
      data,
    });
    // Spread
    const { onUpdate } = this.props;
    const size = keyPath.length;
    onUpdate(keyPath[size - 1], data);
  }

  handleAddMode() {
    this.setState({
      addFormVisible: true,
    });
  }

  handleAddValueCancel() {
    this.setState({
      addFormVisible: false,
    });
  }

  handleAddValueAdd({ key, newValue }: any) {
    const { data, keyPath = [], nextDeep: deep } = this.state;
    const { beforeAddAction, logger } = this.props;

    (beforeAddAction || Promise.resolve.bind(Promise))(key, keyPath, deep, newValue)
      .then(() => {
        // Update data
        data[key] = newValue;
        this.setState({
          data,
        });
        // Cancel add to close
        this.handleAddValueCancel();
        // Spread new update
        const { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data);
        // Spread delta update
        onDeltaUpdate({
          type: deltaTypes.ADD_DELTA_TYPE,
          keyPath,
          deep,
          key,
          newValue,
        });
      })
      .catch(logger.error);
  }

  handleRemoveValue(key: string) {
    return () => {
      const { beforeRemoveAction, logger } = this.props;
      const { data, keyPath = [], nextDeep: deep } = this.state;
      const oldValue = data[key];
      // Before Remove Action
      (beforeRemoveAction || Promise.resolve.bind(Promise))(key, keyPath, deep, oldValue)
        .then(() => {
          const deltaUpdateResult = {
            keyPath,
            deep,
            key,
            oldValue,
            type: deltaTypes.REMOVE_DELTA_TYPE,
          };

          delete data[key];
          this.setState({ data });

          // Spread new update
          const { onUpdate, onDeltaUpdate } = this.props;
          onUpdate(keyPath[keyPath.length - 1], data);
          // Spread delta update
          onDeltaUpdate(deltaUpdateResult);
        })
        .catch(logger.error);
    };
  }

  handleCollapseMode() {
    this.setState((state) => ({
      collapsed: !state.collapsed,
    }));
  }

  handleEditValue({ key, value }: any) {
    return new Promise<void>((resolve, reject) => {
      const { beforeUpdateAction } = this.props;
      const { data, keyPath = [], nextDeep: deep } = this.state;

      // Old value
      const oldValue = data[key];

      // Before update action
      (beforeUpdateAction || Promise.resolve.bind(Promise))(key, keyPath, deep, oldValue, value)
        .then(() => {
          // Update value
          data[key] = value;
          // Set state
          this.setState({
            data,
          });
          // Spread new update
          const { onUpdate, onDeltaUpdate } = this.props;
          onUpdate(keyPath[keyPath.length - 1], data);
          // Spread delta update
          onDeltaUpdate({
            type: deltaTypes.UPDATE_DELTA_TYPE,
            keyPath,
            deep,
            key,
            newValue: value,
            oldValue,
          });
          // Resolve
          resolve();
        })
        .catch(reject);
    });
  }

  renderCollapsed() {
    const { name, keyPath, deep, data } = this.state;
    const { handleRemove, readOnly, dataType, minusMenuElement } = this.props;

    const keyList = Object.getOwnPropertyNames(data);

    const isReadOnly = readOnly(name, data, keyPath, deep, dataType);

    const removeItemButton =
      minusMenuElement &&
      cloneElement(minusMenuElement, {
        onClick: handleRemove,
        className: 'rejt-minus-menu',
        'aria-label': `remove the object '${String(name)}'`,
      });

    return (
      <>
        <span className="rejt-collapsed-value">
          {'{...}'} {keyList.length} {keyList.length === 1 ? 'key' : 'keys'}
        </span>
        {!isReadOnly && removeItemButton}
      </>
    );
  }

  renderNotCollapsed() {
    const { name, data, keyPath, deep, nextDeep, addFormVisible } = this.state;
    const {
      isCollapsed,
      handleRemove,
      onDeltaUpdate,
      readOnly,
      dataType,
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

    const keyList = Object.getOwnPropertyNames(data);

    const isReadOnly = readOnly(name, data, keyPath, deep, dataType);

    const addItemButton =
      plusMenuElement &&
      cloneElement(plusMenuElement, {
        onClick: this.handleAddMode,
        className: 'rejt-plus-menu',
        'aria-label': `add a new property to the object '${String(name)}'`,
      });
    const removeItemButton =
      minusMenuElement &&
      cloneElement(minusMenuElement, {
        onClick: handleRemove,
        className: 'rejt-minus-menu',
        'aria-label': `remove the object '${String(name)}'`,
      });

    const list = keyList.map((key) => (
      <JsonNode
        key={key}
        name={key}
        data={data[key]}
        keyPath={keyPath}
        deep={nextDeep}
        isCollapsed={isCollapsed}
        handleRemove={this.handleRemoveValue(key)}
        handleUpdateValue={this.handleEditValue}
        onUpdate={this.onChildUpdate}
        onDeltaUpdate={onDeltaUpdate}
        readOnly={readOnly}
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
    ));

    const startObject = '{';
    const endObject = '}';

    return (
      <>
        <span className="rejt-not-collapsed-delimiter">{startObject}</span>
        {!isReadOnly && addItemButton}
        <ul className="rejt-not-collapsed-list">{list}</ul>
        {!isReadOnly && addFormVisible && (
          <div className="rejt-add-form">
            <JsonAddValue
              handleAdd={this.handleAddValueAdd}
              handleCancel={this.handleAddValueCancel}
              addButtonElement={addButtonElement}
              cancelButtonElement={cancelButtonElement}
              inputElementGenerator={inputElementGenerator}
              keyPath={keyPath}
              deep={deep}
              onSubmitValueParser={onSubmitValueParser}
            />
          </div>
        )}
        <span className="rejt-not-collapsed-delimiter">{endObject}</span>
        {!isReadOnly && removeItemButton}
      </>
    );
  }

  render() {
    const { name, collapsed, keyPath, deep = 0 } = this.state;
    const value = collapsed ? this.renderCollapsed() : this.renderNotCollapsed();

    return (
      <JsonNodeAccordion
        name={name}
        collapsed={collapsed}
        deep={deep}
        keyPath={keyPath}
        onClick={this.handleCollapseMode}
      >
        {value}
      </JsonNodeAccordion>
    );
  }
}

interface JsonObjectProps {
  data: Record<string, any>;
  name: string;
  isCollapsed: (...args: any) => any;
  keyPath?: string[];
  deep?: number;
  handleRemove?: (...args: any) => any;
  onUpdate: (...args: any) => any;
  onDeltaUpdate: (...args: any) => any;
  readOnly: (...args: any) => any;
  dataType?: string;
  addButtonElement?: ClickableElement;
  cancelButtonElement?: ClickableElement;
  inputElementGenerator: (...args: any) => any;
  textareaElementGenerator: (...args: any) => any;
  minusMenuElement?: ClickableElement;
  plusMenuElement?: ClickableElement;
  beforeRemoveAction?: (...args: any) => any;
  beforeAddAction?: (...args: any) => any;
  beforeUpdateAction?: (...args: any) => any;
  logger: any;
  onSubmitValueParser: (...args: any) => any;
}
