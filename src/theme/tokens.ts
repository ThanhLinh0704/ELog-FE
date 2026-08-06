import type { ThemeConfig } from 'antd';

/**
 * Central design tokens for the ELog admin UI.
 * Palette is derived from the reference dashboard: deep navy sidebar,
 * clean blue primary accent, soft neutral page background, teal/gold
 * secondary accents for stat highlights.
 */
export const palette = {
  // Sidebar / dark surfaces
  navySider: '#16233b',
  navyProfile: '#121c30',
  navyBorder: 'rgba(255, 255, 255, 0.06)',

  // Brand / primary
  primary: '#1677ff',
  primaryDark: '#0958d9',
  primaryBg: '#e6f4ff',

  // Secondary accents
  teal: '#0d9488',
  tealBg: '#e6fbf8',
  gold: '#d48806',
  goldBg: '#fffbe6',
  violet: '#722ed1',
  violetBg: '#f9f0ff',
  success: '#52c41a',
  successBg: '#f6ffed',
  danger: '#ff4d4f',
  dangerBg: '#fff2f0',

  // Neutrals
  textDark: '#0f172a',
  textBody: '#334155',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  border: '#e5e9f2',
  borderSoft: '#eef1f6',
  bgLayout: '#f4f6fb',
  bgCard: '#ffffff',

  // Shadows
  cardShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
  cardShadowHover: '0 12px 24px rgba(15, 23, 42, 0.10)',
  bannerGradient: 'linear-gradient(135deg, #16233b 0%, #0d1727 100%)',
} as const;

const fontFamily = "system-ui, 'Segoe UI', Roboto, sans-serif";

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: palette.primary,
    colorInfo: palette.primary,
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
      darkItemBg: palette.navySider,
      darkItemColor: '#a6b0cf',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.05)',
      darkItemSelectedBg: palette.primary,
      darkItemSelectedColor: '#ffffff',
      darkSubMenuItemBg: palette.navySider,
      darkGroupTitleColor: '#64748b',
      itemBorderRadius: 8,
      itemMarginInline: 12,
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
