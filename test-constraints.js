/**
 * Script de test des contraintes des lignes
 * À exécuter dans la console du navigateur pendant que la simulation tourne
 */

// Test de vérification des contraintes de distance
function testLineConstraints() {
    console.log("🔍 Test des contraintes des lignes - V10");
    
    // Récupérer la simulation depuis la fenêtre globale (si disponible)
    if (typeof window.simulation === 'undefined') {
        console.log("❌ Simulation non disponible. Assurez-vous que la simulation est lancée.");
        return;
    }
    
    const sim = window.simulation;
    const kitePos = sim.kite.position;
    const barPos = sim.controlBar.position;
    
    // Distance totale du kite à la barre de contrôle
    const totalDistance = kitePos.distanceTo(barPos);
    
    // Longueur des lignes configurée
    const lineLength = sim.lineSystem ? sim.lineSystem.getLineLength() : 15;
    
    console.log(`📏 Distance kite-barre: ${totalDistance.toFixed(2)}m`);
    console.log(`🔗 Longueur lignes: ${lineLength}m`);
    
    // Vérification que la contrainte est respectée
    if (totalDistance > lineLength + 0.1) { // Tolérance de 10cm
        console.log(`❌ CONTRAINTE VIOLÉE! Le kite est trop loin (${(totalDistance - lineLength).toFixed(2)}m de dépassement)`);
    } else {
        console.log(`✅ Contrainte respectée`);
    }
    
    // Informations sur les lignes individuelles
    if (sim.lineSystem) {
        const tensions = sim.lineSystem.getLineTensions();
        console.log("📊 Tensions des lignes:", {
            gauche: `${tensions.leftDistance.toFixed(2)}m (tendue: ${tensions.leftTaut})`,
            droite: `${tensions.rightDistance.toFixed(2)}m (tendue: ${tensions.rightTaut})`
        });
    }
    
    return {
        totalDistance: totalDistance.toFixed(2),
        lineLength: lineLength,
        constraintRespected: totalDistance <= lineLength + 0.1
    };
}

// Test en continu pendant 5 secondes
function continuousTest() {
    console.log("🔄 Test continu des contraintes pendant 5 secondes...");
    let violations = 0;
    let checks = 0;
    
    const interval = setInterval(() => {
        const result = testLineConstraints();
        checks++;
        if (!result.constraintRespected) {
            violations++;
        }
    }, 100); // Test toutes les 100ms
    
    setTimeout(() => {
        clearInterval(interval);
        console.log(`📈 Résultat du test continu:`);
        console.log(`   - ${checks} vérifications effectuées`);
        console.log(`   - ${violations} violations détectées`);
        console.log(`   - Taux de respect: ${((checks - violations) / checks * 100).toFixed(1)}%`);
        
        if (violations === 0) {
            console.log("✅ Les contraintes sont parfaitement respectées!");
        } else {
            console.log("⚠️ Des violations ont été détectées. Le système de contraintes pourrait nécessiter des ajustements.");
        }
    }, 5000);
}

// Exporter les fonctions pour utilisation dans la console
if (typeof window !== 'undefined') {
    window.testLineConstraints = testLineConstraints;
    window.continuousTest = continuousTest;
    console.log("🛠️ Fonctions de test des contraintes chargées:");
    console.log("   - testLineConstraints() : test unique");
    console.log("   - continuousTest() : test continu sur 5s");
}