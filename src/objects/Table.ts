/**
 * Table.ts - Table simple pour démonstration de l'AutoLoader
 * Détectée automatiquement sans modification manuelle !
 */

import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import * as THREE from 'three';

export class Table extends StructuredObject implements ICreatable {
    private width: number;
    private height: number;
    private depth: number;

    constructor(width: number = 2, height: number = 1, depth: number = 1.5) {
        super("Table", false);
        this.width = width;
        this.height = height;
        this.depth = depth;
        console.log(`🪑 Création table - Dimensions: ${width}x${height}x${depth}`);
        this.init();
        console.log(`🪑 Table créée et initialisée`);
    }

    protected definePoints(): void {
        const halfWidth = this.width / 2;
        const halfDepth = this.depth / 2;

        // Pieds de la table
        this.setPoint('leg-front-left', [-halfWidth + 0.1, 0, halfDepth - 0.1]);
        this.setPoint('leg-front-right', [halfWidth - 0.1, 0, halfDepth - 0.1]);
        this.setPoint('leg-back-left', [-halfWidth + 0.1, 0, -halfDepth + 0.1]);
        this.setPoint('leg-back-right', [halfWidth - 0.1, 0, -halfDepth + 0.1]);

        // Plateau de la table
        this.setPoint('table-top-front-left', [-halfWidth, this.height, halfDepth]);
        this.setPoint('table-top-front-right', [halfWidth, this.height, halfDepth]);
        this.setPoint('table-top-back-left', [-halfWidth, this.height, -halfDepth]);
        this.setPoint('table-top-back-right', [halfWidth, this.height, -halfDepth]);

        console.log(`✅ Points table définis - ${this.points.size} points`);
    }

    protected buildStructure(): void {
        // Créer les pieds (cylindres)
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, this.height, 8);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

        const legPositions = [
            [-this.width/2 + 0.1, this.height/2, this.depth/2 - 0.1],
            [this.width/2 - 0.1, this.height/2, this.depth/2 - 0.1],
            [-this.width/2 + 0.1, this.height/2, -this.depth/2 + 0.1],
            [this.width/2 - 0.1, this.height/2, -this.depth/2 + 0.1]
        ];

        legPositions.forEach((pos, index) => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos[0], pos[1], pos[2]);
            this.add(leg);
        });

        // Créer le plateau (boîte)
        const topGeometry = new THREE.BoxGeometry(this.width, 0.1, this.depth);
        const topMaterial = new THREE.MeshLambertMaterial({ color: 0xD2691E });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = this.height + 0.05;

        this.add(top);
        console.log(`✅ Structure table créée`);
    }

    protected buildSurfaces(): void {
        // Les surfaces sont déjà créées dans buildStructure
        console.log(`✅ Surfaces table créées`);
    }

    create(): this {
        return this;
    }

    getName(): string {
        return "Table";
    }

    getDescription(): string {
        return `Table de dimensions ${this.width}x${this.height}x${this.depth}`;
    }

    getPrimitiveCount(): number {
        return 5; // 4 pieds + 1 plateau
    }
}
