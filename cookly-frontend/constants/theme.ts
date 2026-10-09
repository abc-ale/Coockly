// Identidad visual Cookly
export const colors = {
  primary: '#FF4D80',      // Bubblegum Pink
  primaryDark: '#D93A68',  // estado presionado
  primaryLight: '#F3D9DC', // Soft Blush
  accent: '#FFD866',       // Butter (acento cálido)
  magic: '#BEE3A5',        // Pistachio (acento mágico)
  background: '#FFF8F6',   // Cream White
  surface: '#FFFFFF',
  text: '#2B1220',         // Plum Ink
  textMuted: '#7A6670',
  border: '#F3D9DC',
  success: '#6FBF73',
  warning: '#FFD866',
  danger: '#E5484D',
  onPrimary: '#FFF8F6',
  white: '#FFFFFF',
};

export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  heading: 'Nunito_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
};

export const typography = {
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.text },
  h3: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 24, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  bodySmall: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 14, color: colors.textMuted },
  button: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const shadow = {
  card: {
    shadowColor: '#2B1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
};

const theme = { colors, fonts, typography, spacing, radius, shadow };
export default theme;