/**
 * Index des panels UI
 * Exportations centralisées pour tous les composants UI
 */

// Core UI Components
export { Panel, type PanelConfig } from './core/Panel.js';
export { PanelManager, type LayoutConfig } from './core/PanelManager.js';
export { ThemeManager, themeManager, type Theme, type ThemeColors } from './core/ThemeManager.js';

// UI Panels
export { SceneTreePanel, type SceneTreeNode } from './panels/SceneTreePanel.js';
export { PropertiesPanel, type PropertyDescriptor, type PropertyCategory } from './panels/PropertiesPanel.js';
export { ConsolePanel, type LogLevel, type LogEntry, type ConsoleCommand } from './panels/ConsolePanel.js';

// Types utilitaires
export type PanelPosition = 'left' | 'right' | 'top' | 'bottom';
export type PanelSize = {
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
};
