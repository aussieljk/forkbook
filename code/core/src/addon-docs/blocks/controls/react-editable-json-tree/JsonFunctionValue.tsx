import React, { Component, cloneElement } from 'react';

import type { ClickableElement } from './types/ClickableElement.ts';
import * as inputUsageTypes from './types/inputUsageTypes.ts';
import { editTriggerProps } from './utils/editTrigger.ts';
import { isComponentWillChange } from './utils/objectTypes.ts';

interface JsonFunctionValueState {
  value: JsonFunctionValueProps['value'];
  name: JsonFunctionValueProps['name'];
  keyPath: Exclude<JsonFunctionValueProps['keyPath'], undefined>;
  deep: Exclude<JsonFunctionValueProps['deep'], undefined>;
  editEnabled: boolean;
}

export class JsonFunctionValue extends Component<JsonFunctionValueProps, JsonFunctionValueState> {
  inputRef: HTMLInputElement | HTMLTextAreaElement | null = null;

  static defaultProps = {
    keyPath: [],
    deep: 0,
    handleUpdateValue: () => {},
    cancelButtonElement: <button>c</button>,
    minusMenuElement: <span> - </span>,
  };

  constructor(props: JsonFunctionValueProps) {
    super(props);
    const keyPath = [...(props.keyPath || []), props.name];
    this.state = {
      value: props.value,
      name: props.name,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      editEnabled: false,
    };

    // Bind
    this.handleEditMode = this.handleEditMode.bind(this);
    this.refInput = this.refInput.bind(this);
    this.handleCancelEdit = this.handleCancelEdit.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
  }

  static getDerivedStateFromProps(props: JsonFunctionValueProps, state: JsonFunctionValueState) {
    return props.value !== state.value ? { value: props.value } : null;
  }

  componentDidUpdate() {
    const { editEnabled, name, value, keyPath, deep } = this.state;
    const { inputRef } = this;
    const { readOnly, dataType } = this.props;
    const readOnlyResult = readOnly(name, value, keyPath, deep, dataType);

    if (editEnabled && !readOnlyResult && inputRef) {
      inputRef.focus();
    }
  }

  onKeydown(event: KeyboardEvent) {
    const { inputRef } = this;
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.repeat ||
      inputRef !== event.target
    ) {
      return;
    }
    if (event.code === 'Enter' || event.key === 'Enter') {
      event.preventDefault();
      this.handleEdit();
    }
    if (event.code === 'Escape' || event.key === 'Escape') {
      event.preventDefault();
      this.handleCancelEdit();
    }
  }

  handleEdit() {
    const { handleUpdateValue, originalValue, logger, onSubmitValueParser, keyPath } = this.props;
    const { name, deep } = this.state;
    const { inputRef } = this;

    if (!inputRef) {
      return;
    }

    const newValue = onSubmitValueParser(true, keyPath, deep, name, inputRef.value);

    const result = {
      value: newValue,
      key: name,
    };

    // Run update
    (handleUpdateValue || Promise.resolve.bind(Promise))(result)
      .then(() => {
        // Cancel edit mode if necessary
        if (!isComponentWillChange(originalValue, newValue)) {
          this.handleCancelEdit();
        }
      })
      .catch(logger.error);
  }

  handleEditMode() {
    this.setState({
      editEnabled: true,
    });
  }

  refInput(node: HTMLInputElement | HTMLTextAreaElement | null) {
    this.inputRef = node;
  }

  handleCancelEdit() {
    this.setState({
      editEnabled: false,
    });
  }

  render() {
    const { name, value, editEnabled, keyPath, deep } = this.state;
    const {
      handleRemove,
      originalValue,
      readOnly,
      dataType,
      textareaElementGenerator,
      minusMenuElement,
      keyPath: comeFromKeyPath = [],
    } = this.props;

    let result = null;
    let minusElement = null;
    const resultOnlyResult = readOnly(name, originalValue, keyPath, deep, dataType);

    if (editEnabled && !resultOnlyResult) {
      const textareaElement = textareaElementGenerator(
        inputUsageTypes.VALUE,
        comeFromKeyPath,
        deep,
        name,
        originalValue,
        dataType
      );

      const textareaElementLayout = cloneElement(textareaElement, {
        ref: this.refInput,
        defaultValue: value,
        onKeyDown: this.onKeydown,
      });

      result = <span className="rejt-edit-form">{textareaElementLayout}</span>;
      minusElement = null;
    } else {
      result = (
        <span
          className="rejt-value"
          {...(resultOnlyResult ? {} : editTriggerProps(this.handleEditMode))}
        >
          {value}
        </span>
      );

      const parentPropertyName = comeFromKeyPath.at(-1);

      const minusMenuLayout =
        minusMenuElement &&
        cloneElement(minusMenuElement, {
          onClick: handleRemove,
          className: 'rejt-minus-menu',
          'aria-label': `remove the function '${String(name)}'${
            String(parentPropertyName) ? ` from '${String(parentPropertyName)}'` : ''
          }`,
        });
      minusElement = resultOnlyResult ? null : minusMenuLayout;
    }

    return (
      <li className="rejt-value-node">
        <span className="rejt-name">{name} : </span>
        {result}
        {minusElement}
      </li>
    );
  }
}

interface JsonFunctionValueProps {
  name: string;
  value: any;
  originalValue?: any;
  keyPath?: string[];
  deep?: number;
  handleRemove?: (...args: any) => any;
  handleUpdateValue?: (...args: any) => any;
  readOnly: (...args: any) => any;
  dataType?: string;
  cancelButtonElement?: ClickableElement;
  textareaElementGenerator: (...args: any) => any;
  minusMenuElement?: ClickableElement;
  logger: any;
  onSubmitValueParser: (...args: any) => any;
}
