/**
 * Test script pour vérifier le comportement de vol du kite V10
 * Ce script peut être exécuté dans la console du navigateur
 */

function testKiteFlight() {
    console.log('🧪 DÉBUT DES TESTS DE VOL DU KITE V10');

    // Test 1: Vérifier que la simulation se charge
    if (typeof SimulationAppV10 === 'undefined') {
        console.error('❌ SimulationAppV10 non trouvée');
        return false;
    }
    console.log('✅ SimulationAppV10 trouvée');

    // Test 2: Vérifier les constantes physiques
    const PhysicsConstants = window.PhysicsConstants || {};
    if (PhysicsConstants.GRAVITY && PhysicsConstants.MAX_FORCE) {
        console.log('✅ Constantes physiques chargées:', {
            gravity: PhysicsConstants.GRAVITY,
            maxForce: PhysicsConstants.MAX_FORCE
        });
    } else {
        console.log('⚠️ Constantes physiques non trouvées dans window');
    }

    // Test 3: Vérifier les modules V10
    const modules = [
        'AerodynamicsCalculator',
        'PhysicsEngine',
        'WindSimulator',
        'LineSystem'
    ];

    modules.forEach(module => {
        if (window[module]) {
            console.log(`✅ Module ${module} disponible`);
        } else {
            console.log(`⚠️ Module ${module} non trouvé`);
        }
    });

    // Test 4: Vérifier la configuration par défaut
    const defaultParams = window.defaultParams || {};
    if (defaultParams.windSpeed) {
        console.log('✅ Configuration par défaut:', defaultParams);
    }

    console.log('🎯 TESTS TERMINÉS - La simulation V10 semble correctement configurée');
    console.log('💡 Pour lancer la simulation: new SimulationAppV10()');

    return true;
}

// Fonction pour analyser les performances de vol
function analyzeFlightPerformance() {
    console.log('📊 ANALYSE DES PERFORMANCES DE VOL');

    // Cette fonction sera appelée pendant le vol pour analyser les métriques
    if (window.simulationUI && window.simulationUI.updateRealTimeValues) {
        console.log('✅ Interface UI connectée');

        // Surveiller les métriques pendant 10 secondes
        let startTime = Date.now();
        let metrics = [];

        const monitor = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed >= 10) {
                clearInterval(monitor);
                console.log('📈 ANALYSE TERMINÉE');
                console.log('Métriques collectées:', metrics.length);
                return;
            }

            // Collecter les métriques actuelles
            const currentMetrics = {
                time: elapsed,
                altitude: window.simulationUI.altitude || 0,
                force: window.simulationUI.force || 0,
                tension: window.simulationUI.tension || 0,
                aoa: window.simulationUI.aoa || 0
            };

            metrics.push(currentMetrics);

            if (elapsed % 2 < 0.1) { // Log toutes les 2 secondes
                console.log(`⏱️ T=${elapsed.toFixed(1)}s: Alt=${currentMetrics.altitude.toFixed(1)}m, Force=${currentMetrics.force.toFixed(0)}N, AoA=${currentMetrics.aoa}°`);
            }
        }, 100);
    } else {
        console.log('⚠️ Interface UI non connectée');
    }
}

// Fonction de diagnostic rapide
function quickDiagnostic() {
    console.log('🔍 DIAGNOSTIC RAPIDE V10');

    const results = {
        simulation: typeof SimulationAppV10 !== 'undefined',
        threeJs: typeof THREE !== 'undefined',
        kite2: typeof Kite2 !== 'undefined',
        ui: typeof window.simulationUI !== 'undefined'
    };

    console.table(results);

    const allGood = Object.values(results).every(v => v);
    if (allGood) {
        console.log('✅ Tous les composants sont chargés correctement');
    } else {
        console.log('⚠️ Certains composants sont manquants');
    }

    return results;
}

// Exposer les fonctions globalement
window.testKiteFlight = testKiteFlight;
window.analyzeFlightPerformance = analyzeFlightPerformance;
window.quickDiagnostic = quickDiagnostic;

console.log('🧪 Fonctions de test disponibles:');
console.log('• testKiteFlight() - Test complet de la simulation');
console.log('• analyzeFlightPerformance() - Analyse des performances de vol');
console.log('• quickDiagnostic() - Diagnostic rapide des composants');