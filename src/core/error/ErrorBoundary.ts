/**
 * Error Boundary pour React-like error handling dans l'application
 * Capture et gère les erreurs au niveau des composants
 */
import { ErrorManager } from './ErrorManager';
import { BaseError, ValidationError, RenderingError } from './ErrorTypes';
import { logger } from '@core/Logger';

export interface IErrorBoundaryState {
  hasError: boolean;
  error?: BaseError;
  fallbackContent?: any;
  retryCount: number;
}

export interface IErrorBoundaryConfig {
  name: string;
  maxRetries: number;
  enableFallback: boolean;
  fallbackFactory?: () => any;
  onError?: (error: BaseError) => void;
  onRetry?: (retryCount: number) => void;
  onMaxRetriesReached?: (error: BaseError) => void;
}

/**
 * Décorateur pour créer des Error Boundaries
 */
export function WithErrorBoundary(config: Partial<IErrorBoundaryConfig> = {}) {
  return function<T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      private errorBoundary: ErrorBoundary;

      constructor(...args: any[]) {
        super(...args);
        this.errorBoundary = new ErrorBoundary({
          name: config.name || constructor.name,
          ...config
        });
      }

      // Wrappe les méthodes pour capturer les erreurs
      protected wrapMethod<R>(methodName: string, method: (...args: any[]) => R): (...args: any[]) => R | null {
        return (...args: any[]): R | null => {
          return this.errorBoundary.execute(() => method.apply(this, args));
        };
      }
    };
  };
}

/**
 * Error Boundary pour encapsuler et gérer les erreurs
 */
export class ErrorBoundary {
  private state: IErrorBoundaryState = {
    hasError: false,
    retryCount: 0
  };

  private readonly config: IErrorBoundaryConfig;
  private readonly errorManager: ErrorManager;

  constructor(config: Partial<IErrorBoundaryConfig> = {}) {
    this.config = {
      name: 'ErrorBoundary',
      maxRetries: 3,
      enableFallback: true,
      ...config
    };

    this.errorManager = ErrorManager.getInstance();
    logger.debug(`ErrorBoundary créé: ${this.config.name}`, 'ErrorBoundary');
  }

  /**
   * Exécute une fonction dans le contexte de l'error boundary
   */
  public execute<T>(fn: () => T): T | null {
    if (this.state.hasError && this.state.retryCount >= this.config.maxRetries) {
      logger.warn(`Max retries atteint pour ${this.config.name}`, 'ErrorBoundary');
      return this.getFallbackContent();
    }

    try {
      const result = fn();
      
      // Reset de l'état si l'exécution réussit après une erreur
      if (this.state.hasError) {
        this.resetError();
      }
      
      return result;

    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Exécute une fonction asynchrone dans le contexte de l'error boundary
   */
  public async executeAsync<T>(fn: () => Promise<T>): Promise<T | null> {
    if (this.state.hasError && this.state.retryCount >= this.config.maxRetries) {
      logger.warn(`Max retries atteint pour ${this.config.name}`, 'ErrorBoundary');
      return this.getFallbackContent();
    }

    try {
      const result = await fn();
      
      // Reset de l'état si l'exécution réussit après une erreur
      if (this.state.hasError) {
        this.resetError();
      }
      
      return result;

    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Gère une erreur capturée
   */
  private handleError(error: unknown): null {
    const baseError = this.normalizeError(error);
    
    this.state.hasError = true;
    this.state.error = baseError;
    this.state.retryCount++;

    // Callback personnalisé
    if (this.config.onError) {
      try {
        this.config.onError(baseError);
      } catch (callbackError) {
        logger.error(`Erreur dans callback onError: ${callbackError}`, 'ErrorBoundary');
      }
    }

    // Gérer via l'ErrorManager
    this.errorManager.handleError(baseError, {
      component: this.config.name,
      method: 'handleError',
      boundaryRetryCount: this.state.retryCount
    });

    // Vérifier si on peut retry
    if (this.state.retryCount < this.config.maxRetries) {
      logger.info(`Erreur capturée par ${this.config.name}, retry ${this.state.retryCount}/${this.config.maxRetries}`, 'ErrorBoundary');
      
      if (this.config.onRetry) {
        try {
          this.config.onRetry(this.state.retryCount);
        } catch (callbackError) {
          logger.error(`Erreur dans callback onRetry: ${callbackError}`, 'ErrorBoundary');
        }
      }
    } else {
      logger.error(`Max retries atteint pour ${this.config.name}`, 'ErrorBoundary');
      
      if (this.config.onMaxRetriesReached) {
        try {
          this.config.onMaxRetriesReached(baseError);
        } catch (callbackError) {
          logger.error(`Erreur dans callback onMaxRetriesReached: ${callbackError}`, 'ErrorBoundary');
        }
      }
    }

    return null;
  }

  /**
   * Convertit une erreur en BaseError
   */
  private normalizeError(error: unknown): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    if (error instanceof Error) {
      // Classification automatique basée sur le contexte de l'error boundary
      if (this.config.name.toLowerCase().includes('render')) {
        return new RenderingError(error.message, 'BOUNDARY_RENDERING_ERROR', {
          component: this.config.name,
          method: 'normalizeError'
        });
      }

      if (this.config.name.toLowerCase().includes('validation')) {
        return new ValidationError(error.message, 'BOUNDARY_VALIDATION_ERROR', {
          component: this.config.name,
          method: 'normalizeError'
        });
      }

      return new ValidationError(error.message, 'BOUNDARY_GENERIC_ERROR', {
        component: this.config.name,
        method: 'normalizeError'
      });
    }

    return new ValidationError(String(error), 'BOUNDARY_UNKNOWN_ERROR', {
      component: this.config.name,
      method: 'normalizeError'
    });
  }

  /**
   * Obtient le contenu de fallback
   */
  private getFallbackContent(): any {
    if (!this.config.enableFallback) {
      return null;
    }

    if (this.config.fallbackFactory) {
      try {
        return this.config.fallbackFactory();
      } catch (error) {
        logger.error(`Erreur dans fallbackFactory: ${error}`, 'ErrorBoundary');
      }
    }

    return this.state.fallbackContent || null;
  }

  /**
   * Réinitialise l'état d'erreur
   */
  public resetError(): void {
    this.state.hasError = false;
    this.state.error = undefined;
    this.state.retryCount = 0;
    logger.debug(`État d'erreur réinitialisé pour ${this.config.name}`, 'ErrorBoundary');
  }

  /**
   * Force un retry
   */
  public retry(): void {
    if (this.state.hasError && this.state.retryCount < this.config.maxRetries) {
      logger.info(`Retry forcé pour ${this.config.name}`, 'ErrorBoundary');
      this.resetError();
    }
  }

  /**
   * Obtient l'état actuel de l'error boundary
   */
  public getState(): IErrorBoundaryState {
    return { ...this.state };
  }

  /**
   * Définit un contenu de fallback personnalisé
   */
  public setFallbackContent(content: any): void {
    this.state.fallbackContent = content;
  }

  /**
   * Vérifie si l'error boundary a une erreur active
   */
  public hasError(): boolean {
    return this.state.hasError;
  }

  /**
   * Obtient l'erreur actuelle
   */
  public getCurrentError(): BaseError | undefined {
    return this.state.error;
  }
}

/**
 * Factory pour créer des error boundaries configurées
 */
export class ErrorBoundaryFactory {
  /**
   * Crée une error boundary pour les opérations de rendu
   */
  static createRenderingBoundary(name: string): ErrorBoundary {
    return new ErrorBoundary({
      name: `Rendering_${name}`,
      maxRetries: 2,
      enableFallback: true,
      fallbackFactory: () => {
        logger.warn(`Fallback de rendu activé pour ${name}`, 'ErrorBoundaryFactory');
        return null; // Ou un objet de rendu par défaut
      }
    });
  }

  /**
   * Crée une error boundary pour les opérations de physique
   */
  static createPhysicsBoundary(name: string): ErrorBoundary {
    return new ErrorBoundary({
      name: `Physics_${name}`,
      maxRetries: 1, // Les erreurs de physique sont critiques
      enableFallback: false,
      onMaxRetriesReached: (error) => {
        logger.error(`Erreur de physique critique dans ${name}: ${error.message}`, 'ErrorBoundaryFactory');
        // Possiblement reset de l'état physique
      }
    });
  }

  /**
   * Crée une error boundary pour les validations
   */
  static createValidationBoundary(name: string): ErrorBoundary {
    return new ErrorBoundary({
      name: `Validation_${name}`,
      maxRetries: 0, // Pas de retry pour les validations
      enableFallback: true,
      fallbackFactory: () => {
        logger.info(`Valeurs par défaut utilisées pour ${name}`, 'ErrorBoundaryFactory');
        return {}; // Objet de configuration par défaut
      }
    });
  }

  /**
   * Crée une error boundary pour les factories
   */
  static createFactoryBoundary(name: string): ErrorBoundary {
    return new ErrorBoundary({
      name: `Factory_${name}`,
      maxRetries: 2,
      enableFallback: true,
      fallbackFactory: () => {
        logger.warn(`Objet par défaut créé par ${name}`, 'ErrorBoundaryFactory');
        return null; // Ou un objet par défaut
      }
    });
  }
}