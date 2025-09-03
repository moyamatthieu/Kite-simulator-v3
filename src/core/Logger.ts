/**
 * Logger.ts - Système de logging centralisé
 * Remplace tous les console.log pour une gestion cohérente des logs
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    context?: string;
    data?: any;
}

/**
 * Logger centralisé avec niveaux de log et contexte
 */
export class Logger {
    private static instance: Logger;
    private currentLevel: LogLevel = LogLevel.INFO;
    private logs: LogEntry[] = [];
    private maxLogs: number = 1000;

    private constructor() { }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setLevel(level: LogLevel): void {
        this.currentLevel = level;
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.currentLevel;
    }

    private log(level: LogLevel, message: string, context?: string, data?: any): void {
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date(),
            context,
            data
        };

        this.logs.push(entry);

        // Limiter la taille du buffer
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Format du message console
        const levelStr = LogLevel[level].padEnd(5);
        const contextStr = context ? `[${context}]` : '';
        const prefix = `${levelStr} ${contextStr}`;

        switch (level) {
            case LogLevel.DEBUG:
                console.debug(`${prefix} ${message}`, data || '');
                break;
            case LogLevel.INFO:
                console.info(`${prefix} ${message}`, data || '');
                break;
            case LogLevel.WARN:
                console.warn(`${prefix} ${message}`, data || '');
                break;
            case LogLevel.ERROR:
                console.error(`${prefix} ${message}`, data || '');
                break;
        }
    }

    debug(message: string, context?: string, data?: any): void {
        this.log(LogLevel.DEBUG, message, context, data);
    }

    info(message: string, context?: string, data?: any): void {
        this.log(LogLevel.INFO, message, context, data);
    }

    warn(message: string, context?: string, data?: any): void {
        this.log(LogLevel.WARN, message, context, data);
    }

    error(message: string, context?: string, data?: any): void {
        this.log(LogLevel.ERROR, message, context, data);
    }

    getLogs(level?: LogLevel): LogEntry[] {
        if (level !== undefined) {
            return this.logs.filter(log => log.level >= level);
        }
        return [...this.logs];
    }

    clearLogs(): void {
        this.logs = [];
    }
}

// Instance globale pour usage facile
export const logger = Logger.getInstance();