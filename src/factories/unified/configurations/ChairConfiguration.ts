/**
 * Configuration pour les chaises - remplace ChairFactory
 * Utilise le nouveau système unifié ConfigurableObjectFactory
 */
import { ObjectConfiguration } from '@factories/unified/ConfigurableObjectFactory';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';

export interface ChairParams {
  // Dimensions (en unités 3D)
  seatWidth: number;
  seatDepth: number;
  seatHeight: number;
  seatThickness: number;

  backHeight: number;
  backThickness: number;
  backAngle: number;  // Inclinaison du dossier en degrés

  legRadius: number;
  legStyle: 'round' | 'square';

  // Couleurs
  seatColor: string;
  backColor: string;
  legColor: string;

  // Options
  hasArmrests: boolean;
  armrestHeight: number;
  style: 'modern' | 'classic' | 'scandinavian';
}

export const ChairConfiguration: ObjectConfiguration<ChairParams> = {
  metadata: {
    category: 'furniture',
    name: 'Chair',
    description: 'Chaise paramétrique',
    tags: ['chaise', 'mobilier', 'siège'],
    complexity: 'simple'
  },

  defaultParams: {
    seatWidth: 0.4,
    seatDepth: 0.4,
    seatHeight: 0.45,
    seatThickness: 0.03,
    backHeight: 0.4,
    backThickness: 0.03,
    backAngle: 5,
    legRadius: 0.02,
    legStyle: 'round',
    seatColor: '#8B4513',
    backColor: '#8B4513',
    legColor: '#654321',
    hasArmrests: false,
    armrestHeight: 0.2,
    style: 'modern'
  },

  variants: {
    dining: {},
    office: {
      seatHeight: 0.5,
      hasArmrests: true,
      backHeight: 0.5,
      style: 'modern'
    },
    bar: {
      seatHeight: 0.75,
      seatWidth: 0.35,
      seatDepth: 0.35,
      legRadius: 0.015,
      style: 'modern'
    },
    lounge: {
      seatWidth: 0.5,
      seatDepth: 0.45,
      backAngle: 15,
      style: 'scandinavian'
    }
  },

  builder: {
    definePoints: (params, context) => {
      const hw = params.seatWidth / 2;  // half width
      const hd = params.seatDepth / 2;  // half depth

      // Points de l'assise
      context.setPoint('seat_center', [0, params.seatHeight, 0]);
      context.setPoint('seat_fl', [-hw, params.seatHeight, -hd]); // front left
      context.setPoint('seat_fr', [hw, params.seatHeight, -hd]);  // front right
      context.setPoint('seat_bl', [-hw, params.seatHeight, hd]);  // back left
      context.setPoint('seat_br', [hw, params.seatHeight, hd]);   // back right

      // Points du dossier
      const backY = params.seatHeight + params.backHeight / 2;
      const backZ = -hd + params.backThickness / 2;
      context.setPoint('back_center', [0, backY, backZ]);
      context.setPoint('back_top', [0, params.seatHeight + params.backHeight, backZ]);
      context.setPoint('back_bottom', [0, params.seatHeight, backZ]);

      // Points des pieds
      const legInset = params.legRadius;
      context.setPoint('leg_fl', [-hw + legInset, params.seatHeight / 2, -hd + legInset]);
      context.setPoint('leg_fr', [hw - legInset, params.seatHeight / 2, -hd + legInset]);
      context.setPoint('leg_bl', [-hw + legInset, params.seatHeight / 2, hd - legInset]);
      context.setPoint('leg_br', [hw - legInset, params.seatHeight / 2, hd - legInset]);

      // Points pour les accoudoirs si nécessaire
      if (params.hasArmrests) {
        context.setPoint('armrest_left', [-hw, params.seatHeight + params.armrestHeight, 0]);
        context.setPoint('armrest_right', [hw, params.seatHeight + params.armrestHeight, 0]);
      }
    },

    buildStructure: (params, context) => {
      // Pieds de la chaise (structure principale)
      const legPositions = [
        context.getPoint('leg_fl'),
        context.getPoint('leg_fr'),
        context.getPoint('leg_bl'),
        context.getPoint('leg_br')
      ];

      legPositions.forEach((pos) => {
        if (pos) {
          let leg;
          if (params.legStyle === 'square') {
            leg = Primitive.box(params.legRadius * 2, params.seatHeight, params.legRadius * 2, params.legColor);
          } else {
            leg = Primitive.cylinder(params.legRadius, params.seatHeight, params.legColor);
          }
          context.addPrimitiveAt(leg, [pos.x, pos.y, pos.z]);
        }
      });

      // Supports pour accoudoirs si nécessaire
      if (params.hasArmrests) {
        const leftSupport = Primitive.cylinder(params.legRadius * 0.8, params.armrestHeight, params.legColor);
        context.addPrimitiveAt(leftSupport, [-params.seatWidth / 2, params.seatHeight + params.armrestHeight / 2, params.seatDepth / 4]);

        const rightSupport = Primitive.cylinder(params.legRadius * 0.8, params.armrestHeight, params.legColor);
        context.addPrimitiveAt(rightSupport, [params.seatWidth / 2, params.seatHeight + params.armrestHeight / 2, params.seatDepth / 4]);
      }
    },

    buildSurfaces: (params, context) => {
      // === ASSISE ===
      const seat = Primitive.box(params.seatWidth, params.seatThickness, params.seatDepth, params.seatColor);
      context.addPrimitiveAt(seat, [0, params.seatHeight, 0]);

      // === DOSSIER ===
      let back = Primitive.box(params.seatWidth, params.backHeight, params.backThickness, params.backColor);

      // Appliquer l'inclinaison si nécessaire
      if (params.backAngle > 0) {
        back.rotation.x = -THREE.MathUtils.degToRad(params.backAngle);
      }

      // Style scandinave : dossier avec barreaux
      if (params.style === 'scandinavian') {
        // Remplacer par des barreaux verticaux
        for (let i = 0; i < 5; i++) {
          const slat = Primitive.box(params.seatWidth * 0.15, params.backHeight * 0.8, params.backThickness, params.backColor);
          const x = (i - 2) * params.seatWidth * 0.2;
          context.addPrimitiveAt(slat, [x, params.seatHeight + params.backHeight / 2, -params.seatDepth / 2 + params.backThickness / 2]);
        }
      } else {
        context.addPrimitiveAt(back, [0, params.seatHeight + params.backHeight / 2, -params.seatDepth / 2 + params.backThickness / 2]);
      }

      // === ACCOUDOIRS ===
      if (params.hasArmrests) {
        const armrestLength = params.seatDepth * 0.8;
        const armrestWidth = params.legRadius * 2;

        const leftArmrest = Primitive.box(armrestWidth, armrestWidth, armrestLength, params.seatColor);
        context.addPrimitiveAt(leftArmrest, [-params.seatWidth / 2, params.seatHeight + params.armrestHeight, 0]);

        const rightArmrest = Primitive.box(armrestWidth, armrestWidth, armrestLength, params.seatColor);
        context.addPrimitiveAt(rightArmrest, [params.seatWidth / 2, params.seatHeight + params.armrestHeight, 0]);
      }
    },

    getName: (params) => 'Chaise',
    
    getDescription: (params) => 
      `Chaise ${params.style} ${Math.round(params.seatHeight * 100)}cm`,
    
    getPrimitiveCount: (params) => {
      let count = 2; // Assise + dossier (box de dossier ou barreaux)
      if (params.style === 'scandinavian') count += 5; // pour les 5 lattes
      count += 4; // 4 pieds

      if (params.hasArmrests) {
        count += 2; // 2 accoudoirs
        count += 2; // 2 supports d'accoudoirs
      }
      return count;
    }
  }
};