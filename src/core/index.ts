/**
 * @module @core
 * Point d'entrée central pour tous les modules du noyau
 * Utiliser : import { Node3D, StructuredObject } from '@core';
 */

// Classes principales
export { Node3D } from './Node3D';
export { StructuredObject } from './StructuredObject';
export { Primitive } from './Primitive';
export { Registry } from './Registry';
export { AutoLoader } from './AutoLoader';

// Re-export des types pour l'autocomplétion
export type { Transform3D } from './Node3D';
export type { Signal } from './SignalManager';

// Note: NamedPoint est un type privé dans StructuredObject