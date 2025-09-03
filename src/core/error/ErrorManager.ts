/**
 * Gestionnaire centralisé d'erreurs - respect du Single Responsibility Principle
 * Gère la capture, traitement, recovery et logging des erreurs
 */
import { 
  BaseError, 
  ErrorSeverity, 
  ErrorCategory, 
  IErrorData, 
  IRecoveryAction,
  ValidationError,
  PhysicsError,
  RenderingError,
  ConfigurationError
} from './ErrorTypes';
import { logger } from '@core/Logger';

export interface IErrorHandler {
  canHandle(error: Error): boolean;
  handle(error: BaseError): Promise<boolean>;
  priority: number; // Plus élevé = priorité plus haute
}

export interface IErrorReporter {
  report(error: BaseError): Promise<void>;
  shouldReport(error: BaseError): boolean;
}

export interface IErrorManagerConfig {
  enableRecovery: boolean;
  maxRecoveryAttempts: number;
  enableReporting: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  reportingThreshold: ErrorSeverity;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

/**
 * Gestionnaire principal d'erreurs de l'application
 */
export class ErrorManager {
  private static instance: ErrorManager | null = null;
  
  private handlers: IErrorHandler[] = [];
  private reporters: IErrorReporter[] = [];
  private errorHistory: BaseError[] = [];
  private errorCounts = new Map<string, number>();
  private circuitBreakers = new Map<string, { isOpen: boolean; lastFailure: number; failureCount: number }>();
  
  private readonly config: IErrorManagerConfig;
  private readonly maxHistorySize = 1000;

  constructor(config: Partial<IErrorManagerConfig> = {}) {
    this.config = {
      enableRecovery: true,
      maxRecoveryAttempts: 3,
      enableReporting: true,
      logLevel: 'error',
      reportingThreshold: ErrorSeverity.MEDIUM,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000, // 30 secondes
      ...config
    };

    this.initializeDefaultHandlers();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Instance singleton
   */
  public static getInstance(config?: Partial<IErrorManagerConfig>): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager(config);
    }
    return ErrorManager.instance;
  }

  /**
   * Point d'entrée principal pour traiter une erreur
   */
  public async handleError(error: Error, context?: { component?: string; method?: string; [key: string]: any }): Promise<boolean> {
    try {
      // Conversion en BaseError si nécessaire
      const baseError = this.normalizeError(error, context);
      
      // Ajouter à l'historique
      this.addToHistory(baseError);
      
      // Incrémenter les compteurs
      this.incrementErrorCount(baseError.errorData.code);
      
      // Vérifier le circuit breaker
      if (this.isCircuitBreakerOpen(baseError.errorData.code)) {
        logger.warn(`Circuit breaker ouvert pour ${baseError.errorData.code}, erreur ignorée`, 'ErrorManager');
        return false;
      }

      // Logger l'erreur
      this.logError(baseError);

      // Tenter la recovery si configurée
      let recovered = false;
      if (this.config.enableRecovery && baseError.errorData.recovery) {
        recovered = await this.attemptRecovery(baseError);
      }

      // Reporter l'erreur si nécessaire
      if (this.config.enableReporting && this.shouldReport(baseError)) {
        await this.reportError(baseError);
      }

      // Mettre à jour le circuit breaker
      this.updateCircuitBreaker(baseError.errorData.code, !recovered);

      return recovered;

    } catch (handlingError) {
      logger.error(`Erreur lors du traitement d'erreur: ${handlingError}`, 'ErrorManager');
      return false;
    }
  }

  /**
   * Convertit une erreur générique en BaseError
   */
  private normalizeError(error: Error, context?: any): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    // Tentative de classification automatique
    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return new ValidationError(error.message, 'AUTO_VALIDATION_ERROR', {
        component: context?.component || 'unknown',
        method: context?.method,
        metadata: context
      });
    }

    if (errorMessage.includes('physics') || errorMessage.includes('simulation')) {
      return new PhysicsError(error.message, 'AUTO_PHYSICS_ERROR', {
        component: context?.component || 'unknown',
        method: context?.method,
        metadata: context
      });
    }

    if (errorMessage.includes('render') || errorMessage.includes('three') || errorMessage.includes('webgl')) {
      return new RenderingError(error.message, 'AUTO_RENDERING_ERROR', {
        component: context?.component || 'unknown',
        method: context?.method,
        metadata: context
      });
    }

    // Erreur générique
    return new ConfigurationError(error.message, 'GENERIC_ERROR', {
      component: context?.component || 'unknown',
      method: context?.method,
      metadata: context
    });
  }

  /**
   * Tente la récupération automatique
   */
  private async attemptRecovery(error: BaseError): Promise<boolean> {
    const recovery = error.errorData.recovery;
    if (!recovery) return false;

    const maxAttempts = recovery.maxAttempts || this.config.maxRecoveryAttempts;
    if (error.recoveryAttempts >= maxAttempts) {
      logger.warn(`Nombre maximum de tentatives de récupération atteint pour ${error.errorData.code}`, 'ErrorManager');
      return false;
    }

    error.recoveryAttempts++;

    try {
      logger.info(`Tentative de récupération ${error.recoveryAttempts}/${maxAttempts} pour ${error.errorData.code}`, 'ErrorManager');

      // Délai avant retry si configuré
      if (recovery.delay && recovery.delay > 0) {
        await this.delay(recovery.delay);
      }

      // Exécuter l'action de récupération
      if (recovery.action) {
        await recovery.action();
        logger.info(`Récupération réussie pour ${error.errorData.code}`, 'ErrorManager');
        return true;
      }

      // Actions de récupération par défaut selon le type
      const defaultRecovered = await this.executeDefaultRecovery(error, recovery.type);
      if (defaultRecovered) {
        logger.info(`Récupération par défaut réussie pour ${error.errorData.code}`, 'ErrorManager');
      }

      return defaultRecovered;

    } catch (recoveryError) {
      logger.error(`Erreur durant la récupération pour ${error.errorData.code}: ${recoveryError}`, 'ErrorManager');
      return false;
    }
  }

  /**
   * Actions de récupération par défaut
   */
  private async executeDefaultRecovery(error: BaseError, type: IRecoveryAction['type']): Promise<boolean> {
    switch (type) {
      case 'retry':
        // La logique de retry est gérée par le code appelant
        return true;
        
      case 'reset':
        // Émettre un signal de reset global
        logger.info('Exécution du reset par défaut', 'ErrorManager');
        return true;
        
      case 'fallback':
        // Utiliser une configuration par défaut
        logger.info('Utilisation de la configuration par défaut', 'ErrorManager');
        return true;
        
      case 'ignore':
        // Marquer comme résolu
        return true;
        
      case 'notify':
        // Notifier l'utilisateur
        logger.warn(`Notification utilisateur: ${error.message}`, 'ErrorManager');
        return true;
        
      default:
        return false;
    }
  }

  /**
   * Ajoute un gestionnaire d'erreur personnalisé
   */
  public addHandler(handler: IErrorHandler): void {
    this.handlers.push(handler);
    // Trier par priorité décroissante
    this.handlers.sort((a, b) => b.priority - a.priority);
    logger.debug(`Handler d'erreur ajouté avec priorité ${handler.priority}`, 'ErrorManager');
  }

  /**
   * Ajoute un reporter d'erreur
   */
  public addReporter(reporter: IErrorReporter): void {
    this.reporters.push(reporter);
    logger.debug('Reporter d\'erreur ajouté', 'ErrorManager');
  }

  /**
   * Initialise les handlers par défaut
   */
  private initializeDefaultHandlers(): void {
    // Handler de validation
    this.addHandler({
      canHandle: (error) => error instanceof ValidationError,
      handle: async (error) => {
        logger.warn(`Erreur de validation: ${error.message}`, 'ValidationHandler');
        return true; // Les erreurs de validation sont généralement non-fatales
      },
      priority: 100
    });

    // Handler de physique
    this.addHandler({
      canHandle: (error) => error instanceof PhysicsError,
      handle: async (error) => {
        logger.error(`Erreur de physique: ${error.message}`, 'PhysicsHandler');
        // Les erreurs de physique peuvent nécessiter un reset de l'état
        return false;
      },
      priority: 200
    });

    // Handler de rendu
    this.addHandler({
      canHandle: (error) => error instanceof RenderingError,
      handle: async (error) => {
        logger.error(`Erreur de rendu: ${error.message}`, 'RenderingHandler');
        // Tenter de récupérer le contexte WebGL
        return this.attemptWebGLRecovery();
      },
      priority: 150
    });
  }

  /**
   * Tentative de récupération WebGL
   */
  private async attemptWebGLRecovery(): Promise<boolean> {
    try {
      // Vérifier si WebGL est encore disponible
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        logger.error('WebGL non disponible pour la récupération', 'ErrorManager');
        return false;
      }

      logger.info('Contexte WebGL récupéré avec succès', 'ErrorManager');
      return true;

    } catch (error) {
      logger.error(`Échec de récupération WebGL: ${error}`, 'ErrorManager');
      return false;
    }
  }

  /**
   * Gère les erreurs globales non catchées
   */
  private setupGlobalErrorHandlers(): void {
    // Erreurs JavaScript non catchées
    window.addEventListener('error', (event) => {
      this.handleError(new Error(event.message), {
        component: 'GlobalErrorHandler',
        method: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Promesses rejetées non catchées
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.handleError(error, {
        component: 'GlobalErrorHandler',
        method: 'unhandledrejection'
      });
    });

    logger.debug('Gestionnaires d\'erreurs globaux installés', 'ErrorManager');
  }

  // === Méthodes utilitaires ===

  private addToHistory(error: BaseError): void {
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  private incrementErrorCount(code: string): void {
    this.errorCounts.set(code, (this.errorCounts.get(code) || 0) + 1);
  }

  private logError(error: BaseError): void {
    const logLevel = this.getSeverityLogLevel(error.errorData.severity);
    const message = `[${error.errorData.category}] ${error.toString()}`;
    
    switch (logLevel) {
      case 'debug':
        logger.debug(message, 'ErrorManager');
        break;
      case 'info':
        logger.info(message, 'ErrorManager');
        break;
      case 'warn':
        logger.warn(message, 'ErrorManager');
        break;
      default:
        logger.error(message, 'ErrorManager');
    }
  }

  private getSeverityLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW: return 'debug';
      case ErrorSeverity.MEDIUM: return 'warn';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.CRITICAL: return 'error';
      default: return 'error';
    }
  }

  private shouldReport(error: BaseError): boolean {
    const severityOrder = [ErrorSeverity.LOW, ErrorSeverity.MEDIUM, ErrorSeverity.HIGH, ErrorSeverity.CRITICAL];
    const errorSeverityIndex = severityOrder.indexOf(error.errorData.severity);
    const thresholdIndex = severityOrder.indexOf(this.config.reportingThreshold);
    
    return errorSeverityIndex >= thresholdIndex;
  }

  private async reportError(error: BaseError): Promise<void> {
    const reportPromises = this.reporters
      .filter(reporter => reporter.shouldReport(error))
      .map(reporter => reporter.report(error));

    await Promise.allSettled(reportPromises);
  }

  private isCircuitBreakerOpen(errorCode: string): boolean {
    if (!this.config.enableCircuitBreaker) return false;
    
    const breaker = this.circuitBreakers.get(errorCode);
    if (!breaker) return false;
    
    if (!breaker.isOpen) return false;
    
    // Vérifier si le timeout est écoulé
    if (Date.now() - breaker.lastFailure > this.config.circuitBreakerTimeout) {
      breaker.isOpen = false;
      breaker.failureCount = 0;
      logger.info(`Circuit breaker fermé pour ${errorCode} après timeout`, 'ErrorManager');
    }
    
    return breaker.isOpen;
  }

  private updateCircuitBreaker(errorCode: string, failed: boolean): void {
    if (!this.config.enableCircuitBreaker) return;
    
    let breaker = this.circuitBreakers.get(errorCode);
    if (!breaker) {
      breaker = { isOpen: false, lastFailure: 0, failureCount: 0 };
      this.circuitBreakers.set(errorCode, breaker);
    }
    
    if (failed) {
      breaker.failureCount++;
      breaker.lastFailure = Date.now();
      
      if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
        breaker.isOpen = true;
        logger.warn(`Circuit breaker ouvert pour ${errorCode} après ${breaker.failureCount} échecs`, 'ErrorManager');
      }
    } else {
      breaker.failureCount = 0;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // === API publique pour diagnostics ===

  public getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: { [category: string]: number };
    errorsBySeverity: { [severity: string]: number };
    recentErrors: BaseError[];
    circuitBreakers: { [code: string]: any };
  } {
    const errorsByCategory: { [category: string]: number } = {};
    const errorsBySeverity: { [severity: string]: number } = {};

    this.errorHistory.forEach(error => {
      const category = error.errorData.category;
      const severity = error.errorData.severity;
      
      errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;
      errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: this.errorHistory.slice(-10),
      circuitBreakers: Object.fromEntries(this.circuitBreakers)
    };
  }

  public clearHistory(): void {
    this.errorHistory.length = 0;
    this.errorCounts.clear();
    logger.info('Historique d\'erreurs effacé', 'ErrorManager');
  }
}