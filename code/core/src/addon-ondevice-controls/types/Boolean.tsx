import { Switch } from 'react-native';
import { styled } from '@aussieljk/forkbook/internal/react-native-theming';

export interface BooleanProps {
  onChange: (value: boolean) => void;
  arg: {
    name: string;
    value: boolean;
  };
}

const Container = styled.View(() => ({
  alignItems: 'flex-start',
}));

const BooleanType = ({ arg, onChange }: BooleanProps) => (
  <Container>
    <Switch testID={arg.name} onValueChange={() => onChange(!arg.value)} value={arg.value} />
  </Container>
);

BooleanType.serialize = (value: any) => (value ? String(value) : null);

BooleanType.deserialize = (value: any) => value === 'true';

export default BooleanType;
