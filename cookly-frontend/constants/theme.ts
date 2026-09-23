// constants/theme.ts
export const colors = {
  primary: '#E8879A',
  primaryDark: '#C25B70',
  primaryLight: '#FBE4EA',
  accent: '#FFB4C6',
  background: '#FFF8F9',
  surface: '#FFFFFF',
  text: '#2E2024',
  textMuted: '#8C7378',
  border: '#F3D6DD',
  success: '#7BC67E',
  warning: '#F2C14E',
  danger: '#E45B5B',
  white: '#FFFFFF',
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '500' as const },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};