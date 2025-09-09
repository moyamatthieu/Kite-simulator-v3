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

/**
 * Données aérodynamiques détaillées pour une seule face du kite.
 */
export interface FaceAerodynamics {
    faceIndex: number;
    center: THREE.Vector3;
    normal: THREE.Vector3;
    apparentWind: THREE.Vector3;
    force: THREE.Vector3;
}

/**
 * Résultat complet des calculs aérodynamiques, incluant les forces totales
 * et les données détaillées par face pour le debug.
 */
export interface DetailedAerodynamicForces extends AerodynamicForces {
    perFaceData: FaceAerodynamics[];
}

export class AerodynamicsCalculator {

    /**
     * Extrait les 4 faces triangulaires de la voile du kite à partir de sa géométrie.
     * Cette méthode lit dynamiquement les points de l'objet Kite pour construire les surfaces.
     * @param kite L'instance de l'objet Kite.
     * @returns Un tableau d'objets, chacun représentant une face avec ses sommets et son aire.
     */
    private static _extractFaces(kite: Kite): { vertices: THREE.Vector3[]; area: number }[] {
        const pNez = kite.getPoint('NEZ');
        const pGauche = kite.getPoint('BORD_GAUCHE');
        const pDroit = kite.getPoint('BORD_DROIT');
        const pBas = kite.getPoint('SPINE_BAS');
        const pMilieu = kite.getPoint('SPINE_MILIEU');

        if (!pNez || !pGauche || !pDroit || !pBas || !pMilieu) {
            console.error("Points de géométrie du kite manquants. Impossible d'extraire les faces.");
            return [];
        }

        // Définition des 4 faces triangulaires de la voile
        const faces = [
            { vertices: [pNez, pGauche, pMilieu] },
            { vertices: [pNez, pMilieu, pDroit] },
            { vertices: [pMilieu, pGauche, pBas] },
            { vertices: [pMilieu, pDroit, pBas] },
        ];

        // Calcul de l'aire pour chaque face
        return faces.map(face => {
            const [v1, v2, v3] = face.vertices;
            const edge1 = new THREE.Vector3().subVectors(v2, v1);
            const edge2 = new THREE.Vector3().subVectors(v3, v1);
            const area = new THREE.Vector3().crossVectors(edge1, edge2).length() / 2;
            return { ...face, area };
        });
    }

    /**
     * Calcule comment le vent pousse sur le cerf-volant, en analysant chaque face.
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
        kite: Kite // Le kite est maintenant obligatoire pour extraire les faces
    ): DetailedAerodynamicForces {
        const windSpeed = apparentWind.length();
        if (windSpeed < 0.1 || !kite) {
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                torque: new THREE.Vector3(),
                leftForce: new THREE.Vector3(),
                rightForce: new THREE.Vector3(),
                perFaceData: []
            };
        }

        const windDir = apparentWind.clone().normalize();
        const dynamicPressure = 0.5 * CONFIG.physics.airDensity * windSpeed * windSpeed;

        let leftForce = new THREE.Vector3();
        let rightForce = new THREE.Vector3();
        let totalForce = new THREE.Vector3();
        let totalTorque = new THREE.Vector3();
        const perFaceData: FaceAerodynamics[] = [];

        // Extraction dynamique des faces du kite au lieu d'utiliser une constante
        const kiteFaces = this._extractFaces(kite);

        // On examine chaque triangle du cerf-volant un par un
        kiteFaces.forEach((surface, index) => {
            // Pour comprendre comment le vent frappe ce triangle,
            // on doit savoir dans quelle direction il "regarde"
            // (comme l'orientation d'un panneau solaire)
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleLocale = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

            // 2. Rotation de la normale selon l'orientation du kite
            const normaleMonde = normaleLocale.clone().applyQuaternion(kiteOrientation);

            // Maintenant on vérifie sous quel angle le vent frappe ce triangle
            // C'est comme mettre votre main par la fenêtre de la voiture :
            // - Main à plat face au vent = beaucoup de force
            // - Main de profil = peu de force
            const facing = windDir.dot(normaleMonde);
            const cosIncidence = Math.max(0, Math.abs(facing));

            // Si le vent glisse sur le côté (angle = 0), pas de force
            if (cosIncidence <= PhysicsConstants.EPSILON) {
                return;
            }

            // 4. Force perpendiculaire à la surface (pression aérodynamique)
            const normalDir = facing >= 0 ? normaleMonde.clone() : normaleMonde.clone().negate();

            // 5. Intensité = pression dynamique × surface × cos(angle)
            const forceMagnitude = dynamicPressure * surface.area * cosIncidence;
            const force = normalDir.multiplyScalar(forceMagnitude);

            // 6. Centre de pression = centre géométrique du triangle (en coordonnées locales)
            const centreLocal = surface.vertices[0].clone()
                .add(surface.vertices[1])
                .add(surface.vertices[2])
                .divideScalar(3);

            // On note si cette force est sur le côté gauche ou droit
            const isLeft = centreLocal.x < 0;

            if (isLeft) {
                leftForce.add(force);
            } else {
                rightForce.add(force);
            }

            totalForce.add(force);

            // Le couple est le produit vectoriel du bras de levier (position du centre de la face)
            // et de la force appliquée. Le bras de levier est la position du centre de la face
            // par rapport au centre de masse du kite (qui est à l'origine de son repère local).
            const torque = new THREE.Vector3().crossVectors(centreLocal, force);
            totalTorque.add(torque);

            // Stockage des données de debug pour cette face
            perFaceData.push({
                faceIndex: index,
                // Le centre pour le debug doit être la position absolue dans le monde
                center: centreLocal.clone().applyQuaternion(kiteOrientation).add(kite.position),
                normal: normaleMonde,
                apparentWind: apparentWind,
                force: force.clone(),
            });
        });

        // Le couple total a été calculé en repère local, il faut le transformer en repère monde
        totalTorque.applyQuaternion(kiteOrientation);


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
            leftForce,
            rightForce,
            perFaceData // On retourne les données détaillées
        };
    }

    /**
     * Calcule des métriques pour le debug
     */
    static computeMetrics(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion,
        kite: Kite // Ajout du kite pour l'extraction des faces
    ): SimulationMetrics {
        const windSpeed = apparentWind.length();
        if (windSpeed < PhysicsConstants.EPSILON || !kite) {
            return { apparentSpeed: 0, liftMag: 0, dragMag: 0, lOverD: 0, aoaDeg: 0 };
        }

        const { lift } = this.calculateForces(apparentWind, kiteOrientation, kite);
        const liftMag = lift.length();
        const dragMag = 0; // Traînée intégrée dans les forces totales
        const lOverD = 0; // Ratio non applicable pour un cerf-volant

        // Calcul approximatif de l'angle d'attaque
        const windDir = apparentWind.clone().normalize();
        let weightedNormal = new THREE.Vector3();

        const kiteFaces = this._extractFaces(kite);
        kiteFaces.forEach((surface) => {
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