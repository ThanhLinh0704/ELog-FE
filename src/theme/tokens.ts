import type { ThemeConfig } from 'antd';

/**
 * Central design tokens for the ELog operational UI — "enterprise navy fleet
 * / logistics operations" language: dark navy sidebar, blue primary accent,
 * white header, light gray content surface. Values below are the single
 * source of truth; change here cascades through ConfigProvider + every
 * `palette.xxx` usage.
 */
export const palette = {
  // Sidebar (dark navy brand surface — distinct from the light content area)
  navySider: '#172b4d',
  navyProfile: '#0f1d33',
  navyBorder: 'rgba(255, 255, 255, 0.10)',

  // Sidebar-only text/state tokens (the dark sidebar needs its own
  // contrast-safe colors; the shared text.* tokens below stay tuned for
  // the light header/content surfaces and must not be reused here)
  sidebarText: '#e5eaf2',
  sidebarTextMuted: 'rgba(255, 255, 255, 0.55)',
  sidebarTextActive: '#ffffff',
  sidebarActiveBg: '#2f5f9f',
  sidebarHoverBg: 'rgba(255, 255, 255, 0.08)',
  sidebarAccent: '#4f7fc4',

  // Brand / primary
  navy: '#172b4d',
  primary: '#4f7fc4',
  primaryDark: '#3f6faf',
  primaryActive: '#345f9c',
  primaryBg: '#eef5fc',

  // Secondary accents (used sparingly for module/stat highlights)
  teal: '#4f7fc4',
  tealBg: '#eef5fc',
  gold: '#e9a23b',
  goldBg: '#fff7e8',
  violet: '#64748b',
  violetBg: '#f1f3f8',

  // Chart series 2 — a real violet distinct from `violet` above (which is actually
  // slate/neutral) and from every status hue (success/warning/danger), so a second
  // trend-line series never impersonates "good"/"bad". Validated: paired with
  // `primary` it clears CVD ΔE 16.0 / normal-vision ΔE 18.0 (targets 8 / 15).
  chartSeries2: '#4a3aa7',

  success: '#2e9d74',
  successBg: '#eef7f3',
  danger: '#e85d68',
  dangerBg: '#fdecee',

  // Status semantics (spec §9 — status badge system)
  statusSuccess: '#2e9d74',
  statusSuccessBg: '#eef7f3',
  statusWarning: '#e9a23b',
  statusWarningBg: '#fff7e8',
  statusDanger: '#e85d68',
  statusDangerBg: '#fdecee',
  statusInfo: '#4f7fc4',
  statusInfoBg: '#eef5fc',
  statusNeutral: '#64748b',
  statusNeutralBg: '#f1f3f8',

  // Neutrals
  textDark: '#172b4d',
  textBody: '#374151',
  textMuted: '#6b7280',
  textFaint: '#98a2b3',
  border: '#e4e8ee',
  borderSoft: '#eef1f5',
  bgLayout: '#f3f5f7',
  bgCard: '#ffffff',

  // Shadows (flat colors only — no gradients/neon per current color spec)
  cardShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
  cardShadowHover: '0 8px 20px rgba(15, 23, 42, 0.08)',
  bannerGradient: '#172b4d',
} as const;

const fontFamily = "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif";

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: palette.primary,
    colorPrimaryHover: palette.primaryDark,
    colorPrimaryActive: palette.primaryActive,
    colorInfo: palette.statusInfo,
    colorSuccess: palette.success,
    colorWarning: palette.gold,
    colorError: palette.danger,
    colorTextBase: palette.textDark,
    colorTextSecondary: palette.textMuted,
    colorBorder: palette.border,
    colorBorderSecondary: palette.borderSoft,
    colorBgLayout: palette.bgLayout,
    borderRadius: 8,
    borderRadiusLG: 12,
    fontFamily,
    fontSize: 14,
  },
  components: {
    Layout: {
      siderBg: palette.navySider,
      bodyBg: palette.bgLayout,
      headerBg: '#ffffff',
    },
    Menu: {
      itemColor: palette.textBody,
      itemHoverColor: palette.primary,
      itemHoverBg: palette.bgLayout,
      itemSelectedBg: palette.primaryBg,
      itemSelectedColor: palette.primary,
      subMenuItemBg: palette.bgCard,
      groupTitleColor: palette.textFaint,
      itemBorderRadius: 8,
      itemMarginInline: 12,
      // Dark variant powers the navy sidebar (Sider/Menu theme="dark")
      darkItemBg: palette.navySider,
      darkSubMenuItemBg: palette.navySider,
      darkPopupBg: palette.navySider,
      darkItemColor: palette.sidebarText,
      darkItemHoverColor: palette.sidebarTextActive,
      darkItemHoverBg: palette.sidebarHoverBg,
      darkItemSelectedColor: palette.sidebarTextActive,
      darkItemSelectedBg: palette.sidebarActiveBg,
      darkGroupTitleColor: palette.sidebarTextMuted,
    },
    Card: {
      borderRadiusLG: 12,
      boxShadowTertiary: palette.cardShadow,
      colorBorderSecondary: palette.borderSoft,
      headerFontSize: 15,
      headerFontSizeSM: 14,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 36,
      fontWeight: 500,
      primaryShadow: 'none',
    },
    Statistic: {
      titleFontSize: 12,
      contentFontSize: 26,
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: palette.textBody,
      borderColor: palette.borderSoft,
      rowHoverBg: '#f8fafc',
      headerBorderRadius: 10,
    },
    Tag: {
      borderRadiusSM: 6,
      fontSizeSM: 12,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 36,
    },
    DatePicker: {
      borderRadius: 8,
      controlHeight: 36,
    },
    Breadcrumb: {
      fontSize: 13,
    },
  },
};
