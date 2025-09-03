/**
 * Types de données physiques - abstraction des dépendances externes
 * Respect du Dependency Inversion Principle en évitant la dépendance directe à Three.js
 */

export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  
  clone(): Vector3D;
  add(vector: Vector3D): Vector3D;
  subtract(vector: Vector3D): Vector3D;
  multiply(scalar: number): Vector3D;
  normalize(): Vector3D;
  length(): number;
  lengthSquared(): number;
  dot(vector: Vector3D): number;
  cross(vector: Vector3D): Vector3D;
  distanceTo(vector: Vector3D): number;
}

export interface Quaternion3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  
  clone(): Quaternion3D;
  multiply(quaternion: Quaternion3D): Quaternion3D;
  normalize(): Quaternion3D;
  setFromAxisAngle(axis: Vector3D, angle: number): Quaternion3D;
}

export interface Matrix4D {
  readonly elements: readonly number[];
  
  clone(): Matrix4D;
  multiply(matrix: Matrix4D): Matrix4D;
  makeRotationFromQuaternion(quaternion: Quaternion3D): Matrix4D;
}

/**
 * Configuration des surfaces aérodynamiques
 */
export interface ISurfaceConfig {
  readonly vertices: readonly Vector3D[];
  readonly normal: Vector3D;
  readonly area: number;
  readonly liftCoefficient: number;
  readonly dragCoefficient: number;
}

/**
 * Configuration du cerf-volant
 */
export interface IKiteGeometry {
  readonly surfaces: readonly ISurfaceConfig[];
  readonly controlPoints: {
    readonly left: Vector3D;
    readonly right: Vector3D;
    readonly center: Vector3D;
  };
  readonly mass: number;
  readonly inertia: number;
}

/**
 * État du vent
 */
export interface IWindState {
  readonly velocity: Vector3D;
  readonly turbulence: number;
  readonly direction: number; // en degrés
  readonly speed: number; // en m/s
}

/**
 * Configuration des lignes
 */
export interface ILineConfig {
  readonly maxLength: number;
  readonly stiffness: number;
  readonly damping: number;
  readonly maxTension: number;
}

/**
 * Résultat des forces aérodynamiques
 */
export interface IAerodynamicForces {
  readonly lift: Vector3D;
  readonly drag: Vector3D;
  readonly torque: Vector3D;
  readonly angleOfAttack: number;
  readonly stallFactor: number;
  readonly surfaceData: readonly ISurfaceForceData[];
}

export interface ISurfaceForceData {
  readonly surfaceIndex: number;
  readonly force: Vector3D;
  readonly normal: Vector3D;
  readonly area: number;
  readonly effectiveAngle: number;
}