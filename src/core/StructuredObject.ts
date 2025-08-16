/**
 * StructuredObject.ts - Classe de base pour objets 3D complexes avec points nommés
 * 
 * Fournit une architecture orientée objet pour créer des objets 3D complexes
 * en définissant d'abord des points anatomiques, puis en construisant la structure
 * et les surfaces entre ces points.
 */

import * as THREE from 'three';
import { Assembly } from './Assembly';
import { Primitive } from './Primitive';

/**
 * Interface pour un nœud dans la hiérarchie de l'objet
 */
export interface Node3D {
  position: THREE.Vector3;
  label: string;
  visible?: boolean;
  children?: Node3D[];
}

/**
 * Type pour une position 3D simple
 */
export type Position3D = [number, number, number];

/**
 * Options pour créer une surface
 */
export interface SurfaceOptions {
  color?: string;
  transparent?: boolean;
  opacity?: number;
  doubleSide?: boolean;
}

/**
 * Classe abstraite pour objets structurés avec points anatomiques
 */
export abstract class StructuredObject extends Assembly {
  /**
   * Map des points nommés de l'objet
   */
  protected points: Map<string, THREE.Vector3> = new Map();
  
  /**
   * Map des nœuds labellisés
   */
  protected nodes: Map<string, Node3D> = new Map();
  
  /**
   * Affichage des labels en mode debug
   */
  protected showLabels: boolean = false;

  constructor(name: string, showLabels: boolean = false) {
    super(name);
    this.showLabels = showLabels;
    this.initialize();
  }

  /**
   * Méthode d'initialisation appelée automatiquement
   */
  protected initialize(): void {
    this.definePoints();
    this.buildFrame();
    this.buildSurface();
    if (this.showLabels) {
      this.createLabels();
    }
  }

  /**
   * Définit tous les points anatomiques de l'objet
   * À implémenter dans les classes dérivées
   */
  protected abstract definePoints(): void;

  /**
   * Construit la structure rigide (frame) de l'objet
   * À implémenter dans les classes dérivées
   */
  protected abstract buildFrame(): void;

  /**
   * Construit les surfaces de l'objet
   * À implémenter dans les classes dérivées
   */
  protected abstract buildSurface(): void;

  /**
   * Définit un point nommé
   */
  protected setPoint(name: string, position: Position3D): void {
    this.points.set(name, new THREE.Vector3(...position));
  }

  /**
   * Récupère un point par son nom
   */
  protected getPoint(name: string): THREE.Vector3 | undefined {
    return this.points.get(name);
  }

  /**
   * Crée un cylindre entre deux points nommés
   */
  protected cylinderBetweenPoints(
    point1Name: string,
    point2Name: string,
    radius: number,
    color: string
  ): THREE.Mesh | null {
    const p1 = this.getPoint(point1Name);
    const p2 = this.getPoint(point2Name);
    
    if (!p1 || !p2) {
      console.warn(`Points ${point1Name} ou ${point2Name} non trouvés`);
      return null;
    }

    // Calculer la distance entre les points
    const distance = p1.distanceTo(p2);
    
    // Créer le cylindre
    const cylinder = Primitive.cylinder(radius, distance, color);
    
    // Positionner au milieu des deux points
    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    
    // Orienter le cylindre vers le second point
    const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction
    );
    cylinder.quaternion.copy(quaternion);
    
    // Ajouter à l'assemblage
    this.add(cylinder, [midpoint.x, midpoint.y, midpoint.z]);
    
    return cylinder;
  }

  /**
   * Crée une surface triangulaire entre trois points nommés
   */
  protected surfaceBetweenPoints(
    pointNames: string[],
    options: SurfaceOptions = {}
  ): THREE.Mesh | null {
    if (pointNames.length < 3) {
      console.warn('Il faut au moins 3 points pour créer une surface');
      return null;
    }

    const vertices: number[] = [];
    const positions: THREE.Vector3[] = [];

    // Récupérer les positions des points
    for (const name of pointNames) {
      const point = this.getPoint(name);
      if (!point) {
        console.warn(`Point ${name} non trouvé`);
        return null;
      }
      positions.push(point);
      vertices.push(point.x, point.y, point.z);
    }

    // Créer la géométrie
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    // Créer les faces (triangulation simple pour N points)
    if (pointNames.length === 3) {
      // Triangle simple
      geometry.setIndex([0, 1, 2]);
    } else if (pointNames.length === 4) {
      // Quad = 2 triangles
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
    } else {
      // Fan triangulation pour plus de points
      const indices: number[] = [];
      for (let i = 1; i < pointNames.length - 1; i++) {
        indices.push(0, i, i + 1);
      }
      geometry.setIndex(indices);
    }

    geometry.computeVertexNormals();

    // Créer le matériau
    const material = new THREE.MeshStandardMaterial({
      color: options.color || '#888888',
      transparent: options.transparent || false,
      opacity: options.opacity || 1,
      side: options.doubleSide ? THREE.DoubleSide : THREE.FrontSide
    });

    // Créer le mesh
    const mesh = new THREE.Mesh(geometry, material);
    this.add(mesh);

    return mesh;
  }

  /**
   * Ajoute un nœud labellisé
   */
  protected addLabeledNode(name: string, position: Position3D): Node3D {
    const node: Node3D = {
      position: new THREE.Vector3(...position),
      label: name,
      visible: this.showLabels,
      children: []
    };
    
    this.nodes.set(name, node);
    
    // Si les labels sont activés, créer une sphère de debug
    if (this.showLabels) {
      const sphere = Primitive.sphere(0.02, '#ffff00');
      this.add(sphere, position);
    }
    
    return node;
  }

  /**
   * Connecte deux nœuds avec un cylindre
   */
  protected connectNodes(
    node1Name: string,
    node2Name: string,
    radius: number = 0.01,
    color: string = '#666666'
  ): THREE.Mesh | null {
    const node1 = this.nodes.get(node1Name);
    const node2 = this.nodes.get(node2Name);
    
    if (!node1 || !node2) {
      console.warn(`Nœuds ${node1Name} ou ${node2Name} non trouvés`);
      return null;
    }

    // Utiliser les positions des nœuds comme points
    this.setPoint(`_node_${node1Name}`, node1.position.toArray() as Position3D);
    this.setPoint(`_node_${node2Name}`, node2.position.toArray() as Position3D);
    
    return this.cylinderBetweenPoints(
      `_node_${node1Name}`,
      `_node_${node2Name}`,
      radius,
      color
    );
  }

  /**
   * Crée les labels visuels pour tous les points
   */
  protected createLabels(): void {
    this.points.forEach((position, name) => {
      // Créer une petite sphère jaune pour chaque point
      const marker = Primitive.sphere(0.015, '#ffff00');
      this.add(marker, [position.x, position.y, position.z]);
      
      // Note: Pour un vrai système de labels texte, il faudrait
      // utiliser THREE.CSS2DRenderer ou THREE.Sprite avec texture texte
    });
  }

  /**
   * Active/désactive l'affichage des labels
   */
  public setShowLabels(show: boolean): void {
    this.showLabels = show;
    if (show) {
      this.createLabels();
    }
  }

  /**
   * Retourne la liste des points définis
   */
  public getPointNames(): string[] {
    return Array.from(this.points.keys());
  }

  /**
   * Retourne la liste des nœuds
   */
  public getNodeNames(): string[] {
    return Array.from(this.nodes.keys());
  }
}