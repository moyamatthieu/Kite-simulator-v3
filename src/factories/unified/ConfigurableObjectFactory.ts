/**
 * Factory générique configurée - élimine la duplication de 17+ factories
 * Respect des principes SOLID : Open/Closed Principle, Single Responsibility
 */
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@/types';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

// Types de base pour la configuration
export interface ObjectConfiguration<T = any> {
  metadata: {
    category: string;
    name: string;
    description: string;
    tags: string[];
    complexity: 'simple' | 'medium' | 'complex';
  };
  defaultParams: T;
  variants?: { [key: string]: Partial<T> };
  builder: ObjectBuilderDefinition<T>;
}

export interface ObjectBuilderDefinition<T> {
  definePoints: (params: T, context: IStructuredObjectContext) => void;
  buildStructure: (params: T, context: IStructuredObjectContext) => void;
  buildSurfaces: (params: T, context: IStructuredObjectContext) => void;
  getName?: (params: T) => string;
  getDescription?: (params: T) => string;
  getPrimitiveCount?: (params: T) => number;
}

export class ConfigurableObjectFactory<T> {
  constructor(private config: ObjectConfiguration<T>) {}

  create(customParams: Partial<T> = {}, variant?: string): StructuredObject & ICreatable {
    // Fusion des paramètres par ordre de priorité
    const baseParams = this.config.defaultParams;
    const variantParams = variant ? this.config.variants?.[variant] || {} : {};
    const finalParams = { ...baseParams, ...variantParams, ...customParams };

    // Création de l'objet avec le builder configuré
    const builder = this.createBuilder(finalParams);
    const obj = new StructuredObject(this.config.metadata.name);
    
    // Application du builder
    const context = this.createContext(obj);
    builder.definePoints(context);
    builder.buildStructure(context);
    builder.buildSurfaces(context);

    // Ajout de l'interface ICreatable
    return this.makeCreatable(obj, builder, finalParams);
  }

  private createBuilder(params: T): IStructuredObjectBuilder {
    const builderDef = this.config.builder;
    
    return {
      definePoints: (context: IStructuredObjectContext) => 
        builderDef.definePoints(params, context),
      
      buildStructure: (context: IStructuredObjectContext) => 
        builderDef.buildStructure(params, context),
      
      buildSurfaces: (context: IStructuredObjectContext) => 
        builderDef.buildSurfaces(params, context),
      
      getName: () => builderDef.getName?.(params) || this.config.metadata.name,
      
      getDescription: () => builderDef.getDescription?.(params) || this.config.metadata.description,
      
      getPrimitiveCount: () => builderDef.getPrimitiveCount?.(params) || 1
    };
  }

  private createContext(obj: StructuredObject): IStructuredObjectContext {
    return {
      setPoint: (name: string, position: [number, number, number]) => 
        obj.setPoint(name, position),
      
      getPoint: (name: string) => obj.getPoint(name),
      
      getPointNames: () => obj.getPointNames(),
      
      addPrimitiveAt: (primitive: any, position: [number, number, number]) => 
        obj.addPrimitiveAtPoint(primitive, 'center'), // Simplification pour l'exemple
      
      addSurfaceBetweenPoints: (pointNames: string[], color: string) => {
        // Implémentation de création de surface entre points
        // Cette méthode devrait être disponible dans StructuredObject
      },
      
      addExistingObject: (object: any) => obj.add(object)
    };
  }

  private makeCreatable(
    obj: StructuredObject, 
    builder: IStructuredObjectBuilder, 
    params: T
  ): StructuredObject & ICreatable {
    const creatable = obj as StructuredObject & ICreatable;
    
    creatable.create = () => creatable;
    creatable.getName = () => builder.getName();
    creatable.getDescription = () => builder.getDescription();
    creatable.getPrimitiveCount = () => builder.getPrimitiveCount();
    
    return creatable;
  }

  // Méthodes utilitaires
  getMetadata() { return this.config.metadata; }
  getDefaultParams() { return this.config.defaultParams; }
  getVariants() { return this.config.variants || {}; }
  getVariantNames() { return Object.keys(this.config.variants || {}); }
}

// Factory manager pour gérer tous les objets configurés
export class ObjectFactoryRegistry {
  private factories = new Map<string, ConfigurableObjectFactory<any>>();
  private categories = new Map<string, string[]>();

  register<T>(key: string, config: ObjectConfiguration<T>): void {
    const factory = new ConfigurableObjectFactory(config);
    this.factories.set(key, factory);
    
    // Mise à jour des catégories
    const category = config.metadata.category;
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push(key);
  }

  create(key: string, params: any = {}, variant?: string): StructuredObject & ICreatable | null {
    const factory = this.factories.get(key);
    return factory ? factory.create(params, variant) : null;
  }

  getFactory(key: string): ConfigurableObjectFactory<any> | undefined {
    return this.factories.get(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.factories.keys());
  }

  getKeysByCategory(category: string): string[] {
    return this.categories.get(category) || [];
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  getCategorizedObjects(): { [category: string]: string[] } {
    const result: { [category: string]: string[] } = {};
    for (const [category, keys] of this.categories.entries()) {
      result[category] = [...keys];
    }
    return result;
  }
}