import React, { Component, cloneElement } from 'react';

import { JsonAddValue } from './JsonAddValue.tsx';
import { JsonNode } from './JsonNode.tsx';
import { JsonNodeAccordion } from './JsonNodeAccordion.tsx';
import type { ClickableElement } from './types/ClickableElement.ts';
import * as deltaTypes from './types/deltaTypes.ts';

interface JsonArrayState {
  data: JsonArrayProps['data'];
  name: JsonArrayProps['name'];
  keyPath: Exclude<JsonArrayProps['keyPath'], undefined>;
  deep: Exclude<JsonArrayProps['deep'], undefined>;
  nextDeep: JsonArrayProps['deep'];
  collapsed: any;
  addFormVisible: boolean;
}
export class JsonArray extends Component<JsonArrayProps, JsonArrayState> {
  static defaultProps = {
    keyPath: [],
    deep: 0,
    minusMenuElement: <span> - </span>,
    plusMenuElement: <span> + </span>,
  };

  constructor(props: JsonArrayProps) {
    super(props);
    const keyPath = [...(props.keyPath || []), props.name];
    this.state = {
      data: props.data,
      name: props.name,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      nextDeep: (props.deep ?? 0) + 1,
      collapsed: props.isCollapsed(keyPath, props.deep ?? 0, props.data),
      addFormVisible: false,
    };

    // Bind
    this.handleCollapseMode = this.handleCollapseMode.bind(this);
    this.handleRemoveItem = this.handleRemoveItem.bind(this);
    this.handleAddMode = this.handleAddMode.bind(this);
    this.handleAddValueAdd = this.handleAddValueAdd.bind(this);
    this.handleAddValueCancel = this.handleAddValueCancel.bind(this);
    this.handleEditValue = this.handleEditValue.bind(this);
    this.onChildUpdate = this.onChildUpdate.bind(this);
    this.renderCollapsed = this.renderCollapsed.bind(this);
    this.renderNotCollapsed = this.renderNotCollapsed.bind(this);
  }

  static getDerivedStateFromProps(props: JsonArrayProps, state: JsonArrayState) {
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

  handleCollapseMode() {
    this.setState((state) => ({
      collapsed: !state.collapsed,
    }));
  }

  handleRemoveItem(index: number) {
    return () => {
      const { beforeRemoveAction, logger } = this.props;
      const { data, keyPath, nextDeep: deep } = this.state;
      const oldValue = data[index];

      // Before Remove Action
      (beforeRemoveAction || Promise.resolve.bind(Promise))(index, keyPath, deep, oldValue)
        .then(() => {
          const deltaUpdateResult = {
            keyPath,
            deep,
            key: index,
            oldValue,
            type: deltaTypes.REMOVE_DELTA_TYPE,
          };

          data.splice(index, 1);
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

  handleAddValueAdd({ newValue }: any) {
    const { data, keyPath = [], nextDeep: deep } = this.state;
    const { beforeAddAction, logger } = this.props;
    const key = data.length;

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

  handleAddValueCancel() {
    this.setState({
      addFormVisible: false,
    });
  }

  handleEditValue({ key, value }: any) {
    return new Promise((resolve, reject) => {
      const { beforeUpdateAction } = this.props;
      const { data, keyPath, nextDeep: deep } = this.state;

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
          resolve(undefined);
        })
        .catch(reject);
    });
  }

  renderCollapsed() {
    const { name, data, keyPath, deep } = this.state;
    const { handleRemove, readOnly, dataType, minusMenuElement } = this.props;

    const isReadOnly = readOnly(name, data, keyPath, deep, dataType);

    const removeItemButton =
      minusMenuElement &&
      cloneElement(minusMenuElement, {
        onClick: handleRemove,
        className: 'rejt-minus-menu',
        'aria-label': `remove the array '${String(name)}'`,
      });

    return (
      <>
        <span className="rejt-collapsed-value">
          [...] {data.length} {data.length === 1 ? 'item' : 'items'}
        </span>
        {!isReadOnly && removeItemButton}
      </>
    );
  }

  renderNotCollapsed() {
    const { name, data, keyPath, deep, addFormVisible, nextDeep } = this.state;
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

    const isReadOnly = readOnly(name, data, keyPath, deep, dataType);

    const addItemButton =
      plusMenuElement &&
      cloneElement(plusMenuElement, {
        onClick: this.handleAddMode,
        className: 'rejt-plus-menu',
        'aria-label': `add a new item to the '${String(name)}' array`,
      });
    const removeItemButton =
      minusMenuElement &&
      cloneElement(minusMenuElement, {
        onClick: handleRemove,
        className: 'rejt-minus-menu',
        'aria-label': `remove the array '${String(name)}'`,
      });

    const onlyValue = true;
    const startObject = '[';
    const endObject = ']';
    return (
      <>
        <span className="rejt-not-collapsed-delimiter">{startObject}</span>
        {!addFormVisible && addItemButton}
        <ul className="rejt-not-collapsed-list">
          {data.map((item, index) => (
            <JsonNode
              key={index}
              name={index.toString()}
              data={item}
              keyPath={keyPath}
              deep={nextDeep}
              isCollapsed={isCollapsed}
              handleRemove={this.handleRemoveItem(index)}
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
          ))}
        </ul>
        {!isReadOnly && addFormVisible && (
          <div className="rejt-add-form">
            <JsonAddValue
              handleAdd={this.handleAddValueAdd}
              handleCancel={this.handleAddValueCancel}
              onlyValue={onlyValue}
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
    const { name, collapsed, keyPath, deep } = this.state;
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

interface JsonArrayProps {
  data: any[];
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
