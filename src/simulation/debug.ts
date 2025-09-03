import * as THREE from 'three';
import { PhysicsConstants } from '@/simulation/physics/PhysicsConstants';

// Constantes pour la visualisation des vecteurs de debug
const VECTOR_VISUAL_SCALE = 0.15;      // Échelle globale pour la longueur des flèches des vecteurs
const NORMAL_VISUAL_LENGTH = 0.3;     // Longueur fixe pour l'affichage des normales de surface
const MIN_ARROW_LENGTH = 0.05;        // Longueur minimale pour toutes les flèches pour qu'elles restent visibles

/**
 * @interface SurfaceDebug
 * @description Définit la structure des objets de debug pour une seule surface (triangle).
 */
interface SurfaceDebug {
  apparentWind: THREE.ArrowHelper; // Vent apparent relatif à la surface
  lift: THREE.ArrowHelper;         // Force de portance de la surface
  drag: THREE.ArrowHelper;         // Force de traînée de la surface
  normal: THREE.ArrowHelper;       // Vecteur normal de la surface
  resultante: THREE.ArrowHelper;   // Force aérodynamique résultante sur la surface
}

/**
 * @class DebugVectors
 * @description Gère la création et la mise à jour des éléments de visualisation de debug 3D
 *              (vecteurs de vitesse, forces aérodynamiques, tension des lignes, indicateur de décrochage).
 *              Cette classe est purement visuelle et ne gère aucune logique de simulation.
 */
export class DebugVectors {
  private group = new THREE.Group();          // Groupe pour tous les objets de debug 3D
  private ltensionArrow: THREE.ArrowHelper;  // Flèche pour la tension de la ligne gauche
  private rtensionArrow: THREE.ArrowHelper;  // Flèche pour la tension de la ligne droite

  // Debug global du kite
  private globalVelocityArrow: THREE.ArrowHelper; // Flèche pour la vitesse globale du kite
  private stallIndicator: THREE.Mesh;             // Indicateur visuel de décrochage (stall)

  // Vecteurs par surface (pour chaque triangle du kite)
  private surfaceDebug: SurfaceDebug[] = [];

  constructor() {
    this.group.name = 'DebugVectors';
    this.group.visible = false; // Initialement caché

    // Initialisation des vecteurs globaux
    // Vitesse globale (vert)
    this.globalVelocityArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x00ff00);
    // Tension gauche (bleu ciel)
    this.ltensionArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0x1e90ff);
    // Tension droite (rouge vif)
    this.rtensionArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0xff5555);

    // Initialisation de l'indicateur de décrochage (bulle rouge transparente)
    const stallGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const stallMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 });
    this.stallIndicator = new THREE.Mesh(stallGeo, stallMat);
    this.stallIndicator.visible = false; // Caché par défaut

    // Création des vecteurs pour chaque surface du kite (4 triangles)
    const surfaceNames = ['Surface_HG', 'Surface_BG', 'Surface_HD', 'Surface_BD']; // Noms pour le debug
    const baseColors = [
      { base: 0x0088ff, accent: 0x66aaff }, // Bleu pour surfaces gauches (Portance, Résultante)
      { base: 0x0088ff, accent: 0x66aaff },
      { base: 0xff8800, accent: 0xffaa66 }, // Orange pour surfaces droites (Portance, Résultante)
      { base: 0xff8800, accent: 0xffaa66 }
    ];

    for (let i = 0; i < 4; i++) {
      const colors = baseColors[i];
      const surfaceDebug: SurfaceDebug = {
        // Vent apparent (cyan)
        apparentWind: new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x00e0ff),
        // Portance (couleur de base)
        lift: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, colors.base),
        // Traînée (rouge)
        drag: new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 1, 0xff0000),
        // Normale (gris)
        normal: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), NORMAL_VISUAL_LENGTH, 0x888888),
        // Force résultante (couleur accentuée)
        resultante: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, colors.accent)
      };

      // Attribuer un nom à chaque flèche pour faciliter le debug dans l'éditeur Three.js
      Object.entries(surfaceDebug).forEach(([type, arrow]) => {
        arrow.name = `${surfaceNames[i]}_${type}`;
      });

      // Ajouter toutes les flèches de la surface au groupe de debug
      Object.values(surfaceDebug).forEach(arrow => this.group.add(arrow));

      this.surfaceDebug.push(surfaceDebug);
    }

    // Ajouter tous les éléments de debug principaux au groupe
    this.group.add(
      this.globalVelocityArrow,
      this.ltensionArrow,
      this.rtensionArrow,
      this.stallIndicator
    );
  }

  /**
   * @returns {THREE.Object3D} Le groupe Three.js contenant tous les éléments de debug.
   */
  get object3d(): THREE.Object3D {
    return this.group;
  }

  /**
   * Définit la visibilité de tous les éléments de debug.
   * @param {boolean} visible - True pour afficher, false pour cacher.
   */
  setVisible(visible: boolean) {
    this.group.visible = visible;
  }

  /**
   * Met à jour la position et l'orientation des vecteurs de debug.
   * @param {THREE.Vector3} kitePosition - Position actuelle du centre du kite.
   * @param {object} data - Données de simulation nécessaires pour la mise à jour des vecteurs.
   * @param {THREE.Vector3} data.globalVelocity - Vitesse globale du kite.
   * @param {object[]} data.surfaceData - Tableau des données pour chaque surface.
   * @param {THREE.Vector3} data.surfaceData[].center - Centre de la surface.
   * @param {THREE.Vector3} data.surfaceData[].normal - Normale de la surface.
   * @param {THREE.Vector3} data.surfaceData[].apparentWind - Vent apparent sur la surface.
   * @param {THREE.Vector3} data.surfaceData[].lift - Force de portance.
   * @param {THREE.Vector3} data.surfaceData[].drag - Force de traînée.
   * @param {THREE.Vector3} data.surfaceData[].].resultant - Force résultante.
   * @param {object} [data.leftLine] - Données de la ligne gauche (from et to).
   * @param {THREE.Vector3} data.leftLine.from - Point de départ de la ligne gauche.
   * @param {THREE.Vector3} data.leftLine.to - Point d'arrivée de la ligne gauche.
   * @param {object} [data.rightLine] - Données de la ligne droite (from et to).
   * @param {THREE.Vector3} data.rightLine.from - Point de départ de la ligne droite.
   * @param {THREE.Vector3} data.rightLine.to - Point d'arrivée de la ligne droite.
   * @param {boolean} [data.isStalling] - Indique si le kite est en décrochage.
   */
  update(kitePosition: THREE.Vector3, data: {
    globalVelocity: THREE.Vector3;
    surfaceData: {
      center: THREE.Vector3;
      normal: THREE.Vector3;
      apparentWind: THREE.Vector3;
      lift: THREE.Vector3;
      drag: THREE.Vector3;
      resultant: THREE.Vector3;
    }[];
    leftLine?: { from: THREE.Vector3; to: THREE.Vector3 };
    rightLine?: { from: THREE.Vector3; to: THREE.Vector3 };
    isStalling?: boolean;
    aoaDeg?: number; // L'AoA est ajouté ici pour être géré par SimulationUIManager, pas DebugVectors
  }) {
    // Offset pour la flèche de vitesse globale (légèrement au-dessus du kite)
    const baseOffset = new THREE.Vector3(0, 0.5, 0);
    this.globalVelocityArrow.position.copy(kitePosition).add(baseOffset);

    // Mise à jour de la vitesse globale
    if (data.globalVelocity.lengthSq() > PhysicsConstants.EPSILON) {
      this.globalVelocityArrow.setDirection(data.globalVelocity.clone().normalize());
      this.globalVelocityArrow.setLength(Math.max(MIN_ARROW_LENGTH, data.globalVelocity.length() * VECTOR_VISUAL_SCALE));
    } else {
      this.globalVelocityArrow.setLength(0); // Cacher la flèche si la vitesse est négligeable
    }

    // Mise à jour des vecteurs pour chaque surface du kite
    data.surfaceData.forEach((surface, index) => {
      // Sécurité : s'assurer que l'index existe
      if (index >= this.surfaceDebug.length) return;

      const surfaceVectors = this.surfaceDebug[index];

      // Vent apparent sur cette surface
      if (surface.apparentWind.lengthSq() > PhysicsConstants.EPSILON) {
        surfaceVectors.apparentWind.position.copy(surface.center);
        surfaceVectors.apparentWind.setDirection(surface.apparentWind.clone().normalize());
        surfaceVectors.apparentWind.setLength(Math.max(MIN_ARROW_LENGTH, surface.apparentWind.length() * VECTOR_VISUAL_SCALE));
      } else {
        surfaceVectors.apparentWind.setLength(0);
      }

      // Portance sur cette surface
      if (surface.lift.lengthSq() > PhysicsConstants.EPSILON) {
        surfaceVectors.lift.position.copy(surface.center);
        surfaceVectors.lift.setDirection(surface.lift.clone().normalize());
        surfaceVectors.lift.setLength(Math.max(MIN_ARROW_LENGTH, surface.lift.length() * VECTOR_VISUAL_SCALE));
      } else {
        surfaceVectors.lift.setLength(0);
      }

      // Traînée sur cette surface
      if (surface.drag.lengthSq() > PhysicsConstants.EPSILON) {
        surfaceVectors.drag.position.copy(surface.center);
        surfaceVectors.drag.setDirection(surface.drag.clone().normalize());
        surfaceVectors.drag.setLength(Math.max(MIN_ARROW_LENGTH, surface.drag.length() * VECTOR_VISUAL_SCALE));
      } else {
        surfaceVectors.drag.setLength(0);
      }

      // Normale de la surface (longueur fixe)
      if (surface.normal.lengthSq() > PhysicsConstants.EPSILON) {
        surfaceVectors.normal.position.copy(surface.center);
        surfaceVectors.normal.setDirection(surface.normal.clone().normalize());
        surfaceVectors.normal.setLength(NORMAL_VISUAL_LENGTH);
      } else {
        surfaceVectors.normal.setLength(0);
      }

      // Force résultante sur cette surface
      if (surface.resultant.lengthSq() > PhysicsConstants.EPSILON) {
        surfaceVectors.resultante.position.copy(surface.center);
        surfaceVectors.resultante.setDirection(surface.resultant.clone().normalize());
        surfaceVectors.resultante.setLength(Math.max(MIN_ARROW_LENGTH, surface.resultant.length() * VECTOR_VISUAL_SCALE));
      } else {
        surfaceVectors.resultante.setLength(0);
      }
    });

    // Mise à jour des lignes de tension (si présentes)
    if (data.leftLine) {
      const dirL = data.leftLine.to.clone().sub(data.leftLine.from);
      this.ltensionArrow.position.copy(data.leftLine.from);
      if (dirL.lengthSq() > PhysicsConstants.EPSILON) {
        this.ltensionArrow.setDirection(dirL.clone().normalize());
        this.ltensionArrow.setLength(Math.max(MIN_ARROW_LENGTH, dirL.length() * VECTOR_VISUAL_SCALE * 1.5)); // Longueur ajustée pour les lignes
      } else {
        this.ltensionArrow.setLength(0);
      }
    } else {
      this.ltensionArrow.setLength(0);
    }

    if (data.rightLine) {
      const dirR = data.rightLine.to.clone().sub(data.rightLine.from);
      this.rtensionArrow.position.copy(data.rightLine.from);
      if (dirR.lengthSq() > PhysicsConstants.EPSILON) {
        this.rtensionArrow.setDirection(dirR.clone().normalize());
        this.rtensionArrow.setLength(Math.max(MIN_ARROW_LENGTH, dirR.length() * VECTOR_VISUAL_SCALE * 1.5));
      } else {
        this.rtensionArrow.setLength(0);
      }
    } else {
      this.rtensionArrow.setLength(0);
    }

    // Mise à jour de l'indicateur de décrochage (stall)
    this.stallIndicator.position.copy(kitePosition);
    this.stallIndicator.visible = data.isStalling || false;
  }

  /**
   * Supprime tous les éléments 3D de debug de la scène.
   * Dans cette version, les éléments de l'UI (comme l'AoA) ne sont plus gérés ici.
   */
  dispose(): void {
    // Les ArrowHelper doivent être retirés et disposés si vous les retirez individuellement
    // ou si vous disposez de la géométrie/matériau s'ils ne sont pas partagés.
    // Pour des raisons de simplicité, on se repose sur la suppression du groupe entier.
    this.group.clear(); // Nettoie tous les enfants du groupe
  }
}
