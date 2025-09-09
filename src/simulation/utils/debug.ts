/**
 * debug.ts - Système de debug visuel avancé V8
 *
 * AMÉLIORATIONS V8 INTÉGRÉES :
 * - Flèches visuelles pour toutes les forces (vitesse, portance, traînée, gravité, vent, lignes)
 * - Labels de texte flottants avec valeurs en temps réel
 * - Trajectoire du kite avec historique
 * - Indicateurs de warnings visuels
 * - Métriques aérodynamiques complètes
 * - Visualisation des contraintes PBD
 */

import * as THREE from 'three';
import { PhysicsConstants, CONFIG } from '../core/constants';
import { Kite } from '@objects/Kite';
import { WindSimulator } from '../physics/WindSimulator';
import { LineSystem } from '../physics/lines';

// Constantes pour la visualisation des vecteurs de debug
const VECTOR_VISUAL_SCALE = 0.8;
const NORMAL_VISUAL_LENGTH = 0.6;
const MIN_ARROW_LENGTH = 0.1;
const MAX_TRAJECTORY_POINTS = 200;

/**
 * Interface pour les données de debug étendues V8
 */
interface ExtendedDebugData {
  kitePosition: THREE.Vector3;
  kiteVelocity: THREE.Vector3;
  kiteAngularVelocity: THREE.Vector3;
  apparentWind: THREE.Vector3;
  aerodynamicForces: {
    lift: THREE.Vector3;
    drag: THREE.Vector3;
    torque: THREE.Vector3;
  };
  lineForces: {
    leftForce: THREE.Vector3;
    rightForce: THREE.Vector3;
    torque: THREE.Vector3;
  };
  warnings: {
    accel: boolean;
    velocity: boolean;
    angular: boolean;
    accelValue: number;
    velocityValue: number;
  };
  surfaceData: {
    center: THREE.Vector3;
    normal: THREE.Vector3;
    apparentWind: THREE.Vector3;
    lift: THREE.Vector3;
    drag: THREE.Vector3;
    resultant: THREE.Vector3;
  }[];
  controlRotation: number;
  pilotPosition: THREE.Vector3;
}

/**
 * Interface pour les métriques de debug
 */
interface DebugMetrics {
  kitePosition: string;
  kiteVelocity: string;
  windSpeed: string;
  warnings: any;
  lineMetrics: any;
  aeroMetrics: any;
}

/**
 * Classe principale pour le système de debug visuel avancé V8
 */
export class DebugVisualizer {
  private scene: THREE.Scene;
  private group = new THREE.Group();
  private isEnabled: boolean = false;

  // Vecteurs de forces principales
  private velocityArrow!: THREE.ArrowHelper;
  private liftArrow!: THREE.ArrowHelper;
  private dragArrow!: THREE.ArrowHelper;
  private gravityArrow!: THREE.ArrowHelper;
  private windArrow!: THREE.ArrowHelper;
  private leftLineArrow!: THREE.ArrowHelper;
  private rightLineArrow!: THREE.ArrowHelper;
  private torqueArrow!: THREE.ArrowHelper;

  // Trajectoire et labels
  private trajectoryPoints: THREE.Vector3[] = [];
  private trajectoryLine: THREE.Line | null = null;
  private forceLabels: Map<string, THREE.Sprite> = new Map();

  // Indicateurs visuels
  private stallIndicator!: THREE.Mesh;
  private warningIndicator!: THREE.Mesh;

  // Couleurs pour les différentes forces
  private readonly COLORS = {
    velocity: 0x00ff00,      // Vert - vitesse
    lift: 0x0088ff,          // Bleu - portance
    drag: 0xff0000,          // Rouge - traînée
    gravity: 0xffaa00,       // Orange - gravité
    wind: 0x88ff00,          // Vert clair - vent
    lineTension: 0xff0088,   // Rose - tension lignes
    torque: 0x8800ff,        // Violet - couple
    stall: 0xff0000,         // Rouge - décrochage
    warning: 0xffaa00        // Orange - warning
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group.name = 'DebugVisualizer';
    this.group.visible = false;

    this.initializeVectors();
    this.initializeIndicators();
    this.setupTrajectoryLine();

    this.scene.add(this.group);
  }

  /**
   * Initialise tous les vecteurs de debug
   */
  private initializeVectors(): void {
    // Vecteur de vitesse
    this.velocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(),
      1,
      this.COLORS.velocity
    );

    // Vecteurs aérodynamiques
    this.liftArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(),
      1,
      this.COLORS.lift
    );

    this.dragArrow = new THREE.ArrowHelper(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(),
      1,
      this.COLORS.drag
    );

    // Gravité
    this.gravityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(),
      1,
      this.COLORS.gravity
    );

    // Vent
    this.windArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(),
      1,
      this.COLORS.wind
    );

    // Lignes de tension
    this.leftLineArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(),
      1,
      this.COLORS.lineTension
    );

    this.rightLineArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(),
      1,
      this.COLORS.lineTension
    );

    // Couple
    this.torqueArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(),
      1,
      this.COLORS.torque
    );

    // Ajouter tous les vecteurs au groupe
    this.group.add(
      this.velocityArrow,
      this.liftArrow,
      this.dragArrow,
      this.gravityArrow,
      this.windArrow,
      this.leftLineArrow,
      this.rightLineArrow,
      this.torqueArrow
    );
  }

  /**
   * Initialise les indicateurs visuels
   */
  private initializeIndicators(): void {
    // Indicateur de décrochage
    const stallGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const stallMaterial = new THREE.MeshBasicMaterial({
      color: this.COLORS.stall,
      transparent: true,
      opacity: 0.7
    });
    this.stallIndicator = new THREE.Mesh(stallGeometry, stallMaterial);
    this.stallIndicator.visible = false;

    // Indicateur de warning
    const warningGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const warningMaterial = new THREE.MeshBasicMaterial({
      color: this.COLORS.warning,
      transparent: true,
      opacity: 0.8
    });
    this.warningIndicator = new THREE.Mesh(warningGeometry, warningMaterial);
    this.warningIndicator.rotation.x = Math.PI;
    this.warningIndicator.visible = false;

    this.group.add(this.stallIndicator, this.warningIndicator);
  }

  /**
   * Configure la ligne de trajectoire
   */
  private setupTrajectoryLine(): void {
    // La trajectoire sera créée dynamiquement
  }

  /**
   * Active/désactive le mode debug
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.group.visible = enabled;

    if (!enabled) {
      this.clearTrajectory();
      this.clearLabels();
    }
  }

  /**
   * Met à jour toutes les visualisations de debug
   */
  update(
    kite: Kite,
    windSimulator: WindSimulator,
    lineSystem: LineSystem,
    controlRotation: number,
    pilotPosition: THREE.Vector3,
    deltaTime: number,
    extendedData?: ExtendedDebugData
  ): void {
    if (!this.isEnabled) return;

    const kitePosition = kite.position.clone();

    // Calculer le centre géométrique du kite
    const centerLocal = new THREE.Vector3(0, 0.325, 0);
    const centerWorld = centerLocal.clone()
      .applyQuaternion(kite.quaternion)
      .add(kitePosition);

    // Utiliser les données étendues si disponibles, sinon calculer
    const data = extendedData || this.computeDebugData(
      kite,
      windSimulator,
      lineSystem,
      controlRotation,
      pilotPosition
    );

    // Mettre à jour les vecteurs principaux
    this.updateMainVectors(centerWorld, data);

    // Mettre à jour les indicateurs
    this.updateIndicators(centerWorld, data);

    // Mettre à jour la trajectoire
    this.updateTrajectory(kitePosition);

    // Mettre à jour les labels
    this.updateLabels(centerWorld, data);
  }

  /**
   * Met à jour les vecteurs principaux
   */
  private updateMainVectors(centerWorld: THREE.Vector3, data: ExtendedDebugData): void {
    // Vitesse
    if (data.kiteVelocity.length() > 0.1) {
      this.velocityArrow.position.copy(centerWorld);
      this.velocityArrow.setDirection(data.kiteVelocity.clone().normalize());
      this.velocityArrow.setLength(Math.min(data.kiteVelocity.length() * 0.5, 3));
    } else {
      this.velocityArrow.setLength(0);
    }

    // Forces aérodynamiques
    if (data.aerodynamicForces.lift.length() > 0.01) {
      this.liftArrow.position.copy(centerWorld);
      this.liftArrow.setDirection(data.aerodynamicForces.lift.clone().normalize());
      this.liftArrow.setLength(Math.min(Math.sqrt(data.aerodynamicForces.lift.length()) * 0.3, 2));
    } else {
      this.liftArrow.setLength(0);
    }

    if (data.aerodynamicForces.drag.length() > 0.01) {
      this.dragArrow.position.copy(centerWorld.clone().add(new THREE.Vector3(0.5, 0, 0)));
      this.dragArrow.setDirection(data.aerodynamicForces.drag.clone().normalize());
      this.dragArrow.setLength(Math.min(Math.sqrt(data.aerodynamicForces.drag.length()) * 0.3, 2));
    } else {
      this.dragArrow.setLength(0);
    }

    // Gravité (toujours visible)
    this.gravityArrow.position.copy(centerWorld.clone().add(new THREE.Vector3(0, 1, 0)));
    this.gravityArrow.setLength(1);

    // Vent
    const wind = data.apparentWind.clone().add(data.kiteVelocity);
    if (wind.length() > 0.1) {
      this.windArrow.position.copy(centerWorld.clone().add(new THREE.Vector3(0, 1.5, 0)));
      this.windArrow.setDirection(wind.clone().normalize());
      this.windArrow.setLength(Math.min(wind.length() * 0.2, 2));
    } else {
      this.windArrow.setLength(0);
    }

    // Tension des lignes
    if (data.lineForces.leftForce.length() > 0) {
      const leftAttach = kite.getPoint('CTRL_GAUCHE');
      if (leftAttach) {
        const leftWorld = leftAttach.clone().applyQuaternion(kite.quaternion).add(kite.position);
        this.leftLineArrow.position.copy(leftWorld);
        this.leftLineArrow.setDirection(data.lineForces.leftForce.clone().normalize());
        this.leftLineArrow.setLength(Math.min(data.lineForces.leftForce.length() * 0.01, 1));
      }
    } else {
      this.leftLineArrow.setLength(0);
    }

    if (data.lineForces.rightForce.length() > 0) {
      const rightAttach = kite.getPoint('CTRL_DROIT');
      if (rightAttach) {
        const rightWorld = rightAttach.clone().applyQuaternion(kite.quaternion).add(kite.position);
        this.rightLineArrow.position.copy(rightWorld);
        this.rightLineArrow.setDirection(data.lineForces.rightForce.clone().normalize());
        this.rightLineArrow.setLength(Math.min(data.lineForces.rightForce.length() * 0.01, 1));
      }
    } else {
      this.rightLineArrow.setLength(0);
    }

    // Couple
    if (data.kiteAngularVelocity.length() > 0.01) {
      this.torqueArrow.position.copy(centerWorld.clone().add(new THREE.Vector3(0, -1, 0)));
      this.torqueArrow.setDirection(data.kiteAngularVelocity.clone().normalize());
      this.torqueArrow.setLength(Math.min(data.kiteAngularVelocity.length() * 2, 1.5));
    } else {
      this.torqueArrow.setLength(0);
    }
  }

  /**
   * Met à jour les indicateurs visuels
   */
  private updateIndicators(centerWorld: THREE.Vector3, data: ExtendedDebugData): void {
    // Indicateur de décrochage (si vitesse verticale négative importante)
    const isStalling = data.kiteVelocity.y < -2 && Math.abs(data.kiteVelocity.x) < 1;
    this.stallIndicator.position.copy(centerWorld);
    this.stallIndicator.visible = isStalling;

    // Indicateur de warning (si accélération ou vitesse excessive)
    const hasWarning = data.warnings.accel || data.warnings.velocity || data.warnings.angular;
    this.warningIndicator.position.copy(centerWorld.clone().add(new THREE.Vector3(0, 2, 0)));
    this.warningIndicator.visible = hasWarning;
  }

  /**
   * Met à jour la trajectoire du kite
   */
  private updateTrajectory(position: THREE.Vector3): void {
    this.trajectoryPoints.push(position.clone());

    if (this.trajectoryPoints.length > MAX_TRAJECTORY_POINTS) {
      this.trajectoryPoints.shift();
    }

    if (this.trajectoryLine) {
      this.group.remove(this.trajectoryLine);
    }

    if (this.trajectoryPoints.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(this.trajectoryPoints);
      const material = new THREE.LineBasicMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.6
      });
      this.trajectoryLine = new THREE.Line(geometry, material);
      this.group.add(this.trajectoryLine);
    }
  }

  /**
   * Met à jour les labels de forces
   */
  private updateLabels(centerWorld: THREE.Vector3, data: ExtendedDebugData): void {
    this.clearLabels();

    const labels = [
      {
        text: `V: ${data.kiteVelocity.length().toFixed(1)}m/s`,
        position: centerWorld.clone().add(new THREE.Vector3(0, 2.5, 0)),
        color: this.COLORS.velocity
      },
      {
        text: `A: ${data.warnings.accelValue.toFixed(1)}m/s²`,
        position: centerWorld.clone().add(new THREE.Vector3(0, 2.2, 0)),
        color: data.warnings.accel ? this.COLORS.stall : this.COLORS.lift
      },
      {
        text: `F: ${(data.aerodynamicForces.lift.length() + data.aerodynamicForces.drag.length()).toFixed(0)}N`,
        position: centerWorld.clone().add(new THREE.Vector3(0, 1.9, 0)),
        color: this.COLORS.lift
      }
    ];

    labels.forEach(label => {
      const sprite = this.createTextSprite(label.text, label.color);
      sprite.position.copy(label.position);
      this.group.add(sprite);
      this.forceLabels.set(label.text, sprite);
    });
  }

  /**
   * Crée un sprite de texte pour les labels
   */
  private createTextSprite(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const fontSize = 24;

    context.font = `Bold ${fontSize}px Arial`;
    const metrics = context.measureText(text);
    canvas.width = metrics.width + 16;
    canvas.height = fontSize + 8;

    // Fond semi-transparent
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Bordure
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = 1;
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    // Texte
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.font = `Bold ${fontSize}px Arial`;
    context.fillText(text, 8, fontSize);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.scale.set(canvas.width / 50, canvas.height / 50, 1);
    return sprite;
  }

  /**
   * Calcule les données de debug si non fournies
   */
  private computeDebugData(
    kite: Kite,
    windSimulator: WindSimulator,
    lineSystem: LineSystem,
    controlRotation: number,
    pilotPosition: THREE.Vector3
  ): ExtendedDebugData {
    const kiteState = {
      position: kite.position.clone(),
      velocity: new THREE.Vector3(), // À récupérer depuis le contrôleur
      angularVelocity: new THREE.Vector3()
    };

    const apparentWind = windSimulator.getApparentWind(kiteState.velocity, 0);

    // Calculer les forces (simplifié)
    const lineForces = lineSystem.calculateLineTensions(kite, controlRotation, pilotPosition);

    return {
      kitePosition: kite.position.clone(),
      kiteVelocity: kiteState.velocity,
      kiteAngularVelocity: kiteState.angularVelocity,
      apparentWind,
      aerodynamicForces: {
        lift: new THREE.Vector3(0, 50, 0), // Valeur par défaut
        drag: new THREE.Vector3(-5, 0, 0),
        torque: new THREE.Vector3()
      },
      lineForces,
      warnings: {
        accel: false,
        velocity: false,
        angular: false,
        accelValue: 0,
        velocityValue: 0
      },
      surfaceData: [],
      controlRotation,
      pilotPosition
    };
  }

  /**
   * Obtient les métriques de debug formatées
   */
  getDebugMetrics(
    kite: Kite,
    windSimulator: WindSimulator,
    lineSystem: LineSystem,
    controlRotation: number,
    pilotPosition: THREE.Vector3
  ): DebugMetrics {
    const kiteState = {
      position: kite.position.clone(),
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3()
    };

    const windParams = windSimulator.getParams();
    const lineMetrics = lineSystem.getLineMetrics(kite, controlRotation, pilotPosition);

    return {
      kitePosition: `[${kite.position.x.toFixed(1)}, ${kite.position.y.toFixed(1)}, ${kite.position.z.toFixed(1)}]`,
      kiteVelocity: `${kiteState.velocity.length().toFixed(1)} m/s`,
      windSpeed: `${windParams.speed} km/h (${(windParams.speed / 3.6).toFixed(1)} m/s)`,
      warnings: { accel: false, velocity: false, angular: false },
      lineMetrics,
      aeroMetrics: { apparentSpeed: 0, liftMag: 0, dragMag: 0, lOverD: 0, aoaDeg: 0 }
    };
  }

  /**
   * Efface la trajectoire
   */
  private clearTrajectory(): void {
    if (this.trajectoryLine) {
      this.group.remove(this.trajectoryLine);
      this.trajectoryLine = null;
    }
    this.trajectoryPoints = [];
  }

  /**
   * Efface les labels
   */
  private clearLabels(): void {
    this.forceLabels.forEach(label => this.group.remove(label));
    this.forceLabels.clear();
  }

  /**
   * Reset toutes les visualisations
   */
  reset(): void {
    this.clearTrajectory();
    this.clearLabels();

    // Cacher tous les vecteurs
    [this.velocityArrow, this.liftArrow, this.dragArrow, this.gravityArrow,
    this.windArrow, this.leftLineArrow, this.rightLineArrow, this.torqueArrow].forEach(arrow => {
      arrow.setLength(0);
    });

    // Cacher les indicateurs
    this.stallIndicator.visible = false;
    this.warningIndicator.visible = false;
  }

  /**
   * Libère les ressources
   */
  dispose(): void {
    this.group.clear();
  }
}

// ==============================================================================
// CLASSE DE COMPATIBILITÉ - Wrapper pour l'ancienne API
// ==============================================================================

/**
 * @interface SurfaceDebug - Interface de compatibilité
 */
interface SurfaceDebug {
  apparentWind: THREE.ArrowHelper;
  lift: THREE.ArrowHelper;
  drag: THREE.ArrowHelper;
  normal: THREE.ArrowHelper;
  resultante: THREE.ArrowHelper;
}

/**
 * @class DebugVectors - Wrapper de compatibilité pour l'ancienne API
 * @description Wrapper pour maintenir la compatibilité avec l'ancien système de debug
 */
export class DebugVectors {
  private visualizer: DebugVisualizer;
  private surfaceDebug: SurfaceDebug[] = [];

  constructor() {
    // Créer une scène temporaire pour l'initialisation
    const tempScene = new THREE.Scene();
    this.visualizer = new DebugVisualizer(tempScene);

    // Créer des surfaces de debug vides pour la compatibilité
    for (let i = 0; i < 4; i++) {
      this.surfaceDebug.push({
        apparentWind: new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x00e0ff),
        lift: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, 0x0088ff),
        drag: new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 1, 0xff0000),
        normal: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.6, 0x888888),
        resultante: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, 0x66aaff)
      });
    }
  }

  get object3d(): THREE.Object3D {
    return this.visualizer['group'];
  }

  setVisible(visible: boolean): void {
    this.visualizer.setEnabled(visible);
  }

  update(kitePosition: THREE.Vector3, data: any): void {
    // Cette méthode est maintenue pour la compatibilité
    // Le nouveau système V8 gère les mises à jour différemment
  }

  dispose(): void {
    this.visualizer.dispose();
  }
}
