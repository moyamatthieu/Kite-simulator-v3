/**
 * ConsolePanel.ts - Panel de console pour debugging et logs
 * Interface de débogage inspirée des DevTools
 */

import { Panel, PanelConfig } from '../core/Panel.js';

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
    id: string;
    timestamp: Date;
    level: LogLevel;
    message: string;
    source?: string;
    count?: number;
    stack?: string;
    collapsed?: boolean;
}

export interface ConsoleCommand {
    name: string;
    description: string;
    execute: (args: string[]) => string | Promise<string>;
    autocomplete?: (args: string[]) => string[];
}

/**
 * Panel de console pour debugging et exécution de commandes
 */
export class ConsolePanel extends Panel {
    private logs: LogEntry[] = [];
    private filteredLogs: LogEntry[] = [];
    private commandHistory: string[] = [];
    private historyIndex: number = -1;
    private commands: Map<string, ConsoleCommand> = new Map();
    private maxLogs: number = 1000;

    private logContainer!: HTMLElement;
    private commandInput!: HTMLInputElement;
    
    // Filtres
    private levelFilters: Set<LogLevel> = new Set(['log', 'info', 'warn', 'error', 'debug']);
    private searchFilter: string = '';
    private sourceFilter: string = '';
    
    // État
    private autoScroll: boolean = true;
    private showTimestamps: boolean = true;
    private groupSimilar: boolean = true;
    
    // Callbacks
    private onCommandCallbacks: ((command: string, args: string[]) => void)[] = [];

    constructor() {
        const config: PanelConfig = {
            id: 'console',
            title: 'Console',
            position: 'bottom',
            size: {
                width: 800,
                height: 200,
                minWidth: 300,
                minHeight: 100
            },
            resizable: true,
            collapsible: true,
            closable: false,
            draggable: true,
            visible: true
        };

        super(config);
        this.setupBuiltinCommands();
        this.interceptConsoleMethods();
    }

    public render(): void {
        this.contentElement.innerHTML = `
            <div class="console-panel">
                <div class="console-panel__toolbar">
                    <button class="console-panel__btn console-panel__btn--clear" id="clear-console" title="Effacer (Ctrl+K)">
                        <span class="icon">🗑️</span>
                        <span>Clear</span>
                    </button>
                    
                    <div class="console-panel__filters">
                        <button class="console-panel__filter console-panel__filter--log" data-level="log" title="Logs">
                            <span class="icon">📝</span>
                            <span class="count">0</span>
                        </button>
                        <button class="console-panel__filter console-panel__filter--info" data-level="info" title="Info">
                            <span class="icon">ℹ️</span>
                            <span class="count">0</span>
                        </button>
                        <button class="console-panel__filter console-panel__filter--warn" data-level="warn" title="Warnings">
                            <span class="icon">⚠️</span>
                            <span class="count">0</span>
                        </button>
                        <button class="console-panel__filter console-panel__filter--error" data-level="error" title="Errors">
                            <span class="icon">❌</span>
                            <span class="count">0</span>
                        </button>
                        <button class="console-panel__filter console-panel__filter--debug" data-level="debug" title="Debug">
                            <span class="icon">🐛</span>
                            <span class="count">0</span>
                        </button>
                    </div>
                    
                    <div class="spacer"></div>
                    
                    <input type="text" class="console-panel__search" placeholder="Filtrer les logs..." id="search-logs">
                    
                    <div class="console-panel__settings">
                        <button class="console-panel__btn console-panel__btn--setting" id="auto-scroll" title="Défilement automatique">
                            <span class="icon">📄</span>
                        </button>
                        <button class="console-panel__btn console-panel__btn--setting" id="show-timestamps" title="Afficher timestamps">
                            <span class="icon">🕐</span>
                        </button>
                        <button class="console-panel__btn console-panel__btn--setting" id="group-similar" title="Grouper similaires">
                            <span class="icon">📚</span>
                        </button>
                    </div>
                </div>
                
                <div class="console-panel__content">
                    <div class="console-panel__logs" id="logs-container">
                        <div class="console-panel__welcome">
                            <span class="icon">🚀</span>
                            <p>Console Kite Simulator v3</p>
                            <small>Tapez <code>help</code> pour voir les commandes disponibles</small>
                        </div>
                    </div>
                </div>
                
                <div class="console-panel__input">
                    <span class="console-panel__prompt">></span>
                    <input type="text" class="console-panel__command" placeholder="Entrez une commande JavaScript ou une commande personnalisée..." id="command-input" autocomplete="off">
                </div>
            </div>
        `;

        this.logContainer = this.contentElement.querySelector('#logs-container') as HTMLElement;
        this.commandInput = this.contentElement.querySelector('#command-input') as HTMLInputElement;
        
        this.setupConsoleEventListeners();
        this.updateFilterButtons();
    }

    private setupConsoleEventListeners(): void {
        // Bouton clear
        const clearBtn = this.contentElement.querySelector('#clear-console');
        clearBtn?.addEventListener('click', () => this.clear());

        // Filtres de niveau
        this.contentElement.addEventListener('click', (e) => {
            const filterBtn = (e.target as HTMLElement).closest('.console-panel__filter') as HTMLElement;
            if (filterBtn) {
                const level = filterBtn.dataset.level as LogLevel;
                this.toggleLevelFilter(level);
            }
        });

        // Recherche
        const searchInput = this.contentElement.querySelector('#search-logs') as HTMLInputElement;
        searchInput?.addEventListener('input', (e) => {
            this.searchFilter = (e.target as HTMLInputElement).value;
            this.applyFilters();
        });

        // Paramètres
        const autoScrollBtn = this.contentElement.querySelector('#auto-scroll');
        const timestampsBtn = this.contentElement.querySelector('#show-timestamps');
        const groupSimilarBtn = this.contentElement.querySelector('#group-similar');

        autoScrollBtn?.addEventListener('click', () => this.toggleAutoScroll());
        timestampsBtn?.addEventListener('click', () => this.toggleTimestamps());
        groupSimilarBtn?.addEventListener('click', () => this.toggleGroupSimilar());

        // Input de commande
        this.commandInput.addEventListener('keydown', (e) => this.handleCommandInput(e));

        // Raccourcis clavier
        this.contentElement.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.clear();
            }
        });
    }

    /**
     * Ajoute un log
     */
    addLog(level: LogLevel, message: string, source?: string, stack?: string): void {
        const existingLog = this.groupSimilar ? 
            this.logs.find(log => log.message === message && log.level === level) : null;

        if (existingLog) {
            existingLog.count = (existingLog.count || 1) + 1;
            existingLog.timestamp = new Date();
        } else {
            const logEntry: LogEntry = {
                id: this.generateLogId(),
                timestamp: new Date(),
                level,
                message,
                source,
                stack,
                count: 1
            };

            this.logs.push(logEntry);
            
            // Limiter le nombre de logs
            if (this.logs.length > this.maxLogs) {
                this.logs.shift();
            }
        }

        this.applyFilters();
        this.updateFilterButtons();
        this.renderLogs();
    }

    /**
     * Applique les filtres
     */
    private applyFilters(): void {
        this.filteredLogs = this.logs.filter(log => {
            // Filtre par niveau
            if (!this.levelFilters.has(log.level)) return false;
            
            // Filtre par recherche
            if (this.searchFilter) {
                const searchLower = this.searchFilter.toLowerCase();
                if (!log.message.toLowerCase().includes(searchLower) &&
                    !log.source?.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }
            
            // Filtre par source
            if (this.sourceFilter && log.source !== this.sourceFilter) return false;
            
            return true;
        });
    }

    /**
     * Rend les logs dans le DOM
     */
    private renderLogs(): void {
        if (this.filteredLogs.length === 0) {
            this.logContainer.innerHTML = `
                <div class="console-panel__empty">
                    <span class="icon">📝</span>
                    <p>Aucun log à afficher</p>
                    <small>Les logs apparaîtront ici selon vos filtres</small>
                </div>
            `;
            return;
        }

        const html = this.filteredLogs.map(log => this.renderLogEntry(log)).join('');
        this.logContainer.innerHTML = html;
        
        // Auto-scroll si activé
        if (this.autoScroll) {
            this.scrollToBottom();
        }
        
        this.attachLogEventListeners();
    }

    /**
     * Rend une entrée de log
     */
    private renderLogEntry(log: LogEntry): string {
        const timestamp = this.showTimestamps ? 
            `<span class="log-entry__timestamp">${this.formatTimestamp(log.timestamp)}</span>` : '';
        
        const source = log.source ? 
            `<span class="log-entry__source">${log.source}</span>` : '';
        
        const count = (log.count && log.count > 1) ? 
            `<span class="log-entry__count">${log.count}</span>` : '';
        
        const expandBtn = log.stack ? 
            `<button class="log-entry__expand" data-log-id="${log.id}">▶</button>` : '';
        
        const levelIcon = this.getLevelIcon(log.level);
        
        return `
            <div class="log-entry log-entry--${log.level}" data-log-id="${log.id}">
                <div class="log-entry__main">
                    ${expandBtn}
                    <span class="log-entry__icon">${levelIcon}</span>
                    ${timestamp}
                    <span class="log-entry__message">${this.escapeHtml(log.message)}</span>
                    ${count}
                    ${source}
                </div>
                ${log.stack ? `<div class="log-entry__stack" style="display: none;">${this.escapeHtml(log.stack)}</div>` : ''}
            </div>
        `;
    }

    /**
     * Attache les événements aux logs
     */
    private attachLogEventListeners(): void {
        this.logContainer.addEventListener('click', (e) => {
            const expandBtn = (e.target as HTMLElement).closest('.log-entry__expand') as HTMLElement;
            if (expandBtn) {
                const logId = expandBtn.dataset.logId!;
                this.toggleLogExpansion(logId);
            }
        });
    }

    /**
     * Bascule l'expansion d'un log
     */
    private toggleLogExpansion(logId: string): void {
        const logEntry = this.logContainer.querySelector(`[data-log-id="${logId}"]`) as HTMLElement;
        const expandBtn = logEntry.querySelector('.log-entry__expand') as HTMLElement;
        const stackElement = logEntry.querySelector('.log-entry__stack') as HTMLElement;
        
        if (stackElement) {
            const isExpanded = stackElement.style.display === 'block';
            stackElement.style.display = isExpanded ? 'none' : 'block';
            expandBtn.textContent = isExpanded ? '▶' : '▼';
        }
    }

    /**
     * Gère l'input de commande
     */
    private handleCommandInput(e: KeyboardEvent): void {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                this.executeCommand();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.navigateHistory(-1);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                this.navigateHistory(1);
                break;
                
            case 'Tab':
                e.preventDefault();
                this.attemptAutocomplete();
                break;
        }
    }

    /**
     * Exécute une commande
     */
    private async executeCommand(): Promise<void> {
        const command = this.commandInput.value.trim();
        if (!command) return;

        // Ajouter à l'historique
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        
        // Afficher la commande dans les logs
        this.addLog('log', `> ${command}`, 'console');
        
        // Nettoyer l'input
        this.commandInput.value = '';
        
        try {
            const result = await this.processCommand(command);
            if (result) {
                this.addLog('info', result, 'console');
            }
        } catch (error) {
            this.addLog('error', `Erreur: ${error}`, 'console');
        }
        
        // Notifier les callbacks
        const [cmd, ...args] = command.split(' ');
        this.onCommandCallbacks.forEach(callback => callback(cmd, args));
    }

    /**
     * Traite une commande
     */
    private async processCommand(command: string): Promise<string> {
        const [cmd, ...args] = command.split(' ');
        
        // Commandes personnalisées
        if (this.commands.has(cmd)) {
            const commandObj = this.commands.get(cmd)!;
            return await commandObj.execute(args);
        }
        
        // JavaScript
        try {
            // Évaluation sécurisée dans un contexte limité
            const result = this.evaluateJavaScript(command);
            return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        } catch (error) {
            throw `Commande inconnue: ${cmd}. Tapez 'help' pour voir les commandes disponibles.`;
        }
    }

    /**
     * Évalue du JavaScript de manière sécurisée
     */
    private evaluateJavaScript(code: string): any {
        // Contexte sécurisé avec accès limité
        const context = {
            console: this,
            Math,
            Date,
            JSON,
            parseInt,
            parseFloat,
            isNaN,
            isFinite
        };
        
        // Créer une fonction avec le contexte
        const func = new Function(...Object.keys(context), `return (${code})`);
        return func(...Object.values(context));
    }

    /**
     * Navigation dans l'historique
     */
    private navigateHistory(direction: number): void {
        this.historyIndex += direction;
        this.historyIndex = Math.max(-1, Math.min(this.commandHistory.length - 1, this.historyIndex));
        
        if (this.historyIndex >= 0) {
            this.commandInput.value = this.commandHistory[this.historyIndex];
        } else {
            this.commandInput.value = '';
        }
    }

    /**
     * Tentative d'autocomplétion
     */
    private attemptAutocomplete(): void {
        const value = this.commandInput.value;
        const [cmd] = value.split(' ');
        
        const matches = Array.from(this.commands.keys()).filter(name => name.startsWith(cmd));
        
        if (matches.length === 1) {
            this.commandInput.value = value.replace(cmd, matches[0]);
        } else if (matches.length > 1) {
            this.addLog('info', `Suggestions: ${matches.join(', ')}`, 'autocomplete');
        }
    }

    /**
     * Configure les commandes intégrées
     */
    private setupBuiltinCommands(): void {
        this.addCommand({
            name: 'help',
            description: 'Affiche la liste des commandes disponibles',
            execute: () => {
                const commands = Array.from(this.commands.values())
                    .map(cmd => `${cmd.name}: ${cmd.description}`)
                    .join('\n');
                return `Commandes disponibles:\n${commands}`;
            }
        });

        this.addCommand({
            name: 'clear',
            description: 'Efface la console',
            execute: () => {
                this.clear();
                return '';
            }
        });

        this.addCommand({
            name: 'history',
            description: 'Affiche l\'historique des commandes',
            execute: () => {
                return this.commandHistory.length > 0 ? 
                    this.commandHistory.join('\n') : 
                    'Aucune commande dans l\'historique';
            }
        });

        this.addCommand({
            name: 'export',
            description: 'Exporte les logs au format JSON',
            execute: () => {
                const data = JSON.stringify(this.logs, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `console-logs-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                return 'Logs exportés';
            }
        });
    }

    /**
     * Intercepte les méthodes de console natives
     */
    private interceptConsoleMethods(): void {
        const originalConsole = { ...console };
        
        console.log = (...args) => {
            originalConsole.log(...args);
            this.addLog('log', args.join(' '), 'app');
        };
        
        console.info = (...args) => {
            originalConsole.info(...args);
            this.addLog('info', args.join(' '), 'app');
        };
        
        console.warn = (...args) => {
            originalConsole.warn(...args);
            this.addLog('warn', args.join(' '), 'app');
        };
        
        console.error = (...args) => {
            originalConsole.error(...args);
            const error = args.find(arg => arg instanceof Error);
            this.addLog('error', args.join(' '), 'app', error?.stack);
        };
        
        console.debug = (...args) => {
            originalConsole.debug(...args);
            this.addLog('debug', args.join(' '), 'app');
        };
    }

    // === MÉTHODES PUBLIQUES ===

    addCommand(command: ConsoleCommand): void {
        this.commands.set(command.name, command);
    }

    removeCommand(name: string): void {
        this.commands.delete(name);
    }

    clear(): void {
        this.logs = [];
        this.filteredLogs = [];
        this.renderLogs();
        this.updateFilterButtons();
    }

    toggleLevelFilter(level: LogLevel): void {
        if (this.levelFilters.has(level)) {
            this.levelFilters.delete(level);
        } else {
            this.levelFilters.add(level);
        }
        this.applyFilters();
        this.renderLogs();
        this.updateFilterButtons();
    }

    toggleAutoScroll(): void {
        this.autoScroll = !this.autoScroll;
        this.updateSettingButtons();
    }

    toggleTimestamps(): void {
        this.showTimestamps = !this.showTimestamps;
        this.updateSettingButtons();
        this.renderLogs();
    }

    toggleGroupSimilar(): void {
        this.groupSimilar = !this.groupSimilar;
        this.updateSettingButtons();
    }

    onCommand(callback: (command: string, args: string[]) => void): void {
        this.onCommandCallbacks.push(callback);
    }

    // === MÉTHODES UTILITAIRES ===

    private generateLogId(): string {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private formatTimestamp(date: Date): string {
        return date.toLocaleTimeString('fr-FR', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit'
        });
    }

    private getLevelIcon(level: LogLevel): string {
        const icons = {
            log: '📝',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
            debug: '🐛'
        };
        return icons[level] || '📝';
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private scrollToBottom(): void {
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    private updateFilterButtons(): void {
        const counts = { log: 0, info: 0, warn: 0, error: 0, debug: 0 };
        
        this.logs.forEach(log => {
            counts[log.level] += log.count || 1;
        });
        
        Object.entries(counts).forEach(([level, count]) => {
            const btn = this.contentElement.querySelector(`[data-level="${level}"]`) as HTMLElement;
            if (btn) {
                const countSpan = btn.querySelector('.count') as HTMLElement;
                countSpan.textContent = count.toString();
                btn.classList.toggle('console-panel__filter--active', this.levelFilters.has(level as LogLevel));
            }
        });
    }

    private updateSettingButtons(): void {
        const autoScrollBtn = this.contentElement.querySelector('#auto-scroll') as HTMLElement;
        const timestampsBtn = this.contentElement.querySelector('#show-timestamps') as HTMLElement;
        const groupSimilarBtn = this.contentElement.querySelector('#group-similar') as HTMLElement;
        
        autoScrollBtn?.classList.toggle('console-panel__btn--active', this.autoScroll);
        timestampsBtn?.classList.toggle('console-panel__btn--active', this.showTimestamps);
        groupSimilarBtn?.classList.toggle('console-panel__btn--active', this.groupSimilar);
    }
}
