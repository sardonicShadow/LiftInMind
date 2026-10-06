export const colors = {
  bg: '#0E0F11',
  surface: '#17191C',
  surface2: '#202328',
  surface3: '#2A2E34',
  line: '#2A2E34',
  tabBg: '#141619',
  text: '#F2F3F5',
  muted: '#A3A9B1',
  faint: '#8A9098',
  dim: '#6E747C',
  accent: '#C6F432',
  accentInk: '#0E0F11',
  accentSoft: '#2A3312',
  accentBg: '#151A0C',
  accentLine: '#4A5A1A',
  warn: '#FF9F43',
  warnSoft: '#3A2510',
  neutralSoft: '#25282D',
  // Pass and fail marks in the workout report.
  good: '#4ADE80',
  goodSoft: '#14301F',
  bad: '#FF6B6B',
  badSoft: '#3A1A1C',
  badBg: '#1E1113',
  neutralText: '#C4C9CF',
};

export const fonts = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  cond: 'BarlowCondensed_600SemiBold',
  condBold: 'BarlowCondensed_700Bold',
};

export const MAX_WIDTH = 520;

/** Quiet focus ring for text fields on web (browsers default to a bright white outline). */
export const webInputFocus = {
  outlineStyle: 'solid',
  outlineWidth: 1,
  outlineColor: colors.accentLine,
  outlineOffset: -1,
} as object;
