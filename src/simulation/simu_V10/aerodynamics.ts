/**
 * aerodynamics.ts — Calculs aérodynamiques avancés inspirés de V9
 * Implémente les calculs par face avec stall factor et cache
 */

import * as THREE from 'three';
import { AeroCache } from '@simulation/simu_V10/cache/AeroCache';

export interface AerodynamicForces {
    lift: THREE.Vector3;
    drag: THREE.Vector3;
    torque: THREE.Vector3;
    leftForce?: THREE.Vector3;
    rightForce?: THREE.Vector3;
}

export interface AerodynamicMetrics {
    apparentSpeed: number;
    liftMag: number;
    dragMag: number;
    lOverD: number;
    aoaDeg: number;
    stallFactor: number;
}

export class AerodynamicsCalculator {
    private static readonly rho = 1.225; // air density
    private static readonly stallAngle = 18; // degrés
    private static readonly stallRecoveryAngle = 10; // degrés
    // Paramètres inspirés de V8 pour un comportement plus naturel
    private static readonly liftScale = 1.5; // Réduit comme V8
    private static readonly dragScale = 1.0; // Naturel comme V8

    // Géométrie du kite (inspiré de V9)
    private static readonly SURFACES = [
        {
            vertices: [
                new THREE.Vector3(0, 0.65, 0),      // nez
                new THREE.Vector3(-0.825, 0, 0),    // bord gauche
                new THREE.Vector3(-0.4125, 0.1, -0.15) // whisker gauche
            ],
            area: 0.23
        },
        {
            vertices: [
                new THREE.Vector3(0, 0.65, 0),      // nez
                new THREE.Vector3(-0.4125, 0.1, -0.15), // whisker gauche
                new THREE.Vector3(0, 0, 0)          // base
            ],
            area: 0.11
        },
        {
            vertices: [
                new THREE.Vector3(0, 0.65, 0),      // nez
                new THREE.Vector3(0.825, 0, 0),     // bord droit
                new THREE.Vector3(0.4125, 0.1, -0.15) // whisker droit
            ],
            area: 0.23
        },
        {
            vertices: [
                new THREE.Vector3(0, 0.65, 0),      // nez
                new THREE.Vector3(0.4125, 0.1, -0.15), // whisker droit
                new THREE.Vector3(0, 0, 0)          // base
            ],
            area: 0.11
        }
    ];

    private static cache = new AeroCache<string, {
        forces: AerodynamicForces;
        metrics: AerodynamicMetrics;
        timestamp: number;
    }>();

    /**
     * Calcule le facteur de stall basé sur l'angle d'attaque
     */
    private static calculateStallFactor(aoaDegrees: number): number {
        if (aoaDegrees <= this.stallRecoveryAngle) {
            return 1.0;
        } else if (aoaDegrees >= this.stallAngle) {
            return 0.4;
        } else {
            const factor = 1.0 - (aoaDegrees - this.stallRecoveryAngle) / (this.stallAngle - this.stallRecoveryAngle);
            return Math.max(0.4, factor);
        }
    }

    /**
     * Calcule les forces aérodynamiques avec cache (inspiré de V9)
     */
    static calculateForces(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion,
        kiteVelocity?: THREE.Vector3
    ): AerodynamicForces {
        const windSpeed = apparentWind.length();
        if (windSpeed < 1e-4) {
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                torque: new THREE.Vector3()
            };
        }

        // Clé de cache
        const cacheKey = AeroCache.makeKey(apparentWind, kiteOrientation);
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 16) {
            return cached.forces;
        }

        const windDir = apparentWind.clone().normalize();
        const dynamicPressure = 0.5 * this.rho * windSpeed * windSpeed;

        // Calcul par face (comme V9)
        let totalForce = new THREE.Vector3();
        let totalTorque = new THREE.Vector3();
        let leftForce = new THREE.Vector3();
        let rightForce = new THREE.Vector3();

        this.SURFACES.forEach((surface, index) => {
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleLocale = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

            const normaleMonde = normaleLocale.clone().applyQuaternion(kiteOrientation);
            const facing = windDir.dot(normaleMonde);
            const cosIncidence = Math.abs(facing);

            if (cosIncidence <= 1e-4) return;

            // Force normale (pression)
            const normalDirection = facing >= 0 ? normaleMonde.clone() : normaleMonde.clone().negate();
            const normalMagnitude = dynamicPressure * surface.area * cosIncidence;
            const forceNormale = normalDirection.clone().multiplyScalar(normalMagnitude);

            // Traînée de profil
            const profileDragMagnitude = dynamicPressure * surface.area * 0.02;
            const profileDragForce = apparentWind.clone().normalize().multiplyScalar(-profileDragMagnitude);

            // Traînée induite
            const clampedCosIncidence = Math.max(1e-4, Math.min(1.0, Math.abs(cosIncidence)));
            const sinIncidence = Math.sqrt(1.0 - clampedCosIncidence * clampedCosIncidence);
            const inducedDragMagnitude = dynamicPressure * surface.area * 0.05 * sinIncidence * sinIncidence;

            let inducedDragForce = new THREE.Vector3();
            const windInLiftPlane = apparentWind.clone();
            if (normalDirection.length() > 1e-4) {
                windInLiftPlane.projectOnPlane(normalDirection.clone().normalize());
            }
            if (windInLiftPlane.length() > 1e-4) {
                inducedDragForce = windInLiftPlane.normalize().multiplyScalar(-inducedDragMagnitude);
            }

            // Force totale sur cette face
            const faceForce = forceNormale.clone()
                .add(profileDragForce)
                .add(inducedDragForce);

            // Accumuler
            totalForce.add(faceForce);

            const centre = surface.vertices[0].clone()
                .add(surface.vertices[1])
                .add(surface.vertices[2])
                .divideScalar(3);

            const centreWorld = centre.clone().applyQuaternion(kiteOrientation);
            const torque = new THREE.Vector3().crossVectors(centreWorld, faceForce);
            totalTorque.add(torque);

            // Forces gauche/droite
            const isLeft = centre.x < 0;
            if (isLeft) {
                leftForce.add(faceForce);
            } else {
                rightForce.add(faceForce);
            }
        });

        // Calcul de l'AoA global pour le stall factor
        let weightedNormal = new THREE.Vector3();
        let totalArea = 0;

        this.SURFACES.forEach((surface) => {
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleMonde = new THREE.Vector3()
                .crossVectors(edge1, edge2)
                .normalize()
                .applyQuaternion(kiteOrientation);

            weightedNormal.add(normaleMonde.multiplyScalar(surface.area));
            totalArea += surface.area;
        });

        if (totalArea > 1e-4) {
            weightedNormal.divideScalar(totalArea).normalize();
        }

        const dotProduct = Math.max(-1, Math.min(1, windDir.dot(weightedNormal)));
        const aoaDeg = Math.abs(Math.acos(Math.abs(dotProduct)) * 180 / Math.PI);
        const stallFactor = this.calculateStallFactor(aoaDeg);

        // Décomposition lift/drag avec stall factor
        const windDirection = windDir.clone();
        const forceParallelToWind = totalForce.clone().projectOnVector(windDirection);
        const forcePerpendicularToWind = totalForce.clone().sub(forceParallelToWind);

        const lift = forcePerpendicularToWind.multiplyScalar(this.liftScale * stallFactor);
        const drag = forceParallelToWind.multiplyScalar(-1).multiplyScalar(this.dragScale);

        const result: AerodynamicForces = {
            lift,
            drag,
            torque: totalTorque,
            leftForce,
            rightForce
        };

        // Calcul des métriques
        const metrics: AerodynamicMetrics = {
            apparentSpeed: windSpeed,
            liftMag: lift.length(),
            dragMag: drag.length(),
            lOverD: drag.length() > 1e-4 ? lift.length() / drag.length() : 0,
            aoaDeg,
            stallFactor
        };

        // Mettre en cache
        this.cache.set(cacheKey, {
            forces: result,
            metrics,
            timestamp: Date.now()
        });

        return result;
    }

    /**
     * Calcule les métriques aérodynamiques
     */
    static computeMetrics(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion
    ): AerodynamicMetrics {
        const windSpeed = apparentWind.length();
        if (windSpeed < 1e-4) {
            return {
                apparentSpeed: 0,
                liftMag: 0,
                dragMag: 0,
                lOverD: 0,
                aoaDeg: 0,
                stallFactor: 1.0
            };
        }

        const cacheKey = AeroCache.makeKey(apparentWind, kiteOrientation);
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 16) {
            return cached.metrics;
        }

        // Si pas en cache, calculer
        this.calculateForces(apparentWind, kiteOrientation);
        const newCached = this.cache.get(cacheKey);
        return newCached ? newCached.metrics : {
            apparentSpeed: 0,
            liftMag: 0,
            dragMag: 0,
            lOverD: 0,
            aoaDeg: 0,
            stallFactor: 1.0
        };
    }

    /**
     * Nettoie le cache
     */
    static clearCache(): void {
        this.cache.clear();
    }
}