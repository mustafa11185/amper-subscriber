/**
 * AMPER Brand Constants
 * استخدم هذا الملف في أي مكان بالمشروع للوصول لألوان وثوابت الهوية
 */

export const AMPER_COLORS = {
  // Primary
  blue:       '#1A56A0',
  blueLight:  '#2563EB',
  blueDark:   '#0E2A50',
  navy:       '#05101F',

  // Accent
  gold:       '#F59E0B',
  goldLight:  '#FCD34D',

  // Semantic
  success:    '#10B981',
  danger:     '#EF4444',
  warning:    '#F97316',
  teal:       '#0D9E7A',

  // Backgrounds
  bg1:        '#05101F',
  bg2:        '#0A1628',
  bg3:        '#0F1F38',
  card:       '#112240',
  cardHover:  '#1A3A6B',

  // Text
  text1:      '#CDD9F0',
  text2:      '#7A9CC0',
  text3:      '#4A6A90',
  textMuted:  '#1E4D8C',
} as const;

export const AMPER_FONTS = {
  ui:   "'Tajawal', sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const;

export const AMPER_BRAND = {
  nameEn:   'AMPER',
  nameAr:   'أمبير',
  taglineEn: 'SMART GENERATOR MANAGEMENT',
  taglineAr: 'إدارة ذكية للمولدات الكهربائية',
  slogan:   'مو بس حسابات — إدارة كاملة',
  version:  '2.0',
} as const;

export const AMPER_LOGO_SVG_STRING = `<svg width="420" height="76" viewBox="0 0 420 76" xmlns="http://www.w3.org/2000/svg">
  <polygon points="36,6 60,6 72,28 60,50 36,50 24,28" fill="#0E2A50" stroke="#1A56A0" stroke-width="1.2"/>
  <polygon points="36,11 57,11 68,28 57,45 36,45 25,28" fill="none" stroke="#1A3A6B" stroke-width="0.5"/>
  <circle cx="36" cy="6"  r="1.5" fill="#2563EB" opacity="0.7"/>
  <circle cx="60" cy="6"  r="1.5" fill="#2563EB" opacity="0.7"/>
  <circle cx="72" cy="28" r="1.5" fill="#2563EB" opacity="0.7"/>
  <polygon points="52,11 38,30 48,30 34,51 62,26 50,26" fill="#F59E0B"/>
  <polygon points="52,11 50,14 54,26 62,26" fill="#FCD34D" opacity="0.45"/>
  <text x="92" y="40" font-family="'IBM Plex Mono', monospace" font-size="36" font-weight="700" fill="#FFFFFF" letter-spacing="5">AMPER</text>
  <line x1="92" y1="50" x2="408" y2="50" stroke="#1A3A6B" stroke-width="0.5"/>
  <text x="94" y="63" font-family="'IBM Plex Mono', monospace" font-size="9" fill="#1E4D8C" letter-spacing="3.5">SMART GENERATOR MANAGEMENT</text>
</svg>`;

export const AMPER_ICON_SVG_STRING = `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <polygon points="24,3 40,3 48,19 40,35 24,35 16,19" fill="#0E2A50" stroke="#1A56A0" stroke-width="1.5"/>
  <polygon points="24,7 38,7 45,19 38,31 24,31 17,19" fill="none" stroke="#1A3A6B" stroke-width="0.5"/>
  <circle cx="24" cy="3"  r="2" fill="#2563EB" opacity="0.6"/>
  <circle cx="40" cy="3"  r="2" fill="#2563EB" opacity="0.6"/>
  <circle cx="48" cy="19" r="2" fill="#2563EB" opacity="0.6"/>
  <polygon points="30,7 21,19 27,19 18,33 38,17 30,17" fill="#F59E0B"/>
  <polygon points="30,7 29,9 32,17 38,17" fill="#FCD34D" opacity="0.45"/>
</svg>`;
