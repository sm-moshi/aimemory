export default {
  darkMode: ['class'],
  content: ['./src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        background: 'var(--vscode-editor-background)',
        foreground: 'var(--vscode-editor-foreground)',
        // VS Code-inspired color palette
        primary: 'var(--vscode-button-background)',
        'primary-foreground': 'var(--vscode-button-foreground)',
        'primary-hover': 'var(--vscode-button-hoverBackground)',
        secondary: 'var(--vscode-badge-background)',
        'secondary-foreground': 'var(--vscode-badge-foreground)',
        accent: 'var(--vscode-activityBarBadge-background)',
        'accent-foreground': 'var(--vscode-activityBarBadge-foreground)',
        border: 'var(--vscode-panel-border)',
        muted: 'var(--vscode-editorWidget-background)',
        'muted-foreground': 'var(--vscode-descriptionForeground)',
        link: 'var(--vscode-textLink-foreground)',
        'link-hover': 'var(--vscode-textLink-activeForeground)',
        error: 'var(--vscode-errorForeground)',
        warning: 'var(--vscode-editorWarning-foreground)',
        info: 'var(--vscode-editorInfo-foreground)',
        success: 'var(--vscode-terminal-ansiGreen)',
        focus: 'var(--vscode-focusBorder)',
        input: 'var(--vscode-input-background)',
        'input-foreground': 'var(--vscode-input-foreground)',
        'input-border': 'var(--vscode-input-border)',
        'dropdown-background': 'var(--vscode-dropdown-background)',
        'dropdown-foreground': 'var(--vscode-dropdown-foreground)',
      },
    },
  },
  plugins: [],
};
