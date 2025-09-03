/**
 * Types d'erreurs pour le système de gestion d'erreurs robuste
 * Classification hiérarchique des erreurs selon leur domaine
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  PHYSICS = 'physics',
  RENDERING = '3d_rendering',
  FACTORY = 'factory',
  LIFECYCLE = 'lifecycle',
  CONFIGURATION = 'configuration',
  SIMULATION = 'simulation',
  NETWORK = 'network',
  FILE_SYSTEM = 'file_system',
  MEMORY = 'memory',
  USER_INPUT = 'user_input',
  THIRD_PARTY = 'third_party'
}

export interface IErrorContext {
  readonly timestamp: number;
  readonly component: string;
  readonly method?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly metadata?: { [key: string]: any };
  readonly stackTrace?: string;
}

export interface IErrorData {
  readonly code: string;
  readonly message: string;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly context: IErrorContext;
  readonly originalError?: Error;
  readonly recovery?: IRecoveryAction;
}

export interface IRecoveryAction {
  readonly type: 'retry' | 'fallback' | 'reset' | 'ignore' | 'notify' | 'custom';
  readonly description: string;
  readonly action?: () => Promise<void> | void;
  readonly maxAttempts?: number;
  readonly delay?: number;
}

/**
 * Classe de base pour toutes les erreurs métier
 */
export abstract class BaseError extends Error {
  public readonly errorData: IErrorData;
  public readonly id: string;
  public recoveryAttempts: number = 0;

  constructor(data: Omit<IErrorData, 'context'>, context?: Partial<IErrorContext>) {
    super(data.message);
    this.name = this.constructor.name;
    
    // Génération d'un ID unique pour l'erreur
    this.id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Construction du contexte complet
    const fullContext: IErrorContext = {
      timestamp: Date.now(),
      component: 'unknown',
      stackTrace: this.stack,
      ...context
    };

    this.errorData = {
      ...data,
      context: fullContext
    };

    // Préserver la stack trace
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Sérialise l'erreur pour logging/transmission
   */
  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      errorData: this.errorData,
      recoveryAttempts: this.recoveryAttempts
    };
  }

  /**
   * Représentation lisible de l'erreur
   */
  toString(): string {
    return `${this.name}[${this.errorData.code}]: ${this.message} (${this.errorData.severity})`;
  }
}

// === ERREURS SPÉCIALISÉES ===

/**
 * Erreur de validation de données
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    code: string = 'VALIDATION_ERROR',
    context?: Partial<IErrorContext>,
    recovery?: IRecoveryAction
  ) {
    super({
      code,
      message,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.VALIDATION,
      recovery
    }, context);
  }
}

/**
 * Erreur de physique/simulation
 */
export class PhysicsError extends BaseError {
  constructor(
    message: string,
    code: string = 'PHYSICS_ERROR',
    context?: Partial<IErrorContext>,
    recovery?: IRecoveryAction
  ) {
    super({
      code,
      message,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.PHYSICS,
      recovery
    }, context);
  }
}

/**
 * Erreur de rendu 3D
 */
export class RenderingError extends BaseError {
  constructor(
    message: string,
    code: string = 'RENDERING_ERROR',
    context?: Partial<IErrorContext>,
    recovery?: IRecoveryAction
  ) {
    super({
      code,
      message,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.RENDERING,
      recovery
    }, context);
  }
}

/**
 * Erreur de factory/création d'objets
 */
export class FactoryError extends BaseError {
  constructor(
    message: string,
    code: string = 'FACTORY_ERROR',
    context?: Partial<IErrorContext>,
    recovery?: IRecoveryAction
  ) {
    super({
      code,
      message,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.FACTORY,
      recovery
    }, context);
  }
}

/**
 * Erreur de cycle de vie d'objets
 */
export class LifecycleError extends BaseError {
  constructor(
    message: string,
    code: string = 'LIFECYCLE_ERROR',
    context?: Partial<IErrorContext>,
    recovery?: IRecoveryAction
  ) {
    super({
      code,
      message,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.LIFECYCLE,
      recovery
    }, context);
  }
}

/**
 * Erreur de configuration
 */
export class ConfigurationError extends BaseError {
  constructor(
    message: string,
    code: string = 'CONFIG_ERROR',
    context?: Partial<IErrorContext>,
    recovery?: IRecoveryAction
  ) {
    super({
      code,
      message,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.CONFIGURATION,
      recovery
    }, context);
  }
}

/**
 * Erreur de simulation
 */
export class SimulationError extends BaseError {
  constructor(
    message: string,
    code: string = 'SIMULATION_ERROR',
    context?: Partial<IErrorContext>,
    recovery?: IRecoveryAction
  ) {
    super({
      code,
      message,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.SIMULATION,
      recovery
    }, context);
  }
}

/**
 * Erreur de ressources/mémoire
 */
export class ResourceError extends BaseError {
  constructor(
    message: string,
    code: string = 'RESOURCE_ERROR',
    context?: Partial<IErrorContext>,
    recovery?: IRecoveryAction
  ) {
    super({
      code,
      message,
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.MEMORY,
      recovery
    }, context);
  }
}

/**
 * Erreur de dépendance externe
 */
export class ThirdPartyError extends BaseError {
  constructor(
    message: string,
    code: string = 'THIRD_PARTY_ERROR',
    context?: Partial<IErrorContext>,
    recovery?: IRecoveryAction,
    originalError?: Error
  ) {
    super({
      code,
      message,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.THIRD_PARTY,
      recovery,
      originalError
    }, context);
  }
}