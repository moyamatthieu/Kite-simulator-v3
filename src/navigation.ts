/**
 * Navigation ultra-simple entre CAO et Simulation
 * 1 fichier, 10 lignes, point final
 */

// Simple redirection vers les pages
export function goToCAO() {
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

export function goToSimulation() {
  if (window.location.pathname !== '/simulation.html') {
    window.location.href = '/simulation.html';
  }
}

// Auto-setup des boutons dans les pages
export function setupNavigation() {
  // Bouton vers simulation sur page CAO
  const modeSimBtn = document.getElementById('mode-simulation');
  if (modeSimBtn) {
    modeSimBtn.onclick = goToSimulation;
  }
  
  // Bouton vers CAO sur page simulation (si on en ajoute un)
  const modeCAOBtn = document.getElementById('mode-cao');
  if (modeCAOBtn) {
    modeCAOBtn.onclick = goToCAO;
  }
}

// Auto-init
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', setupNavigation);
}