import type { KeyboardEvent } from 'react';
import React, { Component, cloneElement } from 'react';

import type { ClickableElement } from './types/ClickableElement.ts';
import type { AddedValue, ElementGenerator, SubmitValueParser } from './types/callbacks.ts';
import * as inputUsageTypes from './types/inputUsageTypes.ts';

export class JsonAddValue extends Component<JsonAddValueProps> {
  inputRefKey: HTMLInputElement | HTMLTextAreaElement | null = null;
  inputRefValue: HTMLInputElement | HTMLTextAreaElement | null = null;

  static defaultProps = {
    onlyValue: false,
    addButtonElement: <button>+</button>,
    cancelButtonElement: <button>c</button>,
  };

  constructor(props: JsonAddValueProps) {
    super(props);
    // Bind
    this.refInputValue = this.refInputValue.bind(this);
    this.refInputKey = this.refInputKey.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  componentDidMount() {
    const { inputRefKey, inputRefValue } = this;
    const { onlyValue } = this.props;

    if (inputRefKey && typeof inputRefKey.focus === 'function') {
      inputRefKey.focus();
    }

    if (onlyValue && inputRefValue && typeof inputRefValue.focus === 'function') {
      inputRefValue.focus();
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) {
      return;
    }
    const { inputRefKey, inputRefValue } = this;
    const { addButtonElement, handleCancel } = this.props;
    const isFormFocused = [inputRefKey, inputRefValue, addButtonElement].some(
      (elm) => elm === event.target
    );
    if (!isFormFocused) {
      return;
    }
    if (event.code === 'Enter' || event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
    }
    if (event.code === 'Escape' || event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  onSubmit() {
    const { handleAdd, onlyValue, onSubmitValueParser, keyPath, deep } = this.props;
    const { inputRefKey, inputRefValue } = this;
    const result: { key?: string; newValue?: unknown } = {};
    // Check if we have the key
    if (!onlyValue) {
      // Check that there is a key
      if (!inputRefKey?.value) {
        // Empty key => Not authorized
        return;
      }

      result.key = inputRefKey.value;
    }
    result.newValue = onSubmitValueParser(false, keyPath, deep, result.key, inputRefValue!.value);
    handleAdd(result);
  }

  refInputKey(node: HTMLInputElement | HTMLTextAreaElement | null) {
    this.inputRefKey = node;
  }

  refInputValue(node: HTMLInputElement | HTMLTextAreaElement | null) {
    this.inputRefValue = node;
  }

  render() {
    const {
      handleCancel,
      onlyValue,
      addButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      keyPath,
      deep,
    } = this.props;
    const addButtonElementLayout =
      addButtonElement &&
      cloneElement(addButtonElement, {
        onClick: this.onSubmit,
      });
    const cancelButtonElementLayout =
      cancelButtonElement &&
      cloneElement(cancelButtonElement, {
        onClick: handleCancel,
      });
    const inputElementValue = inputElementGenerator(inputUsageTypes.VALUE, keyPath, deep);
    const inputElementValueLayout = cloneElement(inputElementValue, {
      placeholder: 'Value',
      ref: this.refInputValue,
      onKeyDown: this.onKeydown,
    });
    let inputElementKeyLayout = null;

    if (!onlyValue) {
      const inputElementKey = inputElementGenerator(inputUsageTypes.KEY, keyPath, deep);
      inputElementKeyLayout = cloneElement(inputElementKey, {
        placeholder: 'Key',
        ref: this.refInputKey,
        onKeyDown: this.onKeydown,
      });
    }

    return (
      <span className="rejt-add-value-node">
        {inputElementKeyLayout}
        {inputElementValueLayout}
        {addButtonElementLayout}
        {cancelButtonElementLayout}
      </span>
    );
  }
}

interface JsonAddValueProps {
  handleAdd: (added: AddedValue) => void;
  handleCancel: () => void;
  onlyValue?: boolean;
  addButtonElement?: ClickableElement;
  cancelButtonElement?: ClickableElement;
  inputElementGenerator: ElementGenerator;
  keyPath: string[];
  deep: number;
  onSubmitValueParser: SubmitValueParser;
}
