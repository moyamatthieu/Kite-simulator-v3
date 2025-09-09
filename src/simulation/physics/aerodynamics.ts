/**
 * aerodynamics.ts — Calculs aérodynamiques EXACTEMENT comme V8
 *
 * PHYSIQUE ÉMERGENTE V8 :
 * - Calcul par triangle du cerf-volant (4 surfaces)
 * - Force = 0.5 × ρ × V² × Area × cos(angle) dans la direction normale
 * - Couple émergeant naturellement de la différence gauche/droite
 * - AUCUN coefficient artificiel - physique pure !
 */

import * as THREE from 'three';
import { AeroCache } from '@/simulation/cache/AeroCache';
import { IAerodynamicForces, ISurfaceForces, IAeroCoefficients } from '@/simulation/interfaces/physics';
import { CONFIG } from '@/simulation/config/SimulationConfig'; // Importe CONFIG
import { KiteGeometry, KiteSurface } from '@/simulation/data/KiteGeometry'; // Importe KiteGeometry et KiteSurface
import { PhysicsConstants } from '@/simulation/physics/PhysicsConstants'; // Importe PhysicsConstants

export interface AerodynamicMetrics {
    apparentSpeed: number;
    liftMag: number;
    dragMag: number;
    lOverD: number;
    aoaDeg: number;
    stallFactor: number;
}

export class AerodynamicsCalculator {
    private static cache = new AeroCache<string, {
        forces: IAerodynamicForces;
        metrics: AerodynamicMetrics;
        timestamp: number;
    }>();

    /**
     * Obtient la configuration aérodynamique actuelle.
     */
    private static get aeroConfig() {
        return CONFIG.get('aero');
    }

    /**
     * Obtient la géométrie statique du kite.
     */
    private static get kiteGeometryData() {
        return KiteGeometry;
    }

    /**
     * PHYSIQUE ÉMERGENTE V8 - Calcule les forces par surface triangulaire
     *
     * COMMENT ÇA MARCHE (exactement comme V8) :
     * 1. On regarde chaque triangle du cerf-volant
     * 2. On calcule sous quel angle le vent frappe ce triangle
     * 3. Plus le vent frappe de face, plus la force est grande
     * 4. On additionne toutes les forces pour avoir la force totale
     *
     * POURQUOI C'EST IMPORTANT :
     * Si un côté du kite reçoit plus de vent, il sera poussé plus fort
     * Cette différence fait tourner le kite naturellement !
     */
    static calculateForces(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion,
        kitePosition: THREE.Vector3
    ): IAerodynamicForces {
        const { rho, liftScale, dragScale } = this.aeroConfig;
        const { SURFACES, TOTAL_AREA } = this.kiteGeometryData;
        const epsilon = PhysicsConstants.EPSILON; // Epsilon vient maintenant de PhysicsConstants

        // Validation des entrées
        if (!apparentWind || !kiteOrientation) {
            console.warn('⚠️ AerodynamicsCalculator: Paramètres invalides (apparentWind ou kiteOrientation null)');
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                torque: new THREE.Vector3(),
                apparent: new THREE.Vector3(),
                coefficients: { cl: 0, cd: 0, cm: 0, aoa: 0, aoaDeg: 0 },
                surfaces: []
            };
        }

        const windSpeed = apparentWind.length();
        if (windSpeed < epsilon || isNaN(windSpeed)) {
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                torque: new THREE.Vector3(),
                apparent: new THREE.Vector3(),
                coefficients: {
                    cl: 0, cd: 0, cm: 0, aoa: 0, aoaDeg: 0
                },
                surfaces: []
            };
        }

        const windDir = apparentWind.clone().normalize();
        const dynamicPressure = 0.5 * rho * windSpeed * windSpeed;

        // Validation des propriétés calculées
        if (isNaN(dynamicPressure) || !isFinite(dynamicPressure)) {
            console.warn('⚠️ AerodynamicsCalculator: Pression dynamique invalide', { rho, windSpeed, dynamicPressure });
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                torque: new THREE.Vector3(),
                apparent: new THREE.Vector3(),
                coefficients: { cl: 0, cd: 0, cm: 0, aoa: 0, aoaDeg: 0 },
                surfaces: []
            };
        }

        // Forces séparées pour gauche et droite (COMPORTEMENT ÉMERGENT V8)
        // Permet au couple de rotation d'émerger naturellement de l'asymétrie
        let leftForce = new THREE.Vector3();
        let rightForce = new THREE.Vector3();
        let totalForce = new THREE.Vector3();
        let totalTorque = new THREE.Vector3();

        // Données par surface pour le debug
        const surfacesData: ISurfaceForces[] = [];

        // On examine chaque triangle du cerf-volant un par un (EXACTEMENT V8)
        SURFACES.forEach((surface: KiteSurface, index: number) => {
            // Validation de la surface
            if (!surface || !surface.vertices || surface.vertices.length !== 3) {
                console.warn(`⚠️ AerodynamicsCalculator: Surface ${index} invalide`);
                return;
            }

            if (isNaN(surface.area) || surface.area <= 0) {
                console.warn(`⚠️ AerodynamicsCalculator: Aire de surface ${index} invalide (${surface.area})`);
                return;
            }

            // 1. Calculer la normale de ce triangle
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleLocale = new THREE.Vector3().crossVectors(edge1, edge2);

            if (normaleLocale.lengthSq() < epsilon * epsilon) {
                console.warn(`⚠️ AerodynamicsCalculator: Normale dégénérée pour surface ${index}`);
                return;
            }

            normaleLocale.normalize();

            // 2. Rotation de la normale selon l'orientation du kite
            const normaleMonde = normaleLocale.clone().applyQuaternion(kiteOrientation);

            // 3. Angle entre vent et normale (cos de l'incidence)
            const facing = windDir.dot(normaleMonde);
            const cosIncidence = Math.max(0, Math.abs(facing));

            // Si le vent glisse sur le côté (angle = 0), pas de force
            if (cosIncidence <= epsilon) {
                return;
            }

            // 4. Force perpendiculaire à la surface (pression aérodynamique V8)
            const normalDir = facing >= 0 ? normaleMonde.clone() : normaleMonde.clone().negate();

            // 5. Intensité = pression dynamique × surface × cos(angle) [FORMULE V8]
            const forceMagnitude = dynamicPressure * surface.area * cosIncidence;
            const force = normalDir.multiplyScalar(forceMagnitude);

            // 6. Centre de pression = centre géométrique du triangle
            const centre = surface.vertices[0].clone()
                .add(surface.vertices[1])
                .add(surface.vertices[2])
                .divideScalar(3);

            // Classification gauche/droite (EXACTEMENT V8)
            const isLeft = centre.x < 0;  // Négatif = gauche, Positif = droite

            if (isLeft) {
                leftForce.add(force);  // Additionner à la force totale gauche
            } else {
                rightForce.add(force); // Additionner à la force totale droite
            }

            totalForce.add(force);

            // Le couple V8 : force × bras de levier
            const centreWorld = centre.clone().applyQuaternion(kiteOrientation).add(kitePosition);
            const torque = new THREE.Vector3().crossVectors(centreWorld, force);
            totalTorque.add(torque);

            // Stocker les données de cette surface pour le debug
            // IMPORTANT: Le centre doit être en coordonnées mondiales absolues
            // (il manquait l'ajout de la position du kite !)
            surfacesData.push({
                center: centreWorld.clone(), // Ce centre doit être ajusté dans simulationV10
                normal: normalDir.clone(),
                apparentWind: apparentWind.clone(),
                lift: force.clone().multiplyScalar(liftScale), // Force = lift sur cette surface
                drag: new THREE.Vector3(), // Pas de traînée séparée en V8
                resultant: force.clone().multiplyScalar(liftScale)
            });
        });

        // DÉCOMPOSITION V8 : On retourne directement les forces totales
        // La décomposition lift/drag classique n'est pas adaptée car le kite
        // peut voler dans toutes les orientations (looping, vrilles, etc.)
        const lift = totalForce.clone().multiplyScalar(liftScale);
        const drag = new THREE.Vector3(); // Traînée intégrée dans les forces totales V8

        // Mise à l'échelle du couple V8
        const baseTotalMag = Math.max(epsilon, totalForce.length());
        const scaledTotalMag = lift.clone().add(drag).length();
        const torqueScale = Math.max(0.1, Math.min(3, scaledTotalMag / baseTotalMag));

        // Coefficients de base (pour compatibilité avec l'interface V10)
        const windSpeedSq = windSpeed * windSpeed;
        const coefficients: IAeroCoefficients = {
            cl: windSpeedSq > epsilon ? (lift.length() / (0.5 * rho * windSpeedSq * TOTAL_AREA)) : 0,
            cd: 0, // Traînée intégrée en V8
            cm: 0, // Coefficient de moment simplifié
            aoa: 0, // Calculé séparément dans computeMetrics
            aoaDeg: 0
        };

        return {
            lift,
            drag,
            torque: totalTorque.multiplyScalar(torqueScale),
            apparent: apparentWind.clone(),
            coefficients,
            surfaces: surfacesData // Nouveau : données par surface pour le debug
        };
    }

    /**
     * Calcule les métriques pour le debug (exactement V8)
     */
    static computeMetrics(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion
    ): AerodynamicMetrics {
        const epsilon = PhysicsConstants.EPSILON; // Epsilon vient maintenant de PhysicsConstants
        const { SURFACES } = this.kiteGeometryData;

        const windSpeed = apparentWind.length();
        if (windSpeed < epsilon) {
            return {
                apparentSpeed: 0,
                liftMag: 0,
                dragMag: 0,
                lOverD: 0,
                aoaDeg: 0,
                stallFactor: 1.0
            };
        }

        const { lift } = this.calculateForces(apparentWind, kiteOrientation, new THREE.Vector3());
        const liftMag = lift.length();
        const dragMag = 0; // Traînée intégrée dans les forces totales V8
        const lOverD = 0; // Ratio non applicable pour un cerf-volant V8

        // Calcul approximatif de l'angle d'attaque V8
        const windDir = apparentWind.clone().normalize();
        let weightedNormal = new THREE.Vector3();

        SURFACES.forEach((surface: KiteSurface) => {
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleMonde = new THREE.Vector3()
                .crossVectors(edge1, edge2)
                .normalize()
                .applyQuaternion(kiteOrientation);

            const facing = windDir.dot(normaleMonde);
            const cosIncidence = Math.max(0, Math.abs(facing));

            const normalDir = facing >= 0 ? normaleMonde : normaleMonde.clone().negate();
            weightedNormal.add(normalDir.multiplyScalar(surface.area * cosIncidence));
        });

        let aoaDeg = 0;
        if (weightedNormal.lengthSq() > epsilon * epsilon) {
            const eff = weightedNormal.normalize();
            const dot = Math.max(-1, Math.min(1, eff.dot(windDir)));
            const phiDeg = Math.acos(dot) * 180 / Math.PI;
            aoaDeg = Math.max(0, 90 - phiDeg);
        }

        return {
            apparentSpeed: windSpeed,
            liftMag,
            dragMag,
            lOverD,
            aoaDeg,
            stallFactor: 1.0 // V8 n'a pas de stall factor
        };
    }

    /**
     * Nettoie le cache
     */
    static clearCache(): void {
        this.cache.clear();
    }
}