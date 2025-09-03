/**
 * Kite.ts - Cerf-volant utilisant KiteFactory pour l'AutoLoader
 * Pont entre le système AutoLoader et le système Factory
 */

import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@/types';
import { KiteFactory, KiteParams, DEFAULT_KITE_CONFIG } from '@factories/KiteFactory';
import * as THREE from 'three';

/**
 * Classe Kite compatible AutoLoader qui utilise KiteFactory
 */
export class Kite extends StructuredObject implements ICreatable {
  private factory: KiteFactory;
  private params: Partial<KiteParams>;

  constructor(params: Partial<KiteParams> = {}) {
    super('Kite'); // Nom pour StructuredObject

    // Paramètres par défaut avec une taille visible
    this.params = {
      width: 3.0,      // Envergure plus visible
      height: 1.5,     // Hauteur plus visible
      depth: 0.3,      // Profondeur des whiskers
      frameDiameter: 0.02,
      frameColor: '#2a2a2a',
      sailColor: '#ff3333',
      sailOpacity: 0.9,
      bridleLengthFactor: 1.0,
      ...params
    };

    this.factory = new KiteFactory();

    // Créer l'objet via la factory et copier ses propriétés
    const kiteObject = this.factory.createObject(this.params);

    // Copier le contenu de l'objet factory dans cette instance
    this.copy(kiteObject as any);
    this.initialize();
  }

  // Interface ICreatable
  create(): this {
    return this;
  }

  getName(): string {
    return 'Kite';
  }

  getDescription(): string {
    return `Cerf-volant paramétrique (${this.params.width}x${this.params.height}) créé via KiteFactory`;
  }

  getPrimitiveCount(): number {
    return 20; // Estimation pour un cerf-volant avec structure
  }

  // Méthodes StructuredObject qui implémentent directement la géométrie
  protected definePoints(): void {
    const w = this.params.width!;
    const h = this.params.height!;
    const d = this.params.depth!;

    // Points principaux du cerf-volant delta
    this.setPoint('NEZ', [0, h * 0.2, 0]);           // Pointe avant
    this.setPoint('AILE_GAUCHE', [-w / 2, -h * 0.3, 0]); // Extrémité gauche
    this.setPoint('AILE_DROITE', [w / 2, -h * 0.3, 0]);  // Extrémité droite
    this.setPoint('QUEUE', [0, -h * 0.8, 0]);          // Pointe arrière
    this.setPoint('CENTRE', [0, 0, 0]);                // Centre

    // Points de contrôle (plus bas pour les lignes)
    this.setPoint('CTRL_GAUCHE', [-w * 0.2, -h * 1.2, 0]);
    this.setPoint('CTRL_DROIT', [w * 0.2, -h * 1.2, 0]);
  }

  protected buildStructure(): void {
    // Structure du cerf-volant avec des lignes
    const frameMaterial = new THREE.LineBasicMaterial({
      color: this.params.frameColor,
      linewidth: 2
    });

    // Contour du cerf-volant - créer manuellement les lignes
    this.createLineBetweenPoints('NEZ', 'AILE_GAUCHE', frameMaterial);
    this.createLineBetweenPoints('AILE_GAUCHE', 'QUEUE', frameMaterial);
    this.createLineBetweenPoints('QUEUE', 'AILE_DROITE', frameMaterial);
    this.createLineBetweenPoints('AILE_DROITE', 'NEZ', frameMaterial);

    // Lignes de contrôle (brides)
    const bridleMaterial = new THREE.LineBasicMaterial({
      color: '#333333',
      linewidth: 1
    });

    this.createLineBetweenPoints('NEZ', 'CTRL_GAUCHE', bridleMaterial);
    this.createLineBetweenPoints('NEZ', 'CTRL_DROIT', bridleMaterial);
    this.createLineBetweenPoints('CENTRE', 'CTRL_GAUCHE', bridleMaterial);
    this.createLineBetweenPoints('CENTRE', 'CTRL_DROIT', bridleMaterial);
  }

  /**
   * Méthode helper pour créer une ligne entre deux points
   */
  private createLineBetweenPoints(point1Name: string, point2Name: string, material: THREE.LineBasicMaterial): void {
    const p1 = this.getPoint(point1Name);
    const p2 = this.getPoint(point2Name);

    if (p1 && p2) {
      const geometry = new THREE.BufferGeometry();
      const points = [p1, p2];
      geometry.setFromPoints(points);

      const line = new THREE.Line(geometry, material);
      line.name = `Line_${point1Name}_${point2Name}`;
      this.add(line);
    }
  }

  protected buildSurfaces(): void {
    // Créer la surface triangulaire du cerf-volant
    const points = [
      this.getPoint('NEZ')!,
      this.getPoint('AILE_GAUCHE')!,
      this.getPoint('QUEUE')!,
      this.getPoint('AILE_DROITE')!
    ];

    // Géométrie personnalisée pour le cerf-volant
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    // Triangle gauche : NEZ -> AILE_GAUCHE -> QUEUE
    vertices.push(
      points[0].x, points[0].y, points[0].z, // NEZ
      points[1].x, points[1].y, points[1].z, // AILE_GAUCHE
      points[2].x, points[2].y, points[2].z  // QUEUE
    );

    // Triangle droit : NEZ -> QUEUE -> AILE_DROITE
    vertices.push(
      points[0].x, points[0].y, points[0].z, // NEZ
      points[2].x, points[2].y, points[2].z, // QUEUE
      points[3].x, points[3].y, points[3].z  // AILE_DROITE
    );

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      color: this.params.sailColor,
      transparent: true,
      opacity: this.params.sailOpacity,
      side: THREE.DoubleSide
    });

    const kiteSurface = new THREE.Mesh(geometry, material);
    kiteSurface.name = 'KiteSurface';
    kiteSurface.castShadow = true;

    this.add(kiteSurface);
  }

  /**
   * Mise à jour des paramètres du cerf-volant
   */
  updateParameters(params: Partial<KiteParams>): void {
    this.params = { ...this.params, ...params };

    // Recréer l'objet via la factory avec les nouveaux paramètres
    const newKiteObject = this.factory.createObject(this.params);
    this.copy(newKiteObject as any);
  }
}

// Export par défaut pour AutoLoader
export default Kite;

// Fonction utilitaire pour créer un cerf-volant rapidement
export function createKite(params: Partial<KiteParams> = {}): Kite {
  return new Kite(params);
}