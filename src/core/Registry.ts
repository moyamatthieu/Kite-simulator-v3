/**
 * Registry - Système d'enregistrement des objets
 * Permet le chargement dynamique et la gestion des objets disponibles
 */

import { ICreatable, ObjectMetadata } from '../types';
import { Assembly } from './Assembly';

export class Registry {
    private static instance: Registry;
    private objects: Map<string, ICreatable> = new Map();
    
    private constructor() {}
    
    static getInstance(): Registry {
        if (!Registry.instance) {
            Registry.instance = new Registry();
        }
        return Registry.instance;
    }
    
    /**
     * Enregistrer un objet
     */
    register(id: string, object: ICreatable): void {
        this.objects.set(id, object);
    }
    
    /**
     * Obtenir un objet par son ID
     */
    get(id: string): ICreatable | undefined {
        return this.objects.get(id);
    }
    
    /**
     * Créer une instance d'un objet
     */
    create(id: string): Assembly | null {
        const object = this.objects.get(id);
        if (object) {
            return object.create();
        }
        return null;
    }
    
    /**
     * Obtenir tous les objets enregistrés
     */
    getAll(): Map<string, ICreatable> {
        return this.objects;
    }
    
    /**
     * Obtenir la liste des objets disponibles
     */
    getAvailable(): Array<{id: string, metadata: ObjectMetadata}> {
        const available: Array<{id: string, metadata: ObjectMetadata}> = [];
        
        this.objects.forEach((object, id) => {
            // Si l'objet a une méthode getMetadata
            if ('getMetadata' in object && typeof object.getMetadata === 'function') {
                available.push({
                    id,
                    metadata: (object as any).getMetadata()
                });
            } else {
                // Sinon, créer des métadonnées basiques
                available.push({
                    id,
                    metadata: {
                        name: object.getName(),
                        description: object.getDescription(),
                        category: 'furniture',
                        complexity: 'simple',
                        primitiveCount: object.getPrimitiveCount()
                    }
                });
            }
        });
        
        return available;
    }
    
    /**
     * Obtenir les objets par catégorie
     */
    getByCategory(category: string): Array<{id: string, metadata: ObjectMetadata}> {
        return this.getAvailable().filter(item => item.metadata.category === category);
    }
    
    /**
     * Vérifier si un objet existe
     */
    has(id: string): boolean {
        return this.objects.has(id);
    }
    
    /**
     * Supprimer un objet du registre
     */
    unregister(id: string): boolean {
        return this.objects.delete(id);
    }
    
    /**
     * Vider le registre
     */
    clear(): void {
        this.objects.clear();
    }
}