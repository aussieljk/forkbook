import type { ComponentType } from 'react';
import React from 'react';
import { styled } from '@aussieljk/forkbook/internal/react-native-theming';
import TypeMap from './types/index.ts';
import type { ArgType } from './ControlsPanel.tsx';
import type { ControlTypes } from './sharedTypes.ts';

export interface Knob {
  name: string;
  label: string;
  value: unknown;
  hideLabel: boolean;
  type: ControlTypes;
  groupId?: string;
}

const InvalidTypeText = styled.Text(({ theme }) => ({
  color: theme.color.negative,
}));

const InvalidType = ({ arg }: { arg: ArgType }) => (
  <InvalidTypeText>Invalid type: {arg.type}</InvalidTypeText>
);

interface PropFieldProps {
  onChange: (value: unknown) => void;
  arg: ArgType;
  isPristine: boolean;
}

const PropField = ({ onChange, arg, isPristine }: PropFieldProps) => {
  // `any`: each control declares its own narrow `arg` shape, so no single props type fits them all.
  const InputType: ComponentType<any> = TypeMap[arg.type as keyof typeof TypeMap];
  return InputType ? (
    <InputType arg={arg} isPristine={isPristine} onChange={onChange} />
  ) : (
    <InvalidType arg={arg} />
  );
};

export default PropField;
