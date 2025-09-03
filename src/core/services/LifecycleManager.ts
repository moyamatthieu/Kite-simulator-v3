/**
 * Gestionnaire du cycle de vie - respect du Single Responsibility Principle
 * Sépare la logique de cycle de vie de la logique 3D
 */
import { IInitializable, IUpdateable, IPhysicsProcessable } from '@core/interfaces/ILifecycleManagement';
import { logger } from '@core/Logger';

export class LifecycleManager {
  private isReady: boolean = false;
  private readonly target: any;
  private readonly readyCallbacks: Array<() => void> = [];

  constructor(target: any) {
    this.target = target;
  }

  /**
   * Marque l'objet comme prêt et appelle _ready() si implémenté
   */
  markReady(): void {
    if (this.isReady) return;

    this.isReady = true;
    
    // Appel de _ready() si l'interface est implémentée
    if (this.implementsInterface<IInitializable>(this.target, '_ready')) {
      try {
        this.target._ready();
        logger.debug(`_ready() appelé avec succès pour ${(this.target as any).name || (this.target as any).nodeId || 'unknown'}`, 'LifecycleManager');
      } catch (error) {
        logger.error(`Erreur dans _ready() pour ${(this.target as any).name || (this.target as any).nodeId || 'unknown'}: ${error}`, 'LifecycleManager');
      }
    }

    // Appel des callbacks de ready
    this.readyCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error(`Erreur dans callback ready: ${error}`, 'LifecycleManager');
      }
    });
    
    this.readyCallbacks.length = 0; // Clear callbacks
  }

  /**
   * Met à jour l'objet selon ses interfaces implémentées
   */
  update(deltaTime: number): void {
    if (!this.isReady) return;

    // Appel de _process() si implémenté
    if (this.implementsInterface<IUpdateable>(this.target, '_process')) {
      try {
        this.target._process(deltaTime);
      } catch (error) {
        logger.error(`Erreur dans _process() pour ${(this.target as any).name || (this.target as any).nodeId || 'unknown'}: ${error}`, 'LifecycleManager');
      }
    }

    // Appel de _physics_process() si implémenté
    if (this.implementsInterface<IPhysicsProcessable>(this.target, '_physics_process')) {
      try {
        this.target._physics_process(deltaTime);
      } catch (error) {
        logger.error(`Erreur dans _physics_process() pour ${(this.target as any).name || (this.target as any).nodeId || 'unknown'}: ${error}`, 'LifecycleManager');
      }
    }
  }

  /**
   * Ajoute un callback à appeler quand l'objet est ready
   */
  onReady(callback: () => void): void {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  /**
   * Vérifie si l'objet est prêt
   */
  getIsReady(): boolean {
    return this.isReady;
  }

  /**
   * Utilitaire pour vérifier si un objet implémente une interface
   */
  private implementsInterface<T>(obj: any, method: keyof T): obj is T {
    return obj && typeof obj[method] === 'function';
  }

  /**
   * Réinitialise le gestionnaire (pour tests ou réutilisation)
   */
  reset(): void {
    this.isReady = false;
    this.readyCallbacks.length = 0;
  }

  /**
   * Obtient des statistiques sur les interfaces implémentées
   */
  getImplementedInterfaces(): string[] {
    const interfaces: string[] = [];
    
    if (this.implementsInterface<IInitializable>(this.target, '_ready')) {
      interfaces.push('IInitializable');
    }
    if (this.implementsInterface<IUpdateable>(this.target, '_process')) {
      interfaces.push('IUpdateable');
    }
    if (this.implementsInterface<IPhysicsProcessable>(this.target, '_physics_process')) {
      interfaces.push('IPhysicsProcessable');
    }

    return interfaces;
  }
}