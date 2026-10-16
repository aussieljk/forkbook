import { styled } from '@aussieljk/forkbook/internal/react-native-theming';
import { Linking, View } from 'react-native';

const Paragraph = styled.Text(({ theme }) => ({
  marginBottom: 16,
  color: theme.color.defaultText,
}));

const LinkText = styled.Text(({ theme }) => ({
  color: theme.color.secondary,
  textDecorationLine: 'underline',
}));

const NoControlsWarning = () => {
  return (
    <View style={{ padding: 10 }}>
      <Paragraph>This story is not configured to handle controls.</Paragraph>
      <Paragraph>
        <LinkText
          onPress={() => Linking.openURL('https://forkbook.ljk.dev/docs/react/essentials/controls')}
        >
          Learn how to add controls.
        </LinkText>
      </Paragraph>
    </View>
  );
};

export default NoControlsWarning;
