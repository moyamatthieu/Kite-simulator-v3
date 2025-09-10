/**
 * `sail.ts` - Objet voile/surface portante pour la simulation
 *
 * Représente une voile ou surface portante dans l'espace 3D.
 * Utile pour les voiles de bateau, parachutes, ailes, ou autres surfaces aérodynamiques.
 */

import * as THREE from 'three';
import { C_objet, C_objetConfig } from './C_objet';

export interface SailConfig extends C_objetConfig {
    width?: number;
    height?: number;
    shape?: 'triangle' | 'rectangle' | 'trapezoid';
    color?: number;
    opacity?: number;
    position?: THREE.Vector3;
    name?: string;
    doubleSided?: boolean;
    wireframe?: boolean;
    aerodynamic?: boolean;
    liftCoefficient?: number;
    dragCoefficient?: number;
}

export class Sail extends C_objet {
    private mesh!: THREE.Mesh;
    private wireframeMesh?: THREE.Mesh;
    private width: number;
    private height: number;
    private shape: 'triangle' | 'rectangle' | 'trapezoid';
    private color: number;
    private opacity: number;
    private doubleSided: boolean;
    private wireframe: boolean;
    private aerodynamic: boolean;
    private liftCoefficient: number;
    private dragCoefficient: number;

    constructor(config: SailConfig = {}) {
        super(config);

        this.width = config.width || 2;
        this.height = config.height || 1;
        this.shape = config.shape || 'triangle';
        this.color = config.color || 0xffffff;
        this.opacity = config.opacity || 0.8;
        this.doubleSided = config.doubleSided || true;
        this.wireframe = config.wireframe || false;
        this.aerodynamic = config.aerodynamic || false;
        this.liftCoefficient = config.liftCoefficient || 1.0;
        this.dragCoefficient = config.dragCoefficient || 0.1;

        this.group.name = config.name || 'Sail';

        if (config.position) {
            this.group.position.copy(config.position);
        }

        this.createGeometry();
    }

    protected createGeometry(): void {
        this.createSailMesh();

        if (this.wireframe) {
            this.createWireframe();
        }
    }

    private createSailMesh(): void {
        let geometry: THREE.BufferGeometry;

        switch (this.shape) {
            case 'triangle':
                geometry = this.createTriangleGeometry();
                break;
            case 'rectangle':
                geometry = this.createRectangleGeometry();
                break;
            case 'trapezoid':
                geometry = this.createTrapezoidGeometry();
                break;
            default:
                geometry = this.createTriangleGeometry();
        }

        // Calcul des normales pour l'éclairage
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            transparent: this.opacity < 1,
            opacity: this.opacity,
            side: this.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
            roughness: 0.1,
            metalness: 0.0
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = 'SailMesh';
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.group.add(this.mesh);
    }

    private createTriangleGeometry(): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();

        // Triangle équilatéral
        const halfWidth = this.width / 2;
        const vertices = new Float32Array([
            -halfWidth, 0, 0,           // Bas gauche
            halfWidth, 0, 0,            // Bas droite
            0, this.height, 0           // Haut centre
        ]);

        const uvs = new Float32Array([
            0, 0,   // Bas gauche
            1, 0,   // Bas droite
            0.5, 1  // Haut centre
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        return geometry;
    }

    private createRectangleGeometry(): THREE.BufferGeometry {
        const geometry = new THREE.PlaneGeometry(this.width, this.height);

        // Rotation pour que la voile soit verticale
        geometry.rotateX(-Math.PI / 2);

        return geometry;
    }

    private createTrapezoidGeometry(): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();

        // Trapèze (plus large en bas)
        const topWidth = this.width * 0.6;
        const halfWidth = this.width / 2;
        const halfTopWidth = topWidth / 2;

        const vertices = new Float32Array([
            -halfWidth, 0, 0,           // Bas gauche
            halfWidth, 0, 0,            // Bas droite
            halfTopWidth, this.height, 0, // Haut droite
            -halfTopWidth, this.height, 0  // Haut gauche
        ]);

        const indices = [
            0, 1, 2,  // Triangle bas
            0, 2, 3   // Triangle haut
        ];

        const uvs = new Float32Array([
            0, 0,   // Bas gauche
            1, 0,   // Bas droite
            0.7, 1, // Haut droite
            0.3, 1  // Haut gauche
        ]);

        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        return geometry;
    }

    private createWireframe(): void {
        if (!this.mesh) return;

        const wireframeGeometry = this.mesh.geometry.clone();
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });

        this.wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
        this.wireframeMesh.name = 'SailWireframe';
        this.group.add(this.wireframeMesh);
    }

    /**
     * Définit les dimensions de la voile
     */
    public setDimensions(width: number, height: number): void {
        this.width = width;
        this.height = height;

        // Recréer la géométrie
        this.clearGeometry();
        this.createGeometry();
    }

    /**
     * Obtient les dimensions actuelles
     */
    public getDimensions(): { width: number; height: number } {
        return {
            width: this.width,
            height: this.height
        };
    }

    /**
     * Définit la forme de la voile
     */
    public setShape(shape: 'triangle' | 'rectangle' | 'trapezoid'): void {
        this.shape = shape;

        // Recréer la géométrie
        this.clearGeometry();
        this.createGeometry();
    }

    /**
     * Obtient la forme actuelle
     */
    public getShape(): string {
        return this.shape;
    }

    /**
     * Définit la couleur de la voile
     */
    public setColor(color: number): void {
        this.color = color;
        if (this.mesh.material instanceof THREE.MeshStandardMaterial) {
            this.mesh.material.color.setHex(color);
        }
    }

    /**
     * Obtient la couleur actuelle
     */
    public getColor(): number {
        return this.color;
    }

    /**
     * Définit l'opacité de la voile
     */
    public setOpacity(opacity: number): void {
        this.opacity = opacity;
        if (this.mesh.material instanceof THREE.MeshStandardMaterial) {
            this.mesh.material.transparent = opacity < 1;
            this.mesh.material.opacity = opacity;
        }
    }

    /**
     * Obtient l'opacité actuelle
     */
    public getOpacity(): number {
        return this.opacity;
    }

    /**
     * Active/désactive le wireframe
     */
    public setWireframe(enabled: boolean): void {
        if (this.wireframe === enabled) return;

        this.wireframe = enabled;

        if (enabled && !this.wireframeMesh) {
            this.createWireframe();
        } else if (!enabled && this.wireframeMesh) {
            this.group.remove(this.wireframeMesh);
            this.wireframeMesh.geometry.dispose();
            if (this.wireframeMesh.material instanceof THREE.Material) {
                this.wireframeMesh.material.dispose();
            }
            this.wireframeMesh = undefined;
        }
    }

    /**
     * Définit les coefficients aérodynamiques
     */
    public setAerodynamicCoefficients(liftCoeff: number, dragCoeff: number): void {
        this.liftCoefficient = liftCoeff;
        this.dragCoefficient = dragCoeff;
    }

    /**
     * Obtient les coefficients aérodynamiques
     */
    public getAerodynamicCoefficients(): { lift: number; drag: number } {
        return {
            lift: this.liftCoefficient,
            drag: this.dragCoefficient
        };
    }

    /**
     * Calcule la surface de la voile
     */
    public getArea(): number {
        switch (this.shape) {
            case 'triangle':
                return (this.width * this.height) / 2;
            case 'rectangle':
                return this.width * this.height;
            case 'trapezoid':
                const topWidth = this.width * 0.6;
                return ((this.width + topWidth) / 2) * this.height;
            default:
                return (this.width * this.height) / 2;
        }
    }

    /**
     * Calcule la normale de la surface (direction de la voile)
     */
    public getNormal(): THREE.Vector3 {
        const normal = new THREE.Vector3(0, 0, 1);
        return normal.applyQuaternion(this.group.quaternion);
    }

    /**
     * Calcule le centre de la voile dans l'espace monde
     */
    public getWorldCenter(): THREE.Vector3 {
        const center = new THREE.Vector3();
        this.group.getWorldPosition(center);
        return center;
    }

    /**
     * Applique une force au vent simulé
     */
    public applyWindForce(windVector: THREE.Vector3, airDensity: number = 1.225): {
        lift: THREE.Vector3;
        drag: THREE.Vector3;
        total: THREE.Vector3;
    } {
        if (!this.aerodynamic) {
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                total: new THREE.Vector3()
            };
        }

        const area = this.getArea();
        const normal = this.getNormal();
        const windSpeed = windVector.length();

        if (windSpeed < 0.1) {
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                total: new THREE.Vector3()
            };
        }

        // Force dynamique = 0.5 * ρ * v² * A
        const dynamicPressure = 0.5 * airDensity * windSpeed * windSpeed * area;

        // Portance (perpendiculaire au vent et à la normale)
        const liftDirection = new THREE.Vector3()
            .crossVectors(windVector, normal)
            .normalize();
        const lift = liftDirection.multiplyScalar(dynamicPressure * this.liftCoefficient);

        // Traînée (dans la direction opposée au vent)
        const dragDirection = windVector.clone().normalize().negate();
        const drag = dragDirection.multiplyScalar(dynamicPressure * this.dragCoefficient);

        const total = lift.clone().add(drag);

        return { lift, drag, total };
    }

    /**
     * Anime la voile avec un effet de gonflement
     */
    public startBillowing(intensity: number = 0.1, speed: number = 1): void {
        const originalScale = this.getScale().clone();

        const animate = () => {
            const time = Date.now() * 0.001 * speed;
            const billow = Math.sin(time) * intensity;

            const currentScale = originalScale.clone();
            currentScale.z *= (1 + billow); // Gonflement dans la direction de la normale

            this.setScale(currentScale);

            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Arrête l'animation de gonflement
     */
    public stopBillowing(): void {
        this.setScale(new THREE.Vector3(1, 1, 1));
    }

    /**
     * Crée une voile temporaire qui se détruit automatiquement
     */
    public static createTemporary(
        position: THREE.Vector3,
        dimensions: { width: number; height: number },
        duration: number = 5000,
        config: SailConfig = {}
    ): Sail {
        const sail = new Sail({
            ...config,
            ...dimensions,
            position: position
        });

        // Destruction automatique après la durée
        setTimeout(() => {
            sail.dispose();
        }, duration);

        return sail;
    }

    /**
     * Crée une voile de bateau
     */
    public static createBoatSail(
        position: THREE.Vector3,
        config: SailConfig = {}
    ): Sail {
        return new Sail({
            ...config,
            position: position,
            shape: 'trapezoid',
            color: 0xffffff,
            opacity: 0.9,
            aerodynamic: true,
            liftCoefficient: 1.2,
            dragCoefficient: 0.15
        });
    }

    /**
     * Crée un parachute
     */
    public static createParachute(
        position: THREE.Vector3,
        config: SailConfig = {}
    ): Sail {
        return new Sail({
            ...config,
            position: position,
            shape: 'rectangle',
            width: 8,
            height: 8,
            color: 0xffaa00,
            opacity: 0.8,
            aerodynamic: true,
            liftCoefficient: 0.8,
            dragCoefficient: 0.3
        });
    }

    private clearGeometry(): void {
        // Nettoyer le mesh principal
        if (this.mesh) {
            this.group.remove(this.mesh);
            this.mesh.geometry.dispose();
            if (this.mesh.material instanceof THREE.Material) {
                this.mesh.material.dispose();
            }
        }

        // Nettoyer le wireframe
        if (this.wireframeMesh) {
            this.group.remove(this.wireframeMesh);
            this.wireframeMesh.geometry.dispose();
            if (this.wireframeMesh.material instanceof THREE.Material) {
                this.wireframeMesh.material.dispose();
            }
            this.wireframeMesh = undefined;
        }
    }

    /**
     * Nettoie les ressources de la voile
     */
    public dispose(): void {
        this.clearGeometry();

        // Appeler la méthode dispose de la classe parente
        super.dispose();
    }

    /**
     * Informations de debug pour la voile
     */
    public getDebugInfo(): object {
        return {
            ...super.getDebugInfo(),
            dimensions: this.getDimensions(),
            shape: this.shape,
            color: this.color.toString(16),
            opacity: this.opacity,
            area: this.getArea(),
            aerodynamic: this.aerodynamic,
            coefficients: this.getAerodynamicCoefficients(),
            wireframe: this.wireframe,
            doubleSided: this.doubleSided
        };
    }
}
