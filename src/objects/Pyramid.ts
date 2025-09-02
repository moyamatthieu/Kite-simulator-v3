/**
 * Pyramid.ts - Pyramide simple pour démonstration de l'AutoLoader
 * Détectée automatiquement sans modification manuelle !
 */

import * as THREE from 'three';
import { StructuredObject } from '@core/StructuredObject';
import { Primitive } from '@core/Primitive';
import { ICreatable } from '@types';

export class Pyramid extends StructuredObject implements ICreatable {
    private size: number;
    private height: number;

    constructor(size: number = 2, height: number = 3) {
        super("Pyramide", false);
        this.size = size;
        this.height = height;
        console.log(`🔺 Création pyramide - Taille: ${size}, Hauteur: ${height}`);
        this.init();
        console.log(`🔺 Pyramide créée et initialisée`);
    }

    protected definePoints(): void {
        const halfSize = this.size / 2;

        // Base carrée
        this.setPoint('base-front-left', [-halfSize, 0, halfSize]);
        this.setPoint('base-front-right', [halfSize, 0, halfSize]);
        this.setPoint('base-back-left', [-halfSize, 0, -halfSize]);
        this.setPoint('base-back-right', [halfSize, 0, -halfSize]);

        // Sommet
        this.setPoint('apex', [0, this.height, 0]);

        console.log(`✅ Points pyramide définis - ${this.points.size} points`);
    }

    protected buildStructure(): void {
        // Créer la géométrie de la pyramide
        const geometry = new THREE.ConeGeometry(this.size / 2, this.height, 4);
        const material = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        const pyramid = new THREE.Mesh(geometry, material);

        // Positionner au centre
        pyramid.position.y = this.height / 2;

        this.add(pyramid);
        console.log(`✅ Géométrie pyramide créée`);
    }

    protected buildSurfaces(): void {
        // Les surfaces sont déjà créées dans buildStructure avec la géométrie du cône
        console.log(`✅ Surfaces pyramide créées`);
    }

    create(): this {
        return this;
    }

    getName(): string {
        return "Pyramide";
    }

    getDescription(): string {
        return `Pyramide de taille ${this.size} et hauteur ${this.height}`;
    }

    getPrimitiveCount(): number {
        return 1; // Une seule primitive (le cône)
    }
}
