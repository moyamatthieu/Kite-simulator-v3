/**
 * BaseFactory.ts - Factory abstraite pour tous les objets 3D
 *
 * Pattern Factory Method avec support des paramètres configurables et des builders
 */

import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@/types';
import { DynamicStructuredObject, IStructuredObjectBuilder } from '@core/DynamicStructuredObject';
import { AppState } from '@core/AppState'; // Pour le debug flag

export interface FactoryParams {
  [key: string]: any;
}

export interface ObjectMetadata {
  category: string;
  name: string;
  description: string;
  tags: string[];
  complexity: 'simple' | 'medium' | 'complex';
}

/**
 * Factory abstraite pour la création d'objets 3D
 */
export abstract class BaseFactory<T extends StructuredObject & ICreatable> {
  protected abstract metadata: ObjectMetadata;

  /**
   * Chaque factory doit fournir son propre builder pour un StructuredObject
   */
  protected abstract createBuilder(params: FactoryParams): IStructuredObjectBuilder;

  /**
   * Créer un objet avec des paramètres optionnels
   */
  createObject(params?: FactoryParams): T {
    const mergedParams = this.mergeParams(params);
    this.validateParams(mergedParams);

    const appState = AppState.getInstance();
    const showDebugPoints = appState.getShowingDebugPoints(); // Récupérer l'état du debug

    const builder = this.createBuilder(mergedParams);
    const dynamicObject = new DynamicStructuredObject(
      this.metadata.name,
      builder,
      showDebugPoints
    );
    dynamicObject.init(); // Initialiser l'objet après sa création
    return dynamicObject as unknown as T; // Cast for compatibility
  }

  /**
   * Obtenir les métadonnées de l'objet
   */
  getMetadata(): ObjectMetadata {
    return { ...this.metadata };
  }

  /**
   * Obtenir la catégorie de l'objet
   */
  getCategory(): string {
    return this.metadata.category;
  }

  /**
   * Obtenir le nom de l'objet
   */
  getName(): string {
    return this.metadata.name;
  }

  /**
   * Valider les paramètres avant création
   */
  protected validateParams(params?: FactoryParams): void {
    // Validation de base - à surcharger dans les classes dérivées
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          // throw new Error(`Paramètre '${key}' ne peut pas être null ou undefined`);
          // Temporairement désactivé pour la compatibilité avec les anciens paramètres
        }
      });
    }
  }

  /**
   * Paramètres par défaut - à surcharger dans les classes dérivées
   */
  protected getDefaultParams(): FactoryParams {
    return {};
  }

  /**
   * Fusionner les paramètres par défaut avec les paramètres fournis
   */
  protected mergeParams(params?: FactoryParams): FactoryParams {
    return {
      ...this.getDefaultParams(),
      ...params
    };
  }
}
