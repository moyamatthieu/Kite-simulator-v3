/**
 * AutoLoader.ts - Chargement automatique RÉEL des objets depuis /src/objects
 * Découverte automatique via import.meta.glob - aucun import manuel requis !
 * Il suffit d'ajouter un fichier .ts dans /src/objects/ pour qu'il soit détecté
 */

import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';

// Types pour l'auto-loader
export interface ObjectInfo {
    id: string;
    name: string;
    description: string;
    className: string;
    instance: StructuredObject & ICreatable;
    folderPath?: string; // Dossier parent de l'objet
}

/**
 * AutoLoader - Chargement automatique RÉEL des objets 3D
 * Utilise import.meta.glob pour découvrir automatiquement tous les fichiers .ts 
 * dans /src/objects/ et charge les classes qui implémentent ICreatable
 * 
 * ✨ Plus besoin d'ajouter manuellement les imports !
 */
export class AutoLoader {
    private objects: Map<string, ObjectInfo> = new Map();
    private loadPromise: Promise<void> | null = null;
    
    constructor() {
        this.loadAllObjects();
    }
    
    /**
     * Charge automatiquement tous les objets du dossier objects
     */
    private async loadAllObjects(): Promise<void> {
        if (this.loadPromise) {
            return this.loadPromise;
        }
        
        this.loadPromise = this.doLoadAllObjects();
        return this.loadPromise;
    }
    
    private async doLoadAllObjects(): Promise<void> {
        try {
            // Découverte automatique des objets via import.meta.glob
            // Chercher dans tous les sous-dossiers de /src/objects/
            const objectModules = import.meta.glob('../objects/**/*.ts', { eager: true });
            
            for (const [filePath, module] of Object.entries(objectModules)) {
                // Extraire le nom du fichier (ex: Table.ts -> Table)
                const fileName = filePath.split('/').pop()?.replace('.ts', '') || '';
                
                // Ignorer le fichier index.ts s'il existe
                if (fileName === 'index') continue;
                
                // Extraire le dossier parent (ex: ../objects/furniture/Table.ts -> furniture)
                const pathParts = filePath.split('/');
                const folderName = pathParts[pathParts.length - 2] || 'uncategorized';
                
                const moduleObj = module as any;
                
                // Chercher la classe exportée qui correspond au nom du fichier
                // Essayer d'abord avec la première lettre en majuscule (convention des classes)
                const classNameCapitalized = fileName.charAt(0).toUpperCase() + fileName.slice(1);
                const ObjectClass = moduleObj[classNameCapitalized] || moduleObj[fileName];
                
                if (ObjectClass && typeof ObjectClass === 'function') {
                    try {
                        // Créer une instance de test pour vérifier que c'est un objet valide
                        const instance = new ObjectClass() as StructuredObject & ICreatable;
                        
                        // Vérifier que l'objet implémente les méthodes requises
                        if (typeof instance.getName === 'function' && 
                            typeof instance.getDescription === 'function' &&
                            typeof instance.create === 'function') {
                            
                            // Générer un ID basé sur le nom du fichier (en minuscules)
                            const id = fileName.toLowerCase();
                            
                            // Enregistrer l'objet avec le dossier parent
                            this.objects.set(id, {
                                id,
                                name: instance.getName(),
                                description: instance.getDescription(),
                                className: fileName,
                                instance,
                                folderPath: folderName
                            });
                            
                            console.log(`✅ Objet chargé automatiquement: ${id} (${classNameCapitalized || fileName}) depuis ${folderName}/`);
                        } else {
                            console.warn(`⚠️ ${fileName} ne semble pas être un objet ICreatable valide`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ Erreur lors du chargement automatique de ${fileName}:`, error);
                    }
                } else {
                    const classNameCapitalized = fileName.charAt(0).toUpperCase() + fileName.slice(1);
                    console.warn(`⚠️ Aucune classe ${classNameCapitalized} ou ${fileName} trouvée dans ${filePath}`);
                }
            }
            
            console.log(`🎯 AutoLoader: ${this.objects.size} objets chargés automatiquement`);
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement automatique des objets:', error);
        }
    }
    
    /**
     * Créer une nouvelle instance d'un objet
     */
    async create(id: string): Promise<StructuredObject | null> {
        await this.loadAllObjects();
        
        const objectInfo = this.objects.get(id);
        if (!objectInfo) {
            console.warn(`⚠️ Objet '${id}' non trouvé`);
            return null;
        }
        
        try {
            // Créer une nouvelle instance de la classe
            const ObjectClass = objectInfo.instance.constructor as new() => StructuredObject & ICreatable;
            const newInstance = new ObjectClass();
            
            console.log(`🆕 Nouvelle instance créée: ${id}`);
            return newInstance;
            
        } catch (error) {
            console.error(`❌ Erreur lors de la création de '${id}':`, error);
            return null;
        }
    }
    
    /**
     * Obtenir les informations d'un objet
     */
    async getObjectInfo(id: string): Promise<ObjectInfo | null> {
        await this.loadAllObjects();
        return this.objects.get(id) || null;
    }
    
    /**
     * Lister tous les objets disponibles
     */
    async getAllObjects(): Promise<ObjectInfo[]> {
        await this.loadAllObjects();
        return Array.from(this.objects.values());
    }
    
    /**
     * Lister tous les IDs disponibles
     */
    async getAllIds(): Promise<string[]> {
        await this.loadAllObjects();
        return Array.from(this.objects.keys());
    }
    
    /**
     * Vérifier si un objet existe
     */
    async has(id: string): Promise<boolean> {
        await this.loadAllObjects();
        return this.objects.has(id);
    }
    
    /**
     * Recharger tous les objets (pour hot reload)
     */
    async reload(): Promise<void> {
        console.log('🔥 AutoLoader: Rechargement des objets...');
        this.objects.clear();
        this.loadPromise = null;
        await this.loadAllObjects();
    }
    
    /**
     * Obtenir les catégories d'objets pour l'UI
     * Détection automatique basée sur les DOSSIERS réels
     */
    async getCategories(): Promise<Record<string, ObjectInfo[]>> {
        await this.loadAllObjects();
        
        const categories: Record<string, ObjectInfo[]> = {};
        
        // Mapping des noms de dossiers vers des icônes et labels
        const categoryMap: Record<string, { icon: string, label: string }> = {
            'furniture': { icon: '🏠', label: 'Mobilier' },
            'shapes': { icon: '🔺', label: 'Formes' },
            'mechanical': { icon: '⚙️', label: 'Mécaniques' },
            'organic': { icon: '🌳', label: 'Organiques' },
            'containers': { icon: '📦', label: 'Contenants' },
            'toys': { icon: '🎮', label: 'Jouets' },
            'sports': { icon: '🏃', label: 'Sports' },
            'tools': { icon: '🔧', label: 'Outils' },
            'vehicles': { icon: '🚗', label: 'Véhicules' },
            'buildings': { icon: '🏢', label: 'Bâtiments' },
            'electronics': { icon: '💻', label: 'Électronique' },
            'nature': { icon: '🌿', label: 'Nature' },
            'weapons': { icon: '⚔️', label: 'Armes' },
            'food': { icon: '🍔', label: 'Nourriture' },
            'music': { icon: '🎵', label: 'Musique' },
            'space': { icon: '🚀', label: 'Spatial' },
            'medical': { icon: '🏥', label: 'Médical' }
        };
        
        // Catégoriser basé sur le DOSSIER réel de chaque objet
        for (const [id, objInfo] of this.objects.entries()) {
            const folderName = objInfo.folderPath || 'uncategorized';
            
            // Utiliser le mapping si le dossier est connu
            let categoryLabel = '🔺 Autres';
            if (categoryMap[folderName]) {
                const { icon, label } = categoryMap[folderName];
                categoryLabel = `${icon} ${label}`;
            } else {
                // Pour les nouveaux dossiers non prédéfinis, créer une catégorie automatique
                // Capitaliser le nom du dossier
                const capitalizedFolder = folderName.charAt(0).toUpperCase() + folderName.slice(1);
                categoryLabel = `📁 ${capitalizedFolder}`;
            }
            
            // Créer la catégorie si elle n'existe pas
            if (!categories[categoryLabel]) {
                categories[categoryLabel] = [];
            }
            
            categories[categoryLabel].push(objInfo);
        }
        
        // Trier les catégories pour avoir un ordre cohérent
        const sortedCategories: Record<string, ObjectInfo[]> = {};
        
        // Ordre de priorité pour les catégories connues
        const priorityOrder = [
            '🏠 Mobilier',
            '🔺 Formes', 
            '⚙️ Mécaniques',
            '🌳 Organiques',
            '📦 Contenants',
            '🎮 Jouets'
        ];
        
        // Ajouter d'abord les catégories prioritaires
        for (const key of priorityOrder) {
            if (categories[key]) {
                sortedCategories[key] = categories[key];
            }
        }
        
        // Ajouter ensuite toutes les autres catégories (y compris les nouvelles)
        Object.keys(categories)
            .filter(key => !priorityOrder.includes(key))
            .sort() // Trier alphabétiquement les autres
            .forEach(key => {
                sortedCategories[key] = categories[key];
            });
        
        console.log(`📊 Catégories détectées: ${Object.keys(sortedCategories).join(', ')}`);
        
        return sortedCategories;
    }
}
