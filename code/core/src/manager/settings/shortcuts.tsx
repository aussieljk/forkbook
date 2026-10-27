import type { ComponentProps } from 'react';
import React, { Component } from 'react';

import { Button, Form, Tooltip, TooltipProvider } from '@aussieljk/forkbook/internal/components';

import { CheckIcon } from 'lucide-react';

import {
  type API_KeyCollection,
  eventToShortcut,
  shortcutMatchesShortcut,
  shortcutToHumanString,
} from '@aussieljk/forkbook/manager-api';
import { clsx } from 'clsx';

import SettingsFooter from './SettingsFooter.tsx';
import styles from './shortcuts.module.css';

export type ValidationStates = 'valid' | 'error' | 'warn';

const TextInput = ({
  valid,
  className,
  ...props
}: ComponentProps<typeof Form.Input> & { valid: ValidationStates | undefined }) => (
  <Form.Input className={clsx(styles.textInput, className)} data-valid={valid} {...props} />
);

const shortcutLabels = {
  fullScreen: 'Go full screen',
  togglePanel: 'Toggle addons',
  panelPosition: 'Toggle addons orientation',
  toggleNav: 'Toggle sidebar',
  toolbar: 'Toggle toolbar',
  search: 'Focus search',
  focusNav: 'Focus sidebar',
  focusIframe: 'Focus canvas',
  focusPanel: 'Focus addons',
  prevComponent: 'Previous component',
  nextComponent: 'Next component',
  prevStory: 'Previous story',
  nextStory: 'Next story',
  shortcutsPage: 'Go to shortcuts page',
  aboutPage: 'Go to about page',
  collapseAll: 'Collapse all items on sidebar',
  expandAll: 'Expand all items on sidebar',
  remount: 'Reload story',
  openInEditor: 'Open story in editor',
  openInIsolation: 'Open story in isolation',
  copyStoryLink: 'Copy story link to clipboard',
  goToPreviousLandmark: 'Go to previous landmark',
  goToNextLandmark: 'Go to next landmark',
  // TODO: bring this back once we want to add shortcuts for this
  // copyStoryName: 'Copy story name to clipboard',
};

export type Feature = keyof typeof shortcutLabels;

type ConfiguredShortcut = { shortcut: API_KeyCollection; error: boolean; hardcoded?: boolean };

// Shortcuts that cannot be changed by the user (imposed by third-party libraries).
const hardcodedShortcuts = ['goToPreviousLandmark', 'goToNextLandmark'];
function toShortcutState(
  shortcutKeys: ShortcutsScreenProps['shortcutKeys']
): Record<Feature, ConfiguredShortcut> {
  const state: Record<string, ConfiguredShortcut> = {};
  for (const key of Object.keys(shortcutKeys)) {
    state[key] = {
      shortcut: shortcutKeys[key as Feature],
      error: false,
      hardcoded: hardcodedShortcuts.includes(key),
    };
  }

  return state;
}

export interface ShortcutsScreenState {
  activeFeature: Feature;
  successField: Feature;
  shortcutKeys: Record<Feature, any>;
  addonsShortcutLabels?: Record<string, string>;
}

export interface ShortcutsScreenProps {
  shortcutKeys: Record<Feature, any>;
  addonsShortcutLabels?: Record<string, string>;
  setShortcut: Function;
  restoreDefaultShortcut: Function;
  restoreAllDefaultShortcuts: Function;
}

class ShortcutsScreen extends Component<ShortcutsScreenProps, ShortcutsScreenState> {
  constructor(props: ShortcutsScreenProps) {
    super(props);
    this.state = {
      // @ts-expect-error (non strict)
      activeFeature: undefined,
      // @ts-expect-error (non strict)
      successField: undefined,
      // The initial shortcutKeys that come from props are the defaults/what was saved
      // As the user interacts with the page, the state stores the temporary, unsaved shortcuts
      // This object also includes the error attached to each shortcut
      shortcutKeys: toShortcutState(props.shortcutKeys),
      addonsShortcutLabels: props.addonsShortcutLabels,
    };
  }

  onKeyDown = (e: KeyboardEvent) => {
    const { activeFeature, shortcutKeys } = this.state;

    if (e.key === 'Backspace') {
      return this.restoreDefault();
    }

    const shortcut = eventToShortcut(e);

    // Keypress is not a potential shortcut
    if (!shortcut) {
      return false;
    }

    // Normalize special characters produced by Option/Alt on macOS (e.g. ['Ø','O'] -> 'O')
    const normalizedShortcut = shortcut.map((key) =>
      Array.isArray(key) ? key.at(-1) : key
    ) as string[];

    // Escape stays reserved: overlays across the manager close on it, and a persisted
    // binding would swallow every Escape press at the document level before they see it.
    const isReservedKey = normalizedShortcut.length === 1 && normalizedShortcut[0] === 'escape';

    // Check we don't match any other shortcuts
    const error =
      isReservedKey ||
      !!Object.entries(shortcutKeys).find(
        ([feature, { shortcut: existingShortcut }]) =>
          feature !== activeFeature &&
          existingShortcut &&
          shortcutMatchesShortcut(normalizedShortcut, existingShortcut)
      );

    return this.setState({
      shortcutKeys: { ...shortcutKeys, [activeFeature]: { shortcut: normalizedShortcut, error } },
    });
  };

  onFocus = (focusedInput: Feature) => () => {
    const { shortcutKeys } = this.state;

    this.setState({
      activeFeature: focusedInput,
      shortcutKeys: {
        ...shortcutKeys,
        [focusedInput]: { shortcut: null, error: false },
      },
    });
  };

  onBlur = async () => {
    const { shortcutKeys, activeFeature } = this.state;

    if (shortcutKeys[activeFeature]) {
      const { shortcut, error } = shortcutKeys[activeFeature];
      if (!shortcut || error) {
        return this.restoreDefault();
      }
      return this.saveShortcut();
    }
    return false;
  };

  saveShortcut = async () => {
    const { activeFeature, shortcutKeys } = this.state;

    const { setShortcut } = this.props;
    await setShortcut(activeFeature, shortcutKeys[activeFeature].shortcut);
    this.setState({ successField: activeFeature });
  };

  restoreDefaults = async () => {
    const { restoreAllDefaultShortcuts } = this.props;

    const defaultShortcuts = await restoreAllDefaultShortcuts();
    return this.setState({ shortcutKeys: toShortcutState(defaultShortcuts) });
  };

  restoreDefault = async () => {
    const { activeFeature, shortcutKeys } = this.state;

    const { restoreDefaultShortcut } = this.props;

    const defaultShortcut = await restoreDefaultShortcut(activeFeature);
    return this.setState({
      shortcutKeys: {
        ...shortcutKeys,
        ...toShortcutState({ [activeFeature]: defaultShortcut } as Record<Feature, any>),
      },
    });
  };

  displaySuccessMessage = (activeElement: Feature) => {
    const { successField, shortcutKeys } = this.state;
    return activeElement === successField && shortcutKeys[activeElement].error === false
      ? 'valid'
      : undefined;
  };

  displayError = (activeElement: Feature): ValidationStates | undefined => {
    const { activeFeature, shortcutKeys } = this.state;
    return activeElement === activeFeature && shortcutKeys[activeElement].error === true
      ? 'error'
      : undefined;
  };

  renderKeyInput = () => {
    const { shortcutKeys, addonsShortcutLabels } = this.state;
    // Filter out keyboard shortcuts from localStorage that no longer exist in code
    const availableShortcuts = (Object.entries(shortcutKeys) as [Feature, any][]).filter(
      ([feature]: [Feature, any]) =>
        shortcutLabels[feature] !== undefined ||
        (addonsShortcutLabels && addonsShortcutLabels[feature])
    );

    const arr = availableShortcuts.map(
      ([feature, { shortcut, hardcoded }]: [Feature, ConfiguredShortcut]) => (
        <div className={styles.row} key={feature}>
          <div className={styles.description}>
            {/* @ts-expect-error (non strict) */}
            {shortcutLabels[feature] || addonsShortcutLabels[feature]}
          </div>

          {hardcoded ? (
            <>
              <TooltipProvider
                tooltip={<Tooltip hasChrome>This shortcut cannot be changed.</Tooltip>}
                placement="right"
              >
                <TextInput
                  aria-disabled
                  readOnly
                  valid={undefined}
                  value={shortcut ? shortcutToHumanString(shortcut) : ''}
                />
              </TooltipProvider>
            </>
          ) : (
            <TextInput
              spellCheck="false"
              valid={this.displayError(feature)}
              className="modalInput"
              onBlur={this.onBlur}
              onFocus={this.onFocus(feature)}
              // @ts-expect-error (Converted from ts-ignore)
              onKeyDown={this.onKeyDown}
              value={shortcut ? shortcutToHumanString(shortcut) : ''}
              placeholder="Type keys"
              readOnly
            />
          )}

          <CheckIcon
            className={styles.successIcon}
            data-valid={this.displaySuccessMessage(feature)}
          />
        </div>
      )
    );

    return arr;
  };

  renderKeyForm = () => (
    <div className={styles.gridWrapper}>
      <div className={styles.gridHeaderRow}>
        <div className={styles.headerItem}>Commands</div>
        <div className={styles.headerItem}>Shortcut</div>
      </div>
      {this.renderKeyInput()}
    </div>
  );

  render() {
    const layout = this.renderKeyForm();
    return (
      <div className={styles.container}>
        <header className={styles.header}>Keyboard shortcuts</header>

        {layout}
        <Button
          ariaLabel={false}
          variant="outline"
          size="small"
          id="restoreDefaultsHotkeys"
          onClick={this.restoreDefaults}
        >
          Restore defaults
        </Button>
        <SettingsFooter />
      </div>
    );
  }
}

export { ShortcutsScreen };
