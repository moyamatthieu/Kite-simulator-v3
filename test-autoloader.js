/**
 * test-autoloader.js - Test de l'AutoLoader
 * Vérifie que tous les objets sont détectés automatiquement
 */

import { AutoLoader } from './core/AutoLoader.js';

async function testAutoLoader() {
    console.log('🧪 Test de l\'AutoLoader...');

    const loader = new AutoLoader();

    // Attendre que le chargement soit terminé
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Obtenir tous les objets
    const allObjects = await loader.getAllObjects();
    console.log(`📊 Total d'objets détectés: ${allObjects.length}`);

    // Obtenir les catégories
    const categories = await loader.getCategories();
    console.log('📂 Catégories détectées:', Object.keys(categories));

    // Lister tous les objets par catégorie
    for (const [category, objects] of Object.entries(categories)) {
        console.log(`\n📁 ${category.toUpperCase()}:`);
        objects.forEach(obj => {
            console.log(`  • ${obj.name} (${obj.id}) - ${obj.description}`);
        });
    }

    console.log('\n✅ Test AutoLoader terminé');
}

// Exécuter le test si ce fichier est appelé directement
if (typeof window !== 'undefined') {
    window.addEventListener('load', testAutoLoader);
} else {
    testAutoLoader();
}
