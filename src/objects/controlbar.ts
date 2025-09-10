/**
 * `controlbar.ts` - Gestion de la barre de contrôle 3D.
 *
 * Cette classe est responsable de la création, de la mise à jour et de l'accès à la représentation 3D
 * de la barre de contrôle dans la simulation. Elle gère purement l'aspect visuel et la position
 * des éléments de la barre, y compris son inclinaison.
 */

import * as THREE from 'three';
import { C_objet, C_objetConfig } from './C_objet';

// Constantes spécifiques à la géométrie de la barre de contrôle.
// Ces valeurs sont des propriétés visuelles et non des constantes physiques globales.
const BAR_LENGTH = 0.9;             // Longueur totale de la barre (hors poignées)
const BAR_RADIUS = 0.02;            // Rayon de la barre cylindrique
const HANDLE_LENGTH = 0.08;         // Longueur des poignées (réduit pour éviter dépassement)
const HANDLE_RADIUS = 0.025;        // Rayon des poignées
const HANDLE_OFFSET_X = 0.4;        // Décalage des poignées par rapport au centre de la barre
const INITIAL_BAR_HEIGHT = 1.4;     // Hauteur initiale de la barre par rapport à l'origine (mains du pilote)
const MAX_TILT_ANGLE_RADIANS = 0.35; // Angle d'inclinaison maximal de la barre en radians (~20 degrés)

export class ControlBar3D extends C_objet {
  private bar: THREE.Mesh;
  private leftOffset = new THREE.Vector3(-HANDLE_OFFSET_X, 0, 0);
  private rightOffset = new THREE.Vector3(HANDLE_OFFSET_X, 0, 0);

  constructor(config: C_objetConfig = {}) {
    super(config);

    // Création de la barre principale (cylindre horizontal)
    const barGeometry = new THREE.CylinderGeometry(BAR_RADIUS, BAR_RADIUS, BAR_LENGTH, 12);
    const barMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.2, roughness: 0.8 });
    this.bar = new THREE.Mesh(barGeometry, barMaterial);
    this.bar.rotation.z = Math.PI / 2; // Oriente le cylindre horizontalement
    this.bar.castShadow = true;        // La barre projette des ombres
    this.group.add(this.bar);

    // Création des poignées colorées
    const handleGeometry = new THREE.CylinderGeometry(HANDLE_RADIUS, HANDLE_RADIUS, HANDLE_LENGTH, 12);
    const leftHandleMaterial = new THREE.MeshStandardMaterial({ color: 0x1e90ff }); // Bleu pour la gauche
    const rightHandleMaterial = new THREE.MeshStandardMaterial({ color: 0xff5555 });// Rouge pour la droite

    const leftHandle = new THREE.Mesh(handleGeometry, leftHandleMaterial);
    const rightHandle = new THREE.Mesh(handleGeometry, rightHandleMaterial);

    leftHandle.position.copy(this.leftOffset);
    rightHandle.position.copy(this.rightOffset);

    // Centrer les poignées sur la hauteur de la barre (pas de décalage vertical)
    leftHandle.position.y = 0;
    rightHandle.position.y = 0;

    // Les poignées sont aussi horizontales
    leftHandle.rotation.z = Math.PI / 2;
    rightHandle.rotation.z = Math.PI / 2;

    this.group.add(leftHandle, rightHandle);

    // Positionne la barre à la hauteur initiale des mains du pilote
    this.group.position.set(0, INITIAL_BAR_HEIGHT, 0);
  }

  protected createGeometry(): void {
    // La géométrie est créée dans le constructeur
  }

  /**
   * Retourne l'objet 3D principal de la barre de contrôle.
   * @returns {THREE.Object3D} Le groupe Three.js représentant la barre.
   */
  get object3d(): THREE.Object3D {
    return this.group;
  }

  /**
   * Met à jour l'inclinaison visuelle de la barre de contrôle.
   * La barre s'incline autour de son axe Z en fonction de la valeur de `tilt`.
   * @param {number} tilt - La valeur d'inclinaison, généralement entre -1 (gauche) et 1 (droite).
   */
  updateTilt(tilt: number): void {
    // Empêche l'inclinaison de dépasser l'angle maximal défini.
    this.group.rotation.z = THREE.MathUtils.clamp(tilt, -1, 1) * MAX_TILT_ANGLE_RADIANS;
  }

  /**
   * Calcule la position mondiale de l'extrémité gauche de la barre.
   * @param {THREE.Vector3} [target=new THREE.Vector3()] - Vecteur cible pour stocker le résultat.
   * @returns {THREE.Vector3} La position mondiale du point d'attache gauche.
   */
  getLeftWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.leftOffset).applyMatrix4(this.group.matrixWorld);
  }

  /**
   * Calcule la position mondiale de l'extrémité droite de la barre.
   * @param {THREE.Vector3} [target=new THREE.Vector3()] - Vecteur cible pour stocker le résultat.
   * @returns {THREE.Vector3} La position mondiale du point d'attache droit.
   */
  getRightWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.rightOffset).applyMatrix4(this.group.matrixWorld);
  }

  /**
   * Retourne le groupe THREE.js pour ajout à la scène ou à un parent
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Nettoie les ressources de la barre de contrôle
   */
  dispose(): void {
    if (this.bar.geometry) {
      this.bar.geometry.dispose();
    }
    if (this.bar.material) {
      if (Array.isArray(this.bar.material)) {
        this.bar.material.forEach(material => material.dispose());
      } else {
        this.bar.material.dispose();
      }
    }
    this.group.clear();
  }
}
