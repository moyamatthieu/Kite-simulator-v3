/**
 * SignalManager.ts - Gestionnaire de signaux pour Node3D
 * Séparation des responsabilités selon le principe SRP
 */

import { Node3D } from './Node3D';
import { logger } from './Logger';

export interface Signal {
  name: string;
  callbacks: Array<{ target: Node3D; method: string }>;
}

/**
 * Gestionnaire de signaux - Responsabilité unique : gestion des signaux
 */
export class SignalManager {
  private signals: Map<string, Signal> = new Map();

  /**
   * Définit un signal
   */
  defineSignal(name: string): void {
    if (!this.signals.has(name)) {
      this.signals.set(name, {
        name,
        callbacks: []
      });
      logger.debug(`Signal défini: ${name}`, 'SignalManager');
    }
  }

  /**
   * Émet un signal
   */
  emitSignal(name: string, ...args: any[]): void {
    const signal = this.signals.get(name);
    if (signal) {
      logger.debug(`Émission du signal: ${name} avec ${signal.callbacks.length} callbacks`, 'SignalManager');
      signal.callbacks.forEach(callback => {
        const method = (callback.target as any)[callback.method];
        if (typeof method === 'function') {
          try {
            method.call(callback.target, ...args);
          } catch (error) {
            logger.error(`Erreur lors de l'exécution du callback ${callback.method}:`, 'SignalManager', error);
          }
        } else {
          logger.warn(`Méthode ${callback.method} non trouvée sur la cible`, 'SignalManager');
        }
      });
    }
  }

  /**
   * Connecte un signal à une méthode
   */
  connectSignal(signal: string, target: Node3D, method: string): void {
    if (!this.signals.has(signal)) {
      this.defineSignal(signal);
    }

    const signalObj = this.signals.get(signal)!;
    // Éviter les connexions dupliquées
    const existing = signalObj.callbacks.find(cb => cb.target === target && cb.method === method);
    if (!existing) {
      signalObj.callbacks.push({ target, method });
      logger.debug(`Signal connecté: ${signal} -> ${target.name}.${method}`, 'SignalManager');
    }
  }

  /**
   * Déconnecte un signal
   */
  disconnectSignal(signal: string, target: Node3D, method: string): void {
    const signalObj = this.signals.get(signal);
    if (signalObj) {
      const index = signalObj.callbacks.findIndex(cb => cb.target === target && cb.method === method);
      if (index !== -1) {
        signalObj.callbacks.splice(index, 1);
        logger.debug(`Signal déconnecté: ${signal} -> ${target.name}.${method}`, 'SignalManager');
      }
    }
  }

  /**
   * Vérifie si un signal existe
   */
  hasSignal(name: string): boolean {
    return this.signals.has(name);
  }

  /**
   * Obtient tous les noms de signaux
   */
  getSignalNames(): string[] {
    return Array.from(this.signals.keys());
  }

  /**
   * Nettoie tous les signaux
   */
  clearSignals(): void {
    this.signals.clear();
    logger.debug('Tous les signaux nettoyés', 'SignalManager');
  }
}