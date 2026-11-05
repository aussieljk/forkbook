import type { KeyboardEvent } from 'react';
import React, { Component, cloneElement } from 'react';

import type { ClickableElement } from './types/ClickableElement.ts';
import type {
  ElementGenerator,
  HandleUpdateValue,
  Logger,
  ReadOnly,
  SubmitValueParser,
} from './types/callbacks.ts';
import { noUpdate } from './types/callbacks.ts';
import * as inputUsageTypes from './types/inputUsageTypes.ts';
import { editTriggerProps } from './utils/editTrigger.ts';
import { isComponentWillChange } from './utils/objectTypes.ts';

interface JsonValueState {
  value: JsonValueProps['value'];
  name: JsonValueProps['name'];
  keyPath: Exclude<JsonValueProps['keyPath'], undefined>;
  deep: Exclude<JsonValueProps['deep'], undefined>;
  editEnabled: boolean;
}

export class JsonValue extends Component<JsonValueProps, JsonValueState> {
  inputRef: HTMLInputElement | HTMLTextAreaElement | null = null;

  static defaultProps = {
    keyPath: [],
    deep: 0,
    handleUpdateValue: () => Promise.resolve(),
    cancelButtonElement: <button>c</button>,
    minusMenuElement: <span> - </span>,
  };

  constructor(props: JsonValueProps) {
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

  static getDerivedStateFromProps(props: JsonValueProps, state: JsonValueState) {
    return props.value !== state.value ? { value: props.value } : null;
  }

  componentDidUpdate() {
    const { editEnabled, name, value, keyPath, deep } = this.state;
    const { inputRef } = this;
    const { readOnly, dataType } = this.props;
    const isReadOnly = readOnly(name, value, keyPath, deep, dataType);

    if (editEnabled && !isReadOnly && inputRef) {
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
    const {
      handleUpdateValue,
      originalValue,
      logger,
      onSubmitValueParser,
      keyPath = [],
    } = this.props;
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
    (handleUpdateValue || noUpdate)(result)
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
      inputElementGenerator,
      minusMenuElement,
      keyPath: comeFromKeyPath = [],
    } = this.props;

    const isReadOnly = readOnly(name, originalValue, keyPath, deep, dataType);
    const isEditing = editEnabled && !isReadOnly;
    const inputElement = inputElementGenerator(
      inputUsageTypes.VALUE,
      comeFromKeyPath,
      deep,
      name,
      originalValue,
      dataType
    );

    const inputElementLayout = cloneElement(inputElement, {
      ref: this.refInput,
      defaultValue: JSON.stringify(originalValue),
      onKeyDown: this.onKeydown,
    });

    const parentPropertyName = keyPath.at(-2);

    const minusMenuLayout =
      minusMenuElement &&
      cloneElement(minusMenuElement, {
        onClick: handleRemove,
        className: 'rejt-minus-menu',
        'aria-label': `remove the property '${String(name)}' with value '${String(originalValue)}'${
          String(parentPropertyName) ? ` from '${String(parentPropertyName)}'` : ''
        }`,
      });

    return (
      <li className="rejt-value-node">
        <span className="rejt-name">
          {name}
          {' : '}
        </span>
        {isEditing ? (
          <span className="rejt-edit-form">{inputElementLayout}</span>
        ) : (
          <span
            className="rejt-value"
            {...(isReadOnly ? {} : editTriggerProps(this.handleEditMode))}
          >
            {String(value)}
          </span>
        )}
        {!isReadOnly && !isEditing && minusMenuLayout}
      </li>
    );
  }
}

interface JsonValueProps {
  name: string;
  value: unknown;
  originalValue?: unknown;
  keyPath?: string[];
  deep?: number;
  handleRemove?: () => void;
  handleUpdateValue?: HandleUpdateValue;
  readOnly: ReadOnly;
  dataType?: string;
  cancelButtonElement?: ClickableElement;
  inputElementGenerator: ElementGenerator;
  minusMenuElement?: ClickableElement;
  logger: Logger;
  onSubmitValueParser: SubmitValueParser;
}
