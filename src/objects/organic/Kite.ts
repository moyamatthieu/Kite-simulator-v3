/**
 * Kite.ts - Cerf-volant delta structuré avec points anatomiques
 * 
 * Implémentation d'un cerf-volant delta en utilisant le système StructuredObject
 * avec définition claire des points anatomiques, frame rigide et surfaces.
 */

import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';

export class Kite extends StructuredObject implements ICreatable {
  private diam = 0.01;  // diamètre des tubes du frame
  
  constructor() {
    super("Cerf-volant Delta", false);
    this.init(); // Initialiser après la configuration
  }

  /**
   * Définit tous les points anatomiques du cerf-volant
   */
  protected definePoints(): void {
    // Dimensions principales
    const width = 2;   // Envergure
    const height = 1;  // Hauteur
    const depth = 0.15;   // Profondeur whiskers


    // Points structurels principaux (SPINE_BAS en 0,0,0)
    this.setPoint('SPINE_BAS', [0, 0, 0]);  // Point bas en origine
    this.setPoint('CENTRE', [0, height/4, 0]);  // Milieu du cerf-volant
    this.setPoint('NEZ', [0, height, 0]);  // Pointe haute
    
    // Points des bords d'attaque (ajustés par rapport au nouveau zéro)
    this.setPoint('BORD_GAUCHE', [-width/2, 0, 0]);
    this.setPoint('BORD_DROIT', [width/2, 0, 0]);
    
    // points de fixation des whisker sur la barre transversale
    // D'abord calculer les positions des points INTER
    const centreY = height/4; // hauteur du centre
    const ratio = (height - centreY) / height; // ratio pour avoir Y = centreY
    const interGaucheX = 0 + ratio * (-width/2 - 0);
    const interDroitX = 0 + ratio * (width/2 - 0);
    
    // Position: 1/3 de la distance entre CENTRE et INTER_GAUCHE/DROIT
    const fixRatio = 2/3;
    this.setPoint('FIX_GAUCHE', [
      0 + fixRatio * (interGaucheX - 0), // 1/3 de la distance CENTRE->INTER_GAUCHE
      centreY,  // même hauteur Y que CENTRE
      0    // profondeur pour les whiskers
    ]);
    this.setPoint('FIX_DROIT', [
      0 + fixRatio * (interDroitX - 0), // 1/3 de la distance CENTRE->INTER_DROIT
      centreY,  // même hauteur Y que CENTRE
      0    // profondeur pour les whiskers
    ]);

    // Points des whiskers (stabilisateurs arrière)
    this.setPoint('WHISKER_GAUCHE', [-width/4, 0.3, -depth]);
    this.setPoint('WHISKER_DROIT', [width/4, 0.3, -depth]);
    
    // Points d'intersection spreader (sur les lignes NEZ-BORD, à la hauteur de CENTRE)
    // Les variables interGaucheX et interDroitX sont déjà calculées plus haut
    this.setPoint('INTER_GAUCHE', [
      interGaucheX,                 // x: position calculée
      centreY,                      // y: même hauteur que CENTRE
      0                             // z reste à 0
    ]);
    this.setPoint('INTER_DROIT', [
      interDroitX,                  // x: position calculée
      centreY,                      // y: même hauteur que CENTRE
      0                             // z reste à 0
    ]);
    
    // Points de contrôle (où s'attachent les lignes)
    this.setPoint('CTRL_GAUCHE', [-width*0.15, height*0.3, 0.8]);
    this.setPoint('CTRL_DROIT', [width*0.15, height*0.3, 0.8]);
  }

  /**
   * Construit la structure rigide du cerf-volant
   */
  protected buildStructure(): void {
    // Épine centrale
    this.addCylinderBetweenPoints('NEZ', 'SPINE_BAS', this.diam, '#2a2a2a');
    
    // Bords d'attaque
    this.addCylinderBetweenPoints('NEZ', 'BORD_GAUCHE', this.diam, '#2a2a2a');
    this.addCylinderBetweenPoints('NEZ', 'BORD_DROIT', this.diam, '#2a2a2a');
    
    // Spreader (barre transversale)
    this.addCylinderBetweenPoints('INTER_GAUCHE', 'INTER_DROIT', this.diam, '#333333');
    
    // Whiskers (stabilisateurs) - connectés aux points de fixation sur la barre
    this.addCylinderBetweenPoints('WHISKER_GAUCHE', 'FIX_GAUCHE', this.diam/2, '#444444');
    this.addCylinderBetweenPoints('WHISKER_DROIT', 'FIX_DROIT', this.diam/2, '#444444');


    // Système de bridage gauche
    this.addCylinderBetweenPoints('CTRL_GAUCHE', 'NEZ', 0.003, '#000000');
    this.addCylinderBetweenPoints('CTRL_GAUCHE', 'INTER_GAUCHE', 0.003, '#000000');
    this.addCylinderBetweenPoints('CTRL_GAUCHE', 'CENTRE', 0.003, '#000000');
    
    // Système de bridage Droit
    this.addCylinderBetweenPoints('CTRL_DROIT', 'NEZ', 0.003, '#000000');
    this.addCylinderBetweenPoints('CTRL_DROIT', 'INTER_DROIT', 0.003, '#000000');
    this.addCylinderBetweenPoints('CTRL_DROIT', 'CENTRE', 0.003, '#000000');

    
  }

  /**
   * Construit les surfaces (toile) du cerf-volant
   */
  protected buildSurfaces(): void {
    // Toile GAUCHE
    this.addSurfaceBetweenPoints(
      ['NEZ', 'BORD_GAUCHE', 'WHISKER_GAUCHE' ],
      { color: '#ff3333', transparent: true, opacity: 0.9, side: THREE.DoubleSide }
    );
    
    this.addSurfaceBetweenPoints(
      ['NEZ', 'WHISKER_GAUCHE', 'SPINE_BAS'],
      { color: '#ff3333', transparent: true, opacity: 0.9, side: THREE.DoubleSide }
    );

    // TOILE DROITE
    this.addSurfaceBetweenPoints(
      ['NEZ', 'BORD_DROIT', 'WHISKER_DROIT'],
      { color: '#ff3333', transparent: true, opacity: 0.9, side: THREE.DoubleSide }
    );
    
    this.addSurfaceBetweenPoints(
      ['NEZ', 'WHISKER_DROIT', 'SPINE_BAS'],
      { color: '#ff3333', transparent: true, opacity: 0.9, side: THREE.DoubleSide }
    );
    
    
    // Ajouter des connecteurs visuels aux points clés
    const nez = this.getPoint('NEZ');
    if (nez) {
      const connector = Primitive.sphere(0.025, '#ff0000');
      this.addPrimitiveAt(connector, [nez.x, nez.y, nez.z]);
    }
    
    const bride = this.getPoint('BRIDE');
    if (bride) {
      const bridlePoint = Primitive.sphere(0.03, '#ffa500');
      this.addPrimitiveAt(bridlePoint, [bride.x, bride.y, bride.z]);
    }
    
    // Points de contrôle
    const ctrlG = this.getPoint('CTRL_GAUCHE');
    if (ctrlG) {
      const controlLeft = Primitive.sphere(0.025, '#dc143c');
      this.addPrimitiveAt(controlLeft, [ctrlG.x, ctrlG.y, ctrlG.z]);
    }
    
    const ctrlD = this.getPoint('CTRL_DROIT');
    if (ctrlD) {
      const controlRight = Primitive.sphere(0.025, '#b22222');
      this.addPrimitiveAt(controlRight, [ctrlD.x, ctrlD.y, ctrlD.z]);
    }
  }

  // Implémentation de l'interface ICreatable
  create(): this {
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