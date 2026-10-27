import type { FC, KeyboardEvent } from 'react';
import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { RotateCwIcon } from 'lucide-react';

import { Popover as BasePopover } from '@base-ui/react/popover';
import { clsx } from 'clsx';

import { Button, type ButtonProps } from '../Button/Button.tsx';
import { Form } from '../Form/Form.tsx';
import { Popover } from '../Popover/Popover.tsx';
import { PortalContainerContext } from '../shared/overlayHelpers.tsx';
import { SelectOption } from './SelectOption.tsx';
import type { InternalOption, Option, ResetOption, Value } from './helpers.tsx';
import { PortalTheme } from '../shared/PortalTheme.tsx';
import styles from './Select.module.css';
import {
  Listbox,
  PAGE_STEP_SIZE,
  externalToValue,
  isLiteralValue,
  optionOrResetToInternal,
  optionToInternal,
  valueToExternal,
} from './helpers.tsx';

export interface SelectProps extends Omit<
  ButtonProps,
  'onClick' | 'onChange' | 'onSelect' | 'variant'
> {
  size?: 'small' | 'medium';
  padding?: 'small' | 'medium' | 'none';

  /**
   * Whether multiple options can be selected. In single select mode, this component acts like a
   * HTML select element where the selected option follows focus. In multi select mode, it acts like
   * a combobox and does not autoclose on select or autoselect the focused option.
   */
  multiSelect?: boolean;

  /**
   * Mandatory label that explains what is being selected. Do not include "change", "toggle" or
   * "select" verbs in the label. Instead, only describe the type of content with a noun.
   */
  ariaLabel: string;

  /**
   * Label for the Select component. In single-select mode, is replaced by the currently selected
   * option's title.
   */
  children?: React.ReactNode;

  /**
   * Icon shown next to the Select's children, still displayed when a value is selected and Select
   * shows that value instead of children.
   */
  icon?: React.ReactNode;

  /** Whether the Select is currently disabled. */
  disabled?: boolean;

  /** Options available in the select. */
  options: Option[];

  /** IDs of the preselected options. */
  defaultOptions?: Value | Value[];

  /** Whether the Select should render open. */
  defaultOpen?: boolean;

  /** When set, a reset option is rendered in the Select listbox. */
  onReset?: () => void;

  /** Custom text label for the reset option when it exists. */
  resetLabel?: string;

  onSelect?: (option: Value) => void;
  onDeselect?: (option: Value) => void;
  onChange?: (selected: Value[]) => void;
  /**
   * Legacy option for ToolbarMenuSelect. Do not use in new code. Controls whether to show the
   * selected option's title.
   *
   * @default true
   */
  showSelectedOptionTitle?: boolean;
}

function valueToId(parentId: string, { value }: InternalOption | ResetOption): string {
  return `${parentId}-opt-${String(value) ?? 'fb-reset'}`;
}

function setSelectedFromDefault(
  options: SelectProps['options'],
  defaultOptions: SelectProps['defaultOptions']
): InternalOption[] {
  if (defaultOptions === undefined) {
    return [];
  }

  if (isLiteralValue(defaultOptions)) {
    return options.filter((opt) => opt.value === defaultOptions).map(optionToInternal);
  }

  return options
    .filter((opt) => defaultOptions.some((def) => opt.value === def))
    .map(optionToInternal);
}

/*
 * This popover does not do any keyboard handling or focus management. It places its children
 * under the trigger. When clicking outside the popover, it closes.
 */
const MinimalistPopover: FC<{
  children: React.ReactNode;
  handleClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}> = ({ children, handleClose, triggerRef }) => {
  const portalContainer = useContext(PortalContainerContext);

  return (
    <BasePopover.Root
      open
      onOpenChange={(open, { reason }) => {
        // Escape is handled by the listbox itself.
        if (!open && reason !== 'escape-key') {
          handleClose();
        }
      }}
    >
      <BasePopover.Portal container={portalContainer}>
        <PortalTheme>
          <div className={styles.underlay} />
          <BasePopover.Positioner
            anchor={triggerRef}
            side="bottom"
            align="start"
            sideOffset={8}
            style={{ zIndex: 100000 }}
          >
            <BasePopover.Popup
              role="presentation"
              initialFocus={false}
              finalFocus={false}
              render={
                <Popover
                  hasChrome
                  padding={0}
                  style={{
                    maxHeight: 'min(504px, var(--available-height))',
                    overflow: 'hidden auto',
                    scrollbarColor: 'var(--fb-bar-text-color) transparent',
                    scrollbarWidth: 'thin',
                  }}
                >
                  {children}
                </Popover>
              }
            />
          </BasePopover.Positioner>
        </PortalTheme>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
};

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      children,
      icon,
      disabled = false,
      options: calleeOptions,
      defaultOptions,
      multiSelect = false,
      onReset,
      padding = 'small',
      resetLabel,
      onSelect,
      onDeselect,
      onChange,
      tooltip,
      ariaLabel,
      showSelectedOptionTitle = true,
      className,
      ...props
    },
    ref
  ) => {
    const [isOpenState, setIsOpen] = useState(props.defaultOpen || false);
    const isOpen = isOpenState && !disabled;
    const [shouldRefocusTrigger, setShouldRefocusTrigger] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    useImperativeHandle(ref, () => triggerRef.current!);

    const id = useMemo(() => {
      return 'select-' + Math.random().toString(36).substring(2, 15);
    }, []);
    const listboxId = `${id}-listbox`;
    const listboxRef = useRef<HTMLUListElement>(null);

    const handleClose = useCallback(() => {
      setIsOpen(false);
      setShouldRefocusTrigger(true);
    }, []);

    // We must delay refocusing the trigger because we first need the listbox to close.
    useEffect(() => {
      if (!isOpen && shouldRefocusTrigger) {
        // Only focus a trigger that still lives in a real browsing context.
        if (triggerRef.current?.ownerDocument?.defaultView) {
          triggerRef.current.focus();
        }
        setShouldRefocusTrigger(false);
      }
    }, [isOpen, shouldRefocusTrigger]);

    // The last selected option(s), which will be used by the app.
    const [selectedOptions, setSelectedOptions] = useState<InternalOption[]>(
      setSelectedFromDefault(calleeOptions, defaultOptions)
    );

    // Selects an option (updating the selection state based on multiSelect).
    const handleSelectOption = useCallback(
      (option: InternalOption | ResetOption) => {
        // Reset option case. We check value === undefined for cleaner type handling in the other branch.
        if (option.type === 'reset') {
          onChange?.([]);
          onReset?.();
          setSelectedOptions([]);
        } else if (multiSelect) {
          setSelectedOptions((previous) => {
            let newSelected: InternalOption[] = [];

            const isSelected = previous?.some((opt) => opt.value === option.value);
            if (isSelected) {
              onDeselect?.(valueToExternal(option.value));
              newSelected = previous?.filter((opt) => opt.value !== option.value) ?? [];
            } else {
              onSelect?.(valueToExternal(option.value));
              newSelected = [...(previous ?? []), option];
            }

            onChange?.(newSelected.map((opt) => valueToExternal(opt.value)));
            return newSelected;
          });
        } else {
          setSelectedOptions((current) => {
            if (current.every((opt) => opt.value !== option.value)) {
              onSelect?.(valueToExternal(option.value));
              onChange?.([valueToExternal(option.value)]);
              return [option];
            }
            return current;
          });
        }
      },
      [multiSelect, onChange, onSelect, onDeselect, onReset]
    );

    // Reset option appears if a handler is defined and there are selected options.
    const resetOption = useMemo(
      () =>
        onReset
          ? {
              type: 'reset',
              value: undefined,
              title: resetLabel ?? 'Reset selection',
              icon: <RotateCwIcon />,
              description: undefined,
              children: undefined,
            }
          : undefined,
      [onReset, resetLabel]
    );

    // Synthetic object allowing us to implement the roving tabindex.
    const options = useMemo(
      () => (resetOption ? [resetOption, ...calleeOptions] : calleeOptions),
      [calleeOptions, resetOption]
    );

    // We must do this to account for callees that have an unstable data model.
    // For instance, when a URL query param is passed for the theme addon, the
    // addon receives, undefined, then the default theme value (incorrectly),
    // then the actual URL query param as a selected theme.
    useEffect(() => {
      if (defaultOptions) {
        setSelectedOptions(setSelectedFromDefault(calleeOptions, defaultOptions));
      }
    }, [defaultOptions, calleeOptions]);

    // The active option in the listbox, which will receive focus when the listbox is open.
    const [activeOption, setActiveOptionState] = useState<InternalOption | ResetOption | undefined>(
      undefined
    );

    // In single select mode, the active option is the selected one, so we
    // wrap setActiveOption to handle selection. We never close the listbox
    // in that scenario.
    const setActiveOption = useCallback(
      (option: Option | ResetOption, changeSelection = true) => {
        setActiveOptionState(optionOrResetToInternal(option));
        if (!multiSelect && changeSelection) {
          handleSelectOption(optionOrResetToInternal(option));
        }
      },
      [multiSelect, handleSelectOption]
    );

    const moveActiveOptionDown = useCallback(
      (step = 1) => {
        if (!isOpen || !activeOption) {
          setActiveOption(options[step === 1 ? 0 : Math.min(step, options.length - 1)]);
          return;
        }

        const currentIndex = options.findIndex((option) =>
          activeOption.type === 'reset'
            ? 'type' in option && option.type === 'reset'
            : externalToValue(option.value) === activeOption.value
        );
        const nextIndex = currentIndex + step;

        // Loop over to the start if we're already on the last option.
        let newActiveOption;
        if (nextIndex >= options.length && currentIndex === options.length - 1) {
          newActiveOption = options[0];
        } else {
          newActiveOption = options[Math.min(options.length - 1, nextIndex)];
        }

        setActiveOption(newActiveOption);
      },
      [isOpen, activeOption, setActiveOption, options]
    );

    const moveActiveOptionUp = useCallback(
      (step = 1) => {
        if (!isOpen || !activeOption) {
          setActiveOption(options[Math.max(0, options.length - step)]);
          return;
        }

        const currentIndex = options.findIndex((option) =>
          activeOption.type === 'reset'
            ? 'type' in option && option.type === 'reset'
            : externalToValue(option.value) === activeOption.value
        );
        const nextIndex = currentIndex - step;

        // Loop over to the end if we're already on the first option.
        let newActiveOption;
        if (nextIndex < 0 && currentIndex === 0) {
          newActiveOption = options[options.length - 1];
        } else {
          newActiveOption = options[Math.max(0, nextIndex)];
        }

        setActiveOption(newActiveOption);
      },
      [isOpen, activeOption, setActiveOption, options]
    );

    const handleButtonKeyDown = useCallback(
      (e: KeyboardEvent<HTMLButtonElement>) => {
        const openAt = (index: number) => {
          e.preventDefault();
          setActiveOption(options[index]);
          setIsOpen(true);
        };

        // If there is a selection, we'll open the Select around the first selected option.
        // If not, around the edges of the list.
        const indexOfFirstSelected = options.findIndex((option) =>
          selectedOptions.some((sel) => sel.value === externalToValue(option.value))
        );
        const hasSelection = indexOfFirstSelected !== -1;

        // When the Select has a reset option, but nothing is selected, it
        // makes no sense to open on the Reset option. We start on the first
        // actual option.
        const listStart = resetOption && !hasSelection ? 1 : 0;
        const listEnd = options.length - 1;

        // When we press ArrowUp/Down, we want to stay close to the edges rather than
        // initiate movement. When we press Home/End or PageUp/PageDown, we want to
        // move immediately because it's clearer the user intends to be in a specific
        // area of the list. This is why we don't always do +/- 1 but always do +/- PAGE_STEP_SIZE.
        if (e.key === 'Enter' || e.key === ' ') {
          openAt(hasSelection ? Math.min(indexOfFirstSelected, listEnd) : listStart);
        } else if (e.key === 'ArrowDown') {
          openAt(hasSelection ? Math.min(indexOfFirstSelected + 1, listEnd) : listStart);
        } else if (e.key === 'ArrowUp') {
          openAt(hasSelection ? Math.max(indexOfFirstSelected - 1, listStart) : listEnd);
        } else if (e.key === 'Home') {
          openAt(listStart);
        } else if (e.key === 'End') {
          openAt(listEnd);
        } else if (e.key === 'PageDown') {
          openAt(
            Math.min((hasSelection ? indexOfFirstSelected : listStart) + PAGE_STEP_SIZE, listEnd)
          );
        } else if (e.key === 'PageUp') {
          openAt(Math.max(0, (hasSelection ? indexOfFirstSelected : listEnd) - PAGE_STEP_SIZE));
        }
      },
      [options, resetOption, setActiveOption, selectedOptions]
    );

    const handleListboxKeyDown = useCallback(
      (e: KeyboardEvent<HTMLUListElement>) => {
        // We don't prevent default on Tab, so that the Tab or Shift+Tab goes
        // through after we've repositioned to the Button.
        if (e.key !== 'Tab') {
          e.preventDefault();
        } else {
          handleClose();
        }

        if (e.key === 'Escape') {
          handleClose();
          e.stopPropagation();
        } else if (e.key === 'ArrowDown') {
          moveActiveOptionDown();
        } else if (e.key === 'ArrowUp') {
          moveActiveOptionUp();
        } else if (e.key === 'Home') {
          setActiveOption(options[0]);
        } else if (e.key === 'End') {
          setActiveOption(options[options.length - 1]);
        } else if (e.key === 'PageDown') {
          moveActiveOptionDown(PAGE_STEP_SIZE);
        } else if (e.key === 'PageUp') {
          moveActiveOptionUp(PAGE_STEP_SIZE);
        }
      },
      [handleClose, moveActiveOptionDown, moveActiveOptionUp, options, setActiveOption]
    );

    // Transfer focus to the active option whenever we open the listbox.
    useEffect(() => {
      if (isOpen && activeOption) {
        const optionElement = document.getElementById(valueToId(id, activeOption));

        if (optionElement) {
          optionElement.scrollIntoView({ block: 'nearest' });
          optionElement.focus();
        }
      } else if (isOpen) {
        listboxRef.current?.focus();
      }
    }, [isOpen, activeOption, id]);

    // We customise the ariaLabel to include a current value, and we let tooltip
    // receive the original ariaLabel as the value is displayed in children.
    const finalAriaLabel = useMemo(() => {
      if (selectedOptions.length === 1) {
        return `${ariaLabel} ${selectedOptions[0].title}`;
      }
      if (selectedOptions.length) {
        return `${ariaLabel}, ${selectedOptions.length} values selected`;
      }
      return ariaLabel;
    }, [ariaLabel, selectedOptions]);

    return (
      <>
        <Button
          {...props}
          className={clsx(
            (isOpen || selectedOptions.length > 0) && styles.highlightedButton,
            className
          )}
          variant="ghost"
          ariaLabel={finalAriaLabel}
          tooltip={tooltip ?? ariaLabel}
          disableAllTooltips={isOpen}
          id={id}
          ref={triggerRef}
          padding={padding}
          // Can be removed once #32325 is fixed (Button will then provide aria-disabled)
          aria-disabled={disabled}
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              handleClose();
            } else {
              setIsOpen(true);
            }
          }}
          tabIndex={isOpen ? -1 : 0}
          onKeyDown={handleButtonKeyDown}
          role="button"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {!multiSelect && (
            <>
              {icon}
              {(showSelectedOptionTitle && selectedOptions[0]?.title) || children}
            </>
          )}

          {multiSelect && (
            <>
              {icon}
              {children}
              {!!selectedOptions.length && (
                <span
                  className={styles.selectedOptionCount}
                  aria-label={`${selectedOptions.length} ${selectedOptions.length > 1 ? 'items' : 'item'} selected`}
                >
                  {selectedOptions?.length}
                </span>
              )}
            </>
          )}
        </Button>
        {isOpen && (
          <MinimalistPopover handleClose={handleClose} triggerRef={triggerRef}>
            <Listbox
              aria-label={ariaLabel}
              role="listbox"
              id={listboxId}
              ref={listboxRef}
              aria-multiselectable={multiSelect}
              onKeyDown={handleListboxKeyDown}
              tabIndex={isOpen ? 0 : -1}
            >
              {options
                .map((opt) => ({
                  option: optionOrResetToInternal(opt),
                  externalOption: opt,
                }))
                .map(({ externalOption, option }) => {
                  const isSelected =
                    selectedOptions?.some((sel) => sel.value === option.value) &&
                    option !== resetOption;
                  const isReset = option === resetOption;

                  return (
                    <SelectOption
                      key={option.value === undefined ? 'fb-reset' : String(option.value)}
                      title={option.title}
                      description={option.description}
                      aside={option.aside}
                      icon={
                        !isReset && multiSelect ? (
                          // Purely decorative.
                          <Form.Checkbox checked={isSelected} hidden role="presentation" />
                        ) : (
                          option.icon
                        )
                      }
                      id={valueToId(id, option)}
                      isActive={isOpen && activeOption?.value === option.value}
                      isSelected={isSelected}
                      onClick={() => {
                        handleSelectOption(option);
                        if (!multiSelect) {
                          handleClose();
                        }
                      }}
                      onFocus={() => setActiveOption(externalOption, false)}
                      shouldLookDisabled={isReset && selectedOptions.length === 0 && multiSelect}
                      onKeyDown={(e: KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectOption(option);
                          if (!multiSelect) {
                            handleClose();
                          }
                        } else if (e.key === 'Tab') {
                          if (!multiSelect) {
                            handleSelectOption(option);
                          }
                          handleClose();
                        }
                      }}
                    >
                      {option.children}
                    </SelectOption>
                  );
                })}
            </Listbox>
          </MinimalistPopover>
        )}
      </>
    );
  }
);

Select.displayName = 'Select';
