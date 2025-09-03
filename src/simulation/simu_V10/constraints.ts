/**
 * constraints.ts — Gestion des contraintes physiques (sol, limites, etc.)
 */

import * as THREE from 'three';

export class GroundCollisionSystem {
    private groundLevel: number = 0.1; // Niveau du sol (légèrement au-dessus de 0 pour éviter les pénétrations visuelles)
    private friction: number = 0.85; // Coefficient de friction au sol
    private restitution: number = 0.3; // Coefficient de restitution (rebond)
    private penetrationThreshold: number = 0.05; // Seuil de pénétration avant correction

    /**
     * Applique les contraintes de collision avec le sol
     */
    applyGroundConstraints(kite: THREE.Object3D, velocity: THREE.Vector3): void {
        // Vérifier si le kite touche le sol
        if (kite.position.y <= this.groundLevel) {
            // Calculer la pénétration
            const penetration = this.groundLevel - kite.position.y;

            if (penetration > this.penetrationThreshold) {
                // Correction de position (éviter la pénétration)
                kite.position.y = this.groundLevel;

                // Appliquer la friction et le rebond
                if (velocity.y < 0) {
                    // Composante verticale : rebond
                    velocity.y *= -this.restitution;

                    // Composantes horizontales : friction
                    velocity.x *= this.friction;
                    velocity.z *= this.friction;

                    // Si la vitesse verticale devient trop faible, l'annuler complètement
                    if (Math.abs(velocity.y) < 0.01) {
                        velocity.y = 0;
                    }
                }
            }
        }
    }

    /**
     * Vérifie si le kite est au sol
     */
    isOnGround(kite: THREE.Object3D): boolean {
        return kite.position.y <= this.groundLevel + this.penetrationThreshold;
    }

    /**
     * Configure les paramètres du système de collision
     */
    setParameters(groundLevel: number, friction: number = 0.85, restitution: number = 0.3): void {
        this.groundLevel = groundLevel;
        this.friction = friction;
        this.restitution = restitution;
    }
}

export class BoundaryConstraints {
    private bounds = {
        minX: -50,
        maxX: 50,
        minY: 0,
        maxY: 100,
        minZ: -50,
        maxZ: 50
    };

    private damping: number = 0.9; // Amortissement aux limites

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

export class LineConstraints {
    private baseMaxLength: number;
    private leftMaxLength: number;
    private rightMaxLength: number;
    private tolerance: number = 0.01;
    private steerShortenFactor = 0.1; // +/-10% par tilt

    constructor(maxLength: number = 15) {
        this.baseMaxLength = maxLength;
        this.leftMaxLength = maxLength;
        this.rightMaxLength = maxLength;
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

export class PhysicsConstraints {
    private groundCollision: GroundCollisionSystem;
    private boundaryConstraints: BoundaryConstraints;

    constructor() {
        this.groundCollision = new GroundCollisionSystem();
        this.boundaryConstraints = new BoundaryConstraints();
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

    private isAtBoundary(kite: THREE.Object3D): boolean {
        const bounds = this.boundaryConstraints['bounds'];
        return (
            kite.position.x <= bounds.minX + 1 || kite.position.x >= bounds.maxX - 1 ||
            kite.position.y >= bounds.maxY - 1 ||
            kite.position.z <= bounds.minZ + 1 || kite.position.z >= bounds.maxZ - 1
        );
    }

    /**
     * Accès aux sous-systèmes pour configuration
     */
    get groundSystem(): GroundCollisionSystem {
        return this.groundCollision;
    }

    get boundarySystem(): BoundaryConstraints {
        return this.boundaryConstraints;
    }
}
