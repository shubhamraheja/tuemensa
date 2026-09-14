/**
 * TüMensa design tokens — warm, minimal, one tangerine accent.
 * Every component styles exclusively from these tokens.
 */

export const palette = {
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F4EEE5',
  ink: '#1C1B1A',
  inkMuted: '#6F6A62',
  inkFaint: '#A9A29A',
  tangerine: '#F4772E',
  tangerineDark: '#D95F1A',
  tangerineSoft: '#FDEBDB',
  open: '#2FA36B',
  closed: '#D64545',
  unknown: '#A9A29A',
  border: '#EAE2D6',
  overlay: 'rgba(28,27,26,0.35)',
  like: '#2FA36B',
  skip: '#D64545',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Inter weights loaded in App.tsx: 400 / 500 / 600. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

export const type = {
  display: { fontSize: 28, lineHeight: 34, fontFamily: fonts.semibold },
  title: { fontSize: 20, lineHeight: 26, fontFamily: fonts.semibold },
  body: { fontSize: 16, lineHeight: 22, fontFamily: fonts.regular },
  label: { fontSize: 14, lineHeight: 18, fontFamily: fonts.medium },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium },
} as const;

export const shadow = {
  card: {
    shadowColor: '#1C1B1A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;
