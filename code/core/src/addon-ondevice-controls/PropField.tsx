import React, { ComponentType } from 'react';
import { styled } from '@aussieljk/forkbook/internal/react-native-theming';
import TypeMap from './types/index.ts';
import { ArgType } from './ControlsPanel.tsx';
import { ControlTypes } from './sharedTypes.ts';

export interface Knob {
  name: string;
  label: string;
  value: any;
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
  onChange: (value: any) => void;
  arg: ArgType;
  isPristine: boolean;
}

const PropField = ({ onChange, arg, isPristine }: PropFieldProps) => {
  const InputType: ComponentType<any> = TypeMap[arg.type as keyof typeof TypeMap];
  return InputType ? (
    <InputType arg={arg} isPristine={isPristine} onChange={onChange} />
  ) : (
    <InvalidType arg={arg} />
  );
};

export default PropField;
