/**
 * Kite.ts - Cerf-volant delta structuré avec points anatomiques
 * 
 * Implémentation d'un cerf-volant delta en utilisant le système StructuredObject
 * avec définition claire des points anatomiques, frame rigide et surfaces.
 */

import { StructuredObject } from '../core/StructuredObject';
import { ICreatable } from '../types';
import { Primitive } from '../core/Primitive';

export class Kite extends StructuredObject implements ICreatable {
  constructor() {
    super("Cerf-volant Delta", false);
  }

  /**
   * Définit tous les points anatomiques du cerf-volant
   */
  protected definePoints(): void {
    // Dimensions principales
    const width = 2.4;   // Envergure
    const height = 1.6;  // Hauteur
    const depth = 0.1;   // Profondeur whiskers
    
    // Points structurels principaux
    this.setPoint('NEZ', [0, height/2, 0]);
    this.setPoint('QUILLE', [0, 0, 0]);
    this.setPoint('SPINE_BAS', [0, -height/2, 0]);
    
    // Points des bords d'attaque
    this.setPoint('BORD_GAUCHE', [-width/2, 0, 0]);
    this.setPoint('BORD_DROIT', [width/2, 0, 0]);
    
    // Points des whiskers (stabilisateurs arrière)
    this.setPoint('WHISKER_GAUCHE', [-width/4, -height/2 + 0.3, -depth]);
    this.setPoint('WHISKER_DROIT', [width/4, -height/2 + 0.3, -depth]);
    
    // Points d'intersection spreader
    this.setPoint('INTER_GAUCHE', [-width*0.3, height*0.15, 0]);
    this.setPoint('INTER_DROIT', [width*0.3, height*0.15, 0]);
    
    // Point de bride (25% depuis le nez)
    this.setPoint('BRIDE', [0, height*0.25, 0.05]);
    
    // Points de contrôle (où s'attachent les lignes)
    this.setPoint('CTRL_GAUCHE', [-width*0.15, -height*0.2, 0.8]);
    this.setPoint('CTRL_DROIT', [width*0.15, -height*0.2, 0.8]);
  }

  /**
   * Construit la structure rigide du cerf-volant
   */
  protected buildFrame(): void {
    // Épine centrale
    this.cylinderBetweenPoints('NEZ', 'SPINE_BAS', 0.025, '#2a2a2a');
    
    // Bords d'attaque
    this.cylinderBetweenPoints('NEZ', 'BORD_GAUCHE', 0.02, '#2a2a2a');
    this.cylinderBetweenPoints('NEZ', 'BORD_DROIT', 0.02, '#2a2a2a');
    
    // Spreader (barre transversale)
    this.cylinderBetweenPoints('INTER_GAUCHE', 'INTER_DROIT', 0.02, '#333333');
    
    // Whiskers (stabilisateurs)
    this.cylinderBetweenPoints('WHISKER_GAUCHE', 'INTER_GAUCHE', 0.015, '#444444');
    this.cylinderBetweenPoints('WHISKER_DROIT', 'INTER_DROIT', 0.015, '#444444');
    
    // Renforts bords de fuite
    this.cylinderBetweenPoints('BORD_GAUCHE', 'WHISKER_GAUCHE', 0.01, '#555555');
    this.cylinderBetweenPoints('BORD_DROIT', 'WHISKER_DROIT', 0.01, '#555555');
    
    // Système de bridage
    this.cylinderBetweenPoints('BRIDE', 'NEZ', 0.003, '#000000');
    this.cylinderBetweenPoints('BRIDE', 'INTER_GAUCHE', 0.003, '#000000');
    this.cylinderBetweenPoints('BRIDE', 'INTER_DROIT', 0.003, '#000000');
    
    // Lignes de contrôle
    this.cylinderBetweenPoints('BRIDE', 'CTRL_GAUCHE', 0.002, '#1a1a1a');
    this.cylinderBetweenPoints('BRIDE', 'CTRL_DROIT', 0.002, '#1a1a1a');
  }

  /**
   * Construit les surfaces (toile) du cerf-volant
   */
  protected buildSurface(): void {
    // Panneau principal supérieur
    this.surfaceBetweenPoints(
      ['NEZ', 'BORD_GAUCHE', 'QUILLE'],
      { color: '#ff3333', transparent: true, opacity: 0.9, doubleSide: true }
    );
    
    this.surfaceBetweenPoints(
      ['NEZ', 'QUILLE', 'BORD_DROIT'],
      { color: '#ff3333', transparent: true, opacity: 0.9, doubleSide: true }
    );
    
    // Panneaux inférieurs
    this.surfaceBetweenPoints(
      ['QUILLE', 'BORD_GAUCHE', 'WHISKER_GAUCHE'],
      { color: '#dd0000', transparent: true, opacity: 0.85, doubleSide: true }
    );
    
    this.surfaceBetweenPoints(
      ['QUILLE', 'WHISKER_DROIT', 'BORD_DROIT'],
      { color: '#dd0000', transparent: true, opacity: 0.85, doubleSide: true }
    );
    
    // Panneaux whiskers
    this.surfaceBetweenPoints(
      ['WHISKER_GAUCHE', 'SPINE_BAS', 'QUILLE'],
      { color: '#cc0000', transparent: true, opacity: 0.8, doubleSide: true }
    );
    
    this.surfaceBetweenPoints(
      ['QUILLE', 'SPINE_BAS', 'WHISKER_DROIT'],
      { color: '#cc0000', transparent: true, opacity: 0.8, doubleSide: true }
    );
    
    // Ajouter des connecteurs visuels aux points clés
    const nez = this.getPoint('NEZ');
    if (nez) {
      const connector = Primitive.sphere(0.025, '#ff0000');
      this.add(connector, [nez.x, nez.y, nez.z]);
    }
    
    const bride = this.getPoint('BRIDE');
    if (bride) {
      const bridlePoint = Primitive.sphere(0.03, '#ffa500');
      this.add(bridlePoint, [bride.x, bride.y, bride.z]);
    }
    
    // Points de contrôle
    const ctrlG = this.getPoint('CTRL_GAUCHE');
    if (ctrlG) {
      const controlLeft = Primitive.sphere(0.025, '#dc143c');
      this.add(controlLeft, [ctrlG.x, ctrlG.y, ctrlG.z]);
    }
    
    const ctrlD = this.getPoint('CTRL_DROIT');
    if (ctrlD) {
      const controlRight = Primitive.sphere(0.025, '#b22222');
      this.add(controlRight, [ctrlD.x, ctrlD.y, ctrlD.z]);
    }
  }

  // Implémentation de l'interface ICreatable
  create(): StructuredObject {
    return this;
  }

  getName(): string {
    return "Cerf-volant Delta";
  }

  getDescription(): string {
    return "Cerf-volant delta avec structure anatomique complète";
  }

  getPrimitiveCount(): number {
    return 20; // Approximatif : frame + surfaces + connecteurs
  }
}