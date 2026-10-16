import { Theme } from '@aussieljk/forkbook/internal/react-native-theming';
import { FC, isValidElement, ReactElement, useEffect, useMemo } from 'react';
import { Image, Linking, StyleProp, Text, TextStyle, TouchableOpacity } from 'react-native';
import { DarkLogo } from './icon/DarkLogo.tsx';
import { Logo } from './icon/Logo.tsx';

const WIDTH = 125;
const HEIGHT = 25;

const NoBrandLogo: FC<{ theme: Theme }> = ({ theme }) =>
  theme.base === 'light' ? (
    <Logo height={HEIGHT} width={WIDTH} />
  ) : (
    <DarkLogo height={HEIGHT} width={WIDTH} />
  );

function isElement(value: unknown): value is ReactElement {
  return isValidElement(value);
}

const BrandLogo: FC<{ theme: Theme }> = ({ theme }) => {
  const brand: NonNullable<Theme['brand']> = theme.brand ?? {};
  const imageHasNoWidthOrHeight =
    typeof brand.image === 'object' &&
    typeof brand.image === 'object' &&
    brand.image !== null &&
    'uri' in brand.image &&
    (!('height' in brand.image) || !('width' in brand.image));

  useEffect(() => {
    if (imageHasNoWidthOrHeight) {
      console.warn(
        "STORYBOOK: When using a remote image as the brand logo, you must also set the width and height.\nFor example:  brand: { image: { uri: 'https://sb.com/img.png', height: 25, width: 25}}"
      );
    }
  }, [imageHasNoWidthOrHeight]);

  if (!brand.image) {
    return null;
  }

  if (isElement(brand.image)) {
    return brand.image;
  }

  const image = (
    <Image
      source={brand.image}
      resizeMode={brand.resizeMode ?? 'contain'}
      style={imageHasNoWidthOrHeight ? { width: WIDTH, height: HEIGHT } : undefined}
    />
  );

  if (brand.url) {
    return (
      <TouchableOpacity
        onPress={() => {
          if (brand.url) Linking.openURL(brand.url);
        }}
      >
        {image}
      </TouchableOpacity>
    );
  } else {
    return image;
  }
};

const BrandTitle: FC<{ theme: Theme }> = ({ theme }) => {
  const brandTitleStyle = useMemo<StyleProp<TextStyle>>(() => {
    return {
      width: WIDTH,
      height: HEIGHT,
      color: theme.color.defaultText,
      fontSize: theme.typography.size.m1,
    };
  }, [theme]);

  const title = (
    <Text style={brandTitleStyle} numberOfLines={1} ellipsizeMode="tail">
      {theme.brand?.title}
    </Text>
  );

  if (theme.brand?.url) {
    return (
      <TouchableOpacity
        onPress={() => {
          if (theme.brand?.url) Linking.openURL(theme.brand?.url);
        }}
      >
        {title}
      </TouchableOpacity>
    );
  } else {
    return title;
  }
};

export const StorybookLogo: FC<{ theme: Theme }> = ({ theme }) => {
  const image = useMemo(() => theme.brand?.image, [theme.brand?.image]);
  const title = useMemo(() => theme.brand?.title, [theme.brand?.title]);

  if (image) {
    return <BrandLogo theme={theme} />;
  } else if (title) {
    return <BrandTitle theme={theme} />;
  } else {
    return <NoBrandLogo theme={theme} />;
  }
};
