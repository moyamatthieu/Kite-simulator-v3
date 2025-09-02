/**
 * ThemeManager.ts - Gestionnaire de thèmes pour l'interface utilisateur
 * Système de thèmes inspiré de VS Code avec support dark/light
 */

export interface ThemeColors {
    // Couleurs de base
    primary: string;
    secondary: string;
    accent: string;
    
    // Arrière-plans
    background: {
        primary: string;
        secondary: string;
        tertiary: string;
        hover: string;
        active: string;
        disabled: string;
    };
    
    // Texte
    text: {
        primary: string;
        secondary: string;
        tertiary: string;
        disabled: string;
        link: string;
        linkHover: string;
    };
    
    // Bordures
    border: {
        primary: string;
        secondary: string;
        focus: string;
        hover: string;
    };
    
    // États
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Panels spécifiques
    panel: {
        titleBar: string;
        titleText: string;
        content: string;
        border: string;
        shadow: string;
    };
    
    // Console spécifique
    console: {
        background: string;
        prompt: string;
        log: string;
        info: string;
        warn: string;
        error: string;
        debug: string;
    };
}

export interface Theme {
    id: string;
    name: string;
    type: 'dark' | 'light';
    colors: ThemeColors;
    fonts: {
        primary: string;
        secondary: string;
        monospace: string;
    };
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    borderRadius: {
        sm: string;
        md: string;
        lg: string;
    };
    shadows: {
        sm: string;
        md: string;
        lg: string;
    };
}

/**
 * Gestionnaire de thèmes global
 */
export class ThemeManager {
    private static instance: ThemeManager;
    private currentTheme: Theme;
    private themes: Map<string, Theme> = new Map();
    private styleElement: HTMLStyleElement;
    private onThemeChangeCallbacks: ((theme: Theme) => void)[] = [];

    private constructor() {
        this.styleElement = this.createStyleElement();
        this.setupBuiltinThemes();
        this.currentTheme = this.themes.get('dark')!;
        this.applyTheme();
        this.setupSystemPreferenceListener();
    }

    static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }

    /**
     * Crée l'élément style pour les CSS variables
     */
    private createStyleElement(): HTMLStyleElement {
        const style = document.createElement('style');
        style.id = 'theme-variables';
        document.head.appendChild(style);
        return style;
    }

    /**
     * Configure les thèmes intégrés
     */
    private setupBuiltinThemes(): void {
        // Thème sombre (défaut)
        this.addTheme({
            id: 'dark',
            name: 'Dark',
            type: 'dark',
            colors: {
                primary: '#4a90e2',
                secondary: '#5ba0f2',
                accent: '#ff6b6b',
                background: {
                    primary: '#1e1e1e',
                    secondary: '#252526',
                    tertiary: '#2d2d30',
                    hover: '#2a2d2e',
                    active: '#37373d',
                    disabled: '#3c3c3c'
                },
                text: {
                    primary: '#cccccc',
                    secondary: '#9d9d9d',
                    tertiary: '#6a6a6a',
                    disabled: '#555555',
                    link: '#4a90e2',
                    linkHover: '#5ba0f2'
                },
                border: {
                    primary: '#3e3e42',
                    secondary: '#4e4e52',
                    focus: '#4a90e2',
                    hover: '#5e5e62'
                },
                success: '#4caf50',
                warning: '#ff9800',
                error: '#f44336',
                info: '#2196f3',
                panel: {
                    titleBar: '#2d2d30',
                    titleText: '#cccccc',
                    content: '#252526',
                    border: '#3e3e42',
                    shadow: 'rgba(0, 0, 0, 0.5)'
                },
                console: {
                    background: '#1e1e1e',
                    prompt: '#4a90e2',
                    log: '#cccccc',
                    info: '#17a2b8',
                    warn: '#ffc107',
                    error: '#dc3545',
                    debug: '#6f42c1'
                }
            },
            fonts: {
                primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                secondary: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                monospace: '"Cascadia Code", "Fira Code", "JetBrains Mono", "Source Code Pro", "Courier New", monospace'
            },
            spacing: {
                xs: '2px',
                sm: '4px',
                md: '8px',
                lg: '16px',
                xl: '24px'
            },
            borderRadius: {
                sm: '2px',
                md: '4px',
                lg: '8px'
            },
            shadows: {
                sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
                md: '0 4px 6px rgba(0, 0, 0, 0.4)',
                lg: '0 10px 25px rgba(0, 0, 0, 0.5)'
            }
        });

        // Thème clair
        this.addTheme({
            id: 'light',
            name: 'Light',
            type: 'light',
            colors: {
                primary: '#0078d4',
                secondary: '#106ebe',
                accent: '#e74c3c',
                background: {
                    primary: '#f8f8f8',
                    secondary: '#ffffff',
                    tertiary: '#f0f0f0',
                    hover: '#e8e8e8',
                    active: '#d0d0d0',
                    disabled: '#f5f5f5'
                },
                text: {
                    primary: '#333333',
                    secondary: '#666666',
                    tertiary: '#999999',
                    disabled: '#cccccc',
                    link: '#0078d4',
                    linkHover: '#106ebe'
                },
                border: {
                    primary: '#d0d0d0',
                    secondary: '#e0e0e0',
                    focus: '#0078d4',
                    hover: '#c0c0c0'
                },
                success: '#28a745',
                warning: '#ffc107',
                error: '#dc3545',
                info: '#17a2b8',
                panel: {
                    titleBar: '#f0f0f0',
                    titleText: '#333333',
                    content: '#ffffff',
                    border: '#d0d0d0',
                    shadow: 'rgba(0, 0, 0, 0.1)'
                },
                console: {
                    background: '#f8f8f8',
                    prompt: '#0078d4',
                    log: '#333333',
                    info: '#17a2b8',
                    warn: '#856404',
                    error: '#721c24',
                    debug: '#6f42c1'
                }
            },
            fonts: {
                primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                secondary: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                monospace: '"Cascadia Code", "Fira Code", "JetBrains Mono", "Source Code Pro", "Courier New", monospace'
            },
            spacing: {
                xs: '2px',
                sm: '4px',
                md: '8px',
                lg: '16px',
                xl: '24px'
            },
            borderRadius: {
                sm: '2px',
                md: '4px',
                lg: '8px'
            },
            shadows: {
                sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
                md: '0 2px 4px rgba(0, 0, 0, 0.15)',
                lg: '0 8px 16px rgba(0, 0, 0, 0.15)'
            }
        });

        // Thème high contrast
        this.addTheme({
            id: 'high-contrast',
            name: 'High Contrast',
            type: 'dark',
            colors: {
                primary: '#00ff00',
                secondary: '#00cccc',
                accent: '#ffff00',
                background: {
                    primary: '#000000',
                    secondary: '#000000',
                    tertiary: '#111111',
                    hover: '#333333',
                    active: '#555555',
                    disabled: '#222222'
                },
                text: {
                    primary: '#ffffff',
                    secondary: '#ffffff',
                    tertiary: '#cccccc',
                    disabled: '#666666',
                    link: '#00ff00',
                    linkHover: '#00cccc'
                },
                border: {
                    primary: '#ffffff',
                    secondary: '#cccccc',
                    focus: '#00ff00',
                    hover: '#ffffff'
                },
                success: '#00ff00',
                warning: '#ffff00',
                error: '#ff0000',
                info: '#00ccff',
                panel: {
                    titleBar: '#000000',
                    titleText: '#ffffff',
                    content: '#000000',
                    border: '#ffffff',
                    shadow: 'rgba(255, 255, 255, 0.3)'
                },
                console: {
                    background: '#000000',
                    prompt: '#00ff00',
                    log: '#ffffff',
                    info: '#00ccff',
                    warn: '#ffff00',
                    error: '#ff0000',
                    debug: '#ff00ff'
                }
            },
            fonts: {
                primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                secondary: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                monospace: '"Cascadia Code", "Fira Code", "JetBrains Mono", "Source Code Pro", "Courier New", monospace'
            },
            spacing: {
                xs: '2px',
                sm: '4px',
                md: '8px',
                lg: '16px',
                xl: '24px'
            },
            borderRadius: {
                sm: '2px',
                md: '4px',
                lg: '8px'
            },
            shadows: {
                sm: '0 1px 3px rgba(255, 255, 255, 0.3)',
                md: '0 4px 6px rgba(255, 255, 255, 0.4)',
                lg: '0 10px 25px rgba(255, 255, 255, 0.5)'
            }
        });
    }

    /**
     * Configure l'écoute des préférences système
     */
    private setupSystemPreferenceListener(): void {
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Appliquer le thème initial basé sur les préférences système
            const savedTheme = localStorage.getItem('kite-simulator-theme');
            if (!savedTheme) {
                this.setTheme(darkModeQuery.matches ? 'dark' : 'light');
            } else {
                this.setTheme(savedTheme);
            }
            
            // Écouter les changements de préférences
            darkModeQuery.addEventListener('change', (e) => {
                if (!localStorage.getItem('kite-simulator-theme')) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * Applique le thème actuel
     */
    private applyTheme(): void {
        const theme = this.currentTheme;
        
        // Générer les CSS variables
        const cssVars = this.generateCSSVariables(theme);
        this.styleElement.textContent = cssVars;
        
        // Appliquer l'attribut data-theme
        document.documentElement.setAttribute('data-theme', theme.type);
        document.documentElement.setAttribute('data-theme-id', theme.id);
        
        // Sauvegarder la préférence
        localStorage.setItem('kite-simulator-theme', theme.id);
        
        // Notifier les callbacks
        this.onThemeChangeCallbacks.forEach(callback => callback(theme));
    }

    /**
     * Génère les CSS variables pour un thème
     */
    private generateCSSVariables(theme: Theme): string {
        const { colors, fonts, spacing, borderRadius, shadows } = theme;
        
        return `
            :root {
                /* Couleurs principales */
                --color-primary: ${colors.primary};
                --color-secondary: ${colors.secondary};
                --color-accent: ${colors.accent};
                
                /* Arrière-plans */
                --bg-primary: ${colors.background.primary};
                --bg-secondary: ${colors.background.secondary};
                --bg-tertiary: ${colors.background.tertiary};
                --bg-hover: ${colors.background.hover};
                --bg-active: ${colors.background.active};
                --bg-disabled: ${colors.background.disabled};
                
                /* Texte */
                --text-primary: ${colors.text.primary};
                --text-secondary: ${colors.text.secondary};
                --text-tertiary: ${colors.text.tertiary};
                --text-disabled: ${colors.text.disabled};
                --text-link: ${colors.text.link};
                --text-link-hover: ${colors.text.linkHover};
                
                /* Bordures */
                --border-primary: ${colors.border.primary};
                --border-secondary: ${colors.border.secondary};
                --border-focus: ${colors.border.focus};
                --border-hover: ${colors.border.hover};
                
                /* États */
                --color-success: ${colors.success};
                --color-warning: ${colors.warning};
                --color-error: ${colors.error};
                --color-info: ${colors.info};
                
                /* Panels */
                --panel-title-bar: ${colors.panel.titleBar};
                --panel-title-text: ${colors.panel.titleText};
                --panel-content: ${colors.panel.content};
                --panel-border: ${colors.panel.border};
                --panel-shadow: ${colors.panel.shadow};
                
                /* Console */
                --console-bg: ${colors.console.background};
                --console-prompt: ${colors.console.prompt};
                --console-log: ${colors.console.log};
                --console-info: ${colors.console.info};
                --console-warn: ${colors.console.warn};
                --console-error: ${colors.console.error};
                --console-debug: ${colors.console.debug};
                
                /* Polices */
                --font-primary: ${fonts.primary};
                --font-secondary: ${fonts.secondary};
                --font-monospace: ${fonts.monospace};
                
                /* Espacement */
                --spacing-xs: ${spacing.xs};
                --spacing-sm: ${spacing.sm};
                --spacing-md: ${spacing.md};
                --spacing-lg: ${spacing.lg};
                --spacing-xl: ${spacing.xl};
                
                /* Bordures arrondies */
                --radius-sm: ${borderRadius.sm};
                --radius-md: ${borderRadius.md};
                --radius-lg: ${borderRadius.lg};
                
                /* Ombres */
                --shadow-sm: ${shadows.sm};
                --shadow-md: ${shadows.md};
                --shadow-lg: ${shadows.lg};
            }
        `;
    }

    // === MÉTHODES PUBLIQUES ===

    /**
     * Ajoute un thème personnalisé
     */
    addTheme(theme: Theme): void {
        this.themes.set(theme.id, theme);
    }

    /**
     * Supprime un thème
     */
    removeTheme(themeId: string): void {
        if (themeId === this.currentTheme.id) {
            console.warn('Impossible de supprimer le thème actuel');
            return;
        }
        this.themes.delete(themeId);
    }

    /**
     * Définit le thème actuel
     */
    setTheme(themeId: string): void {
        const theme = this.themes.get(themeId);
        if (!theme) {
            console.warn(`Thème "${themeId}" introuvable`);
            return;
        }
        
        this.currentTheme = theme;
        this.applyTheme();
    }

    /**
     * Bascule entre dark et light
     */
    toggleTheme(): void {
        const isCurrentlyDark = this.currentTheme.type === 'dark';
        const targetType = isCurrentlyDark ? 'light' : 'dark';
        
        // Trouver le premier thème du type opposé
        const targetTheme = Array.from(this.themes.values())
            .find(theme => theme.type === targetType);
        
        if (targetTheme) {
            this.setTheme(targetTheme.id);
        }
    }

    /**
     * Obtient le thème actuel
     */
    getCurrentTheme(): Theme {
        return this.currentTheme;
    }

    /**
     * Obtient tous les thèmes disponibles
     */
    getAvailableThemes(): Theme[] {
        return Array.from(this.themes.values());
    }

    /**
     * Obtient un thème par ID
     */
    getTheme(themeId: string): Theme | undefined {
        return this.themes.get(themeId);
    }

    /**
     * Crée un thème personnalisé basé sur un thème existant
     */
    createCustomTheme(baseThemeId: string, customizations: Partial<ThemeColors>, name: string, id: string): Theme {
        const baseTheme = this.themes.get(baseThemeId);
        if (!baseTheme) {
            throw new Error(`Thème de base "${baseThemeId}" introuvable`);
        }

        const customTheme: Theme = {
            ...baseTheme,
            id,
            name,
            colors: this.deepMerge(baseTheme.colors, customizations)
        };

        this.addTheme(customTheme);
        return customTheme;
    }

    /**
     * Écoute les changements de thème
     */
    onThemeChange(callback: (theme: Theme) => void): void {
        this.onThemeChangeCallbacks.push(callback);
    }

    /**
     * Supprime un callback de changement de thème
     */
    offThemeChange(callback: (theme: Theme) => void): void {
        const index = this.onThemeChangeCallbacks.indexOf(callback);
        if (index !== -1) {
            this.onThemeChangeCallbacks.splice(index, 1);
        }
    }

    /**
     * Exporte la configuration du thème actuel
     */
    exportCurrentTheme(): string {
        return JSON.stringify(this.currentTheme, null, 2);
    }

    /**
     * Importe un thème depuis JSON
     */
    importTheme(themeJson: string): Theme {
        try {
            const theme = JSON.parse(themeJson) as Theme;
            this.addTheme(theme);
            return theme;
        } catch (error) {
            throw new Error('Format JSON invalide pour le thème');
        }
    }

    // === MÉTHODES UTILITAIRES ===

    /**
     * Fusion profonde d'objets
     */
    private deepMerge(target: any, source: any): any {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    /**
     * Obtient une couleur CSS variable
     */
    static getCSSVariable(name: string): string {
        return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
    }

    /**
     * Définit une couleur CSS variable
     */
    static setCSSVariable(name: string, value: string): void {
        document.documentElement.style.setProperty(`--${name}`, value);
    }
}

// Export de l'instance singleton
export const themeManager = ThemeManager.getInstance();
