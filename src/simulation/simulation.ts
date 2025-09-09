/**
 * Simulation.ts - Application principale de simulation de cerf-volant
 *
 * Architecture inspirée de V8 :
 * - Physique émergente pure
 * - Kite.ts intégré
 * - Structure modulaire simple
 * - Configuration centralisée
 */

import { SimulationApp } from './SimulationApp';

// Auto-initialisation au chargement de la page
let sim: SimulationApp;

// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSimulation);
} else {
  initSimulation();
}

function initSimulation() {
  try {
    const container = document.getElementById('app');
    if (!container) {
      console.error('❌ Container #app introuvable');
      return;
    }

    console.log('🚀 Initialisation simulation V8-style avec Kite.ts');
    sim = new SimulationApp(container);
    
    // Exposer globalement pour debug
    (window as any).sim = sim;
    
    console.log('✅ Simulation initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation simulation:', error);
    
    // Fallback simple si erreur
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = `
        <div style="color: white; text-align: center; padding: 40px; font-family: Arial;">
          <h2>❌ Erreur de chargement</h2>
          <p>Impossible de charger la simulation.</p>
          <p>Erreur: ${error instanceof Error ? error.message : 'Inconnue'}</p>
          <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">
            🔄 Recharger
          </button>
        </div>
      `;
    }
  }
}

// Export pour usage externe
export { SimulationApp };

// Export principal pour compatibilité
export { sim as default };