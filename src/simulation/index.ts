/**
 * Index principal du module de simulation
 * Point d'entrée pour tous les composants de simulation
 */

// Export des objets principaux
export { SimulationApp } from './SimulationApp';
export { Kite } from './objects';

// Export des composants physiques
export { PhysicsEngine } from './physics/PhysicsEngine';
export { WindSimulator } from './physics/WindSimulator';
export { AerodynamicsCalculator } from './physics/AerodynamicsCalculator';
export { LineSystem } from './physics/lines';
export { DebugVisualizer } from './physics/DebugVisualizer';

// Export des composants UI
export { CompactUI } from './ui/CompactUI';

// Export des constantes et configurations
export * from './core/constants';

// Export par défaut
export { SimulationApp as default } from './SimulationApp';
