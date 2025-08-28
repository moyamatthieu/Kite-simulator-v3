/**
 * Test rapide de l'export du cube imprimable
 */

import { Cube } from './src/objects/shapes/Cube.js';
import { OBJExporter } from './src/export/OBJExporter.js';

// Créer un cube imprimable
console.log('🧊 Création du cube imprimable...');
const cube = new Cube({ printable: true, size: 20.0 });

console.log(`📐 Dimensions: ${cube.params.size}mm x ${cube.params.size}mm x ${cube.params.size}mm`);
console.log(`🔢 Primitives: ${cube.getPrimitiveCount()}`);

// Tester l'export (sans téléchargement pour le test)
console.log('📦 Test d\'export OBJ...');
try {
    const objContent = OBJExporter.export(cube, 1);
    console.log('✅ Export réussi!');
    console.log(`📄 Taille du fichier OBJ: ${objContent.length} caractères`);

    // Afficher un aperçu du début du fichier
    const lines = objContent.split('\n');
    console.log('📋 Aperçu du fichier OBJ:');
    console.log(lines.slice(0, 10).join('\n'));

    // Compter les vertices et faces
    const vertexCount = (objContent.match(/^v\s/gm) || []).length;
    const faceCount = (objContent.match(/^f\s/gm) || []).length;
    console.log(`🔺 Vertices: ${vertexCount}, Faces: ${faceCount}`);

} catch (error) {
    console.error('❌ Erreur d\'export:', error);
}
