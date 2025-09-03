/**
 * `environment.ts` - Création de l'environnement 3D pour la simulation.
 *
 * Cette classe est responsable de l'initialisation des éléments statiques de la scène
 * tels que le sol, la grille de référence et les axes de coordonnées. Elle définit
 * l'aspect visuel de l'environnement dans lequel la simulation se déroule.
 */

import * as THREE from 'three';

export class Environment {
  private group = new THREE.Group();

  constructor() {
    this.group.name = 'Environment';

    // Création du sol (un grand cercle vert)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d7d2a }); // Couleur verte foncée
    const groundGeo = new THREE.CircleGeometry(50, 64);                     // Géométrie circulaire de 50m de rayon
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;     // Place le cercle à plat sur le plan XZ
    ground.receiveShadow = true;          // Le sol peut recevoir des ombres
    ground.name = 'Ground';               // Nom pour l'identification dans la scène
    this.group.add(ground);

    // Ajout d'une grille pour les repères visuels
    const grid = new THREE.GridHelper(40, 40, 0x335533, 0x224422); // Grille de 40x40 unités
    (grid.material as THREE.Material).opacity = 0.5;                // Transparence
    (grid.material as THREE.Material).transparent = true;           // Active la transparence
    this.group.add(grid);

    // Ajout d'un repère 3D (axes X, Y, Z)
    const axesHelper = new THREE.AxesHelper(2); // Axes de 2m de long
    axesHelper.position.set(1, 0, 0);             // Positionne les axes pour une meilleure visibilité
    axesHelper.name = 'AxesHelper';               // Nom pour l'identification
    this.group.add(axesHelper);
  }

  get object3d(): THREE.Object3D { return this.group; }
}

