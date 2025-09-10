/**
 * `frame.ts` - Objet cadre/structure pour la simulation
 *
 * Représente un cadre ou une boîte dans l'espace 3D avec des lignes.
 * Utile pour les structures, boîtes de collision, cadres de référence, ou zones délimitées.
 */

import * as THREE from 'three';
import { C_objet, C_objetConfig } from './C_objet';

export interface FrameConfig extends C_objetConfig {
    width?: number;
    height?: number;
    depth?: number;
    thickness?: number;
    color?: number;
    position?: THREE.Vector3;
    name?: string;
    filled?: boolean;
    fillColor?: number;
    fillOpacity?: number;
}

export class Frame extends C_objet {
    private lines: THREE.Line[] = [];
    private fillMesh?: THREE.Mesh;
    private width: number;
    private height: number;
    private depth: number;
    private thickness: number;
    private color: number;
    private filled: boolean;
    private fillColor: number;
    private fillOpacity: number;

    constructor(config: FrameConfig = {}) {
        super(config);

        this.width = config.width || 1;
        this.height = config.height || 1;
        this.depth = config.depth || 1;
        this.thickness = config.thickness || 0.02;
        this.color = config.color || 0xffffff;
        this.filled = config.filled || false;
        this.fillColor = config.fillColor || 0x333333;
        this.fillOpacity = config.fillOpacity || 0.1;

        this.group.name = config.name || 'Frame';

        if (config.position) {
            this.group.position.copy(config.position);
        }

        this.createGeometry();
    }

    protected createGeometry(): void {
        this.createFrameLines();

        if (this.filled) {
            this.createFillMesh();
        }
    }

    private createFrameLines(): void {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const halfDepth = this.depth / 2;

        // Définition des 8 sommets du cadre
        const vertices = [
            // Face avant (Z = halfDepth)
            new THREE.Vector3(-halfWidth, -halfHeight, halfDepth),  // 0: bas-gauche
            new THREE.Vector3(halfWidth, -halfHeight, halfDepth),   // 1: bas-droite
            new THREE.Vector3(halfWidth, halfHeight, halfDepth),    // 2: haut-droite
            new THREE.Vector3(-halfWidth, halfHeight, halfDepth),   // 3: haut-gauche

            // Face arrière (Z = -halfDepth)
            new THREE.Vector3(-halfWidth, -halfHeight, -halfDepth), // 4: bas-gauche
            new THREE.Vector3(halfWidth, -halfHeight, -halfDepth),  // 5: bas-droite
            new THREE.Vector3(halfWidth, halfHeight, -halfDepth),   // 6: haut-droite
            new THREE.Vector3(-halfWidth, halfHeight, -halfDepth),  // 7: haut-gauche
        ];

        // Définition des arêtes (12 lignes pour un cadre complet)
        const edges = [
            // Face avant
            [vertices[0], vertices[1]], // bas
            [vertices[1], vertices[2]], // droite
            [vertices[2], vertices[3]], // haut
            [vertices[3], vertices[0]], // gauche

            // Face arrière
            [vertices[4], vertices[5]], // bas
            [vertices[5], vertices[6]], // droite
            [vertices[6], vertices[7]], // haut
            [vertices[7], vertices[4]], // gauche

            // Arêtes de liaison
            [vertices[0], vertices[4]], // bas-gauche avant-arrière
            [vertices[1], vertices[5]], // bas-droite avant-arrière
            [vertices[2], vertices[6]], // haut-droite avant-arrière
            [vertices[3], vertices[7]], // haut-gauche avant-arrière
        ];

        // Création des lignes
        const material = new THREE.LineBasicMaterial({
            color: this.color,
            linewidth: this.thickness * 100 // Three.js linewidth est en pixels
        });

        edges.forEach((edge, index) => {
            const geometry = new THREE.BufferGeometry().setFromPoints(edge);
            const line = new THREE.Line(geometry, material);
            line.name = `FrameEdge_${index}`;
            this.lines.push(line);
            this.group.add(line);
        });
    }

    private createFillMesh(): void {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshStandardMaterial({
            color: this.fillColor,
            transparent: true,
            opacity: this.fillOpacity,
            side: THREE.DoubleSide
        });

        this.fillMesh = new THREE.Mesh(geometry, material);
        this.fillMesh.name = 'FrameFill';
        this.group.add(this.fillMesh);
    }

    /**
     * Définit les dimensions du cadre
     */
    public setDimensions(width: number, height: number, depth: number): void {
        this.width = width;
        this.height = height;
        this.depth = depth;

        // Recréer la géométrie
        this.clearGeometry();
        this.createGeometry();
    }

    /**
     * Obtient les dimensions actuelles
     */
    public getDimensions(): { width: number; height: number; depth: number } {
        return {
            width: this.width,
            height: this.height,
            depth: this.depth
        };
    }

    /**
     * Définit la couleur des lignes du cadre
     */
    public setColor(color: number): void {
        this.color = color;
        this.lines.forEach(line => {
            if (line.material instanceof THREE.LineBasicMaterial) {
                line.material.color.setHex(color);
            }
        });
    }

    /**
     * Obtient la couleur actuelle des lignes
     */
    public getColor(): number {
        return this.color;
    }

    /**
     * Définit l'épaisseur des lignes
     */
    public setThickness(thickness: number): void {
        this.thickness = thickness;
        this.lines.forEach(line => {
            if (line.material instanceof THREE.LineBasicMaterial) {
                line.material.linewidth = thickness * 100;
            }
        });
    }

    /**
     * Obtient l'épaisseur actuelle des lignes
     */
    public getThickness(): number {
        return this.thickness;
    }

    /**
     * Active/désactive le remplissage du cadre
     */
    public setFilled(filled: boolean): void {
        if (this.filled === filled) return;

        this.filled = filled;

        if (filled && !this.fillMesh) {
            this.createFillMesh();
        } else if (!filled && this.fillMesh) {
            this.group.remove(this.fillMesh);
            this.fillMesh.geometry.dispose();
            if (this.fillMesh.material instanceof THREE.Material) {
                this.fillMesh.material.dispose();
            }
            this.fillMesh = undefined;
        }
    }

    /**
     * Définit la couleur et l'opacité du remplissage
     */
    public setFill(fillColor: number, fillOpacity: number = 0.1): void {
        this.fillColor = fillColor;
        this.fillOpacity = fillOpacity;

        if (this.fillMesh && this.fillMesh.material instanceof THREE.MeshStandardMaterial) {
            this.fillMesh.material.color.setHex(fillColor);
            this.fillMesh.material.opacity = fillOpacity;
        }
    }

    /**
     * Vérifie si le point est à l'intérieur du cadre
     */
    public containsPoint(point: THREE.Vector3): boolean {
        const localPoint = point.clone().sub(this.group.position);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const halfDepth = this.depth / 2;

        return (
            localPoint.x >= -halfWidth && localPoint.x <= halfWidth &&
            localPoint.y >= -halfHeight && localPoint.y <= halfHeight &&
            localPoint.z >= -halfDepth && localPoint.z <= halfDepth
        );
    }

    /**
     * Obtient les limites du cadre (bounding box)
     */
    public getBoundingBox(): THREE.Box3 {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const halfDepth = this.depth / 2;

        const min = new THREE.Vector3(
            this.group.position.x - halfWidth,
            this.group.position.y - halfHeight,
            this.group.position.z - halfDepth
        );

        const max = new THREE.Vector3(
            this.group.position.x + halfWidth,
            this.group.position.y + halfHeight,
            this.group.position.z + halfDepth
        );

        return new THREE.Box3(min, max);
    }

    /**
     * Anime le cadre avec une pulsation
     */
    public startPulsing(intensity: number = 0.2, speed: number = 1): void {
        const originalScale = this.getScale().clone();
        const targetScale = originalScale.clone().multiplyScalar(1 + intensity);

        const animate = () => {
            const time = Date.now() * 0.001 * speed;
            const pulse = Math.sin(time) * 0.5 + 0.5; // 0 à 1

            const currentScale = originalScale.clone().lerp(targetScale, pulse);
            this.setScale(currentScale);

            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Arrête l'animation de pulsation
     */
    public stopPulsing(): void {
        this.setScale(new THREE.Vector3(1, 1, 1));
    }

    /**
     * Crée un cadre temporaire qui se détruit automatiquement
     */
    public static createTemporary(
        position: THREE.Vector3,
        dimensions: { width: number; height: number; depth: number },
        duration: number = 3000,
        config: FrameConfig = {}
    ): Frame {
        const frame = new Frame({
            ...config,
            ...dimensions,
            position: position
        });

        // Destruction automatique après la durée
        setTimeout(() => {
            frame.dispose();
        }, duration);

        return frame;
    }

    /**
     * Crée un cadre de zone de jeu
     */
    public static createPlayArea(
        center: THREE.Vector3,
        size: number,
        config: FrameConfig = {}
    ): Frame {
        return new Frame({
            ...config,
            position: center,
            width: size,
            height: size,
            depth: size,
            color: 0x00ff00,
            thickness: 0.05
        });
    }

    /**
     * Crée un cadre de collision
     */
    public static createCollisionBox(
        position: THREE.Vector3,
        dimensions: { width: number; height: number; depth: number },
        config: FrameConfig = {}
    ): Frame {
        return new Frame({
            ...config,
            position: position,
            ...dimensions,
            color: 0xff0000,
            thickness: 0.03,
            filled: true,
            fillColor: 0xff0000,
            fillOpacity: 0.05
        });
    }

    private clearGeometry(): void {
        // Nettoyer les lignes existantes
        this.lines.forEach(line => {
            this.group.remove(line);
            line.geometry.dispose();
        });
        this.lines.length = 0;

        // Nettoyer le remplissage s'il existe
        if (this.fillMesh) {
            this.group.remove(this.fillMesh);
            this.fillMesh.geometry.dispose();
            if (this.fillMesh.material instanceof THREE.Material) {
                this.fillMesh.material.dispose();
            }
            this.fillMesh = undefined;
        }
    }

    /**
     * Nettoie les ressources du cadre
     */
    public dispose(): void {
        this.clearGeometry();

        // Appeler la méthode dispose de la classe parente
        super.dispose();
    }

    /**
     * Informations de debug pour le cadre
     */
    public getDebugInfo(): object {
        return {
            ...super.getDebugInfo(),
            dimensions: this.getDimensions(),
            thickness: this.thickness,
            color: this.color.toString(16),
            filled: this.filled,
            fillColor: this.fillColor.toString(16),
            fillOpacity: this.fillOpacity,
            lineCount: this.lines.length
        };
    }
}
