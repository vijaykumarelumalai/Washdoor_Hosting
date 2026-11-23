import { createTheme, CssVarsProvider } from '@mui/material/styles';

// Light mode color tokens
const lightPalette = {
  primary: {
    main: '#2563eb',
    light: '#60a5fa',
    dark: '#1e40af',
  },
  secondary: {
    main: '#64748b',
    light: '#94a3b8',
    dark: '#475569',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  info: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#1d4ed8',
  },

  background: {
    paper: '#ffffff',
    default: '#f8fafc',
  },
  surface: {
    card: '#ffffff',
    elevated: '#f8fafc',
  },
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    disabled: '#94a3b8',
    inverse: '#ffffff',
  },
  divider: 'rgba(147, 197, 253, 0.2)',

  // MUI elevation shadows
  shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
};

// Dark mode color tokens
const darkPalette = {
  primary: {
    main: '#2563eb',
    light: '#3b82f6',
    dark: '#1e40af',
  },
  secondary: {
    main: '#94a3b8',
    light: '#64748b',
    dark: '#1e293b',
  },
  error: {
    main: '#f87171',
    light: '#fca5a5',
    dark: '#dc2626',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  info: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#1d4ed8',
  },

  background: {
    paper: '#0f172a',
    default: '#0e101f',
  },
  surface: {
    card: '#1e293b',
    elevated: '#1e293b',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    disabled: '#64748b',
    inverse: '#1e293b',
  },
  divider: 'rgba(147, 197, 253, 0.2)',

  // MUI elevation shadows
  shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
};

export const theme = createTheme({
  palette: {
    mode: 'light' as const,
    ...lightPalette,
    // Dark mode will be toggled via system preference or manual class
    // We'll set up the dark palette but keep light as default
    // The actual dark mode can be controlled via class strategy
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineLineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        contained: {
          borderRadius: 8,
        },
        outlined: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
        },
        stickyHeader: {
          position: 'sticky',
          backgroundColor: '#f8fafc',
          zIndex: 100,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          width: 260,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 6,
        },
      },
    },
  },
});

// Export a CssVarsProvider wrapper for consistent theming
export const ThemeProvider = CssVarsProvider;

export default theme;