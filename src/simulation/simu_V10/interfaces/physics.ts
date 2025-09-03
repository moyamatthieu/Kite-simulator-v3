/**
 * Interfaces pour le système physique
 * Définit les contrats entre les différents modules
 */

import * as THREE from 'three';

/**
 * État complet du cerf-volant
 */
export interface IKiteState {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    orientation: THREE.Quaternion;
    angularVelocity: THREE.Vector3;
}

/**
 * Forces aérodynamiques calculées
 */
export interface IAerodynamicForces {
    lift: THREE.Vector3;
    drag: THREE.Vector3;
    torque: THREE.Vector3;
    apparent: THREE.Vector3;
    coefficients: IAeroCoefficients;
    surfaces?: ISurfaceForces[]; // Nouveau : données par surface pour le debug
}

/**
 * Forces sur une surface individuelle du kite
 */
export interface ISurfaceForces {
    center: THREE.Vector3;        // Centre de la surface
    normal: THREE.Vector3;        // Normale de la surface
    apparentWind: THREE.Vector3;  // Vent apparent sur cette surface
    lift: THREE.Vector3;         // Portance sur cette surface
    drag: THREE.Vector3;         // Traînée sur cette surface
    resultant: THREE.Vector3;    // Force résultante sur cette surface
}

/**
 * Coefficients aérodynamiques
 */
export interface IAeroCoefficients {
    cl: number;      // Coefficient de portance
    cd: number;      // Coefficient de traînée
    cm: number;      // Coefficient de moment
    aoa: number;     // Angle d'attaque (rad)
    aoaDeg: number;  // Angle d'attaque (deg)
}

/**
 * Paramètres du vent
 */
export interface IWindParams {
    speed: number;        // m/s
    direction: number;    // rad
    turbulence: number;   // 0-1
}

/**
 * Tension des lignes
 */
export interface ILineTension {
    left: number;         // N
    right: number;        // N
    leftLength: number;   // m
    rightLength: number;  // m
    isTaut: boolean;
}

/**
 * Contrôle utilisateur
 */
export interface IControlInput {
    steer: number;        // -1 à 1
    tensionDiff: number;  // -1 à 1 (différentiel de tension)
}

/**
 * Métriques de simulation
 */
export interface ISimulationMetrics {
    fps: number;
    frameTime: number;
    physicsTime: number;
    renderTime: number;
    totalForce: number;
    altitude: number;
    airspeed: number;
    aoaDeg: number;
}

/**
 * Surface du cerf-volant pour les calculs aéro
 */
export interface IKiteSurface {
    vertices: THREE.Vector3[];
    normal: THREE.Vector3;
    area: number;
    center: THREE.Vector3;
}

/**
 * Configuration de la simulation
 */
export interface ISimulationConfig {
    physics: {
        gravity: number;
        airDensity: number;
        maxTimestep: number;
        linearDamping: number;
        angularDamping: number;
    };

    aerodynamics: {
        liftSlope: number;
        dragCoeff0: number;
        stallAngle: number;
        aspectRatio: number;
    };

    lines: {
        stiffness: number;
        damping: number;
        maxLength: number;
        elasticity: number;
    };

    wind: {
        baseSpeed: number;
        gustFactor: number;
        turbulenceScale: number;
    };
}

/**
 * Interface pour un calculateur aérodynamique
 */
export interface IAerodynamicsCalculator {
    calculateForces(
        apparentWind: THREE.Vector3,
        orientation: THREE.Quaternion,
        surfaces?: IKiteSurface[]
    ): IAerodynamicForces;

    getCoefficients(aoa: number): IAeroCoefficients;
}

/**
 * Interface pour le système de lignes
 */
export interface ILineSystem {
    update(handles: IHandlePositions, kitePoints: IKitePoints): ILineTension;
    applyConstraints(state: IKiteState, dt: number): IKiteState;
    getLinePoints(): ILineRenderData[];
}

/**
 * Positions des poignées
 */
export interface IHandlePositions {
    left: THREE.Vector3;
    right: THREE.Vector3;
}

/**
 * Points d'attache sur le cerf-volant
 */
export interface IKitePoints {
    leftControl: THREE.Vector3;
    rightControl: THREE.Vector3;
    bridles?: THREE.Vector3[];
}

/**
 * Données pour le rendu des lignes
 */
export interface ILineRenderData {
    from: THREE.Vector3;
    to: THREE.Vector3;
    tension: number;
    color?: number;
}

/**
 * Interface pour un moteur physique
 */
export interface IPhysicsEngine {
    step(dt: number, kite: THREE.Object3D, control: IControlInput): ISimulationMetrics;
    reset(): void;
    getState(): IKiteState;
    setConfig(config: Partial<ISimulationConfig>): void;
}

/**
 * Interface pour l'observateur d'événements
 */
export interface IEventObserver<T> {
    subscribe(callback: (data: T) => void): () => void;
    notify(data: T): void;
}

/**
 * Types d'événements de simulation
 */
export interface ISimulationEvents {
    stateUpdate: IKiteState;
    collision: { point: THREE.Vector3; normal: THREE.Vector3 };
    stall: { severity: number; recovery: boolean };
    lineBreak: { side: 'left' | 'right'; tension: number };
}