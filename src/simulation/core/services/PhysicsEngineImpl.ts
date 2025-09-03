/**
 * Implémentation du moteur physique respectant le Single Responsibility Principle
 * Remplace la logique dispersée dans l'ancienne classe PhysicsEngine
 */
import { 
  IPhysicsEngine,
  IKiteState,
  IControlInput,
  IPilotHandles,
  IPhysicsResult,
  IPhysicsConfig,
  IConstraintStatus
} from '@simulation/core/abstractions/IPhysicsEngine';
import { IAerodynamicsCalculator } from '@simulation/core/abstractions/IAerodynamicsCalculator';
import { IWindSimulator } from '@simulation/core/abstractions/IWindSimulator';
import { ILineConstraints } from '@simulation/core/abstractions/ILineConstraints';
import { Vector3D } from '@simulation/core/types/PhysicsTypes';
import { Vector3DImpl } from '@simulation/core/implementations/Vector3DImpl';

export class PhysicsEngineImpl implements IPhysicsEngine {
  private velocity: Vector3D = new Vector3DImpl();
  private angularVelocity: Vector3D = new Vector3DImpl();
  
  // Lissage temporel pour la stabilité
  private smoothedForce: Vector3D = new Vector3DImpl();
  private smoothedTorque: Vector3D = new Vector3DImpl();
  private readonly FORCE_SMOOTHING = 0.15;

  // Configuration physique
  private config: IPhysicsConfig;

  // Métriques de la dernière étape
  private lastMetrics: IPhysicsResult = {
    totalForce: 0,
    totalTension: 0,
    angleOfAttack: 0,
    airspeed: 0,
    leftTension: 0,
    rightTension: 0,
    stallFactor: 1.0
  };

  constructor(
    private aerodynamicsCalculator: IAerodynamicsCalculator,
    private windSimulator: IWindSimulator,
    private lineConstraints: ILineConstraints,
    private physicsConstraints: IPhysicsConstraints,
    config: IPhysicsConfig
  ) {
    this.config = { ...config };
  }

  step(
    deltaTime: number,
    kiteState: IKiteState,
    controlInput: IControlInput,
    pilotHandles: IPilotHandles
  ): IPhysicsResult {
    // 1. Calcul du vent apparent
    const windVector = this.windSimulator.getVector();
    const apparentWind = windVector.subtract(this.velocity);
    
    if (apparentWind.length() < 0.001) {
      return this.getZeroResult();
    }

    // 2. Calcul des forces aérodynamiques
    const aeroForces = this.aerodynamicsCalculator.calculateForces(
      apparentWind,
      kiteState.quaternion
    );

    // 3. Forces de gravité
    const gravity = new Vector3DImpl(0, -kiteState.mass * this.config.gravity, 0);

    // 4. Forces des lignes
    const lineTensions = this.lineConstraints.calculateTensions(
      {
        position: kiteState.position,
        quaternion: kiteState.quaternion,
        controlPoints: this.getControlPoints(kiteState)
      },
      pilotHandles.left,
      pilotHandles.right
    );

    // 5. Somme totale des forces
    const totalForce = aeroForces.lift
      .add(aeroForces.drag)
      .add(gravity)
      .add(lineTensions.leftForce)
      .add(lineTensions.rightForce);

    // 6. Couple total
    const totalTorque = aeroForces.torque.add(lineTensions.totalTorque);

    // 7. Validation et lissage
    const validatedForce = this.validateForce(totalForce);
    const validatedTorque = this.validateTorque(totalTorque);

    this.smoothedForce = this.lerp(this.smoothedForce, validatedForce, 1 - this.FORCE_SMOOTHING);
    this.smoothedTorque = this.lerp(this.smoothedTorque, validatedTorque, 1 - this.FORCE_SMOOTHING);

    // 8. Intégration physique
    this.integrateMotion(this.smoothedForce, this.smoothedTorque, kiteState, deltaTime);

    // 9. Application des contraintes
    this.applyConstraints(kiteState);

    // 10. Calcul des métriques
    this.lastMetrics = {
      totalForce: this.smoothedForce.length(),
      totalTension: Math.max(lineTensions.leftForce.length(), lineTensions.rightForce.length()),
      angleOfAttack: aeroForces.angleOfAttack,
      airspeed: apparentWind.length(),
      leftTension: lineTensions.leftForce.length(),
      rightTension: lineTensions.rightForce.length(),
      stallFactor: aeroForces.stallFactor
    };

    return this.lastMetrics;
  }

  reset(): void {
    this.velocity = new Vector3DImpl();
    this.angularVelocity = new Vector3DImpl();
    this.smoothedForce = new Vector3DImpl();
    this.smoothedTorque = new Vector3DImpl();
    this.lastMetrics = {
      totalForce: 0,
      totalTension: 0,
      angleOfAttack: 0,
      airspeed: 0,
      leftTension: 0,
      rightTension: 0,
      stallFactor: 1.0
    };
  }

  updateConfig(config: IPhysicsConfig): void {
    this.config = { ...config };
  }

  getConstraintStatus(): IConstraintStatus {
    return this.physicsConstraints.getStatus();
  }

  private integrateMotion(
    force: Vector3D,
    torque: Vector3D,
    kiteState: IKiteState,
    deltaTime: number
  ): void {
    // Intégration linéaire (Euler)
    const acceleration = force.multiply(1 / kiteState.mass);
    this.velocity = this.velocity.add(acceleration.multiply(deltaTime));
    this.velocity = this.velocity.multiply(this.config.linearDamping);

    // Limitation de vitesse
    if (this.velocity.length() > this.config.maxVelocity) {
      this.velocity = this.velocity.normalize().multiply(this.config.maxVelocity);
    }

    // Intégration angulaire
    const angularAcceleration = torque.multiply(1 / kiteState.inertia);
    this.angularVelocity = this.angularVelocity.add(angularAcceleration.multiply(deltaTime));
    this.angularVelocity = this.angularVelocity.multiply(this.config.angularDamping);
  }

  private validateForce(force: Vector3D): Vector3D {
    if (!force || isNaN(force.length()) || force.length() > this.config.maxForce) {
      console.warn('⚠️ Force invalide détectée, réinitialisation');
      return new Vector3DImpl();
    }
    return force;
  }

  private validateTorque(torque: Vector3D): Vector3D {
    if (!torque || isNaN(torque.length())) {
      console.warn('⚠️ Couple invalide détecté, réinitialisation');
      return new Vector3DImpl();
    }
    return torque;
  }

  private lerp(from: Vector3D, to: Vector3D, factor: number): Vector3D {
    const diff = to.subtract(from);
    return from.add(diff.multiply(factor));
  }

  private getZeroResult(): IPhysicsResult {
    return {
      totalForce: 0,
      totalTension: 0,
      angleOfAttack: 0,
      airspeed: 0,
      leftTension: 0,
      rightTension: 0,
      stallFactor: 1.0
    };
  }

  private getControlPoints(kiteState: IKiteState): { left: Vector3D; right: Vector3D } {
    // Points de contrôle basiques - à adapter selon la géométrie du cerf-volant
    return {
      left: new Vector3DImpl(-0.4, 0, 0.4),
      right: new Vector3DImpl(0.4, 0, 0.4)
    };
  }

  private applyConstraints(kiteState: IKiteState): void {
    // Application des contraintes sera déléguée au service de contraintes
    // Cette méthode sera implémentée selon les besoins spécifiques
  }
}

// Interface pour les contraintes physiques (sol, limites)
interface IPhysicsConstraints {
  getStatus(): IConstraintStatus;
  apply(kiteState: IKiteState, velocity: Vector3D): void;
}