/**
 * Objects module exports
 * Centralise tous les objets 3D disponibles
 */

// Furniture et Factories de mobilier
export * from './furniture';
export { ChairFactory } from '@factories/ChairFactory';
export { ModularChairFactory } from '@factories/ModularChairFactory';
export { SimpleChairFactory } from '@factories/SimpleChairFactory';
export { FurnitureTableFactory } from '@factories/FurnitureTableFactory';

// Shapes et Factories de formes
export * from './shapes';
export { PyramidFactory } from '@factories/PyramidFactory';
export { BoxFactory } from '@factories/BoxFactory';
export { CarFactory } from '@factories/CarFactory';
export { CubeFactory } from '@factories/CubeFactory';
export { TestSphereFactory } from '@factories/TestSphereFactory';

// Mechanical et Factories mécaniques
export * from './mechanical';
export { GearFactory } from '@factories/GearFactory';

// Organic et Factories organiques
export * from './organic';
export { FractalTreeFactory } from '@factories/FractalTreeFactory';
export { KiteFactory } from '@factories/KiteFactory'; // Ajoute la factory du cerf-volant