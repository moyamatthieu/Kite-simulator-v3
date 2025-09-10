/**
 * `point.ts` - Objet point visuel pour la simulation
 *
 * Représente un point dans l'espace 3D avec une sphère visible.
 * Utile pour le debug, les marqueurs de position, ou les indicateurs visuels.
 */

import * as THREE from 'three';
import { C_objet, C_objetConfig } from './C_objet';

export interface PointConfig extends C_objetConfig {
    radius?: number;
    color?: number;
    position?: THREE.Vector3;
    name?: string;
}

export class Point extends C_objet {
    private sphere!: THREE.Mesh;
    private radius: number;
    private color: number;

    constructor(config: PointConfig = {}) {
        super(config);

        this.radius = config.radius || 0.05;
        this.color = config.color || 0xff0000; // Rouge par défaut

        this.group.name = config.name || 'Point';

        if (config.position) {
            this.group.position.copy(config.position);
        }

        this.createGeometry();
    }

    protected createGeometry(): void {
        // Création de la géométrie sphérique
        const geometry = new THREE.SphereGeometry(this.radius, 16, 12);

        // Matériau avec couleur et propriétés
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.4,
            metalness: 0.1,
            transparent: false
        });

        // Création du mesh
        this.sphere = new THREE.Mesh(geometry, material);
        this.sphere.castShadow = true;
        this.sphere.receiveShadow = true;
        this.sphere.name = 'PointSphere';

        this.group.add(this.sphere);
    }

    /**
     * Définit la couleur du point
     */
    public setColor(color: number): void {
        this.color = color;
        if (this.sphere.material instanceof THREE.MeshStandardMaterial) {
            this.sphere.material.color.setHex(color);
        }
    }

    /**
     * Obtient la couleur actuelle du point
     */
    public getColor(): number {
        return this.color;
    }

    /**
     * Définit le rayon du point
     */
    public setRadius(radius: number): void {
        this.radius = radius;

        // Recréer la géométrie avec le nouveau rayon
        if (this.sphere.geometry) {
            this.sphere.geometry.dispose();
        }

        const newGeometry = new THREE.SphereGeometry(radius, 16, 12);
        this.sphere.geometry = newGeometry;
    }

    /**
     * Obtient le rayon actuel du point
     */
    public getRadius(): number {
        return this.radius;
    }

    /**
     * Active/désactive la visibilité du point
     */
    public setVisible(visible: boolean): void {
        super.setVisible(visible);
    }

    /**
     * Définit la position du point
     */
    public setPosition(position: THREE.Vector3): void {
        super.setPosition(position);
    }

    /**
     * Obtient la position actuelle du point
     */
    public getPosition(): THREE.Vector3 {
        return super.getPosition();
    }

    /**
     * Définit l'échelle du point
     */
    public setScale(scale: THREE.Vector3): void {
        super.setScale(scale);
    }

    /**
     * Obtient l'échelle actuelle du point
     */
    public getScale(): THREE.Vector3 {
        return super.getScale();
    }

    /**
     * Définit la rotation du point
     */
    public setRotation(rotation: THREE.Euler): void {
        super.setRotation(rotation);
    }

    /**
     * Obtient la rotation actuelle du point
     */
    public getRotation(): THREE.Euler {
        return super.getRotation();
    }

    /**
     * Obtient le mesh de la sphère
     */
    public getSphere(): THREE.Mesh {
        return this.sphere;
    }

    /**
     * Définit l'opacité du point (0 = transparent, 1 = opaque)
     */
    public setOpacity(opacity: number): void {
        if (this.sphere.material instanceof THREE.MeshStandardMaterial) {
            this.sphere.material.transparent = opacity < 1;
            this.sphere.material.opacity = opacity;
        }
    }

    /**
     * Obtient l'opacité actuelle du point
     */
    public getOpacity(): number {
        if (this.sphere.material instanceof THREE.MeshStandardMaterial) {
            return this.sphere.material.opacity;
        }
        return 1;
    }

    /**
     * Anime le point avec une pulsation
     */
    public startPulsing(intensity: number = 0.3, speed: number = 2): void {
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
        // Remettre à l'échelle originale
        this.setScale(new THREE.Vector3(1, 1, 1));
    }

    /**
     * Crée un point temporaire qui se détruit automatiquement
     */
    public static createTemporary(
        position: THREE.Vector3,
        duration: number = 2000,
        config: PointConfig = {}
    ): Point {
        const point = new Point({
            ...config,
            position: position
        });

        // Animation d'apparition
        point.setOpacity(0);
        point.setOpacity(1);

        // Destruction automatique après la durée
        setTimeout(() => {
            point.dispose();
        }, duration);

        return point;
    }

    /**
     * Nettoie les ressources du point
     */
    public dispose(): void {
        // Nettoyer la géométrie et le matériau
        if (this.sphere.geometry) {
            this.sphere.geometry.dispose();
        }
        if (this.sphere.material) {
            if (Array.isArray(this.sphere.material)) {
                this.sphere.material.forEach(material => material.dispose());
            } else {
                this.sphere.material.dispose();
            }
        }

        // Appeler la méthode dispose de la classe parente
        super.dispose();
    }

    /**
     * Informations de debug pour le point
     */
    public getDebugInfo(): object {
        return {
            ...super.getDebugInfo(),
            radius: this.radius,
            color: this.color.toString(16),
            opacity: this.getOpacity()
        };
    }
}
