/**
 * Node3D.ts - Refactorisation de Node3D avec composition
 * Respecte les principes SOLID : SRP, OCP, LSP, ISP, DIP
 */

import * as THREE from 'three';
import { SignalManager } from './SignalManager';
import { TreeManager } from './TreeManager';
import { logger } from './Logger';

/**
 * Transform3D compatible Godot
 */
export interface Transform3D {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
}

/**
 * Interface pour le cycle de vie Godot
 */
export interface IGodotLifecycle {
    _ready(): void;
    _process(delta: number): void;
    _physics_process(delta: number): void;
}

/**
 * Node3D - Équivalent du Node3D de Godot
 * Refactorisé avec composition au lieu d'héritage multiple
 * Respecte le principe de responsabilité unique
 */
export class Node3D extends THREE.Group implements IGodotLifecycle {
    // 🎮 Propriétés Godot-like
    public transform: Transform3D;

    // 🏷️ Métadonnées
    public readonly nodeId: string;
    public nodeType: string = 'Node3D';

    // 🔧 État interne
    protected isReady: boolean = false;

    // 📦 Composition - Gestionnaires spécialisés
    public readonly signalManager: SignalManager;
    public readonly treeManager: TreeManager;

    constructor(name: string = 'Node3D') {
        super();
        this.name = name;
        this.nodeId = this.generateNodeId();

        // Initialiser les gestionnaires
        this.signalManager = new SignalManager();
        this.treeManager = new TreeManager(this);

        // Transform3D unifié
        this.transform = {
            position: this.position,
            rotation: this.rotation,
            scale: this.scale
        };

        // Auto-initialisation
        this.callReady();

        logger.debug(`Node3D créé: ${this.get_description()}`, 'Node3D');
    }

    /**
     * Génère un ID unique pour le node (compatible Godot)
     */
    private generateNodeId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `node_${timestamp}_${random}`;
    }

    // === 🎮 Méthodes Cycle de Vie Godot ===

    /**
     * _ready() - Appelé une seule fois quand le node est ajouté à la scène
     */
    public _ready(): void {
        // À overrider dans les classes dérivées
        logger.debug(`_ready() appelé pour ${this.name}`, 'Node3D');
    }

    /**
     * _process() - Appelé à chaque frame
     */
    public _process(delta: number): void {
        // À overrider dans les classes dérivées
    }

    /**
     * _physics_process() - Appelé à chaque frame physique
     */
    public _physics_process(delta: number): void {
        // À overrider dans les classes dérivées
    }

    /**
     * Appel automatique de _ready()
     */
    private callReady(): void {
        if (!this.isReady) {
            this.isReady = true;
            this._ready();
        }
    }

    // === 🔗 Gestion des Signaux - Délégation ===

    /**
     * Définit un signal (équivalent signal en GDScript)
     */
    public define_signal(name: string): void {
        this.signalManager.defineSignal(name);
    }

    /**
     * Émet un signal
     */
    public emit_signal(name: string, ...args: any[]): void {
        this.signalManager.emitSignal(name, ...args);
    }

    /**
     * Connecte un signal à une méthode
     */
    public connect(signal: string, target: Node3D, method: string): void {
        this.signalManager.connectSignal(signal, target, method);
    }

    // === 🌳 Gestion de l'Arbre de Nodes - Délégation ===

    /**
     * Ajoute un enfant (compatible Godot)
     */
    public add_child(child: Node3D): void {
        this.treeManager.addChild(child);
    }

    /**
     * Retire un enfant
     */
    public remove_child(child: Node3D): void {
        this.treeManager.removeChild(child);
    }

    /**
     * Trouve un enfant par nom
     */
    public get_node(path: string): Node3D | null {
        return this.treeManager.getNode(path);
    }

    /**
     * Trouve tous les enfants d'un type donné
     */
    public get_children_of_type<T extends Node3D>(type: new (...args: any[]) => T): T[] {
        return this.treeManager.getChildrenOfType(type);
    }

    // === 🔄 Mise à Jour du Cycle de Vie ===

    /**
     * Met à jour le node et tous ses enfants
     */
    public update(delta: number): void {
        if (this.isReady) {
            this._process(delta);
            this._physics_process(delta);

            // Mettre à jour les enfants Node3D
            this.treeManager.getChildren().forEach(child => {
                child.update(delta);
            });
        }
    }

    // === 🏷️ Métadonnées et Debug ===

    /**
     * Retourne une description du node
     */
    public get_description(): string {
        return `${this.nodeType}:${this.name} (${this.nodeId})`;
    }

    /**
     * Affiche l'arbre des nodes (debug)
     */
    public print_tree(indent: number = 0): void {
        this.treeManager.printTree(indent);
    }

    // === 🎯 Compatibilité Three.js ===

    /**
     * Accès direct au transform Three.js
     */
    public get three_transform() {
        return {
            position: this.position,
            rotation: this.rotation,
            scale: this.scale,
            matrix: this.matrix,
            matrixWorld: this.matrixWorld
        };
    }

    // === 🧹 Nettoyage ===

    /**
     * Nettoie les ressources
     */
    public dispose(): void {
        this.signalManager.clearSignals();
        logger.debug(`Node3D nettoyé: ${this.name}`, 'Node3D');
        // Appeler dispose sur les enfants si nécessaire, TreeManager pourrait aussi gérer cela.
        this.treeManager.getChildren().forEach(child => child.dispose());
        this.clear(); // Supprime les objets THREE.js du groupe
    }
}
