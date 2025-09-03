/**
 * `SimulationV10.ts` - Version modulaire de l'application de simulation de kite.
 *
 * Ce fichier est le point d'entrée principal de la simulation. Il orchestre
 * l'initialisation et la gestion de tous les composants de simulation, y compris
 * le rendu 3D, la physique, le vent, les entrées utilisateur et l'interface utilisateur.
 * Il applique des principes de modularité en utilisant des classes dédiées pour
 * chaque aspect de la simulation.
 */

import * as THREE from 'three';
import { RenderManager } from '@/simulation/render';
import { WindSimulator } from '@/simulation/wind';
import { InputHandler } from '@/simulation/input';
import { ControlBarManager } from '@/simulation/control';
import { LineSystem } from '@/simulation/lines';
import { PhysicsEngine } from '@/simulation/engine';
import { Environment } from '@/simulation/environment';
import { Pilot3D } from '@/simulation/pilot';
import { ControlBar3D } from '@/simulation/control_bar';
import { DebugVectors } from '@/simulation/debug';
import { FlightAnalyzer } from '@/simulation/analysis/FlightAnalyzer';
import { Kite } from '@objects/organic/Kite';
import { CONFIG } from '@/simulation/config/SimulationConfig';
import { PhysicsConstants } from '@/simulation/physics/PhysicsConstants';
import { KiteGeometry } from '@/simulation/data/KiteGeometry';
import { SimulationUIManager } from '@/simulation/ui/SimulationUIManager';

// --- Constantes de la simulation ---
const INITIAL_KITE_Y_HEIGHT = 7; // Hauteur initiale du kite en mètres au-dessus du sol
const INITIAL_KITE_HORIZONTAL_FACTOR = 0.95; // Facteur de la distance horizontale par rapport à la longueur des lignes

/**
 * @class SimulationAppV10
 * @description Classe principale qui orchestre tous les modules de la simulation V10:
 *              rendu, vent, entrée utilisateur, contrôle, physique, UI, debug, etc.
 *              Elle gère le cycle de vie de la simulation, de l'initialisation au rendu.
 */
export class SimulationAppV10 {
  private container: HTMLElement;
  public renderer: THREE.WebGLRenderer; // Exposé pour le loader
  private rm: RenderManager;
  private wind: WindSimulator;
  private input: InputHandler;
  private control: ControlBarManager;
  private environment: Environment;
  private pilot: Pilot3D;
  private bar: ControlBar3D;
  private lines: LineSystem;
  private engine: PhysicsEngine;
  private kite: Kite; // Utilise la classe Kite typée
  private running = true;
  private lastTime = performance.now();
  private debugVisible = CONFIG.get('debug').startVisible; // Utilise la config pour l'état initial du debug
  private fpsSMA = 60; // Moyenne mobile simple (Simple Moving Average) pour le calcul des FPS
  private rafId: number | null = null;
  private debugVectors: DebugVectors;
  private flightAnalyzer: FlightAnalyzer;
  private uiManager: SimulationUIManager; // Instance du nouveau gestionnaire d'UI

  /**
   * Crée une instance de SimulationAppV10.
   * @param {HTMLElement} [container=document.getElementById('app') as HTMLElement] - L'élément DOM
   *        dans lequel la simulation sera rendue et l'UI affichée.
   */
  constructor(container: HTMLElement = document.getElementById('app') as HTMLElement) {
    this.container = container;

    // Initialisation des gestionnaires de bas niveau
    this.rm = new RenderManager(this.container);
    this.renderer = this.rm.renderer; // Expose le renderer pour une utilisation externe si nécessaire
    this.wind = new WindSimulator(); // WindSimulator gère maintenant sa config interne
    this.input = new InputHandler();
    this.control = new ControlBarManager();
    this.environment = new Environment();
    this.pilot = new Pilot3D();
    this.bar = new ControlBar3D();
    this.lines = new LineSystem();
    this.debugVectors = new DebugVectors();
    this.flightAnalyzer = new FlightAnalyzer();
    this.uiManager = SimulationUIManager.getInstance(this.container); // Obtient l'instance du gestionnaire d'UI

    // Configure la visibilité des éléments de debug via l'UI Manager
    this.uiManager.toggleDebugInfoPanel(this.debugVisible);
    this.uiManager.toggleDebugLegend(this.debugVisible);
    this.debugVectors.setVisible(this.debugVisible);

    // Initialisation du Kite
    this.kite = new Kite({ sailColor: CONFIG.get('kite').defaultColor });

    // Calcul de la position initiale du kite (basé sur la géométrie du pilote et les lignes)
    const pilotPos = this.pilot.object3d.position.clone();
    const initialLineLength = CONFIG.get('lines').defaultLength;
    const dy = INITIAL_KITE_Y_HEIGHT - pilotPos.y;
    // Utilise Phytagore pour trouver la distance horizontale si les lignes sont tendues
    const horizontalDistance = Math.max(
      PhysicsConstants.EPSILON, // S'assure que la distance n'est jamais nulle ou négative
      Math.sqrt(Math.max(0, initialLineLength * initialLineLength - dy * dy)) * INITIAL_KITE_HORIZONTAL_FACTOR
    );

    this.kite.position.set(pilotPos.x, INITIAL_KITE_Y_HEIGHT, pilotPos.z - horizontalDistance);
    this.kite.rotation.set(0, 0, 0);
    this.kite.quaternion.identity();

    // Moteur physique, initialisé avec les données de configuration des lignes
    this.engine = new PhysicsEngine(this.wind);
    this.engine.setLineLength(initialLineLength); // Assigne la longueur des lignes au moteur physique

    // Ajout des objets à la scène Three.js
    this.rm.scene.add(this.environment.object3d);
    this.rm.scene.add(this.kite);
    this.rm.scene.add(this.pilot.object3d);
    this.rm.scene.add(this.bar.object3d);
    this.rm.scene.add(this.lines.object3d);
    this.rm.scene.add(this.debugVectors.object3d as THREE.Object3D); // Cast pour compatibilité

    // Positionne la barre de contrôle aux mains du pilote (le pilote est à 1,0,0 + hauteur des mains)
    const pilotPosition = this.pilot.object3d.position.clone();
    this.bar.object3d.position.set(pilotPosition.x, CONFIG.get('control').barHeight, pilotPosition.z);

    // Établit les écouteurs d'événements UI
    this.setupUIEventListeners();

    // Lance la boucle de simulation
    this.loop();
  }

  /**
   * Crée une instance de SimulationAppV10.
   * @param {HTMLElement} [container=document.getElementById('app') as HTMLElement] - L'élément DOM
   *        dans lequel la simulation sera rendue et l'UI affichée.
   */
  constructor(container: HTMLElement = document.getElementById('app') as HTMLElement) {
    this.container = container;

    // Initialisation des gestionnaires de bas niveau
    this.rm = new RenderManager(this.container);
    this.renderer = this.rm.renderer; // Expose le renderer pour une utilisation externe si nécessaire
    this.wind = new WindSimulator(); // WindSimulator gère maintenant sa config interne
    this.input = new InputHandler();
    this.control = new ControlBarManager();
    this.environment = new Environment();
    this.pilot = new Pilot3D();
    this.bar = new ControlBar3D();
    this.lines = new LineSystem();
    this.debugVectors = new DebugVectors();
    this.flightAnalyzer = new FlightAnalyzer();
    this.uiManager = SimulationUIManager.getInstance(this.container); // Obtient l'instance du gestionnaire d'UI

    // Configure la visibilité des éléments de debug via l'UI Manager
    this.uiManager.toggleDebugInfoPanel(this.debugVisible);
    this.uiManager.toggleDebugLegend(this.debugVisible);
    this.debugVectors.setVisible(this.debugVisible);

    // Initialisation du Kite
    this.kite = new Kite({ sailColor: CONFIG.get('kite').defaultColor });

    // Calcul de la position initiale du kite (basé sur la géométrie du pilote et les lignes)
    const pilotPos = this.pilot.object3d.position.clone();
    const initialLineLength = CONFIG.get('lines').defaultLength;
    const dy = INITIAL_KITE_Y_HEIGHT - pilotPos.y;
    // Utilise Phytagore pour trouver la distance horizontale si les lignes sont tendues
    const horizontalDistance = Math.max(
      PhysicsConstants.EPSILON, // S'assure que la distance n'est jamais nulle ou négative
      Math.sqrt(Math.max(0, initialLineLength * initialLineLength - dy * dy)) * INITIAL_KITE_HORIZONTAL_FACTOR
    );

    this.kite.position.set(pilotPos.x, INITIAL_KITE_Y_HEIGHT, pilotPos.z - horizontalDistance);
    this.kite.rotation.set(0, 0, 0);
    this.kite.quaternion.identity();

    // Moteur physique, initialisé avec les données de configuration des lignes
    this.engine = new PhysicsEngine(
      this.wind,
      CONFIG.get('physics'),
      CONFIG.get('kite'),
      CONFIG.get('lines')
    );
    this.engine.setLineLength(initialLineLength); // Assigne la longueur des lignes au moteur physique

    // Ajout des objets à la scène Three.js
    this.rm.scene.add(this.environment.object3d);
    this.rm.scene.add(this.kite);
    this.rm.scene.add(this.pilot.object3d);
    this.rm.scene.add(this.bar.object3d);
    this.rm.scene.add(this.lines.object3d);
    this.rm.scene.add(this.debugVectors.object3d as THREE.Object3D); // Cast pour compatibilité

    // Positionne la barre de contrôle aux mains du pilote (le pilote est à 1,0,0 + hauteur des mains)
    const pilotPosition = this.pilot.object3d.position.clone();
    this.bar.object3d.position.set(pilotPosition.x, CONFIG.get('control').barHeight, pilotPosition.z);

    // Établit les écouteurs d'événements UI
    this.setupUIEventListeners();

    // Lance la boucle de simulation
    this.loop();
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    // Limite le delta temps pour éviter les instabilités physiques lors de ralentissements
    const dt = Math.min(CONFIG.get('physics').maxDeltaTime, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Mise à jour du vent
    this.wind.update(dt);

    // Mise à jour des contrôles (lissage et retour au centre)
    this.control.setTargetTilt(this.input.steer);
    this.control.update(dt);
    this.bar.updateTilt(this.control.tilt);

    // Récupération des positions des poignées de la barre de contrôle pour les contraintes de ligne
    const leftBarHandlePos = new THREE.Vector3();
    const rightBarHandlePos = new THREE.Vector3();
    this.bar.getLeftWorldPosition(leftBarHandlePos);
    this.bar.getRightWorldPosition(rightBarHandlePos);

    // Étape de la physique (PBD + Aérodynamique)
    // Les métriques incluent les tensions des lignes, l'AoA, le facteur de décrochage, etc.
    const metrics = this.engine.step(
      dt,
      this.kite,
      { steer: this.control.tilt },
      { left: leftBarHandlePos, right: rightBarHandlePos }
    );

    // L'état des contraintes (par ex., collision avec le sol) est géré en interne par l'Engine
    // mais on peut le récupérer pour l'affichage UI si besoin.
    const constraintStatus = this.engine.getConstraintStatus(this.kite);

    // Analyse de vol pour détecter des phénomènes comme les oscillations
    this.flightAnalyzer.addSample(
      this.kite.position,
      this.engine.getVelocity(),
      metrics.force,
      metrics.aoaDeg,
      dt
    );

    // Récupération des données aérodynamiques détaillées pour l'affichage de debug
    const aeroData = this.engine.getLastAerodynamics();
    const windVector = this.wind.getVector();
    const apparentWind = windVector.clone().sub(this.engine.getVelocity());

    // Mise à jour des vecteurs de debug 3D
    const currentKiteVelocity = this.engine.getVelocity();
    const kiteControlPointLeft = KiteGeometry.CONTROL_POINTS.CTRL_GAUCHE.clone().applyMatrix4(this.kite.matrixWorld);
    const kiteControlPointRight = KiteGeometry.CONTROL_POINTS.CTRL_DROIT.clone().applyMatrix4(this.kite.matrixWorld);

    // Ajuster les centres des surfaces pour les coordonnées mondiales absolues pour le debug
    const adjustedSurfaces = (aeroData.surfaces || []).map(surface => ({
      ...surface,
      center: surface.center.clone().applyMatrix4(this.kite.matrixWorld) // Transformer en coords mondiales
    }));

    this.debugVectors.update(this.kite.position, {
      globalVelocity: currentKiteVelocity,
      surfaceData: adjustedSurfaces,
      leftLine: { from: leftBarHandlePos, to: kiteControlPointLeft },
      rightLine: { from: rightBarHandlePos, to: kiteControlPointRight },
      isStalling: metrics.stallFactor < 0.95, // Seuil de décrochage
    });

    // Actualiser les lignes 3D (après intégration physique)
    this.lines.update(leftBarHandlePos, kiteControlPointLeft, rightBarHandlePos, kiteControlPointRight);

    // Mise à jour de l'UI en temps réel via le SimulationUIManager
    const fps = dt > 0 ? 1 / dt : 60;
    this.fpsSMA = this.fpsSMA * 0.9 + fps * 0.1; // Calcul de la moyenne mobile des FPS

    this.uiManager.updateRealTimeValues({
      fps: Math.round(this.fpsSMA),
      altitude: this.kite.position.y,
      windSpeed: windVector.length() * 3.6, // Convertir en km/h pour l'affichage
      forceAero: metrics.force,
      lineTensionStatus: `G:${Math.round(metrics.leftTension || 0)}N D:${Math.round(metrics.rightTension || 0)}N`,
      physicsStatus: constraintStatus.onGround ? '⚠️ Au sol' : '✅ Actif',
      logMessage: this.flightAnalyzer.getLatestLog(), // Ou un autre système de log
    });

    // Rendu de la scène 3D
    this.rm.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * Configure les écouteurs d'événements pour les éléments de l'interface utilisateur.
   * Utilise des événements personnalisés pour découpler l'UI de la logique de simulation.
   */
  private setupUIEventListeners(): void {
    // Écoute des événements personnalisés déclenchés par SimulationUIManager
    window.addEventListener('simulation:reset', () => this.resetSimulation());
    window.addEventListener('simulation:togglePlayPause', () => {
      if (this.running) {
        this.pause();
        this.uiManager.setPlayPauseButtonState(false);
        this.uiManager.updateRealTimeValues({ physicsStatus: '⏸️ Pause' });
      } else {
        this.resume();
        this.uiManager.setPlayPauseButtonState(true);
        this.uiManager.updateRealTimeValues({ physicsStatus: '✅ Actif' });
      }
    });

    window.addEventListener('simulation:toggleDebugMode', () => {
      this.debugVisible = !this.debugVisible;
      this.uiManager.setDebugButtonState(this.debugVisible);
      this.uiManager.toggleDebugInfoPanel(this.debugVisible);
      this.uiManager.toggleDebugLegend(this.debugVisible);
      this.debugVectors.setVisible(this.debugVisible);
    });

    // Écouteurs pour les sliders de vent
    this.uiManager.addUIEventListener('wind-speed', 'input', (e) => {
      const kmh = parseFloat((e.target as HTMLInputElement).value);
      this.wind.setSpeed(kmh / 3.6); // Convertir en m/s
      this.uiManager.updateRealTimeValues({ windSpeed: kmh });
    });
    this.uiManager.addUIEventListener('wind-direction', 'input', (e) => {
      const deg = parseFloat((e.target as HTMLInputElement).value);
      this.wind.setDirection(deg);
      // Pas de mise à jour windSpeed car la vitesse ne change pas, seule la direction
    });
    this.uiManager.addUIEventListener('wind-turbulence', 'input', (e) => {
      const percent = parseFloat((e.target as HTMLInputElement).value);
      this.wind.setTurbulence(percent / 100);
      // Pas de mise à jour affichage, le slider gère son propre label de valeur
    });

    // Écouteur pour le slider de longueur de ligne
    this.uiManager.addUIEventListener('line-length', 'input', (e) => {
      const length = parseFloat((e.target as HTMLInputElement).value);
      CONFIG.set('lines.defaultLength', length); // Met à jour la config EN TEMPS RÉEL
      this.engine.setLineLength(length);         // Applique à la physique
      // Pas de mise à jour affichage, le slider gère son propre label de valeur
      try { localStorage.setItem('v10_line_length', String(length)); } catch { /* ignore */ }
    });

    // Initialiser les valeurs de l'UI à partir de la config
    // Cela devrait être géré par l'UIManager lors de sa création/initialisation
    // Mais on peut déclencher un update pour s'assurer que tout est synchronisé
    this.uiManager.updateRealTimeValues({
      windSpeed: CONFIG.get('wind').defaultSpeed, // en km/h
      lineTensionStatus: `G:0N D:0N`, // Valeurs initiales
      altitude: this.kite.position.y
    });

    // Initialisation de la longueur de ligne depuis le localStorage si elle existe
    try {
      const savedLineLength = parseFloat(localStorage.getItem('v10_line_length') || '');
      if (!isNaN(savedLineLength) && savedLineLength > 0) {
        CONFIG.set('lines.defaultLength', savedLineLength);
        this.engine.setLineLength(savedLineLength);
        // Mettre à jour le slider de l'UI directement si on a une référence
        const lineLenInput = this.container.querySelector<HTMLInputElement>('#line-length');
        if (lineLenInput) {
          lineLenInput.value = String(savedLineLength);
          lineLenInput.dispatchEvent(new Event('input')); // Déclenche l'événement pour mettre à jour le label
        }
      }
    } catch { /* ignore */ }
  }


  private resetSimulation(): void {
    // Position initiale du kite calculée géométriquement par rapport au pilote
    const pilotPos = this.pilot.object3d.position.clone();
    const initialLineLength = CONFIG.get('lines').defaultLength;
    const dy = INITIAL_KITE_Y_HEIGHT - pilotPos.y;
    const horizontalDistance = Math.max(
      PhysicsConstants.EPSILON,
      Math.sqrt(Math.max(0, initialLineLength * initialLineLength - dy * dy)) * INITIAL_KITE_HORIZONTAL_FACTOR
    );

    this.kite.position.set(pilotPos.x, INITIAL_KITE_Y_HEIGHT, pilotPos.z - horizontalDistance);
    this.kite.rotation.set(0, 0, 0);
    this.kite.quaternion.identity();

    this.engine.reset();
    this.engine.setLineLength(initialLineLength); // Restaurer la longueur des lignes
    this.flightAnalyzer.reset(); // Réinitialiser l'analyseur de vol
    this.uiManager.updateRealTimeValues({ physicsStatus: '✅ Actif' }); // Met à jour statut UI
    this.lastTime = performance.now(); // Reset le temps pour éviter un gros dt à la reprise
    this.fpsSMA = 60; // Réinitialise le SMA des FPS
  }

  /**
   * Met la simulation en pause.
   */
  pause(): void {
    this.running = false;
  }

  /**
   * Reprend la simulation si elle est en pause.
   */
  resume(): void {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now(); // Réinitialise lastTime pour éviter un grand dt au démarrage
      this.rafId = requestAnimationFrame(this.loop); // Relance la boucle de rendu
    }
  }

  /**
   * Effectue le nettoyage des ressources pour arrêter proprement la simulation.
   */
  cleanup(): void {
    this.running = false;
    this.input.dispose();        // Nettoie les écouteurs d'entrée
    this.rm.dispose();           // Nettoie le RenderManager (renderer, controls...)
    this.uiManager.cleanup();    // Nettoie l'UI Manager
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId); // Arrête la boucle d'animation
    }
    // Assurez-vous que le conteneur UI est également nettoyé si l'UIManager ne le fait pas.
    if (this.container && this.container.parentNode) {
      // Dépend de comment l'UIManager gère son #simulation-ui-container
      // Si SimulationUIManager nettoie son conteneur, ce n'est pas nécessaire ici.
    }
  }
}
