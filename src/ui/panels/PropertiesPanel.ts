/**
 * PropertiesPanel.ts - Panel d'édition des propriétés en temps réel
 * Interface d'inspecteur inspirée de Godot Editor
 */

import { Panel, PanelConfig } from '../core/Panel.js';
import { Node3D } from '../../core/Node3D.js';
import { StructuredObject } from '../../core/StructuredObject.js';

export interface PropertyDescriptor {
    name: string;
    type: 'number' | 'string' | 'boolean' | 'color' | 'vector3' | 'select' | 'range';
    value: any;
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
    category?: string;
    description?: string;
    readonly?: boolean;
}

export interface PropertyCategory {
    name: string;
    properties: PropertyDescriptor[];
    expanded: boolean;
    icon?: string;
}

/**
 * Panel d'édition des propriétés d'objets sélectionnés
 */
export class PropertiesPanel extends Panel {
    private selectedNode: Node3D | null = null;
    private properties: PropertyCategory[] = [];
    private expandedCategories: Set<string> = new Set(['Transform', 'Material', 'Geometry']);
    private propertiesContainer!: HTMLElement;
    
    // Callbacks
    private onPropertyChangeCallbacks: ((property: string, value: any) => void)[] = [];

    constructor() {
        const config: PanelConfig = {
            id: 'properties',
            title: 'Propriétés',
            position: 'right',
            size: {
                width: 300,
                height: 500,
                minWidth: 250,
                minHeight: 200
            },
            resizable: true,
            collapsible: true,
            closable: false,
            draggable: true,
            visible: true
        };

        super(config);
    }

    public render(): void {
        this.contentElement.innerHTML = `
            <div class="properties-panel">
                <div class="properties-panel__toolbar">
                    <button class="properties-panel__btn" id="refresh-properties" title="Actualiser">
                        <span class="icon">🔄</span>
                    </button>
                    <button class="properties-panel__btn" id="reset-properties" title="Réinitialiser">
                        <span class="icon">↺</span>
                    </button>
                    <div class="spacer"></div>
                    <button class="properties-panel__btn" id="save-preset" title="Sauvegarder preset">
                        <span class="icon">💾</span>
                    </button>
                    <button class="properties-panel__btn" id="load-preset" title="Charger preset">
                        <span class="icon">📁</span>
                    </button>
                </div>
                <div class="properties-panel__content" id="properties-container">
                    <div class="properties-panel__empty">
                        <span class="icon">🎛️</span>
                        <p>Aucun objet sélectionné</p>
                        <small>Sélectionnez un objet dans l'arbre de scène pour voir ses propriétés</small>
                    </div>
                </div>
            </div>
        `;

        this.propertiesContainer = this.contentElement.querySelector('#properties-container') as HTMLElement;
        this.setupPropertiesEventListeners();
    }

    private setupPropertiesEventListeners(): void {
        // Boutons de la toolbar
        const refreshBtn = this.contentElement.querySelector('#refresh-properties');
        const resetBtn = this.contentElement.querySelector('#reset-properties');
        const savePresetBtn = this.contentElement.querySelector('#save-preset');
        const loadPresetBtn = this.contentElement.querySelector('#load-preset');

        refreshBtn?.addEventListener('click', () => this.refreshProperties());
        resetBtn?.addEventListener('click', () => this.resetProperties());
        savePresetBtn?.addEventListener('click', () => this.savePreset());
        loadPresetBtn?.addEventListener('click', () => this.loadPreset());
    }

    /**
     * Définit l'objet sélectionné
     */
    setSelectedNode(node: Node3D | null): void {
        this.selectedNode = node;
        if (node) {
            this.extractProperties();
            this.renderProperties();
        } else {
            this.showEmptyState();
        }
    }

    /**
     * Extrait les propriétés de l'objet sélectionné
     */
    private extractProperties(): void {
        if (!this.selectedNode) return;

        this.properties = [];

        // Catégorie Node
        this.properties.push({
            name: 'Node',
            icon: '📦',
            expanded: this.expandedCategories.has('Node'),
            properties: [
                {
                    name: 'name',
                    type: 'string',
                    value: this.selectedNode.name || '',
                    description: 'Nom du nœud'
                },
                {
                    name: 'visible',
                    type: 'boolean',
                    value: this.selectedNode.visible,
                    description: 'Visibilité du nœud'
                }
            ]
        });

        // Catégorie Transform
        this.properties.push({
            name: 'Transform',
            icon: '📐',
            expanded: this.expandedCategories.has('Transform'),
            properties: [
                {
                    name: 'position',
                    type: 'vector3',
                    value: this.selectedNode.position,
                    description: 'Position dans l\'espace 3D'
                },
                {
                    name: 'rotation',
                    type: 'vector3',
                    value: this.selectedNode.rotation,
                    description: 'Rotation en radians'
                },
                {
                    name: 'scale',
                    type: 'vector3',
                    value: this.selectedNode.scale,
                    description: 'Échelle'
                }
            ]
        });

        // Propriétés spécifiques aux StructuredObjects
        if (this.selectedNode instanceof StructuredObject) {
            this.extractStructuredObjectProperties();
        }
    }

    /**
     * Extrait les propriétés spécifiques aux StructuredObjects
     */
    private extractStructuredObjectProperties(): void {
        const structuredObj = this.selectedNode as StructuredObject;
        
        // Tenter d'extraire les paramètres si ils existent
        if ('params' in structuredObj) {
            const params = (structuredObj as any).params;
            if (params && typeof params === 'object') {
                const geometryProps: PropertyDescriptor[] = [];
                
                Object.entries(params).forEach(([key, value]) => {
                    const prop = this.createPropertyFromValue(key, value);
                    if (prop) geometryProps.push(prop);
                });

                if (geometryProps.length > 0) {
                    this.properties.push({
                        name: 'Geometry',
                        icon: '🔧',
                        expanded: this.expandedCategories.has('Geometry'),
                        properties: geometryProps
                    });
                }
            }
        }

        // Propriétés des matériaux si disponibles
        if (structuredObj.children.length > 0) {
            const materialProps = this.extractMaterialProperties();
            if (materialProps.length > 0) {
                this.properties.push({
                    name: 'Material',
                    icon: '🎨',
                    expanded: this.expandedCategories.has('Material'),
                    properties: materialProps
                });
            }
        }
    }

    /**
     * Crée une propriété à partir d'une valeur
     */
    private createPropertyFromValue(key: string, value: any): PropertyDescriptor | null {
        if (typeof value === 'number') {
            // Déterminer si c'est un angle, une taille, etc.
            const isAngle = key.toLowerCase().includes('angle') || key.toLowerCase().includes('rotation');
            const isSize = key.toLowerCase().includes('size') || key.toLowerCase().includes('width') || 
                          key.toLowerCase().includes('height') || key.toLowerCase().includes('depth');
            
            return {
                name: key,
                type: 'range',
                value: value,
                min: isAngle ? 0 : (isSize ? 0.1 : -10),
                max: isAngle ? Math.PI * 2 : (isSize ? 10 : 10),
                step: isAngle ? 0.1 : 0.1,
                description: `Paramètre ${key}`
            };
        }
        
        if (typeof value === 'string') {
            return {
                name: key,
                type: 'string',
                value: value,
                description: `Paramètre ${key}`
            };
        }
        
        if (typeof value === 'boolean') {
            return {
                name: key,
                type: 'boolean',
                value: value,
                description: `Paramètre ${key}`
            };
        }

        return null;
    }

    /**
     * Extrait les propriétés des matériaux
     */
    private extractMaterialProperties(): PropertyDescriptor[] {
        const props: PropertyDescriptor[] = [];
        
        // Parcourir les enfants pour trouver des meshs avec matériaux
        this.selectedNode?.traverse((child: any) => {
            if (child.material) {
                const material = child.material;
                
                if (material.color) {
                    props.push({
                        name: 'color',
                        type: 'color',
                        value: `#${material.color.getHexString()}`,
                        description: 'Couleur du matériau'
                    });
                }
                
                if ('roughness' in material) {
                    props.push({
                        name: 'roughness',
                        type: 'range',
                        value: material.roughness,
                        min: 0,
                        max: 1,
                        step: 0.01,
                        description: 'Rugosité du matériau'
                    });
                }
                
                if ('metalness' in material) {
                    props.push({
                        name: 'metalness',
                        type: 'range',
                        value: material.metalness,
                        min: 0,
                        max: 1,
                        step: 0.01,
                        description: 'Aspect métallique'
                    });
                }
            }
        });
        
        return props;
    }

    /**
     * Affiche l'état vide
     */
    private showEmptyState(): void {
        this.propertiesContainer.innerHTML = `
            <div class="properties-panel__empty">
                <span class="icon">🎛️</span>
                <p>Aucun objet sélectionné</p>
                <small>Sélectionnez un objet dans l'arbre de scène pour voir ses propriétés</small>
            </div>
        `;
    }

    /**
     * Rend les propriétés dans le DOM
     */
    private renderProperties(): void {
        if (this.properties.length === 0) {
            this.showEmptyState();
            return;
        }

        const html = this.properties.map(category => this.renderCategory(category)).join('');
        this.propertiesContainer.innerHTML = html;
        
        this.attachPropertyEventListeners();
    }

    /**
     * Rend une catégorie de propriétés
     */
    private renderCategory(category: PropertyCategory): string {
        const expandIcon = category.expanded ? '▼' : '▶';
        const icon = category.icon || '📋';
        
        return `
            <div class="property-category ${category.expanded ? 'property-category--expanded' : ''}">
                <div class="property-category__header" data-category="${category.name}">
                    <span class="property-category__expand">${expandIcon}</span>
                    <span class="property-category__icon">${icon}</span>
                    <span class="property-category__name">${category.name}</span>
                    <span class="property-category__count">(${category.properties.length})</span>
                </div>
                <div class="property-category__content" style="display: ${category.expanded ? 'block' : 'none'}">
                    ${category.properties.map(prop => this.renderProperty(prop)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Rend une propriété individuelle
     */
    private renderProperty(prop: PropertyDescriptor): string {
        const isReadonly = prop.readonly ? 'readonly' : '';
        
        let inputHtml = '';
        
        switch (prop.type) {
            case 'number':
                inputHtml = `<input type="number" value="${prop.value}" step="${prop.step || 0.1}" ${isReadonly} />`;
                break;
                
            case 'range':
                inputHtml = `
                    <div class="property-range">
                        <input type="range" min="${prop.min}" max="${prop.max}" step="${prop.step || 0.1}" 
                               value="${prop.value}" ${isReadonly} />
                        <input type="number" value="${prop.value}" step="${prop.step || 0.1}" 
                               min="${prop.min}" max="${prop.max}" ${isReadonly} />
                    </div>
                `;
                break;
                
            case 'string':
                inputHtml = `<input type="text" value="${prop.value}" ${isReadonly} />`;
                break;
                
            case 'boolean':
                inputHtml = `<input type="checkbox" ${prop.value ? 'checked' : ''} ${isReadonly} />`;
                break;
                
            case 'color':
                inputHtml = `
                    <div class="property-color">
                        <input type="color" value="${prop.value}" ${isReadonly} />
                        <input type="text" value="${prop.value}" ${isReadonly} />
                    </div>
                `;
                break;
                
            case 'vector3':
                const vec = prop.value;
                inputHtml = `
                    <div class="property-vector3">
                        <label>X</label><input type="number" value="${vec.x.toFixed(3)}" step="0.1" ${isReadonly} />
                        <label>Y</label><input type="number" value="${vec.y.toFixed(3)}" step="0.1" ${isReadonly} />
                        <label>Z</label><input type="number" value="${vec.z.toFixed(3)}" step="0.1" ${isReadonly} />
                    </div>
                `;
                break;
                
            case 'select':
                const options = prop.options?.map(opt => 
                    `<option value="${opt}" ${opt === prop.value ? 'selected' : ''}>${opt}</option>`
                ).join('') || '';
                inputHtml = `<select ${isReadonly}>${options}</select>`;
                break;
        }
        
        return `
            <div class="property-item" data-property="${prop.name}" data-type="${prop.type}">
                <div class="property-item__label">
                    <span class="property-item__name">${prop.name}</span>
                    ${prop.description ? `<span class="property-item__description" title="${prop.description}">?</span>` : ''}
                </div>
                <div class="property-item__input">
                    ${inputHtml}
                </div>
            </div>
        `;
    }

    /**
     * Attache les événements aux contrôles de propriétés
     */
    private attachPropertyEventListeners(): void {
        // Expansion/réduction des catégories
        this.propertiesContainer.addEventListener('click', (e) => {
            const header = (e.target as HTMLElement).closest('.property-category__header') as HTMLElement;
            if (header) {
                const categoryName = header.dataset.category!;
                this.toggleCategory(categoryName);
            }
        });

        // Changement de valeurs
        this.propertiesContainer.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            const propertyItem = input.closest('.property-item') as HTMLElement;
            
            if (propertyItem) {
                const propertyName = propertyItem.dataset.property!;
                const propertyType = propertyItem.dataset.type!;
                
                this.handlePropertyChange(propertyName, propertyType, input);
            }
        });

        // Synchronisation des ranges et numbers
        this.propertiesContainer.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            if (input.type === 'range') {
                const numberInput = input.parentElement?.querySelector('input[type="number"]') as HTMLInputElement;
                if (numberInput) {
                    numberInput.value = input.value;
                }
            } else if (input.type === 'number' && input.parentElement?.classList.contains('property-range')) {
                const rangeInput = input.parentElement?.querySelector('input[type="range"]') as HTMLInputElement;
                if (rangeInput) {
                    rangeInput.value = input.value;
                }
            }
        });
    }

    /**
     * Gère le changement d'une propriété
     */
    private handlePropertyChange(propertyName: string, propertyType: string, input: HTMLInputElement): void {
        if (!this.selectedNode) return;

        let value: any;
        
        switch (propertyType) {
            case 'number':
            case 'range':
                value = parseFloat(input.value);
                break;
            case 'boolean':
                value = input.checked;
                break;
            case 'string':
            case 'color':
                value = input.value;
                break;
            case 'vector3':
                // Gérer les Vector3 séparément
                const container = input.closest('.property-vector3') as HTMLElement;
                const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
                value = {
                    x: parseFloat(inputs[0].value),
                    y: parseFloat(inputs[1].value),
                    z: parseFloat(inputs[2].value)
                };
                break;
            default:
                value = input.value;
        }

        this.applyPropertyChange(propertyName, value);
        this.onPropertyChangeCallbacks.forEach(callback => callback(propertyName, value));
    }

    /**
     * Applique le changement de propriété à l'objet
     */
    private applyPropertyChange(propertyName: string, value: any): void {
        if (!this.selectedNode) return;

        try {
            // Propriétés de base du Node3D
            if (propertyName === 'name') {
                this.selectedNode.name = value;
            } else if (propertyName === 'visible') {
                this.selectedNode.visible = value;
            } else if (propertyName === 'position') {
                this.selectedNode.position.set(value.x, value.y, value.z);
            } else if (propertyName === 'rotation') {
                this.selectedNode.rotation.set(value.x, value.y, value.z);
            } else if (propertyName === 'scale') {
                this.selectedNode.scale.set(value.x, value.y, value.z);
            }
            // Propriétés des paramètres
            else if (this.selectedNode instanceof StructuredObject && 'params' in this.selectedNode) {
                const params = (this.selectedNode as any).params;
                if (params && propertyName in params) {
                    params[propertyName] = value;
                    // Reconstruire l'objet si nécessaire
                    if ('rebuild' in this.selectedNode) {
                        (this.selectedNode as any).rebuild();
                    }
                }
            }
            // Propriétés des matériaux
            else if (['color', 'roughness', 'metalness'].includes(propertyName)) {
                this.applyMaterialProperty(propertyName, value);
            }
        } catch (error) {
            console.warn(`Erreur lors de l'application de la propriété ${propertyName}:`, error);
        }
    }

    /**
     * Applique une propriété de matériau
     */
    private applyMaterialProperty(propertyName: string, value: any): void {
        this.selectedNode?.traverse((child: any) => {
            if (child.material) {
                const material = child.material;
                
                if (propertyName === 'color' && material.color) {
                    material.color.setHex(parseInt(value.replace('#', ''), 16));
                } else if (propertyName === 'roughness' && 'roughness' in material) {
                    material.roughness = value;
                } else if (propertyName === 'metalness' && 'metalness' in material) {
                    material.metalness = value;
                }
                
                material.needsUpdate = true;
            }
        });
    }

    /**
     * Bascule l'expansion d'une catégorie
     */
    private toggleCategory(categoryName: string): void {
        if (this.expandedCategories.has(categoryName)) {
            this.expandedCategories.delete(categoryName);
        } else {
            this.expandedCategories.add(categoryName);
        }
        
        this.extractProperties();
        this.renderProperties();
    }

    /**
     * Actualise les propriétés
     */
    private refreshProperties(): void {
        if (this.selectedNode) {
            this.extractProperties();
            this.renderProperties();
        }
    }

    /**
     * Réinitialise les propriétés
     */
    private resetProperties(): void {
        if (!this.selectedNode) return;
        
        const confirmed = confirm('Réinitialiser toutes les propriétés aux valeurs par défaut ?');
        if (confirmed) {
            // TODO: Implémenter la réinitialisation
            console.log('Réinitialisation des propriétés');
        }
    }

    /**
     * Sauvegarde un preset
     */
    private savePreset(): void {
        // TODO: Implémenter la sauvegarde de preset
        console.log('Sauvegarde du preset');
    }

    /**
     * Charge un preset
     */
    private loadPreset(): void {
        // TODO: Implémenter le chargement de preset
        console.log('Chargement du preset');
    }

    // === ÉVÉNEMENTS PUBLICS ===

    onPropertyChange(callback: (property: string, value: any) => void): void {
        this.onPropertyChangeCallbacks.push(callback);
    }

    // === GETTERS ===

    get currentNode(): Node3D | null {
        return this.selectedNode;
    }
}
