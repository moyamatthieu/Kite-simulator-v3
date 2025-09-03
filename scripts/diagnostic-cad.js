/**
 * diagnostic-cad.js - Script de diagnostic pour les problèmes d'affichage CAD
 */

// Fonction pour diagnostiquer les problèmes dans la console du navigateur
window.diagnosticCAD = function () {
    console.log('🔍 === DIAGNOSTIC CAD ===');

    // 1. Vérifier la scène Three.js
    const scene = window.renderer?.scene;
    if (!scene) {
        console.error('❌ Pas de scène Three.js trouvée');
        return;
    }

    console.log(`📦 Scène trouvée - ${scene.children.length} objets`);

    // 2. Lister tous les objets dans la scène
    scene.traverse((obj, index) => {
        if (obj === scene) return;

        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        console.log(`  ${index}: ${obj.type} "${obj.name}"`);
        console.log(`    Position: (${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`);
        console.log(`    Échelle: (${obj.scale.x.toFixed(2)}, ${obj.scale.y.toFixed(2)}, ${obj.scale.z.toFixed(2)})`);
        console.log(`    Visible: ${obj.visible}`);
        console.log(`    Dimensions: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
        console.log(`    Centre: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);

        if (obj instanceof THREE.Mesh) {
            console.log(`    Matériau: ${obj.material?.type || 'Aucun'}`);
            console.log(`    Géométrie: ${obj.geometry?.type || 'Aucune'}`);
        }
        console.log('');
    });

    // 3. Vérifier la caméra
    const camera = window.renderer?.camera;
    if (camera) {
        console.log(`📷 Caméra position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
        console.log(`📷 Caméra rotation: (${camera.rotation.x.toFixed(2)}, ${camera.rotation.y.toFixed(2)}, ${camera.rotation.z.toFixed(2)})`);
    }

    // 4. Vérifier l'éclairage
    const lights = [];
    scene.traverse(obj => {
        if (obj instanceof THREE.Light) {
            lights.push({
                type: obj.type,
                intensity: obj.intensity,
                position: obj.position.clone()
            });
        }
    });
    console.log(`💡 Éclairage: ${lights.length} sources lumineuses`);
    lights.forEach((light, i) => {
        console.log(`  ${i}: ${light.type} - Intensité: ${light.intensity}`);
    });

    console.log('✅ === FIN DIAGNOSTIC ===');
};

// Auto-exécution si on est dans la console
if (typeof window !== 'undefined') {
    console.log('💡 Tapez diagnosticCAD() dans la console pour diagnostiquer les problèmes d\'affichage');
}
