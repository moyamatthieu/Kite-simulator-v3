/**
 * Point d'entrée unifié pour le système de gestion d'erreurs
 * Facilite l'import et l'utilisation du système d'erreurs
 */

// Imports nécessaires
import { IRecoveryAction } from './ErrorTypes';
import { ErrorManager } from './ErrorManager';
import { ErrorBoundaryFactory } from './ErrorBoundary';

// Types et classes d'erreurs
export {
  ErrorSeverity,
  ErrorCategory,
  BaseError,
  ValidationError,
  PhysicsError,
  RenderingError,
  FactoryError,
  LifecycleError,
  ConfigurationError,
  SimulationError,
  ResourceError,
  ThirdPartyError
} from './ErrorTypes';

export type {
  IErrorContext,
  IErrorData,
  IRecoveryAction
} from './ErrorTypes';

// Gestionnaire d'erreurs
export { ErrorManager } from './ErrorManager';
export type {
  IErrorHandler,
  IErrorReporter,
  IErrorManagerConfig
} from './ErrorManager';

// Error Boundaries
export {
  ErrorBoundary,
  ErrorBoundaryFactory,
  WithErrorBoundary
} from './ErrorBoundary';
export type {
  IErrorBoundaryState,
  IErrorBoundaryConfig
} from './ErrorBoundary';

// Utilitaires et raccourcis
export const errorManager = ErrorManager.getInstance();

/**
 * Fonction utilitaire pour gérer une erreur rapidement
 */
export async function handleError(error: Error, context?: any): Promise<boolean> {
  return ErrorManager.getInstance().handleError(error, context);
}

/**
 * Décorateur pour wrapper automatiquement les méthodes avec gestion d'erreur
 */
export function HandleErrors(context?: { component?: string }) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const method = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      try {
        const result = method.apply(this, args);
        // Si c'est une Promise, gérer les erreurs async
        if (result && typeof result.then === 'function') {
          return result.catch(async (error: unknown) => {
            const handled = await handleError(error as Error, {
              component: context?.component || target.constructor.name,
              method: propertyName,
              ...context
            });
            
            if (!handled) {
              throw error;
            }
            return null;
          });
        }
        return result;
      } catch (error: unknown) {
        // Gestion synchrone des erreurs
        handleError(error as Error, {
          component: context?.component || target.constructor.name,
          method: propertyName,
          ...context
        }).then(handled => {
          if (!handled) {
            throw error;
          }
        });
        return null;
      }
    };
    
    return descriptor;
  };
}

/**
 * Fonction utilitaire pour créer des actions de récupération
 */
export const RecoveryActions = {
  retry: (action: () => Promise<void> | void, maxAttempts: number = 3, delay: number = 1000): IRecoveryAction => ({
    type: 'retry',
    description: `Retry avec ${maxAttempts} tentatives`,
    action,
    maxAttempts,
    delay
  }),

  fallback: (fallbackAction: () => Promise<void> | void): IRecoveryAction => ({
    type: 'fallback',
    description: 'Utiliser un fallback',
    action: fallbackAction
  }),

  reset: (resetAction?: () => Promise<void> | void): IRecoveryAction => ({
    type: 'reset',
    description: 'Reset de l\'état',
    action: resetAction
  }),

  ignore: (): IRecoveryAction => ({
    type: 'ignore',
    description: 'Ignorer l\'erreur'
  }),

  notify: (message?: string): IRecoveryAction => ({
    type: 'notify',
    description: message || 'Notifier l\'utilisateur'
  })
};

/**
 * Error Boundaries préconfigurés pour différents contextes
 */
export const ErrorBoundaries = {
  Rendering: ErrorBoundaryFactory.createRenderingBoundary,
  Physics: ErrorBoundaryFactory.createPhysicsBoundary,
  Validation: ErrorBoundaryFactory.createValidationBoundary,
  Factory: ErrorBoundaryFactory.createFactoryBoundary
};