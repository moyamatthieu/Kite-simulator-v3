/**
 * constraints.ts — Gestion des contraintes physiques (sol, limites, etc.)
 */

import * as THREE from 'three';
import { CONFIG } from '@/simulation/config/SimulationConfig';
import { PhysicsConstants } from '@/simulation/physics/PhysicsConstants';
import { KiteGeometry } from '@/simulation/data/KiteGeometry';
import {
    IGroundCollisionSystem,
    IBoundaryConstraints,
    ILineConstraints,
    IPhysicsConstraints
} from '@/simulation/interfaces/physics';

export class GroundCollisionSystem implements IGroundCollisionSystem {
    private groundLevel: number;
    private friction: number;
    private restitution: number;
    private penetrationThreshold: number;
    private kiteGeometry: typeof KiteGeometry; // Devient une référence à la classe statique

    constructor() {
        const physicsConfig = CONFIG.get('physics');
        const kiteConfig = CONFIG.get('kite');
        this.groundLevel = kiteConfig.minHeight; // Initialiser avec la hauteur minimale du kite
        this.friction = PhysicsConstants.GROUND_FRICTION; // Utilise la friction des constantes physiques
        this.restitution = 0.05; // Valeur fixe, un petit rebond
        this.penetrationThreshold = 0.05; // Marge de pénétration avant correction
        this.kiteGeometry = KiteGeometry; // Utilise la classe statique KiteGeometry
    }

    /**
     * Applique les contraintes de collision avec le sol
     */
    applyGroundConstraints(kite: THREE.Object3D, velocity: THREE.Vector3): void {
        // Calculer le point le plus bas du cerf-volant en tenant compte de sa rotation
        const lowestPoint = this.getLowestPoint(kite);
        const minHeight = this.groundLevel + 0.05; // Marge de sécurité

        if (lowestPoint <= minHeight) {
            // Calculer de combien il faut remonter le kite pour que son point le plus bas soit au niveau du sol
            const correctionY = minHeight - lowestPoint;
            kite.position.y += correctionY;

            // Si la vitesse va vers le bas, l'arrêter complètement
            if (velocity.y < 0) {
                velocity.y = 0; // Arrêt immédiat, pas de rebond
            }

            // Appliquer la friction au sol
            velocity.x *= this.friction;
            velocity.z *= this.friction;

            // Debug silencieux - logs supprimés pour éviter le spam
        }
    }

    /**
     * Calcule le point le plus bas du cerf-volant en tenant compte de sa rotation
     */
    private getLowestPoint(kite: THREE.Object3D): number {
        const localPoints = Object.values(this.kiteGeometry.POINTS); // Accès aux points via .POINTS

        let lowestY = Infinity;

        // Transformer chaque point local en coordonnées mondiales et trouver le plus bas
        localPoints.forEach(localPoint => {
            const worldPoint = localPoint.clone()
                .applyQuaternion(kite.quaternion)  // Appliquer la rotation
                .add(kite.position);               // Appliquer la position

            if (worldPoint.y < lowestY) {
                lowestY = worldPoint.y;
            }
        });

        return lowestY;
    }

    /**
     * Vérifie si le kite est au sol
     */
    isOnGround(kite: THREE.Object3D): boolean {
        const lowestPoint = this.getLowestPoint(kite);
        return lowestPoint <= this.groundLevel + this.penetrationThreshold;
    }

    /**
     * Configure les paramètres du système de collision
     */
    setParameters(groundLevel: number, friction?: number, restitution?: number): void {
        this.groundLevel = groundLevel;
        if (friction !== undefined) this.friction = friction;
        if (restitution !== undefined) this.restitution = restitution;
    }
}

export class BoundaryConstraints implements IBoundaryConstraints {
    private bounds: {
        minX: number; maxX: number;
        minY: number; maxY:
        number; minZ: number;
        maxZ: number;
    };
    private damping: number;

    constructor() {
        // En V8, ces bornes n'étaient pas explicitement dans une config,
        // donc nous les initialisons avec des valeurs par défaut raisonnables
        // et offrons une méthode `setBounds` pour les ajuster.
        this.bounds = {
            minX: -50, maxX: 50,
            minY: 0, maxY: 100,
            minZ: -50, maxZ: 50
        };
        this.damping = 0.9; // Amortissement aux limites
    }
    isAtBoundary(kite: THREE.Object3D): boolean {
        throw new Error('Method not implemented.');
    }

    /**
     * Applique les contraintes de limites du monde
     */
    applyBoundaryConstraints(kite: THREE.Object3D, velocity: THREE.Vector3): void {
        let constrained = false;

        // Limite X
        if (kite.position.x < this.bounds.minX) {
            kite.position.x = this.bounds.minX;
            velocity.x *= -this.damping;
            constrained = true;
        } else if (kite.position.x > this.bounds.maxX) {
            kite.position.x = this.bounds.maxX;
            velocity.x *= -this.damping;
            constrained = true;
        }

        // Limite Y (plafond)
        if (kite.position.y > this.bounds.maxY) {
            kite.position.y = this.bounds.maxY;
            velocity.y *= -this.damping;
            constrained = true;
        }

        // Limite Z
        if (kite.position.z < this.bounds.minZ) {
            kite.position.z = this.bounds.minZ;
            velocity.z *= -this.damping;
            constrained = true;
        } else if (kite.position.z > this.bounds.maxZ) {
            kite.position.z = this.bounds.maxZ;
            velocity.z *= -this.damping;
            constrained = true;
        }

        if (constrained) {
            console.log(`🛑 Kite contraint aux limites: [${kite.position.x.toFixed(1)}, ${kite.position.y.toFixed(1)}, ${kite.position.z.toFixed(1)}]`);
        }
    }

    /**
     * Configure les limites du monde
     */
    setBounds(bounds: Partial<typeof this.bounds>): void {
        Object.assign(this.bounds, bounds);
    }
}

export class LineConstraints implements ILineConstraints {
    private baseMaxLength: number;
    private leftMaxLength: number;
    private rightMaxLength: number;
    private tolerance: number;
    private steerShortenFactor: number;

    constructor() {
        const linesConfig = CONFIG.get('lines');
        this.baseMaxLength = linesConfig.defaultLength;
        this.leftMaxLength = linesConfig.defaultLength;
        this.rightMaxLength = linesConfig.defaultLength;
        this.tolerance = PhysicsConstants.LINE_CONSTRAINT_TOLERANCE; // Utilise la tolérance des constantes physiques
        this.steerShortenFactor = 0.1; // Valeur fixe pour l'instant, à exposer si nécessaire
    }

    /**
     * Applique les contraintes de longueur des lignes (PBD) — asymétriques
     */
    enforceConstraints(
        kite: THREE.Object3D,
        predictedPosition: THREE.Vector3,
        leftHandle: THREE.Vector3,
        rightHandle: THREE.Vector3
    ): THREE.Vector3 {
        const constrained = predictedPosition.clone();

        // Contrainte gauche
        const leftDist = leftHandle.distanceTo(constrained);
        if (leftDist > this.leftMaxLength + this.tolerance) {
            const dir = constrained.clone().sub(leftHandle).normalize();
            constrained.copy(leftHandle.clone().add(dir.multiplyScalar(this.leftMaxLength)));
        }

        // Contrainte droite
        const rightDist = rightHandle.distanceTo(constrained);
        if (rightDist > this.rightMaxLength + this.tolerance) {
            const dir = constrained.clone().sub(rightHandle).normalize();
            constrained.copy(rightHandle.clone().add(dir.multiplyScalar(this.rightMaxLength)));
        }

        return constrained;
    }

    /**
     * Vérifie l'état des contraintes
     */
    checkConstraints(kite: THREE.Object3D, leftHandle: THREE.Vector3, rightHandle: THREE.Vector3): {
        leftDistance: number;
        rightDistance: number;
        leftConstrained: boolean;
        rightConstrained: boolean;
    } {
        const leftDistance = leftHandle.distanceTo(kite.position);
        const rightDistance = rightHandle.distanceTo(kite.position);

        return {
            leftDistance,
            rightDistance,
            leftConstrained: leftDistance > this.leftMaxLength + this.tolerance,
            rightConstrained: rightDistance > this.rightMaxLength + this.tolerance
        };
    }

    /**
     * Définit la longueur maximale de base (sans tilt)
     */
    setMaxLength(length: number): void {
        this.baseMaxLength = length;
        this.leftMaxLength = length;
        this.rightMaxLength = length;
    }

    /**
     * Applique le tilt utilisateur aux longueurs côté G/D
     */
    setSteer(tilt: number): void {
        const s = THREE.MathUtils.clamp(tilt, -1, 1) * this.steerShortenFactor;
        this.leftMaxLength = this.baseMaxLength * (1 - s);
        this.rightMaxLength = this.baseMaxLength * (1 + s);
    }

    /** Retourne les longueurs actuelles (gauche/droite) */
    getMaxLengths(): { left: number; right: number } { return { left: this.leftMaxLength, right: this.rightMaxLength }; }
}

export class PhysicsConstraints implements IPhysicsConstraints {
    private groundCollision: IGroundCollisionSystem;
    private boundaryConstraints: IBoundaryConstraints;

    constructor(groundCollision: IGroundCollisionSystem, boundaryConstraints: IBoundaryConstraints) {
        this.groundCollision = groundCollision;
        this.boundaryConstraints = boundaryConstraints;
    }

    /**
     * Applique toutes les contraintes physiques
     */
    applyAllConstraints(kite: THREE.Object3D, velocity: THREE.Vector3): void {
        // Appliquer les contraintes de sol
        this.groundCollision.applyGroundConstraints(kite, velocity);

        // Appliquer les contraintes de limites
        this.boundaryConstraints.applyBoundaryConstraints(kite, velocity);
    }

    /**
     * Vérifie si le kite est dans un état contraint
     */
    getConstraintStatus(kite: THREE.Object3D): {
        onGround: boolean;
        atBoundary: boolean;
    } {
        return {
            onGround: this.groundCollision.isOnGround(kite),
            atBoundary: this.isAtBoundary(kite)
        };
    }

    isAtBoundary(kite: THREE.Object3D): boolean {
        return this.boundaryConstraints.isAtBoundary(kite);
    }

    /**
     * Accès aux sous-systèmes pour configuration
     */
    get groundSystem(): IGroundCollisionSystem {
        return this.groundCollision;
    }

    get boundarySystem(): IBoundaryConstraints {
        return this.boundaryConstraints;
    }
}
