import * as THREE from 'three';

/**
 * @interface KiteSurface
 * @description Représente une surface triangulaire du cerf-volant avec ses sommets et son aire.
 */
export interface KiteSurface {
    vertices: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
    area: number;
}

/**
 * @function calculateTriangleArea
 * @description Calcule l'aire d'un triangle défini par trois vecteurs.
 * @param v1 Premier sommet du triangle.
 * @param v2 Deuxième sommet du triangle.
 * @param v3 Troisième sommet du triangle.
 * @returns L'aire du triangle.
 */
function calculateTriangleArea(v1: THREE.Vector3, v2: THREE.Vector3, v3: THREE.Vector3): number {
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    return edge1.cross(edge2).length() * 0.5;
}

/**
 * @class KiteGeometry
 * @description Fournit toutes les données géométriques statiques du cerf-volant.
 * Centralise les définitions des points, des surfaces et l'aire totale pour faciliter la maintenance.
 */
class KiteGeometry {
    /**
     * @property POINTS
     * @description Points clés du cerf-volant définis dans son système de coordonnées local.
     */
    static readonly POINTS = {
        NEZ: new THREE.Vector3(0, 0.65, 0),             // Point le plus haut du cerf-volant (avant)
        SPINE_BAS: new THREE.Vector3(0, 0, 0),          // Base de la "colonne vertébrale" (arrière, centre)
        BORD_GAUCHE: new THREE.Vector3(-0.825, 0, 0),  // Extrémité gauche du bord d'attaque
        BORD_DROIT: new THREE.Vector3(0.825, 0, 0),    // Extrémité droite du bord d'attaque
        WHISKER_GAUCHE: new THREE.Vector3(-0.4125, 0.1, -0.15), // Point intermédiaire gauche sur l'aile
        WHISKER_DROIT: new THREE.Vector3(0.4125, 0.1, -0.15),  // Point intermédiaire droit sur l'aile
        CENTRE_BASE: new THREE.Vector3(0, 0, 0)         // Centre de la base, identique à SPINE_BAS ici pour la simplicité
    };

    /**
     * @property CONTROL_POINTS
     * @description Points spécifiques où les lignes de contrôle sont attachées au cerf-volant.
     */
    static readonly CONTROL_POINTS = {
        CTRL_GAUCHE: new THREE.Vector3(-0.01, 0.325, 0.4), // Point d'attache de la ligne de contrôle gauche
        CTRL_DROIT: new THREE.Vector3(0.01, 0.325, 0.4),  // Point d'attache de la ligne de contrôle droite
    };

    /**
     * @property SURFACES
     * @description Définition des surfaces triangulaires du cerf-volant pour les calculs aérodynamiques.
     * Chaque surface est définie par trois sommets référencés depuis `POINTS`.
     */
    static readonly SURFACES: KiteSurface[] = [
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.BORD_GAUCHE,
                KiteGeometry.POINTS.WHISKER_GAUCHE
            ],
            area: 0 // L'aire sera calculée dynamiquement
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.WHISKER_GAUCHE,
                KiteGeometry.POINTS.SPINE_BAS
            ],
            area: 0
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.BORD_DROIT,
                KiteGeometry.POINTS.WHISKER_DROIT
            ],
            area: 0
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.WHISKER_DROIT,
                KiteGeometry.POINTS.SPINE_BAS
            ],
            area: 0
        }
    ];

    /**
     * @property TOTAL_AREA
     * @description L'aire totale calculée du cerf-volant en mètres carrés.
     */
    static TOTAL_AREA: number = 0;

    // Bloc d'initialisation statique : calcule les aires des surfaces et l'aire totale
    static {
        let totalAreaSum = 0;
        for (const surface of KiteGeometry.SURFACES) {
            // Calcule l'aire de chaque surface une fois au chargement de la classe
            surface.area = calculateTriangleArea(surface.vertices[0], surface.vertices[1], surface.vertices[2]);
            totalAreaSum += surface.area;
        }
        KiteGeometry.TOTAL_AREA = totalAreaSum; // Met à jour l'aire totale
    }
}

export { KiteGeometry };