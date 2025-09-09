/**
 * KiteFactory.ts - Factory pour créer un cerf-volant delta paramétrique
 * Utilise le pattern Builder pour construire un objet Kite en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D } from '@/types';
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
        const pointsMap: Map<string, THREE.Vector3> = new Map();
        let computedPoints: Map<string, [number, number, number]> = new Map();

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
                // Utiliser les outils centralisés pour éviter les divergences
                computedPoints = KiteFactoryTools.computePoints({
                    width: mergedParams.width!,
                    height: mergedParams.height!,
                    depth: mergedParams.depth!
                });

                // Convertir en Vector3 pour usages internes et injecter dans le contexte
                computedPoints.forEach((pos, name) => {
                    const v = new THREE.Vector3(pos[0], pos[1], pos[2]);
                    pointsMap.set(name, v);
                    context.setPoint(name, pos as Position3D);
                });
            },

            // buildStructure de KiteFactory
            buildStructure(context: IStructuredObjectContext): void {
                const { frameDiameter, frameColor } = mergedParams;
                const mainFrame = KiteFactoryTools.createMainFrame(computedPoints, {
                    diameter: frameDiameter!,
                    material: frameColor!
                });
                context.addExistingObject(mainFrame);

                const whiskerFrame = KiteFactoryTools.createWhiskerFrame(computedPoints, {
                    diameter: frameDiameter! / 2,
                    material: '#444444'
                });
                context.addExistingObject(whiskerFrame);

                const bridle = KiteFactoryTools.createBridleLines(computedPoints);
                context.addExistingObject(bridle);
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                const { sailColor, sailOpacity } = mergedParams;
                const sail = KiteFactoryTools.createSail(computedPoints, {
                    color: sailColor!,
                    transparent: true,
                    opacity: sailOpacity!,
                    doubleSided: true
                });
                context.addExistingObject(sail);

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

// === Outils utilitaires pour une construction orchestrée par Kite.ts ===
// Fournit des helpers idempotents pour définir les points, construire la frame,
// les surfaces et les brides, afin que Kite.ts pilote l'assemblage intelligemment.
export class KiteFactoryTools {
    static computePoints(params: {
        width: number; height: number; depth: number;
        ctrlX?: number; ctrlY?: number; ctrlZ?: number;
    }): Map<string, [number, number, number]> {
        const { width, height, depth } = params;
        const ctrlX = params.ctrlX ?? 0.15;
        const ctrlY = params.ctrlY ?? 0.3;
        const ctrlZ = params.ctrlZ ?? 0.4;

        const centreY = height / 4;
        const ratio = (height - centreY) / height;
        const interGaucheX = ratio * (-width / 2);
        const interDroitX = ratio * (width / 2);
        const fixRatio = 2 / 3;

        return new Map<string, [number, number, number]>([
            ['SPINE_BAS', [0, 0, 0]],
            ['CENTRE', [0, height / 4, 0]],
            ['NEZ', [0, height, 0]],
            ['BORD_GAUCHE', [-width / 2, 0, 0]],
            ['BORD_DROIT', [width / 2, 0, 0]],
            ['INTER_GAUCHE', [interGaucheX, centreY, 0]],
            ['INTER_DROIT', [interDroitX, centreY, 0]],
            ['FIX_GAUCHE', [fixRatio * interGaucheX, centreY, 0]],
            ['FIX_DROIT', [fixRatio * interDroitX, centreY, 0]],
            ['WHISKER_GAUCHE', [-width / 4, 0.1, -depth]],
            ['WHISKER_DROIT', [width / 4, 0.1, -depth]],
            ['CTRL_GAUCHE', [-ctrlX, ctrlY, ctrlZ]],
            ['CTRL_DROIT', [ctrlX, ctrlY, ctrlZ]],
            ['BRIDE_GAUCHE_A', [0, height, 0]],
            ['BRIDE_GAUCHE_B', [interGaucheX, centreY, 0]],
            ['BRIDE_GAUCHE_C', [0, height / 4, 0]],
            ['BRIDE_DROITE_A', [0, height, 0]],
            ['BRIDE_DROITE_B', [interDroitX, centreY, 0]],
            ['BRIDE_DROITE_C', [0, height / 4, 0]]
        ]);
    }

    static createMainFrame(points: Map<string, [number, number, number]>,
        opts: { diameter: number; material: string }) {
        const ff = new FrameFactory();
        return ff.createObject({
            diameter: opts.diameter,
            material: opts.material,
            points: Array.from(points.entries()),
            connections: [
                ['NEZ', 'SPINE_BAS'],
                ['NEZ', 'BORD_GAUCHE'],
                ['NEZ', 'BORD_DROIT'],
                ['INTER_GAUCHE', 'INTER_DROIT']
            ]
        } as any);
    }

    static createWhiskerFrame(points: Map<string, [number, number, number]>,
        opts: { diameter: number; material?: string }) {
        const ff = new FrameFactory();
        return ff.createObject({
            diameter: opts.diameter,
            material: opts.material ?? '#444444',
            points: Array.from(points.entries()),
            connections: [
                ['WHISKER_GAUCHE', 'FIX_GAUCHE'],
                ['WHISKER_DROIT', 'FIX_DROIT']
            ]
        } as any);
    }

    static createSail(points: Map<string, [number, number, number]>, material: {
        color: string; transparent?: boolean; opacity?: number; doubleSided?: boolean;
    }) {
        const sf = new SurfaceFactory();
        return sf.createObject({
            points: Array.from(points.entries()),
            panels: [
                ['NEZ', 'BORD_GAUCHE', 'WHISKER_GAUCHE'],
                ['NEZ', 'WHISKER_GAUCHE', 'SPINE_BAS'],
                ['NEZ', 'BORD_DROIT', 'WHISKER_DROIT'],
                ['NEZ', 'WHISKER_DROIT', 'SPINE_BAS']
            ],
            material: {
                color: material.color,
                transparent: material.transparent ?? true,
                opacity: material.opacity ?? 0.9,
                doubleSided: material.doubleSided ?? true
            }
        } as any);
    }

    static createBridleLines(points: Map<string, [number, number, number]>) {
        const group = new THREE.Group();
        group.name = 'BridleLines';
        const pairs: [string, string][] = [
            ['CTRL_GAUCHE', 'NEZ'],
            ['CTRL_GAUCHE', 'INTER_GAUCHE'],
            ['CTRL_GAUCHE', 'CENTRE'],
            ['CTRL_DROIT', 'NEZ'],
            ['CTRL_DROIT', 'INTER_DROIT'],
            ['CTRL_DROIT', 'CENTRE']
        ];
        const mat = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1, opacity: 0.8, transparent: true });
        pairs.forEach(([a, b]) => {
            const pa = points.get(a); const pb = points.get(b);
            if (!pa || !pb) return;
            const geom = new THREE.BufferGeometry();
            geom.setFromPoints([new THREE.Vector3(...pa), new THREE.Vector3(...pb)]);
            const line = new THREE.Line(geom, mat);
            (line as any).userData.startPoint = a;
            (line as any).userData.endPoint = b;
            (line as any).userData.restLength = new THREE.Vector3(...pa).distanceTo(new THREE.Vector3(...pb));
            group.add(line);
        });
        return group;
    }
}
