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

// Voltage Hex Mark (v2) — gold variant for subscriber app
export const AMPER_LOGO_SVG_STRING = `<svg width="420" height="76" viewBox="0 0 420 76" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(6,1) scale(0.467)">
    <polygon points="60,14 100,37 100,83 60,106 20,83 20,37" fill="none" stroke="#D97706" stroke-width="5" stroke-linejoin="miter"/>
    <path d="M66,24 L50,60 L62,60 L46,96 L76,56 L62,56 Z" fill="#F59E0B"/>
  </g>
  <text x="78" y="40" font-family="'Rajdhani','Outfit',monospace" font-size="36" font-weight="700" fill="#F59E0B" letter-spacing="4">AMPER</text>
  <line x1="78" y1="50" x2="408" y2="50" stroke="rgba(217,119,6,0.3)" stroke-width="0.6"/>
  <text x="80" y="63" font-family="'Rajdhani',monospace" font-size="9" fill="#B0651A" letter-spacing="3.5">SUBSCRIBER APP</text>
</svg>`;

export const AMPER_ICON_SVG_STRING = `<svg width="48" height="48" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <polygon points="60,14 100,37 100,83 60,106 20,83 20,37" fill="none" stroke="#D97706" stroke-width="5" stroke-linejoin="miter"/>
  <path d="M66,24 L50,60 L62,60 L46,96 L76,56 L62,56 Z" fill="#F59E0B"/>
</svg>`;
