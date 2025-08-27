/**
 * Cube.ts - Cube optimisé 1x1x1 pour impression 3D
 * Utilise une géométrie indexée avec 8 vertices partagés
 */

import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import * as THREE from 'three';

export class Cube extends StructuredObject implements ICreatable {
  private size: number;
  
  constructor(size: number = 10) { // 10mm = 1cm en millimètres
    super("Cube", false);
    this.size = size;
    this.init();
  }
  
  protected definePoints(): void {
    const s = this.size / 2;
    
    // 8 sommets du cube
    this.setPoint('VERTEX_000', [-s, -s, -s]);
    this.setPoint('VERTEX_001', [-s, -s,  s]);
    this.setPoint('VERTEX_010', [-s,  s, -s]);
    this.setPoint('VERTEX_011', [-s,  s,  s]);
    this.setPoint('VERTEX_100', [ s, -s, -s]);
    this.setPoint('VERTEX_101', [ s, -s,  s]);
    this.setPoint('VERTEX_110', [ s,  s, -s]);
    this.setPoint('VERTEX_111', [ s,  s,  s]);
    
    // Centre du cube
    this.setPoint('CENTER', [0, 0, 0]);
  }
  
  protected buildStructure(): void {
    // Créer une géométrie de cube optimisée avec 8 vertices
    const geometry = this.createOptimizedCubeGeometry(this.size);
    
    // Créer le matériau
    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.3,
      roughness: 0.7
    });
    
    // Créer le mesh
    const cube = new THREE.Mesh(geometry, material);
    
    // Ajouter au centre
    this.add(cube);
  }
  
  /**
   * Crée une géométrie de cube optimisée avec seulement 8 vertices
   * et des faces indexées pour éviter les duplications
   */
  private createOptimizedCubeGeometry(size: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const s = size / 2;
    
    // Définir les 8 vertices uniques du cube
    const vertices = new Float32Array([
      // Vertex 0: arrière-bas-gauche
      -s, -s, -s,
      // Vertex 1: arrière-bas-droit
       s, -s, -s,
      // Vertex 2: arrière-haut-droit
       s,  s, -s,
      // Vertex 3: arrière-haut-gauche
      -s,  s, -s,
      // Vertex 4: avant-bas-gauche
      -s, -s,  s,
      // Vertex 5: avant-bas-droit
       s, -s,  s,
      // Vertex 6: avant-haut-droit
       s,  s,  s,
      // Vertex 7: avant-haut-gauche
      -s,  s,  s
    ]);
    
    // Définir les indices pour les 12 triangles (6 faces × 2 triangles)
    const indices = new Uint16Array([
      // Face arrière (z = -s)
      0, 1, 2,
      0, 2, 3,
      // Face avant (z = s)
      4, 6, 5,
      4, 7, 6,
      // Face gauche (x = -s)
      0, 3, 7,
      0, 7, 4,
      // Face droite (x = s)
      1, 5, 6,
      1, 6, 2,
      // Face bas (y = -s)
      0, 4, 5,
      0, 5, 1,
      // Face haut (y = s)
      3, 2, 6,
      3, 6, 7
    ]);
    
    // Calculer les normales pour chaque vertex
    // Pour un cube, chaque vertex appartient à 3 faces
    const normals = new Float32Array([
      // Les normales moyennées pour chaque vertex
      -0.577, -0.577, -0.577,  // Vertex 0
       0.577, -0.577, -0.577,  // Vertex 1
       0.577,  0.577, -0.577,  // Vertex 2
      -0.577,  0.577, -0.577,  // Vertex 3
      -0.577, -0.577,  0.577,  // Vertex 4
       0.577, -0.577,  0.577,  // Vertex 5
       0.577,  0.577,  0.577,  // Vertex 6
      -0.577,  0.577,  0.577   // Vertex 7
    ]);
    
    // Appliquer les attributs à la géométrie
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    
    // Calculer les bounding box et sphere
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    return geometry;
  }
  
  protected buildSurfaces(): void {
    // Pas de surfaces supplémentaires - le cube est déjà solide
  }
  
  create(): this {
    return this;
  }
  
  getName(): string {
    return "Cube";
  }
  
  getDescription(): string {
    return `Cube optimisé ${this.size}x${this.size}x${this.size}mm (1cm³) - 8 vertices, 12 faces`;
  }
  
  getPrimitiveCount(): number {
    return 1;
  }
}