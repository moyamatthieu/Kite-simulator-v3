/**
 * Test script to verify printable cube export
 */

import { Cube } from './src/objects/shapes/Cube';
import { OBJExporter } from './src/export/OBJExporter';

// Create a regular cube
console.log('Creating regular cube...');
const regularCube = new Cube();
console.log(`Regular cube has ${regularCube.getPrimitiveCount()} primitives`);

// Create a printable cube
console.log('Creating printable cube...');
const printableCube = new Cube({ printable: true });
console.log(`Printable cube has ${printableCube.getPrimitiveCount()} primitives`);

// Export the printable cube
console.log('Exporting printable cube...');
try {
    OBJExporter.download(printableCube, 'test-cube-printable.obj', 1);
    console.log('✅ Export successful!');
} catch (error) {
    console.error('❌ Export failed:', error);
}
