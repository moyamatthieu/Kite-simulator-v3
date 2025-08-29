import * as THREE from 'three';
import { StructuredObject } from '../../core/StructuredObject';
import { Primitive } from '../../core/Primitive';
import { ICreatable } from '../../types';

export class Cube extends StructuredObject implements ICreatable {
    private size: number;
    private printable: boolean;

    constructor(size: number = 2, printable: boolean = false) {
        super("Cube", false);
        this.size = size;
        this.printable = printable;
        console.log(`🎲 Creating cube - Size: ${size} units, Printable: ${printable}`);
        this.init(); // Initialize after configuration
        console.log(`🎲 Cube created and initialized`);
    }

    protected definePoints(): void {
        const halfSize = this.size / 2;

        console.log(`📐 Defining cube points - Size: ${this.size} units, Half size: ${halfSize}`);

        // Define 8 vertices of the cube with names
        this.setPoint('bottom-back-left', [-halfSize, -halfSize, -halfSize]);
        this.setPoint('bottom-back-right', [halfSize, -halfSize, -halfSize]);
        this.setPoint('top-back-right', [halfSize, halfSize, -halfSize]);
        this.setPoint('top-back-left', [-halfSize, halfSize, -halfSize]);
        this.setPoint('bottom-front-left', [-halfSize, -halfSize, halfSize]);
        this.setPoint('bottom-front-right', [halfSize, -halfSize, halfSize]);
        this.setPoint('top-front-right', [halfSize, halfSize, halfSize]);
        this.setPoint('top-front-left', [-halfSize, halfSize, halfSize]);

        console.log(`✅ Cube points defined - Total points: ${this.points.size}`);
        console.log(`📍 Sample point 'bottom-front-left':`, this.getPoint('bottom-front-left'));
    }

    protected buildStructure(): void {
        // For printable mode, we don't need frames
        if (!this.printable) {
            // Add some basic structure lines for visualization
            // Create lines using THREE.Line
            const material = new THREE.LineBasicMaterial({ color: 0x000000 });
            const points = [
                this.getPoint('bottom-back-left')!, this.getPoint('bottom-back-right')!,
                this.getPoint('bottom-back-right')!, this.getPoint('top-back-right')!,
                this.getPoint('top-back-right')!, this.getPoint('top-back-left')!,
                this.getPoint('top-back-left')!, this.getPoint('bottom-back-left')!
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            this.add(line);
        }
    }

    protected buildSurfaces(): void {
        console.log(`🎲 Building cube surfaces - Printable: ${this.printable}, Size: ${this.size} units`);

        if (this.printable) {
            this.buildPrintableSurfaces();
        } else {
            this.buildVisualSurfaces();
        }

        console.log(`✅ Cube surfaces built - Total children: ${this.children.length}`);
    }

    private buildPrintableSurfaces(): void {
        console.log(`🔧 Building printable surfaces for ${this.size} units cube`);

        // For 3D printing, create explicit triangles for each face to ensure manifold geometry

        // Front face (z = halfSize)
        const front1 = this.addSurfaceBetweenPoints(['bottom-front-left', 'bottom-front-right', 'top-front-right'], '#ff0000');
        const front2 = this.addSurfaceBetweenPoints(['bottom-front-left', 'top-front-right', 'top-front-left'], '#ff0000');
        console.log(`🎨 Front face: ${front1 ? 'OK' : 'FAILED'}, ${front2 ? 'OK' : 'FAILED'}`);

        // Back face (z = -halfSize)
        const back1 = this.addSurfaceBetweenPoints(['bottom-back-left', 'bottom-back-right', 'top-back-right'], '#00ff00');
        const back2 = this.addSurfaceBetweenPoints(['bottom-back-left', 'top-back-right', 'top-back-left'], '#00ff00');
        console.log(`🎨 Back face: ${back1 ? 'OK' : 'FAILED'}, ${back2 ? 'OK' : 'FAILED'}`);

        // Left face (x = -halfSize)
        const left1 = this.addSurfaceBetweenPoints(['bottom-back-left', 'top-back-left', 'top-front-left'], '#0000ff');
        const left2 = this.addSurfaceBetweenPoints(['bottom-back-left', 'top-front-left', 'bottom-front-left'], '#0000ff');
        console.log(`🎨 Left face: ${left1 ? 'OK' : 'FAILED'}, ${left2 ? 'OK' : 'FAILED'}`);

        // Right face (x = halfSize)
        const right1 = this.addSurfaceBetweenPoints(['bottom-back-right', 'top-back-right', 'top-front-right'], '#ffff00');
        const right2 = this.addSurfaceBetweenPoints(['bottom-back-right', 'top-front-right', 'bottom-front-right'], '#ffff00');
        console.log(`🎨 Right face: ${right1 ? 'OK' : 'FAILED'}, ${right2 ? 'OK' : 'FAILED'}`);

        // Top face (y = halfSize)
        const top1 = this.addSurfaceBetweenPoints(['top-back-left', 'top-back-right', 'top-front-right'], '#ff00ff');
        const top2 = this.addSurfaceBetweenPoints(['top-back-left', 'top-front-right', 'top-front-left'], '#ff00ff');
        console.log(`🎨 Top face: ${top1 ? 'OK' : 'FAILED'}, ${top2 ? 'OK' : 'FAILED'}`);

        // Bottom face (y = -halfSize)
        const bottom1 = this.addSurfaceBetweenPoints(['bottom-back-left', 'bottom-back-right', 'bottom-front-right'], '#00ffff');
        const bottom2 = this.addSurfaceBetweenPoints(['bottom-back-left', 'bottom-front-right', 'bottom-front-left'], '#00ffff');
        console.log(`🎨 Bottom face: ${bottom1 ? 'OK' : 'FAILED'}, ${bottom2 ? 'OK' : 'FAILED'}`);

        console.log(`✅ Printable cube: Created 12 triangles for 6 faces - Total meshes: ${this.children.filter(child => child instanceof THREE.Mesh).length}`);
    }

    private buildVisualSurfaces(): void {
        console.log(`🔧 Building visual surfaces for ${this.size} units cube`);
        // For visualization, use a simple box primitive
        const box = Primitive.box(this.size, this.size, this.size, '#8B4513');
        this.add(box);
        console.log(`✅ Visual cube: Created box primitive - Added to scene: ${box ? 'OK' : 'FAILED'}`);
    }

    public getSize(): number {
        return this.size;
    }

    public isPrintable(): boolean {
        return this.printable;
    }

    // Implémentation de l'interface ICreatable
    create(): this {
        return this;
    }

    getName(): string {
        return this.printable ? "Cube 20mm (Impression 3D)" : "Cube";
    }

    getDescription(): string {
        return this.printable
            ? "Cube optimisé pour l'impression 3D avec géométrie manifold (2 unités = 20mm)"
            : "Cube simple avec structure anatomique (2 unités = 20mm)";
    }

    getPrimitiveCount(): number {
        return this.printable ? 12 : 6; // 12 triangles ou 6 quads
    }
}
