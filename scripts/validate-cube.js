/**
 * Test de validation de la topologie du cube pour l'impression 3D
 */

import { Cube } from '../src/objects/Cube.js';
import { OBJExporter } from '../src/export/OBJExporter.js';

// Créer un cube imprimable
console.log('🧊 Test de validation du cube imprimable...');
const cube = new Cube({ printable: true, size: 20.0 });

console.log(`📐 Dimensions: ${cube.params.size}mm x ${cube.params.size}mm x ${cube.params.size}mm`);
console.log(`🔢 Primitives: ${cube.getPrimitiveCount()}`);

// Tester l'export
console.log('📦 Export et validation OBJ...');
try {
    const objContent = OBJExporter.export(cube, 1);

    // Analyser le contenu OBJ
    const lines = objContent.split('\n');
    let vertexCount = 0;
    let faceCount = 0;
    const faces = [];

    lines.forEach(line => {
        if (line.startsWith('v ')) {
            vertexCount++;
        } else if (line.startsWith('f ')) {
            faceCount++;
            faces.push(line);
        }
    });

    console.log(`🔺 Vertices: ${vertexCount}`);
    console.log(`📐 Faces: ${faceCount}`);
    console.log(`📋 Aperçu des premières faces:`);
    faces.slice(0, 5).forEach((face, i) => console.log(`   ${i + 1}: ${face}`));

    // Validation basique de la topologie
    if (vertexCount === 8 && faceCount === 12) {
        console.log('✅ Topologie valide: 8 sommets, 12 triangles');
        console.log('✅ Le cube devrait être manifold');
    } else {
        console.log('⚠️ Topologie inattendue détectée');
    }

    // Vérifier que toutes les faces sont des triangles
    const nonTriangles = faces.filter(face => {
        const parts = face.trim().split(/\s+/);
        return parts.length !== 4; // 'f' + 3 indices = 4 parties
    });

    if (nonTriangles.length === 0) {
        console.log('✅ Toutes les faces sont des triangles');
    } else {
        console.log(`⚠️ ${nonTriangles.length} faces ne sont pas des triangles`);
    }

} catch (error) {
    console.error('❌ Erreur lors du test:', error);
}
