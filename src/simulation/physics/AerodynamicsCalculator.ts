/**
 * AerodynamicsCalculator.ts - Calculs aérodynamiques EXACTEMENT comme V8
 *
 * PHYSIQUE ÉMERGENTE V8 :
 * - Calcul par triangle du cerf-volant (4 surfaces) 
 * - Force = 0.5 × ρ × V² × Area × cos(angle) dans la direction normale
 * - Couple émergeant naturellement de la différence gauche/droite
 * - AUCUN coefficient artificiel - physique pure !
 */

import * as THREE from 'three';
import { PhysicsConstants, KiteGeometry, CONFIG, AerodynamicForces, SimulationMetrics } from '../core/constants';
import { Kite } from '@objects/Kite';

export class AerodynamicsCalculator {
    /**
     * Calcule comment le vent pousse sur le cerf-volant
     * 
     * COMMENT ÇA MARCHE :
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
        kite?: Kite
    ): AerodynamicForces {
        const windSpeed = apparentWind.length();
        if (windSpeed < 0.1) {
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                torque: new THREE.Vector3()
            };
        }

        const windDir = apparentWind.clone().normalize();
        const dynamicPressure = 0.5 * CONFIG.physics.airDensity * windSpeed * windSpeed;

        // Forces séparées pour gauche et droite
        let leftForce = new THREE.Vector3();
        let rightForce = new THREE.Vector3();
        let totalForce = new THREE.Vector3();
        let totalTorque = new THREE.Vector3();

        // MÉTHODE UNIFIÉE AVEC CARACTÉRISTIQUES SPÉCIFIQUES PAR FACE
        KiteGeometry.SURFACES.forEach((surface, faceIndex) => {
            // ÉTAPE 1 : Géométrie spécifique de chaque face
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);

            // Calcul de la normale avec orientation spécifique à chaque face
            const normaleLocale = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

            // Ajustement d'orientation selon la position de la face (avant/arrière)
            const faceCenterZ = (surface.vertices[0].z + surface.vertices[1].z + surface.vertices[2].z) / 3;
            if (faceCenterZ < 0) { // Face arrière - inversion de la normale
                normaleLocale.negate();
            }

            // ÉTAPE 2 : Transformation en coordonnées monde
            const normaleMonde = normaleLocale.clone().applyQuaternion(kiteOrientation);

            // ÉTAPE 3 : Calcul de l'incidence du vent (même formule pour toutes)
            const facing = windDir.dot(normaleMonde);
            const cosIncidence = Math.max(0, Math.abs(facing));

            // Filtrage des faces peu exposées au vent
            if (cosIncidence < 0.1) {
                return; // Face non contributive
            }

            // ÉTAPE 4 : Force aérodynamique proportionnelle à la surface
            const forceMagnitude = dynamicPressure * surface.area * cosIncidence;
            const normalDir = facing >= 0 ? normaleMonde.clone() : normaleMonde.clone().negate();
            const force = normalDir.multiplyScalar(forceMagnitude);

            // ÉTAPE 5 : Centre de pression spécifique à chaque face
            const centreLocal = surface.vertices[0].clone()
                .add(surface.vertices[1])
                .add(surface.vertices[2])
                .divideScalar(3);

            // Ajustement du centre de pression selon la face
            // Faces avant : centre de pression plus en avant
            // Faces arrière : centre de pression plus en arrière
            if (faceCenterZ > 0) {
                centreLocal.z += 0.05; // Faces avant : CP plus en avant
            } else {
                centreLocal.z -= 0.05; // Faces arrière : CP plus en arrière
            }

            const centreWorld = centreLocal.clone().applyQuaternion(kiteOrientation)
                .add(kite ? kite.position : new THREE.Vector3());

            // ÉTAPE 6 : Classification gauche/droite avec précision
            const isLeft = centreLocal.x < -0.01;  // Tolérance pour éviter les ambiguïtés
            const isRight = centreLocal.x > 0.01;

            if (isLeft) {
                leftForce.add(force);
            } else if (isRight) {
                rightForce.add(force);
            } else {
                // Face centrale - contribution équilibrée
                leftForce.add(force.clone().multiplyScalar(0.5));
                rightForce.add(force.clone().multiplyScalar(0.5));
            }

            // ÉTAPE 7 : Couple avec bras de levier spécifique
            const centerOfMass = kite ? kite.position : new THREE.Vector3();
            const leverArm = centreWorld.clone().sub(centerOfMass);
            const torque = new THREE.Vector3().crossVectors(leverArm, force);

            // Accumulation avec poids selon l'importance de la face
            const faceWeight = surface.area / KiteGeometry.TOTAL_AREA;
            totalForce.add(force.clone().multiplyScalar(faceWeight));
            totalTorque.add(torque.clone().multiplyScalar(faceWeight));
        });

        // PHYSIQUE ÉMERGENTE : Le couple vient de la différence G/D
        // Si leftForce > rightForce → rotation vers la droite
        // Si rightForce > leftForce → rotation vers la gauche
        // AUCUN facteur artificiel nécessaire!

        // 9. Pour un cerf-volant, on retourne directement les forces totales
        // La décomposition lift/drag classique n'est pas adaptée car le kite
        // peut voler dans toutes les orientations (looping, vrilles, etc.)
        // Les forces émergent naturellement de la pression sur chaque surface

        const lift = totalForce.clone().multiplyScalar(CONFIG.aero.liftScale);
        const drag = new THREE.Vector3(); // Traînée intégrée dans les forces totales

        // Mise à l'échelle du couple
        const baseTotalMag = Math.max(PhysicsConstants.EPSILON, totalForce.length());
        const scaledTotalMag = lift.clone().add(drag).length();
        const torqueScale = Math.max(0.1, Math.min(3, scaledTotalMag / baseTotalMag));

        return {
            lift,
            drag,
            torque: totalTorque.multiplyScalar(torqueScale),
            leftForce,    // Exposer les forces pour analyse
            rightForce    // Permet de voir l'asymétrie émergente
        };
    }

    /**
     * Calcule des métriques pour le debug
     */
    static computeMetrics(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion
    ): SimulationMetrics {
        const windSpeed = apparentWind.length();
        if (windSpeed < PhysicsConstants.EPSILON) {
            return { apparentSpeed: 0, liftMag: 0, dragMag: 0, lOverD: 0, aoaDeg: 0 };
        }

        const { lift } = this.calculateForces(apparentWind, kiteOrientation);
        const liftMag = lift.length();
        const dragMag = 0; // Traînée intégrée dans les forces totales
        const lOverD = 0; // Ratio non applicable pour un cerf-volant

        // Calcul approximatif de l'angle d'attaque
        const windDir = apparentWind.clone().normalize();
        let weightedNormal = new THREE.Vector3();

        KiteGeometry.SURFACES.forEach((surface) => {
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
        if (weightedNormal.lengthSq() > PhysicsConstants.EPSILON * PhysicsConstants.EPSILON) {
            const eff = weightedNormal.normalize();
            const dot = Math.max(-1, Math.min(1, eff.dot(windDir)));
            const phiDeg = Math.acos(dot) * 180 / Math.PI;
            aoaDeg = Math.max(0, 90 - phiDeg);
        }

        return { apparentSpeed: windSpeed, liftMag, dragMag, lOverD, aoaDeg };
    }
}
