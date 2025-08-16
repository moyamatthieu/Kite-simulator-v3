/**
 * TableStructured.ts - Table utilisant le système StructuredObject
 * 
 * Exemple simple montrant comment utiliser StructuredObject
 * même pour des objets basiques avec peu de primitives.
 */

import { StructuredObject } from '../core/StructuredObject';
import { ICreatable } from '../types';
import { Primitive } from '../core/Primitive';

export class TableStructured extends StructuredObject implements ICreatable {
  constructor() {
    super("Table Structurée", false);
  }

  /**
   * Définit les points clés de la table
   */
  protected definePoints(): void {
    // Dimensions
    const width = 1.2;
    const depth = 0.8;
    const height = 0.75;
    
    // Points du plateau (coins supérieurs)
    this.setPoint('COIN_AVANT_GAUCHE', [-width/2, height, depth/2]);
    this.setPoint('COIN_AVANT_DROIT', [width/2, height, depth/2]);
    this.setPoint('COIN_ARRIERE_GAUCHE', [-width/2, height, -depth/2]);
    this.setPoint('COIN_ARRIERE_DROIT', [width/2, height, -depth/2]);
    
    // Points des pieds (base au sol)
    this.setPoint('PIED_AVANT_GAUCHE', [-width/2 + 0.05, 0, depth/2 - 0.05]);
    this.setPoint('PIED_AVANT_DROIT', [width/2 - 0.05, 0, depth/2 - 0.05]);
    this.setPoint('PIED_ARRIERE_GAUCHE', [-width/2 + 0.05, 0, -depth/2 + 0.05]);
    this.setPoint('PIED_ARRIERE_DROIT', [width/2 - 0.05, 0, -depth/2 + 0.05]);
    
    // Point central du plateau
    this.setPoint('CENTRE_PLATEAU', [0, height, 0]);
  }

  /**
   * Construit la structure de la table (les pieds)
   */
  protected buildFrame(): void {
    // Les 4 pieds
    this.cylinderBetweenPoints('PIED_AVANT_GAUCHE', 'COIN_AVANT_GAUCHE', 0.025, '#654321');
    this.cylinderBetweenPoints('PIED_AVANT_DROIT', 'COIN_AVANT_DROIT', 0.025, '#654321');
    this.cylinderBetweenPoints('PIED_ARRIERE_GAUCHE', 'COIN_ARRIERE_GAUCHE', 0.025, '#654321');
    this.cylinderBetweenPoints('PIED_ARRIERE_DROIT', 'COIN_ARRIERE_DROIT', 0.025, '#654321');
    
    // Optionnel : barres de renfort entre les pieds
    this.cylinderBetweenPoints('PIED_AVANT_GAUCHE', 'PIED_AVANT_DROIT', 0.015, '#4a3621');
    this.cylinderBetweenPoints('PIED_ARRIERE_GAUCHE', 'PIED_ARRIERE_DROIT', 0.015, '#4a3621');
  }

  /**
   * Construit les surfaces de la table (le plateau)
   */
  protected buildSurface(): void {
    // Créer le plateau comme une boîte plutôt qu'une surface
    // car c'est plus approprié pour une table
    const centre = this.getPoint('CENTRE_PLATEAU');
    if (centre) {
      const plateau = Primitive.box(1.2, 0.03, 0.8, '#8B4513');
      this.add(plateau, [centre.x, centre.y, centre.z]);
    }
    
    // Alternative : utiliser surfaceBetweenPoints pour un plateau plus fin
    // this.surfaceBetweenPoints(
    //   ['COIN_AVANT_GAUCHE', 'COIN_AVANT_DROIT', 'COIN_ARRIERE_DROIT', 'COIN_ARRIERE_GAUCHE'],
    //   { color: '#8B4513', doubleSide: true }
    // );
  }

  // Implémentation de l'interface ICreatable
  create(): StructuredObject {
    return this;
  }

  getName(): string {
    return "Table Structurée";
  }

  getDescription(): string {
    return "Table simple utilisant le système de points structurés";
  }

  getPrimitiveCount(): number {
    return 7; // 1 plateau + 4 pieds + 2 renforts
  }
}