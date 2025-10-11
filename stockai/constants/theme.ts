/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const crimson = '#C2341F';
const softBackground = '#FBE9E7';
const golden = '#F5C26B';

export const Colors = {
  light: {
    text: '#3A120A',
    background: softBackground,
    backgroundStrong: '#8C1D18',
    tint: crimson,
    icon: '#C75B47',
    tabIconDefault: '#B87363',
    tabIconSelected: crimson,
    surface: '#FFFFFF',
    surfaceMuted: '#FCE3D5',
    border: 'rgba(194, 52, 31, 0.16)',
    overlay: 'rgba(92, 18, 12, 0.85)',
    positive: crimson,
    positiveSoft: '#FF7F66',
    negativeSoft: '#A94F4A',
  },
  dark: {
    text: '#FFE3D6',
    background: '#4A0D0A',
    backgroundStrong: '#300706',
    tint: golden,
    icon: '#F1B37B',
    tabIconDefault: '#D58E64',
    tabIconSelected: golden,
    surface: '#6E1A17',
    surfaceMuted: '#5A1210',
    border: 'rgba(245, 194, 107, 0.25)',
    overlay: 'rgba(10, 2, 2, 0.9)',
    positive: golden,
    positiveSoft: '#F9B385',
    negativeSoft: '#F28B82',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
