/**
 * AutoLoader unifié utilisant le nouveau système de factories configurables
 * Élimine la duplication et respecte le principe Open/Closed
 */
import { ObjectFactoryRegistry } from '@factories/unified/ConfigurableObjectFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@/types';

// Import de toutes les configurations
import { ChairConfiguration } from '@factories/unified/configurations/ChairConfiguration';
import { CubeConfiguration } from '@factories/unified/configurations/CubeConfiguration';

export class UnifiedAutoLoader {
  private registry: ObjectFactoryRegistry;
  private initialized: boolean = false;

  constructor() {
    this.registry = new ObjectFactoryRegistry();
  }

  /**
   * Initialise l'AutoLoader avec toutes les configurations disponibles
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔧 Initialisation de l\'AutoLoader unifié...');

    // Enregistrement des configurations
    this.registry.register('chair', ChairConfiguration);
    this.registry.register('cube', CubeConfiguration);

    // TODO: Ajouter dynamiquement toutes les autres configurations
    // Ceci remplace les 17+ factories dupliquées par un système configurable

    this.initialized = true;
    console.log('✅ AutoLoader unifié initialisé avec succès');
    console.log(`📦 ${this.registry.getAllKeys().length} objets disponibles`);
    console.log(`📁 ${this.registry.getCategories().length} catégories disponibles`);
  }

  /**
   * Crée un objet à partir de sa clé et de paramètres optionnels
   */
  async create(
    objectKey: string, 
    params: any = {}, 
    variant?: string
  ): Promise<StructuredObject & ICreatable | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const obj = this.registry.create(objectKey, params, variant);
    
    if (obj) {
      console.log(`✨ Objet créé: ${obj.getName()} (${obj.getPrimitiveCount()} primitives)`);
    } else {
      console.warn(`⚠️ Objet inconnu: ${objectKey}`);
    }

    return obj;
  }

  /**
   * Obtient toutes les catégories disponibles avec leurs objets
   */
  async getCategories(): Promise<{ [category: string]: string[] }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const categorized = this.registry.getCategorizedObjects();
    
    // Transformation pour l'affichage avec icônes
    const categoriesWithIcons: { [key: string]: string[] } = {};
    
    for (const [category, objects] of Object.entries(categorized)) {
      const icon = this.getCategoryIcon(category);
      categoriesWithIcons[`${icon} ${this.getCategoryLabel(category)}`] = objects;
    }

    return categoriesWithIcons;
  }

  /**
   * Obtient tous les objets disponibles
   */
  async getAllObjects(): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.registry.getAllKeys();
  }

  /**
   * Obtient les variants disponibles pour un objet
   */
  async getVariants(objectKey: string): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const factory = this.registry.getFactory(objectKey);
    return factory ? factory.getVariantNames() : [];
  }

  /**
   * Obtient les métadonnées d'un objet
   */
  async getMetadata(objectKey: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    const factory = this.registry.getFactory(objectKey);
    return factory ? factory.getMetadata() : null;
  }

  /**
   * Obtient les paramètres par défaut d'un objet
   */
  async getDefaultParams(objectKey: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    const factory = this.registry.getFactory(objectKey);
    return factory ? factory.getDefaultParams() : null;
  }

  private getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'furniture': '🪑',
      'shapes': '🔺',
      'mechanical': '⚙️',
      'organic': '🌿',
      'vehicles': '🚗',
      'architecture': '🏗️',
      'tools': '🔧'
    };
    return icons[category] || '📦';
  }

  private getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'furniture': 'Mobilier',
      'shapes': 'Formes',
      'mechanical': 'Mécanique',
      'organic': 'Organique',
      'vehicles': 'Véhicules',
      'architecture': 'Architecture',
      'tools': 'Outils'
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }
}

// Instance singleton pour l'utilisation dans l'application
export const unifiedAutoLoader = new UnifiedAutoLoader();