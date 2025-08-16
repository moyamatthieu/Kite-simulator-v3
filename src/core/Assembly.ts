/**
 * Assembly - Système d'assemblage de primitives
 * Principe KISS : composition simple parent-enfant
 * Hérite de THREE.Group pour une compatibilité totale
 */

import * as THREE from 'three';
import { Position3D, Rotation3D } from '../types';

export class Assembly extends THREE.Group {
    parts: THREE.Mesh[] = [];
    private initialPositions: Map<THREE.Mesh, THREE.Vector3> = new Map();
    private labels: THREE.Sprite[] = [];
    
    constructor(name: string) {
        super();
        this.name = name;
    }

    /**
     * Ajouter une primitive à l'assemblage
     */
    add(...objects: THREE.Object3D[]): this;
    add(
        mesh: THREE.Mesh, 
        position?: Position3D, 
        rotation?: Rotation3D
    ): this;
    add(...args: any[]): this {
        // Si c'est un appel THREE.Group standard
        if (args.length === 1 && args[0] instanceof THREE.Object3D && !(args[0] instanceof THREE.Mesh)) {
            super.add(args[0]);
            return this;
        }
        
        // Si c'est plusieurs objets
        if (args.length > 1 && args.every(arg => arg instanceof THREE.Object3D)) {
            args.forEach(obj => super.add(obj));
            return this;
        }
        
        // Si c'est notre API custom avec position/rotation
        const mesh = args[0] as THREE.Mesh;
        const position = args[1] as Position3D || [0, 0, 0];
        const rotation = args[2] as Rotation3D;
        
        if (mesh instanceof THREE.Mesh) {
            mesh.position.set(...position);
            if (rotation) {
                mesh.rotation.set(...rotation);
            }
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            // Sauvegarder la position initiale
            this.initialPositions.set(mesh, mesh.position.clone());
            
            super.add(mesh);
            this.parts.push(mesh);
        } else {
            // Fallback pour d'autres types d'objets
            super.add(mesh);
        }
        
        return this;
    }

    /**
     * Obtenir le groupe Three.js (pour compatibilité)
     */
    getGroup(): THREE.Group {
        return this;
    }
    
    /**
     * Nombre de primitives
     */
    getPrimitiveCount(): number {
        return this.parts.length;
    }

    /**
     * Éclater l'assemblage (pour visualisation)
     */
    explode(factor = 2): void {
        const center = new THREE.Vector3();
        this.getWorldPosition(center);
        
        this.parts.forEach(part => {
            const dir = new THREE.Vector3();
            part.getWorldPosition(dir);
            dir.sub(center).multiplyScalar(factor - 1);
            part.position.add(dir);
        });
    }
    
    /**
     * Réinitialiser les positions
     */
    reset(): void {
        this.parts.forEach(part => {
            const initialPos = this.initialPositions.get(part);
            if (initialPos) {
                part.position.copy(initialPos);
            }
        });
    }

    /**
     * Cloner l'assemblage
     */
    clone(recursive?: boolean): Assembly {
        const cloned = new Assembly(this.name + '_clone');
        
        // Copier les propriétés de transformation
        cloned.position.copy(this.position);
        cloned.rotation.copy(this.rotation);
        cloned.scale.copy(this.scale);
        
        // Cloner les parties
        this.parts.forEach(part => {
            const clonedMesh = part.clone();
            const initialPos = this.initialPositions.get(part);
            if (initialPos) {
                cloned.add(
                    clonedMesh,
                    [initialPos.x, initialPos.y, initialPos.z] as Position3D
                );
            }
        });
        
        // Cloner les labels
        this.labels.forEach(label => {
            const clonedLabel = label.clone();
            cloned.add(clonedLabel);
            cloned.labels.push(clonedLabel);
        });
        
        return cloned;
    }

    /**
     * Ajouter un label à un point structurel
     */
    addLabel(text: string, position: Position3D, color: string = '#ffffff', scale: number = 0.3): void {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 128;
        canvas.height = 64;
        
        // Fond semi-transparent
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Texte
        context.font = 'Bold 24px Arial';
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 64, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(...position);
        sprite.scale.set(scale, scale * 0.5, 1);
        
        super.add(sprite);
        this.labels.push(sprite);
    }

    /**
     * Afficher/Masquer les labels
     */
    toggleLabels(visible: boolean): void {
        this.labels.forEach(label => {
            label.visible = visible;
        });
    }

    /**
     * Obtenir les labels
     */
    getLabels(): THREE.Sprite[] {
        return this.labels;
    }
}