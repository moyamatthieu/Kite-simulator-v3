/**
 * DynamicStructuredObject.ts - StructuredObject dynamique et configurable
 * Permet aux Factories de construire des objets StructuredObject sans hériter directement.
 */

import * as THREE from 'three';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive'; // Nécessaire si les builders utilisent directement Primitive
import { logger } from '@core/Logger';

/**
 * Interface pour la construction dynamique d'un StructuredObject
 * Les classes Factory implémenteront cette interface pour définir la construction de l'objet.
 * Elles appelleront les méthodes sur le 'objectContext' fourni.
 */
export interface IStructuredObjectBuilder {
    definePoints(context: IStructuredObjectContext): void;
    buildStructure(context: IStructuredObjectContext): void;
    buildSurfaces(context: IStructuredObjectContext): void;

    getName(): string;
    getDescription(): string;
    getPrimitiveCount(): number;
}

/**
 * Interface pour exposer les méthodes protégées de StructuredObject aux builders
 * C'est le "contexte" que le builder utilise pour construire l'objet.
 */
export interface IStructuredObjectContext {
    setPoint(name: string, position: Position3D): void;
    getPoint(name: string): THREE.Vector3 | undefined;
    addCylinderBetweenPoints(
        point1Name: string, point2Name: string, radius: number, material: string | MaterialConfig
    ): THREE.Mesh | null;
    addSurfaceBetweenPoints(
        pointNames: string[], material: string | MaterialConfig
    ): THREE.Mesh | null;
    addPrimitiveAt(primitive: THREE.Mesh, positon: Position3D): void;
    addPrimitiveAtPoint(primitive: THREE.Mesh, pointName: string): boolean;
    // Nouvelle méthode pour ajouter un objet THREE.Object3D existant (comme un groupe ou un StructuredObject)
    addExistingObject(object: THREE.Object3D): void;
    getPointNames(): string[];
}

/**
 * StructuredObject dont la logique de construction est déléguée à un builder.
 */
export class DynamicStructuredObject extends StructuredObject implements ICreatable {
    private builder: IStructuredObjectBuilder;
    private objectContext: IStructuredObjectContext;

    // Méthode interne pour ajouter un objet Three.js au StructuredObject
    private _addExistingObject(object: THREE.Object3D): void {
        this.add(object);
    }

    constructor(name: string, builder: IStructuredObjectBuilder, showDebugPoints: boolean = false) {
        super(name, showDebugPoints);
        this.builder = builder;
        this.nodeType = 'DynamicStructuredObject';

        // Initialiser le contexte qui sera passé au builder
        this.objectContext = {
            setPoint: this.setPoint.bind(this),
            getPoint: this.getPoint.bind(this),
            addCylinderBetweenPoints: this.addCylinderBetweenPoints.bind(this),
            addSurfaceBetweenPoints: this.addSurfaceBetweenPoints.bind(this),
            addPrimitiveAt: this.addPrimitiveAt.bind(this),
            addPrimitiveAtPoint: this.addPrimitiveAtPoint.bind(this),
            // Lier la nouvelle méthode au contexte
            addExistingObject: this._addExistingObject.bind(this),
            getPointNames: this.getPointNames.bind(this) // Lier la méthode getPointNames
        };
        logger.debug(`DynamicStructuredObject '${name}' créé avec builder.`, 'DynamicStructuredObject');
    }

    // ... autres méthodes

    protected definePoints(): void {
        this.builder.definePoints(this.objectContext);
    }

    protected buildStructure(): void {
        this.builder.buildStructure(this.objectContext);
    }

    protected buildSurfaces(): void {
        this.builder.buildSurfaces(this.objectContext);
    }

    // Implémentation ICreatable déléguée au builder
    create(): this {
        return this;
    }

    getName(): string {
        return this.builder.getName();
    }

    getDescription(): string {
        return this.builder.getDescription();
    }

    getPrimitiveCount(): number {
        return this.builder.getPrimitiveCount();
    }
}