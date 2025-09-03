/**
 * Shape objects exports
 */

// Legacy factories (à migrer vers l'architecture refactorisée)
export { BoxFactory } from '@factories/BoxFactory';
export { CarFactory } from '@factories/CarFactory'; // Utilise la factory
export { CubeFactory } from '@factories/CubeFactory';
export { PyramidFactory } from '@factories/PyramidFactory'; // Utilise la factory
export { TestSphereFactory } from '@factories/TestSphereFactory';

// Note: Cube est géré par CubeFactory - utiliser le système de Factory au lieu d'un objet direct