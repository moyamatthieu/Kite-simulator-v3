/**
 * Orchestrateur principal de la simulation - respect du Single Responsibility Principle
 * Remplace la classe monolithique SimulationAppV10
 */
import {
  ISimulationOrchestrator,
  ISimulationConfig,
  ISimulationState,
  ISimulationMetrics
} from '@simulation/core/abstractions/ISimulationOrchestrator';
import { IPhysicsEngine } from '@simulation/core/abstractions/IPhysicsEngine';
import { IWindSimulator } from '@simulation/core/abstractions/IWindSimulator';
import { Vector3D } from '@simulation/core/types/PhysicsTypes';
import { Vector3DImpl } from '@simulation/core/implementations/Vector3DImpl';

export class SimulationOrchestrator implements ISimulationOrchestrator {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private currentTime: number = 0;
  private lastFrameTime: number = 0;
  private animationFrameId: number = 0;

  // État du cerf-volant
  private kitePosition: Vector3D = new Vector3DImpl(0, 5, -10);
  private kiteVelocity: Vector3D = new Vector3DImpl();
  
  // Configuration
  private config: ISimulationConfig;
  
  // Métriques internes mutables
  private internalMetrics = {
    frameRate: 0,
    airspeed: 0,
    altitude: 0,
    totalForce: 0,
    angleOfAttack: 0
  };
  
  // Getter pour l'interface readonly
  private get metrics(): ISimulationMetrics {
    return {
      frameRate: this.internalMetrics.frameRate,
      airspeed: this.internalMetrics.airspeed,
      altitude: this.internalMetrics.altitude,
      totalForce: this.internalMetrics.totalForce,
      angleOfAttack: this.internalMetrics.angleOfAttack
    };
  }

  // Services injectés
  constructor(
    private physicsEngine: IPhysicsEngine,
    private windSimulator: IWindSimulator,
    private renderManager: IRenderManager,
    private inputManager: IInputManager,
    private uiManager: IUIManager,
    config: ISimulationConfig
  ) {
    this.config = { ...config };
    this.bindMethods();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initialisation de la simulation...');
      
      // Initialiser les services
      await this.renderManager.initialize();
      await this.inputManager.initialize();
      await this.uiManager.initialize();
      
      // Configurer les services
      this.physicsEngine.updateConfig(this.config.physics);
      this.windSimulator.configure(this.config.wind);
      
      console.log('✅ Simulation initialisée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }

  start(): void {
    if (this.isRunning) return;
    
    console.log('▶️ Démarrage de la simulation');
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    
    this.gameLoop();
  }

  pause(): void {
    if (!this.isRunning || this.isPaused) return;
    
    console.log('⏸️ Pause de la simulation');
    this.isPaused = true;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  stop(): void {
    if (!this.isRunning) return;
    
    console.log('⏹️ Arrêt de la simulation');
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
    
    this.renderManager.clear();
  }

  reset(): void {
    console.log('🔄 Réinitialisation de la simulation');
    
    const wasRunning = this.isRunning;
    this.stop();
    
    // Réinitialiser l'état
    this.currentTime = 0;
    this.kitePosition = new Vector3DImpl(0, 5, -10);
    this.kiteVelocity = new Vector3DImpl();
    
    // Réinitialiser les services
    this.physicsEngine.reset();
    this.windSimulator.reset();
    
    // Redémarrer si nécessaire
    if (wasRunning) {
      this.start();
    }
  }

  update(deltaTime: number): void {
    if (!this.isRunning || this.isPaused) return;
    
    try {
      this.currentTime += deltaTime;
      
      // Mettre à jour le vent
      this.windSimulator.update(deltaTime);
      
      // Obtenir les entrées utilisateur
      const controlInput = this.inputManager.getControlInput();
      const pilotHandles = this.inputManager.getPilotHandles();
      
      // État du cerf-volant
      const kiteState = {
        position: this.kitePosition,
        quaternion: this.getKiteQuaternion(),
        velocity: this.kiteVelocity,
        angularVelocity: this.getKiteAngularVelocity(),
        mass: this.config.kite.mass,
        inertia: this.config.kite.inertia
      };
      
      // Simuler la physique
      const physicsResult = this.physicsEngine.step(
        deltaTime,
        kiteState,
        controlInput,
        pilotHandles
      );
      
      // Mettre à jour les métriques
      this.updateMetrics(physicsResult, deltaTime);
      
      // Mettre à jour l'affichage
      this.renderManager.update(kiteState, this.windSimulator.getState());
      this.uiManager.updateMetrics(this.metrics);
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      this.pause();
    }
  }

  configure(config: ISimulationConfig): void {
    this.config = { ...config };
    
    // Propager la configuration aux services
    this.physicsEngine.updateConfig(config.physics);
    this.windSimulator.configure(config.wind);
    this.renderManager.configure(config.rendering);
  }

  getState(): ISimulationState {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentTime: this.currentTime,
      kitePosition: this.kitePosition,
      kiteVelocity: this.kiteVelocity,
      windSpeed: this.windSimulator.getState().speed,
      metrics: this.metrics
    };
  }

  private gameLoop = (): void => {
    if (!this.isRunning || this.isPaused) return;
    
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 1/30); // Max 30fps
    this.lastFrameTime = currentTime;
    
    this.update(deltaTime);
    
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private bindMethods(): void {
    this.gameLoop = this.gameLoop.bind(this);
  }

  private getKiteQuaternion(): any {
    // Placeholder - sera remplacé par l'état réel du cerf-volant
    return { x: 0, y: 0, z: 0, w: 1 };
  }

  private getKiteAngularVelocity(): Vector3D {
    // Placeholder - sera remplacé par l'état réel du cerf-volant
    return new Vector3DImpl();
  }

  private updateMetrics(physicsResult: any, deltaTime: number): void {
    // Calcul du framerate
    this.internalMetrics.frameRate = 1 / deltaTime;
    
    // Mise à jour des métriques physiques
    this.internalMetrics.airspeed = physicsResult.airspeed;
    this.internalMetrics.altitude = this.kitePosition.y;
    this.internalMetrics.totalForce = physicsResult.totalForce;
    this.internalMetrics.angleOfAttack = physicsResult.angleOfAttack;
  }
}

// Interfaces pour les dépendances - à implémenter
interface IRenderManager {
  initialize(): Promise<void>;
  update(kiteState: any, windState: any): void;
  clear(): void;
  configure(config: any): void;
}

interface IInputManager {
  initialize(): Promise<void>;
  getControlInput(): any;
  getPilotHandles(): any;
}

interface IUIManager {
  initialize(): Promise<void>;
  updateMetrics(metrics: ISimulationMetrics): void;
}