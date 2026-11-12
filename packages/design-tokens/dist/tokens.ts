// GENERATED FROM packages/design-tokens/tokens.json — DO NOT EDIT. 값을 바꾸려면 tokens.json을 고치고 `pnpm generate`.

export const TOKENS_VERSION = 2 as const;
export const THEME_IDS = ['light', 'dark'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** 색상 토큰. 테마별 hex. 용도는 docs/DESIGN_SYSTEM.md §3. */
export const color = {
  light: {
    /** Page background. Light = 솔로 모드·온보딩 기본, Dark = 랜덤 매칭·방 통화·밤 장면. */
    surface100: '#FBF8FF',
    /** Section background, list grouping, input fields. */
    surface200: '#F3EDFC',
    /** Cards, sheets, chat bubbles from the other side. */
    surface300: '#FFFFFF',
    /** Deep slab for call screens and the brand's night mood; text on it uses ink-on-night. */
    night: '#1A1324',
    /** Primary text on surface-100/200/300. */
    ink: '#1E1729',
    /** Secondary text, timestamps, captions on surface-100/200/300. */
    inkMuted: '#5E5470',
    /** Text on night slabs and the in-call overlay. */
    inkOnNight: '#F2EDF8',
    /** Murmur violet. Primary buttons, active tab, links, focus ring, my chat bubble. */
    brand: '#6B3FD4',
    /** Text and icons on brand fills. */
    onBrand: '#FFFFFF',
    /** Selected rows, chips, soft highlight behind brand text. */
    brandSoft: '#EBE3FD',
    /** Decorative fields, ripple motif, illustration backdrops. Never behind body text in dark. */
    lavender: '#D9CCFF',
    /** Warm dusk pink for AI character presence: speaking indicator, character name tag, hearts. Small areas only. */
    accent: '#B8366E',
    /** Warm card tint in solo mode (daily mood note, song card) to keep the light tone from feeling cold. */
    cream: '#FFF6EA',
    /** Hairlines, card and input borders. */
    border: '#E2DAF0',
    /** Control borders that must meet 3:1 (checkbox, toggle off). */
    borderStrong: '#8C7FA3',
    /** Connected, verified, upload approved. */
    success: '#1F7A52',
    /** Weak network, upload under review. */
    warning: '#9A5B00',
    /** Text and icons on destructive action fills. */
    onDanger: '#FFFFFF',
    /** Report, block, end call, destructive confirm. */
    danger: '#B42E2E',
  },
  dark: {
    /** Page background. Light = 솔로 모드·온보딩 기본, Dark = 랜덤 매칭·방 통화·밤 장면. */
    surface100: '#0E0B14',
    /** Section background, list grouping, input fields. */
    surface200: '#17121F',
    /** Cards, sheets, chat bubbles from the other side. */
    surface300: '#211A2C',
    /** Deep slab for call screens and the brand's night mood; text on it uses ink-on-night. */
    night: '#2A2040',
    /** Primary text on surface-100/200/300. */
    ink: '#F2EDF8',
    /** Secondary text, timestamps, captions on surface-100/200/300. */
    inkMuted: '#B3A8C4',
    /** Text on night slabs and the in-call overlay. */
    inkOnNight: '#F2EDF8',
    /** Murmur violet. Primary buttons, active tab, links, focus ring, my chat bubble. */
    brand: '#A98BFF',
    /** Text and icons on brand fills. */
    onBrand: '#140E1F',
    /** Selected rows, chips, soft highlight behind brand text. */
    brandSoft: '#2C2142',
    /** Decorative fields, ripple motif, illustration backdrops. Never behind body text in dark. */
    lavender: '#5B45A0',
    /** Warm dusk pink for AI character presence: speaking indicator, character name tag, hearts. Small areas only. */
    accent: '#FF8FBE',
    /** Warm card tint in solo mode (daily mood note, song card) to keep the light tone from feeling cold. */
    cream: '#2A2219',
    /** Hairlines, card and input borders. */
    border: '#2F2640',
    /** Control borders that must meet 3:1 (checkbox, toggle off). */
    borderStrong: '#7A6D90',
    /** Connected, verified, upload approved. */
    success: '#5FD39B',
    /** Weak network, upload under review. */
    warning: '#FFB547',
    /** Text and icons on destructive action fills. */
    onDanger: '#140E1F',
    /** Report, block, end call, destructive confirm. */
    danger: '#FF7B7B',
  },
} as const;
export type ColorToken = keyof (typeof color)['light'];
export type ColorPalette = Record<ColorToken, string>;

/** 간격(px). 4px 단위. 키는 space-N의 N. */
export const space = {
  /** Icon-to-label gap, tight chip padding. */
  1: 4,
  /** Gap between related items, bubble stack gap. */
  2: 8,
  /** Chat bubble padding, list row vertical padding. */
  3: 12,
  /** Screen side gutter, card padding. */
  4: 16,
  /** Gap between sections inside a screen. */
  6: 24,
  /** Top of screen to first heading, sheet padding. */
  8: 32,
  /** Call screen controls offset from bottom edge. */
  12: 48,
} as const;
export type SpaceToken = keyof typeof space;

/** 모서리 반지름(px). */
export const radius = {
  /** Chips, small tags, inputs. */
  sm: 8,
  /** Cards, chat bubbles, sheets' inner blocks. */
  md: 16,
  /** Bottom sheets, character cards, call video frame. */
  lg: 24,
  /** Primary buttons, call controls, avatars' status ring. */
  pill: 999,
} as const;
export type RadiusToken = keyof typeof radius;

export const layout = {
  contentMaxWidth: 560,
  compactWidth: 360,
  wideWidth: 600,
  soloAvatarHeight: 192,
  soloAvatarMaxHeightRatio: 0.3,
  compactAvatarSize: 48,
  inputMinHeight: 52,
  inputMaxLines: 5,
  bubbleMaxWidthRatio: 0.86,
  largeFontScale: 1.5,
} as const;

/** 글꼴 패밀리. RN fontFamily에는 첫 패밀리 이름을, 웹에는 CSS 스택을 쓴다. */
export const fontFamily = {
  display: 'Noto Serif KR',
  sans: 'Noto Sans KR',
} as const;
export const fontFamilyCss = {
  display: "\"Noto Serif KR\", \"Times New Roman\", serif",
  sans: "\"Noto Sans KR\", system-ui, -apple-system, sans-serif",
} as const;
export type FontFamilyToken = keyof typeof fontFamily;

/** 텍스트 스타일. RN Text style에 그대로 펼친다. fontWeight는 RN 규격대로 문자열. */
export const text = {
  displayLg: { fontFamily: fontFamily.display, fontSize: 40, lineHeight: 48, fontWeight: '600' },
  displayMd: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 36, fontWeight: '600' },
  displayCompact: { fontFamily: fontFamily.display, fontSize: 32, lineHeight: 42, fontWeight: '600' },
  characterName: { fontFamily: fontFamily.display, fontSize: 24, lineHeight: 32, fontWeight: '600' },
  title: { fontFamily: fontFamily.sans, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  heading: { fontFamily: fontFamily.sans, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontFamily: fontFamily.sans, fontSize: 16, lineHeight: 26, fontWeight: '400' },
  bodySm: { fontFamily: fontFamily.sans, fontSize: 14, lineHeight: 22, fontWeight: '400' },
  label: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontFamily: fontFamily.sans, fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;
export type TextStyleToken = keyof typeof text;

/** 컴포넌트 치수. DESIGN_SYSTEM.md §7. */
export const size = {
  /** 주·보조 버튼 높이 */
  buttonHeight: 52,
  /** 통화 컨트롤 지름 */
  callControl: 56,
  /** 최소 터치 영역 */
  touchTarget: 48,
  /** 통화 오버레이 글자 크기 배율 상한 */
  callOverlayMaxFontScale: 1.3,
} as const;

/** 모션. 말하는 중 물결 링 주기(ms). "동작 줄이기"에서는 정지. */
export const motion = {
  speakingRippleMs: 1200,
  speakingRippleCount: 3,
} as const;
