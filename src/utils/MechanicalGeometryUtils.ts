/**
 * MechanicalGeometryUtils.ts - Utilitaires pour la génération de géométries mécaniques
 * Centralise les helpers pour la création de motifs complexes comme les dents d'engrenage ou les rayons de roue.
 */

import * as THREE from 'three';
import { CircularPatternParams } from '@factories/CircularPatternFactory'; // Assurez-vous que l'interface est exportée
import { MaterialConfig } from '@/types'; // MaterialConfig est dans types

export class MechanicalGeometryUtils {

    /**
     * Méthode helper pour créer un pattern de dents d'engrenage
     */
    static createGearTeeth(params: {
        radius: number;
        teethCount: number;
        toothHeight: number;
        toothWidth: number;
        thickness: number;
        color?: string;
    }): CircularPatternParams {
        return {
            radius: params.radius + params.toothHeight / 2,
            count: params.teethCount,
            elementType: 'box',
            elementSize: {
                width: params.toothHeight,
                height: params.thickness,
                depth: params.toothWidth
            },
            material: {
                color: params.color || '#708090',
                metalness: 0.7,
                roughness: 0.3
            } as MaterialConfig, // Cast pour MaterialConfig
            alignToRadius: true
        };
    }

    /**
     * Méthode helper pour créer des rayons
     */
    static createSpokes(params: {
        innerRadius: number;
        outerRadius: number;
        spokeCount: number;
        spokeWidth: number;
        thickness: number;
        color?: string;
    }): CircularPatternParams {
        const spokeLength = params.outerRadius - params.innerRadius;
        return {
            radius: (params.innerRadius + params.outerRadius) / 2,
            count: params.spokeCount,
            elementType: 'box',
            elementSize: {
                width: spokeLength,
                height: params.thickness * 0.8,
                depth: params.spokeWidth
            },
            material: {
                color: params.color || '#606060'
            } as MaterialConfig, // Cast pour MaterialConfig
            alignToRadius: true
        };
    }
}