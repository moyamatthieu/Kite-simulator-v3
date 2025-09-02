/**
 * SceneTreePanel.ts - Panel de navigation dans l'arbre de scène
 * Interface hiérarchique inspirée de Godot Editor
 */

import { Panel, PanelConfig } from '../core/Panel.js';
import { Node3D } from '../../core/Node3D.js';
import { ObjectInfo } from '../../core/AutoLoader.js';

export interface SceneTreeNode {
    id: string;
    name: string;
    type: string;
    node: Node3D;
    children: SceneTreeNode[];
    expanded: boolean;
    visible: boolean;
    selected: boolean;
}

/**
 * Panel d'arbre de scène pour navigation hiérarchique
 */
export class SceneTreePanel extends Panel {
    private rootNode: Node3D | null = null;
    private treeData: SceneTreeNode[] = [];
    private selectedNodes: Set<string> = new Set();
    private expandedNodes: Set<string> = new Set();
    private treeContainer!: HTMLElement;
    private creatableObjects: Record<string, ObjectInfo[]> = {};
    
    // Callbacks
    private onNodeSelectCallbacks: ((node: Node3D) => void)[] = [];
    private onNodeVisibilityCallbacks: ((node: Node3D, visible: boolean) => void)[] = [];
    private onNodeDeleteCallbacks: ((node: Node3D) => void)[] = [];
    private onObjectCreateRequestCallbacks: ((objectId: string) => void)[] = [];

    constructor() {
        const config: PanelConfig = {
            id: 'scene-tree',
            title: 'Arbre de Scène',
            position: 'left',
            size: {
                width: 250,
                height: 400,
                minWidth: 200,
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
            <div class="scene-tree">
                <div class="scene-tree__toolbar">
                    <button class="scene-tree__btn" id="refresh-tree" title="Actualiser">
                        <span class="icon">🔄</span>
                    </button>
                    <button class="scene-tree__btn" id="expand-all" title="Tout développer">
                        <span class="icon">📂</span>
                    </button>
                    <button class="scene-tree__btn" id="collapse-all" title="Tout réduire">
                        <span class="icon">📁</span>
                    </button>
                    <div class="spacer"></div>
                    <button class="scene-tree__btn" id="add-node" title="Ajouter un nœud">
                        <span class="icon">➕</span>
                    </button>
                </div>
                <div class="scene-tree__search">
                    <input type="text" placeholder="Rechercher..." id="tree-search" />
                </div>
                <div class="scene-tree__container" id="tree-container">
                    <div class="scene-tree__empty">
                        <span class="icon">🌳</span>
                        <p>Aucun objet dans la scène</p>
                        <small>Sélectionnez un objet dans le panneau de droite</small>
                    </div>
                </div>
            </div>
        `;

        this.treeContainer = this.contentElement.querySelector('#tree-container') as HTMLElement;
        this.setupSceneTreeEventListeners();
    }

    protected setupSceneTreeEventListeners(): void {
        // Boutons de la toolbar
        const refreshBtn = this.contentElement.querySelector('#refresh-tree');
        const expandAllBtn = this.contentElement.querySelector('#expand-all');
        const collapseAllBtn = this.contentElement.querySelector('#collapse-all');
        const addNodeBtn = this.contentElement.querySelector('#add-node');
        const searchInput = this.contentElement.querySelector('#tree-search') as HTMLInputElement;

        refreshBtn?.addEventListener('click', () => this.refreshTree());
        expandAllBtn?.addEventListener('click', () => this.expandAll());
        collapseAllBtn?.addEventListener('click', () => this.collapseAll());
        addNodeBtn?.addEventListener('click', () => this.showAddNodeDialog());

        // Recherche
        searchInput?.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value;
            this.filterTree(query);
        });

        // Raccourcis clavier
        this.contentElement.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Delete':
                    this.deleteSelectedNodes();
                    break;
                case 'F2':
                    this.renameSelectedNode();
                    break;
                case 'Escape':
                    this.clearSelection();
                    break;
            }
        });
    }

    /**
     * Définit le nœud racine de la scène
     */
    setRootNode(node: Node3D): void {
        this.rootNode = node;
        this.refreshTree();
    }

    /**
     * Actualise l'arbre complet
     */
    refreshTree(): void {
        if (!this.rootNode) {
            this.showEmptyState();
            return;
        }

        this.treeData = [this.buildTreeData(this.rootNode)];
        this.renderTree();
    }

    /**
     * Construit les données de l'arbre récursivement
     */
    private buildTreeData(node: Node3D, parent?: SceneTreeNode): SceneTreeNode {
        const nodeId = this.generateNodeId(node);
        const treeNode: SceneTreeNode = {
            id: nodeId,
            name: node.name || 'Sans nom',
            type: node.constructor.name,
            node: node,
            children: [],
            expanded: this.expandedNodes.has(nodeId),
            visible: node.visible,
            selected: this.selectedNodes.has(nodeId)
        };

        // Traiter les enfants
        if (node.children && node.children.length > 0) {
            treeNode.children = node.children
                .filter(child => child instanceof Node3D)
                .map(child => this.buildTreeData(child as Node3D, treeNode));
        }

        return treeNode;
    }

    /**
     * Génère un ID unique pour un nœud
     */
    private generateNodeId(node: Node3D): string {
        return `${node.uuid || node.id || 'node'}-${Date.now()}`;
    }

    /**
     * Affiche l'état vide
     */
    private showEmptyState(): void {
        this.treeContainer.innerHTML = `
            <div class="scene-tree__empty">
                <span class="icon">🌳</span>
                <p>Aucun objet dans la scène</p>
                <small>Sélectionnez un objet dans le panneau de droite</small>
            </div>
        `;
    }

    /**
     * Rend l'arbre dans le DOM
     */
    private renderTree(): void {
        if (this.treeData.length === 0) {
            this.showEmptyState();
            return;
        }

        const treeHTML = this.treeData.map(node => this.renderTreeNode(node, 0)).join('');
        this.treeContainer.innerHTML = `<div class="scene-tree__nodes">${treeHTML}</div>`;
        
        // Attacher les événements
        this.attachTreeEventListeners();
    }

    /**
     * Rend un nœud d'arbre récursivement
     */
    private renderTreeNode(treeNode: SceneTreeNode, depth: number): string {
        const hasChildren = treeNode.children.length > 0;
        const expandIcon = hasChildren ? (treeNode.expanded ? '▼' : '▶') : '';
        const typeIcon = this.getTypeIcon(treeNode.type);
        const visibilityIcon = treeNode.visible ? '👁' : '🚫';
        
        let html = `
            <div class="tree-node ${treeNode.selected ? 'tree-node--selected' : ''}" 
                 data-node-id="${treeNode.id}" 
                 style="padding-left: ${depth * 20 + 8}px">
                <div class="tree-node__content">
                    <span class="tree-node__expand" data-action="toggle">${expandIcon}</span>
                    <span class="tree-node__icon">${typeIcon}</span>
                    <span class="tree-node__name" data-action="select">${treeNode.name}</span>
                    <div class="tree-node__actions">
                        <button class="tree-node__btn" data-action="visibility" title="Basculer la visibilité">
                            ${visibilityIcon}
                        </button>
                        <button class="tree-node__btn" data-action="menu" title="Menu contextuel">
                            ⋮
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Ajouter les enfants si développé
        if (hasChildren && treeNode.expanded) {
            const childrenHTML = treeNode.children
                .map(child => this.renderTreeNode(child, depth + 1))
                .join('');
            html += childrenHTML;
        }

        return html;
    }

    /**
     * Obtient l'icône pour un type de nœud
     */
    private getTypeIcon(type: string): string {
        const iconMap: { [key: string]: string } = {
            'Node3D': '📦',
            'StructuredObject': '🔧',
            'Chair': '🪑',
            'Table': '🪑',
            'Kite': '🪁',
            'Kite2': '🪁',
            'Car': '🚗',
            'Cube': '🧊',
            'Sphere': '⚽',
            'Cylinder': '🗞',
            'Group': '📁',
            'Mesh': '🔺',
            'Light': '💡',
            'Camera': '📷'
        };
        
        return iconMap[type] || '📦';
    }

    /**
     * Attache les événements aux nœuds de l'arbre
     */
    private attachTreeEventListeners(): void {
        this.treeContainer.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const nodeElement = target.closest('.tree-node') as HTMLElement;
            
            if (!nodeElement) return;
            
            const nodeId = nodeElement.dataset.nodeId!;
            const action = target.dataset.action || target.closest('[data-action]')?.getAttribute('data-action');
            
            switch (action) {
                case 'toggle':
                    this.toggleNodeExpansion(nodeId);
                    break;
                case 'select':
                    this.selectNode(nodeId, e.ctrlKey || e.metaKey);
                    break;
                case 'visibility':
                    this.toggleNodeVisibility(nodeId);
                    break;
                case 'menu':
                    this.showContextMenu(nodeId, e);
                    break;
            }
        });

        // Double-clic pour renommer
        this.treeContainer.addEventListener('dblclick', (e) => {
            const nodeElement = (e.target as HTMLElement).closest('.tree-node') as HTMLElement;
            if (nodeElement) {
                const nameElement = nodeElement.querySelector('.tree-node__name');
                if (nameElement && e.target === nameElement) {
                    this.startRenaming(nodeElement.dataset.nodeId!);
                }
            }
        });
    }

    /**
     * Bascule l'expansion d'un nœud
     */
    private toggleNodeExpansion(nodeId: string): void {
        if (this.expandedNodes.has(nodeId)) {
            this.expandedNodes.delete(nodeId);
        } else {
            this.expandedNodes.add(nodeId);
        }
        
        this.refreshTree();
    }

    /**
     * Sélectionne un nœud
     */
    private selectNode(nodeId: string, multiSelect = false): void {
        if (!multiSelect) {
            this.selectedNodes.clear();
        }
        
        if (this.selectedNodes.has(nodeId)) {
            this.selectedNodes.delete(nodeId);
        } else {
            this.selectedNodes.add(nodeId);
        }
        
        // Trouver le nœud correspondant
        const treeNode = this.findTreeNode(nodeId);
        if (treeNode) {
            this.onNodeSelectCallbacks.forEach(callback => callback(treeNode.node));
        }
        
        this.refreshTree();
    }

    /**
     * Bascule la visibilité d'un nœud
     */
    private toggleNodeVisibility(nodeId: string): void {
        const treeNode = this.findTreeNode(nodeId);
        if (treeNode) {
            const newVisibility = !treeNode.node.visible;
            treeNode.node.visible = newVisibility;
            this.onNodeVisibilityCallbacks.forEach(callback => 
                callback(treeNode.node, newVisibility));
            this.refreshTree();
        }
    }

    /**
     * Trouve un nœud dans l'arbre par son ID
     */
    private findTreeNode(nodeId: string): SceneTreeNode | null {
        const search = (nodes: SceneTreeNode[]): SceneTreeNode | null => {
            for (const node of nodes) {
                if (node.id === nodeId) return node;
                const found = search(node.children);
                if (found) return found;
            }
            return null;
        };
        
        return search(this.treeData);
    }

    /**
     * Développe tous les nœuds
     */
    private expandAll(): void {
        const addAllIds = (nodes: SceneTreeNode[]) => {
            nodes.forEach(node => {
                this.expandedNodes.add(node.id);
                addAllIds(node.children);
            });
        };
        
        addAllIds(this.treeData);
        this.refreshTree();
    }

    /**
     * Réduit tous les nœuds
     */
    private collapseAll(): void {
        this.expandedNodes.clear();
        this.refreshTree();
    }

    /**
     * Filtre l'arbre selon une requête
     */
    private filterTree(query: string): void {
        const filterNodes = (nodes: SceneTreeNode[]): SceneTreeNode[] => {
            return nodes.filter(node => {
                const matchesQuery = query === '' || 
                    node.name.toLowerCase().includes(query.toLowerCase()) ||
                    node.type.toLowerCase().includes(query.toLowerCase());
                
                node.children = filterNodes(node.children);
                return matchesQuery || node.children.length > 0;
            });
        };
        
        if (query.trim() === '') {
            this.refreshTree();
        }
        else {
            this.treeData = filterNodes([...this.treeData]);
            this.renderTree();
        }
    }

    /**
     * Supprime les nœuds sélectionnés
     */
    private deleteSelectedNodes(): void {
        if (this.selectedNodes.size === 0) return;
        
        const selectedTreeNodes = Array.from(this.selectedNodes)
            .map(id => this.findTreeNode(id))
            .filter(node => node !== null) as SceneTreeNode[];
        
        if (selectedTreeNodes.length === 0) return;
        
        const confirmed = confirm(
            `Supprimer ${selectedTreeNodes.length} nœud(s) sélectionné(s) ?`
        );
        
        if (confirmed) {
            selectedTreeNodes.forEach(treeNode => {
                this.onNodeDeleteCallbacks.forEach(callback => callback(treeNode.node));
            });
            
            this.selectedNodes.clear();
            this.refreshTree();
        }
    }

    /**
     * Renomme le nœud sélectionné
     */
    private renameSelectedNode(): void {
        if (this.selectedNodes.size !== 1) return;
        
        const nodeId = Array.from(this.selectedNodes)[0];
        this.startRenaming(nodeId);
    }

    /**
     * Démarre le renommage d'un nœud
     */
    private startRenaming(nodeId: string): void {
        const nodeElement = this.treeContainer.querySelector(`[data-node-id="${nodeId}"]`);
        const nameElement = nodeElement?.querySelector('.tree-node__name') as HTMLElement;
        
        if (!nameElement) return;
        
        const currentName = nameElement.textContent || '';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'tree-node__name-input';
        
        const finishRename = () => {
            const newName = input.value.trim();
            if (newName && newName !== currentName) {
                const treeNode = this.findTreeNode(nodeId);
                if (treeNode) {
                    treeNode.node.name = newName;
                    this.refreshTree();
                }
            } else {
                nameElement.textContent = currentName;
                nameElement.style.display = '';
            }
            input.remove();
        };
        
        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishRename();
            if (e.key === 'Escape') {
                nameElement.style.display = '';
                input.remove();
            }
        });
        
        nameElement.style.display = 'none';
        nameElement.parentElement!.insertBefore(input, nameElement.nextSibling);
        input.focus();
        input.select();
    }

    /**
     * Affiche le menu contextuel
     */
    private showContextMenu(nodeId: string, event: Event): void {
        event.preventDefault();
        
        // TODO: Implémenter le menu contextuel
        console.log('Menu contextuel pour le nœud:', nodeId);
    }

    private showAddNodeDialog(): void {
        // Check if the dialog already exists
        const existingDialog = this.contentElement.querySelector('.add-node-dialog');
        if (existingDialog) {
            existingDialog.remove();
            return;
        }

        const dialog = document.createElement('div');
        dialog.className = 'add-node-dialog';

        let html = '<h1>Ajouter un objet</h1>';
        for (const category in this.creatableObjects) {
            html += `<div class="category"><h2>${category}</h2>`;
            this.creatableObjects[category].forEach(obj => {
                html += `<button class="object-button" data-id="${obj.id}">${obj.name}</button>`;
            });
            html += `</div>`;
        }
        dialog.innerHTML = html;

        dialog.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('object-button')) {
                const objectId = target.dataset.id;
                if (objectId) {
                    this.onObjectCreateRequestCallbacks.forEach(cb => cb(objectId));
                }
                dialog.remove();
            }
        });

        const style = document.createElement('style');
        style.textContent = `
            .add-node-dialog {
                position: absolute;
                top: 40px;
                left: 10px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-primary);
                padding: 16px;
                z-index: 100;
                max-height: 400px;
                overflow-y: auto;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                border-radius: 4px;
            }
            .add-node-dialog h1 { margin-top: 0; font-size: 18px; }
            .add-node-dialog .category h2 { font-size: 16px; margin-top: 10px; margin-bottom: 5px; border-bottom: 1px solid var(--border-secondary); padding-bottom: 5px; }
            .add-node-dialog .object-button { 
                display: block;
                width: 100%;
                padding: 8px;
                margin-bottom: 4px;
                text-align: left;
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid var(--border-secondary);
                cursor: pointer;
                border-radius: 3px;
            }
            .add-node-dialog .object-button:hover {
                background: var(--bg-hover);
                border-color: var(--accent-primary);
            }
        `;
        dialog.appendChild(style);

        this.contentElement.appendChild(dialog);
    }

    /**
     * Efface la sélection
     */
    private clearSelection(): void {
        this.selectedNodes.clear();
        this.refreshTree();
    }

    // === ÉVÉNEMENTS PUBLICS ===

    onNodeSelect(callback: (node: Node3D) => void): void {
        this.onNodeSelectCallbacks.push(callback);
    }

    onNodeVisibilityChange(callback: (node: Node3D, visible: boolean) => void): void {
        this.onNodeVisibilityCallbacks.push(callback);
    }

    onNodeDelete(callback: (node: Node3D) => void): void {
        this.onNodeDeleteCallbacks.push(callback);
    }

    public setCreatableObjects(categories: Record<string, ObjectInfo[]>) {
        this.creatableObjects = categories;
    }

    public onObjectCreateRequest(callback: (objectId: string) => void) {
        this.onObjectCreateRequestCallbacks.push(callback);
    }

    // === GETTERS ===

    get selectedNodeIds(): string[] {
        return Array.from(this.selectedNodes);
    }

    get selectedNode(): Node3D | null {
        if (this.selectedNodes.size !== 1) return null;
        const nodeId = Array.from(this.selectedNodes)[0];
        const treeNode = this.findTreeNode(nodeId);
        return treeNode ? treeNode.node : null;
    }
}
