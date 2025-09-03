/**
 * Registry.ts - Registry simplifié pour l'enregistrement temporaire
 * L'AutoLoader gère maintenant le chargement automatique des objets
 */

import * as THREE from 'three';

/**
 * Registry simple pour l'enregistrement temporaire d'instances
 * Note: L'AutoLoader gère le chargement automatique des classes depuis /src/objects/
 */
export class Registry {
  private static instance: Registry;
  private instances: Map<string, THREE.Object3D> = new Map();

  private constructor() {}

  /**
   * Récupère l'instance unique du Registry
   */
  static getInstance(): Registry {
    if (!Registry.instance) {
      Registry.instance = new Registry();
    }
    return Registry.instance;
  }

  /**
   * Enregistre une instance temporairement
   */
  registerInstance(id: string, instance: THREE.Object3D): void {
    this.instances.set(id, instance);
  }

  /**
   * Récupère une instance enregistrée
   */
  getInstance(id: string): THREE.Object3D | undefined {
    return this.instances.get(id);
  }

  /**
   * Supprime une instance
   */
  removeInstance(id: string): boolean {
    return this.instances.delete(id);
  }

  /**
   * Vide le registry
   */
  clear(): void {
    this.instances.clear();
  }

  /**
   * Retourne le nombre d'instances enregistrées
   */
  size(): number {
    return this.instances.size;
  }
}