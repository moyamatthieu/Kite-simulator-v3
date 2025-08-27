/**
 * Table.ts - Table simple avec pattern StructuredObject unifié
 */

import * as THREE from 'three';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import { Primitive } from '@core/Primitive';

export class Table extends StructuredObject implements ICreatable {
  private config = {
    width: 1.2,
    depth: 0.8,
    height: 0.75,
    topThickness: 0.03,
    legRadius: 0.025,
    woodColor: '#8B4513'
  };

  constructor() {
    super("Table", false);
    this.init(); // Initialiser après la configuration
  }

  protected definePoints(): void {
    const { width, depth, height } = this.config;
    
    // Points du plateau
    this.setPoint('PLATEAU_CENTRE', [0, height, 0]);
    
    // Points des pieds (positions en bas et en haut)
    this.setPoint('PIED_BAS_AG', [-width/2 + 0.05, 0, -depth/2 + 0.05]);
    this.setPoint('PIED_BAS_AD', [width/2 - 0.05, 0, -depth/2 + 0.05]);
    this.setPoint('PIED_BAS_RG', [-width/2 + 0.05, 0, depth/2 - 0.05]);
    this.setPoint('PIED_BAS_RD', [width/2 - 0.05, 0, depth/2 - 0.05]);
    
    this.setPoint('PIED_HAUT_AG', [-width/2 + 0.05, height, -depth/2 + 0.05]);
    this.setPoint('PIED_HAUT_AD', [width/2 - 0.05, height, -depth/2 + 0.05]);
    this.setPoint('PIED_HAUT_RG', [-width/2 + 0.05, height, depth/2 - 0.05]);
    this.setPoint('PIED_HAUT_RD', [width/2 - 0.05, height, depth/2 - 0.05]);
  }

  protected buildStructure(): void {
    const { legRadius, woodColor } = this.config;
    
    // Les 4 pieds
    this.addCylinderBetweenPoints('PIED_BAS_AG', 'PIED_HAUT_AG', legRadius, woodColor);
    this.addCylinderBetweenPoints('PIED_BAS_AD', 'PIED_HAUT_AD', legRadius, woodColor);
    this.addCylinderBetweenPoints('PIED_BAS_RG', 'PIED_HAUT_RG', legRadius, woodColor);
    this.addCylinderBetweenPoints('PIED_BAS_RD', 'PIED_HAUT_RD', legRadius, woodColor);
  }

  protected buildSurfaces(): void {
    const { width, depth, topThickness, woodColor } = this.config;
    
    // Plateau
    const plateau = Primitive.box(width, topThickness, depth, woodColor);
    this.addPrimitiveAtPoint(plateau, 'PLATEAU_CENTRE');
  }

  // Interface ICreatable
  create(): this {
    return this;
  }

  getName(): string {
    return "Table";
  }

  getDescription(): string {
    return "Table simple en bois avec 4 pieds";
  }

  getPrimitiveCount(): number {
    return 5; // 1 plateau + 4 pieds
  }
}