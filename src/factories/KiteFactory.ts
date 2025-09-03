/**
 * KiteFactory.ts - Factory pour créer un cerf-volant delta paramétrique
 * Utilise le pattern Builder pour construire un objet Kite en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import { FrameFactory } from '@factories/FrameFactory';
import { SurfaceFactory } from '@factories/SurfaceFactory';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

export const DEFAULT_KITE_CONFIG = {
    width: 1.65,      // Envergure
    height: 0.65,     // Hauteur
    depth: 0.15,   // Profondeur whiskers
    frameDiameter: 0.01,
    frameColor: '#2a2a2a',
    sailColor: '#ff3333',
    sailOpacity: 0.9,
    bridleLengthFactor: 1.0 // Facteur de longueur virtuelle des brides principales
};

export interface KiteParams extends FactoryParams, Partial<typeof DEFAULT_KITE_CONFIG> { }

export class KiteFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'organic',
        name: 'Kite',
        description: 'Cerf-volant delta paramétrique',
        tags: ['cerf-volant', 'vol', 'aerodynamique'],
        complexity: 'complex' as const
    };

    protected getDefaultParams(): KiteParams {
        return DEFAULT_KITE_CONFIG;
    }

    protected createBuilder(params: KiteParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as KiteParams;
        const pointsMap: Map<string, THREE.Vector3> = new Map(); // Stocke les Vector3 pour la facilité d'utilisation
        let bridleLengthFactor: number = mergedParams.bridleLengthFactor!;

        const frameFactory = new FrameFactory();
        const surfaceFactory = new SurfaceFactory();

        const createBridleLines = (context: IStructuredObjectContext) => {
            const bridleLinesGroup = new THREE.Group();
            bridleLinesGroup.name = 'BridleLines';

            const bridleConnections = [
                ['CTRL_GAUCHE', 'NEZ'],
                ['CTRL_GAUCHE', 'INTER_GAUCHE'],
                ['CTRL_GAUCHE', 'CENTRE'],
                ['CTRL_DROIT', 'NEZ'],
                ['CTRL_DROIT', 'INTER_DROIT'],
                ['CTRL_DROIT', 'CENTRE']
            ];

            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x333333,
                linewidth: 1,
                opacity: 0.8,
                transparent: true
            });

            bridleConnections.forEach(([startName, endName]) => {
                const startPos = pointsMap.get(startName);
                const endPos = pointsMap.get(endName);

                if (startPos && endPos) {
                    const geometry = new THREE.BufferGeometry();
                    const points = [
                        startPos, // Directement des Vector3
                        endPos
                    ];
                    geometry.setFromPoints(points);

                    const line = new THREE.Line(geometry, lineMaterial);
                    line.name = `Bridle_${startName}_${endName}`;

                    const restLength = startPos.distanceTo(endPos);
                    line.userData.restLength = restLength;
                    line.userData.startPoint = startName;
                    line.userData.endPoint = endName;

                    bridleLinesGroup.add(line);
                }
            });
            context.addExistingObject(bridleLinesGroup); // Utilise la nouvelle méthode
        };

        // La logique de updateBridleLines peut nécessiter d'être refactorisée car elle accède directement
        // aux objets Three.js. Pour l'instant, nous la laissons telle quelle mais elle serait
        // mieux si elle opérait sur des identifiants ou via une interface plus abstraite.
        const updateBridleLines = (context: IStructuredObjectContext) => {
            // Cette fonction ne peut pas accéder directement aux enfants d'un StructuredObject
            // via 'getPoint' car 'getPoint' retourne un Vector3.
            // La gestion des mises à jour des lignes visualisées devrait être refactorisée
            // pour que le StructuredObject expose une méthode pour mettre à jour ses sub-objets.
            // Pour l'instant, cette partie sera désactivée ou déplacée vers un module de simulation.
        };

        const addVisualMarkers = (context: IStructuredObjectContext) => {
            const nez = pointsMap.get('NEZ');
            if (nez) {
                const marker = Primitive.sphere(0.025, '#ff0000');
                context.addPrimitiveAt(marker, nez.toArray() as Position3D); // Position3D
            }

            const ctrlG = pointsMap.get('CTRL_GAUCHE');
            if (ctrlG) {
                const marker = Primitive.sphere(0.025, '#dc143c');
                context.addPrimitiveAt(marker, ctrlG.toArray() as Position3D);
            }

            const ctrlD = pointsMap.get('CTRL_DROIT');
            if (ctrlD) {
                const marker = Primitive.sphere(0.025, '#b22222');
                context.addPrimitiveAt(marker, ctrlD.toArray() as Position3D);
            }
        };


        return {
            definePoints(context: IStructuredObjectContext): void {
                const { width, height, depth } = mergedParams;

                const centreY = height! / 4;
                const ratio = (height! - centreY) / height!;
                const interGaucheX = ratio * (-width! / 2);
                const interDroitX = ratio * (width! / 2);
                const fixRatio = 2 / 3;

                pointsMap.set('SPINE_BAS', new THREE.Vector3(0, 0, 0));
                pointsMap.set('CENTRE', new THREE.Vector3(0, height! / 4, 0));
                pointsMap.set('NEZ', new THREE.Vector3(0, height!, 0));
                pointsMap.set('BORD_GAUCHE', new THREE.Vector3(-width! / 2, 0, 0));
                pointsMap.set('BORD_DROIT', new THREE.Vector3(width! / 2, 0, 0));
                pointsMap.set('INTER_GAUCHE', new THREE.Vector3(interGaucheX, centreY, 0));
                pointsMap.set('INTER_DROIT', new THREE.Vector3(interDroitX, centreY, 0));
                pointsMap.set('FIX_GAUCHE', new THREE.Vector3(fixRatio * interGaucheX, centreY, 0));
                pointsMap.set('FIX_DROIT', new THREE.Vector3(fixRatio * interDroitX, centreY, 0));
                pointsMap.set('WHISKER_GAUCHE', new THREE.Vector3(-width! / 4, 0.1, -depth!));
                pointsMap.set('WHISKER_DROIT', new THREE.Vector3(width! / 4, 0.1, -depth!));
                pointsMap.set('CTRL_GAUCHE', new THREE.Vector3(-0.25, 0.3, 0.4));
                pointsMap.set('CTRL_DROIT', new THREE.Vector3(0.25, 0.3, 0.4));
                pointsMap.set('BRIDE_GAUCHE_A', new THREE.Vector3(0, height!, 0));
                pointsMap.set('BRIDE_GAUCHE_B', new THREE.Vector3(interGaucheX, centreY, 0));
                pointsMap.set('BRIDE_GAUCHE_C', new THREE.Vector3(0, height! / 4, 0));
                pointsMap.set('BRIDE_DROITE_A', new THREE.Vector3(0, height!, 0));
                pointsMap.set('BRIDE_DROITE_B', new THREE.Vector3(interDroitX, centreY, 0));
                pointsMap.set('BRIDE_DROITE_C', new THREE.Vector3(0, height! / 4, 0));

                pointsMap.forEach((position, name) => {
                    context.setPoint(name, position.toArray() as Position3D); // Conversion en Position3D
                });
            },

            // buildStructure de KiteFactory
            buildStructure(context: IStructuredObjectContext): void {
                const { frameDiameter, frameColor } = mergedParams;

                const framePoints: Array<[string, number[]]> = Array.from(pointsMap.entries()).map(([name, vec]) => [name, vec.toArray()]);

                const mainFrame = frameFactory.createObject({
                    diameter: frameDiameter,
                    material: frameColor,
                    points: framePoints,
                    connections: [
                        ['NEZ', 'SPINE_BAS'],
                        ['NEZ', 'BORD_GAUCHE'],
                        ['NEZ', 'BORD_DROIT'],
                        ['INTER_GAUCHE', 'INTER_DROIT']
                    ]
                });
                context.addExistingObject(mainFrame); // Ajout direct de StructuredObject (qui est un THREE.Group)

                const whiskerFrame = frameFactory.createObject({
                    diameter: frameDiameter! / 2,
                    material: '#444444',
                    points: framePoints,
                    connections: [ // Utilisation de FrameParams pour la connexion
                        ['WHISKER_GAUCHE', 'FIX_GAUCHE'],
                        ['WHISKER_DROIT', 'FIX_DROIT']
                    ]
                });
                context.addExistingObject(whiskerFrame); // Ajout direct de StructuredObject

                createBridleLines(context);
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                const { sailColor, sailOpacity } = mergedParams;

                const surfacePoints: Array<[string, number[]]> = Array.from(pointsMap.entries()).map(([name, vec]) => [name, vec.toArray()]);

                const sail = surfaceFactory.createObject({
                    points: surfacePoints,
                    panels: [
                        ['NEZ', 'BORD_GAUCHE', 'WHISKER_GAUCHE'],
                        ['NEZ', 'WHISKER_GAUCHE', 'SPINE_BAS'],
                        ['NEZ', 'BORD_DROIT', 'WHISKER_DROIT'],
                        ['NEZ', 'WHISKER_DROIT', 'SPINE_BAS']
                    ],
                    material: {
                        color: sailColor,
                        transparent: true,
                        opacity: sailOpacity,
                        doubleSided: true
                    }
                });
                context.addExistingObject(sail); // Ajout direct de StructuredObject

                addVisualMarkers(context);
            },

            getName(): string { return 'Cerf-volant Delta'; },
            // La description doit être statique ou dépendre de mergedParams.
            getDescription(): string { return `Cerf-volant delta de ${mergedParams.width}m x ${mergedParams.height}m`; },
            getPrimitiveCount(): number {
                // Calculer le nombre de primitives à partir des factories utilisées
                const totalFramePrimitives = 1 + 2 + 1; // mainFrame connections
                const totalWhiskerPrimitives = 2; // whiskerFrame connections
                const totalSailPrimitives = 4; // sail panels
                const totalMarkers = 3; // nez, ctrlG, ctrlD

                return (mergedParams.frameDiameter ? totalFramePrimitives : 0) +
                    (mergedParams.frameDiameter ? totalWhiskerPrimitives : 0) + // Si frames activés
                    (mergedParams.sailColor ? totalSailPrimitives : 0) +
                    totalMarkers;
            }
        };
    }
}