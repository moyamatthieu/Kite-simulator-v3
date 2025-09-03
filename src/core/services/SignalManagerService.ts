/**
 * Service de gestion des signaux - respect du Single Responsibility Principle
 * Sépare la logique des signaux de la logique 3D
 */
import { logger } from '@core/Logger';

interface SignalConnection {
  target: any;
  method: string;
  once?: boolean; // Pour les signaux qui ne s'exécutent qu'une fois
}

interface SignalDefinition {
  name: string;
  connections: SignalConnection[];
  metadata?: {
    description?: string;
    expectedArgs?: string[];
  };
}

export class SignalManagerService {
  private signals = new Map<string, SignalDefinition>();
  private readonly ownerId: string;

  constructor(ownerId: string) {
    this.ownerId = ownerId;
  }

  /**
   * Définit un nouveau signal
   */
  defineSignal(name: string, metadata?: { description?: string; expectedArgs?: string[] }): void {
    if (this.signals.has(name)) {
      logger.warn(`Signal '${name}' déjà défini pour ${this.ownerId}`, 'SignalManagerService');
      return;
    }

    const signalDef: SignalDefinition = {
      name,
      connections: [],
      metadata
    };

    this.signals.set(name, signalDef);
    logger.debug(`Signal '${name}' défini pour ${this.ownerId}`, 'SignalManagerService');
  }

  /**
   * Connecte un signal à une méthode d'un objet cible
   */
  connectSignal(signalName: string, target: any, methodName: string, once: boolean = false): boolean {
    const signal = this.signals.get(signalName);
    
    if (!signal) {
      logger.error(`Signal '${signalName}' non défini pour ${this.ownerId}`, 'SignalManagerService');
      return false;
    }

    if (!target || typeof target[methodName] !== 'function') {
      logger.error(`Méthode '${methodName}' non trouvée sur l'objet cible pour le signal '${signalName}'`, 'SignalManagerService');
      return false;
    }

    // Vérifier si la connexion existe déjà
    const existingConnection = signal.connections.find(
      conn => conn.target === target && conn.method === methodName
    );

    if (existingConnection) {
      logger.warn(`Connexion déjà établie: ${signalName} -> ${methodName}`, 'SignalManagerService');
      return false;
    }

    signal.connections.push({ target, method: methodName, once });
    logger.debug(`Signal connecté: ${signalName} -> ${target.name || 'unknown'}.${methodName}`, 'SignalManagerService');
    
    return true;
  }

  /**
   * Déconnecte un signal d'un objet cible
   */
  disconnectSignal(signalName: string, target: any, methodName?: string): boolean {
    const signal = this.signals.get(signalName);
    
    if (!signal) {
      logger.error(`Signal '${signalName}' non défini pour ${this.ownerId}`, 'SignalManagerService');
      return false;
    }

    const initialLength = signal.connections.length;
    
    signal.connections = signal.connections.filter(conn => {
      const shouldKeep = !(
        conn.target === target && 
        (!methodName || conn.method === methodName)
      );
      return shouldKeep;
    });

    const disconnectedCount = initialLength - signal.connections.length;
    
    if (disconnectedCount > 0) {
      logger.debug(`${disconnectedCount} connexion(s) déconnectée(s) pour le signal '${signalName}'`, 'SignalManagerService');
      return true;
    }

    return false;
  }

  /**
   * Émet un signal avec des arguments
   */
  emitSignal(signalName: string, ...args: any[]): boolean {
    const signal = this.signals.get(signalName);
    
    if (!signal) {
      logger.error(`Tentative d'émission d'un signal non défini: '${signalName}' pour ${this.ownerId}`, 'SignalManagerService');
      return false;
    }

    if (signal.connections.length === 0) {
      logger.debug(`Aucune connexion pour le signal '${signalName}'`, 'SignalManagerService');
      return true;
    }

    let successCount = 0;
    const connectionsToRemove: SignalConnection[] = [];

    for (const connection of signal.connections) {
      try {
        // Validation de l'existence de l'objet cible et de sa méthode
        if (!connection.target || typeof connection.target[connection.method] !== 'function') {
          logger.warn(`Connexion invalide trouvée pour ${signalName}, suppression automatique`, 'SignalManagerService');
          connectionsToRemove.push(connection);
          continue;
        }

        // Appel de la méthode
        connection.target[connection.method](...args);
        successCount++;

        // Marquer pour suppression si c'est un signal "once"
        if (connection.once) {
          connectionsToRemove.push(connection);
        }

      } catch (error) {
        logger.error(`Erreur lors de l'appel de ${connection.method} pour le signal '${signalName}': ${error}`, 'SignalManagerService');
        // Marquer la connexion défaillante pour suppression
        connectionsToRemove.push(connection);
      }
    }

    // Supprimer les connexions marquées pour suppression
    connectionsToRemove.forEach(conn => {
      const index = signal.connections.indexOf(conn);
      if (index > -1) {
        signal.connections.splice(index, 1);
      }
    });

    logger.debug(`Signal '${signalName}' émis avec succès vers ${successCount} connexion(s)`, 'SignalManagerService');
    return successCount > 0;
  }

  /**
   * Obtient la liste des signaux définis
   */
  getDefinedSignals(): string[] {
    return Array.from(this.signals.keys());
  }

  /**
   * Obtient les informations détaillées sur un signal
   */
  getSignalInfo(signalName: string): { connectionCount: number; metadata?: any } | null {
    const signal = this.signals.get(signalName);
    
    if (!signal) {
      return null;
    }

    return {
      connectionCount: signal.connections.length,
      metadata: signal.metadata
    };
  }

  /**
   * Supprime tous les signaux et leurs connexions
   */
  clearAllSignals(): void {
    const signalCount = this.signals.size;
    this.signals.clear();
    logger.debug(`${signalCount} signaux supprimés pour ${this.ownerId}`, 'SignalManagerService');
  }

  /**
   * Supprime les connexions vers un objet cible spécifique
   */
  clearConnectionsTo(target: any): void {
    let removedCount = 0;
    
    this.signals.forEach((signal) => {
      const initialLength = signal.connections.length;
      signal.connections = signal.connections.filter(conn => conn.target !== target);
      removedCount += initialLength - signal.connections.length;
    });

    if (removedCount > 0) {
      logger.debug(`${removedCount} connexion(s) supprimée(s) vers l'objet cible`, 'SignalManagerService');
    }
  }

  /**
   * Obtient des statistiques sur l'utilisation des signaux
   */
  getStatistics(): {
    totalSignals: number;
    totalConnections: number;
    signalsWithoutConnections: number;
    mostConnectedSignal: string | null;
  } {
    let totalConnections = 0;
    let signalsWithoutConnections = 0;
    let mostConnectedSignal: string | null = null;
    let maxConnections = 0;

    this.signals.forEach((signal, name) => {
      const connectionCount = signal.connections.length;
      totalConnections += connectionCount;
      
      if (connectionCount === 0) {
        signalsWithoutConnections++;
      }
      
      if (connectionCount > maxConnections) {
        maxConnections = connectionCount;
        mostConnectedSignal = name;
      }
    });

    return {
      totalSignals: this.signals.size,
      totalConnections,
      signalsWithoutConnections,
      mostConnectedSignal
    };
  }
}