/**
 * Cube.ts - Cube utilisant CubeFactory pour l'AutoLoader
 * Pont entre le système AutoLoader et le système Factory
 */

import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@/types';
import { Primitive } from '@core/Primitive';

/**
 * Classe Cube compatible AutoLoader qui implémente directement la géométrie
 */
export class Cube extends StructuredObject implements ICreatable {
  private cubeSize: number = 2; // Taille visible par défaut

  constructor() {
    super('Cube'); // Nom pour StructuredObject
    this.initialize();
  }

  // Interface ICreatable
  create(): this {
    return this;
  }

  getName(): string {
    return 'Cube';
  }

  getDescription(): string {
    return `Cube paramétrique de ${this.cubeSize} unités`;
  }

  getPrimitiveCount(): number {
    return 1; // 1 primitive de cube
  }

  // Méthodes StructuredObject
  protected definePoints(): void {
    const halfSize = this.cubeSize / 2;

    // 8 sommets du cube
    this.setPoint('bottom-back-left', [-halfSize, -halfSize, -halfSize]);
    this.setPoint('bottom-back-right', [halfSize, -halfSize, -halfSize]);
    this.setPoint('top-back-right', [halfSize, halfSize, -halfSize]);
    this.setPoint('top-back-left', [-halfSize, halfSize, -halfSize]);
    this.setPoint('bottom-front-left', [-halfSize, -halfSize, halfSize]);
    this.setPoint('bottom-front-right', [halfSize, -halfSize, halfSize]);
    this.setPoint('top-front-right', [halfSize, halfSize, halfSize]);
    this.setPoint('top-front-left', [-halfSize, halfSize, halfSize]);

    // Point central
    this.setPoint('center', [0, 0, 0]);
  }

  protected buildStructure(): void {
    // Pas de structure spécifique pour un cube simple
  }

  protected buildSurfaces(): void {
    // Créer le cube directement avec une primitive
    const cube = Primitive.box(this.cubeSize, this.cubeSize, this.cubeSize, '#8B4513');
    this.addPrimitiveAt(cube, [0, 0, 0]);
  }
}

// Export par défaut pour AutoLoader
export default Cube;