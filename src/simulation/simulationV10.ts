/**
 * SimulationV10.ts — Version modulaire (petits fichiers par classe)
 */

import * as THREE from 'three';
import { RenderManager } from '@simulation/simu_V10/render';
import { WindSimulator } from '@simulation/simu_V10/wind';
import { InputHandler } from '@simulation/simu_V10/input';
import { ControlBarManager } from '@simulation/simu_V10/control';
import { LineSystem } from '@simulation/simu_V10/lines';
import { PhysicsEngine } from '@simulation/simu_V10/engine';
import { defaultParams } from '@simulation/simu_V10/constants';
import { Environment } from '@simulation/simu_V10/environment';
import { Pilot3D } from '@simulation/simu_V10/pilot';
import { ControlBar3D } from '@simulation/simu_V10/control_bar';
import { DebugVectors } from '@simulation/simu_V10/debug';
import { FlightAnalyzer } from '@simulation/simu_V10/analysis/FlightAnalyzer';
import { DebugOverlay, VectorLegend } from '@simulation/simu_V10/debug_overlay';
import { Kite2 } from '@objects/organic/Kite2';

export const UI_MODULE_PATH = '/src/simulation/simu_V10/ui/SimulationUI.ts';

export class SimulationAppV10 {
  private container: HTMLElement;
  // Exposé pour le loader: doit ressembler à un WebGLRenderer
  public renderer: THREE.WebGLRenderer;
  private rm: RenderManager;
  private wind: WindSimulator;
  private input: InputHandler;
  private control: ControlBarManager;
  private environment: Environment;
  private pilot: Pilot3D;
  private bar: ControlBar3D;
  private lines: LineSystem;
  private engine: PhysicsEngine;
  private kite: THREE.Object3D;
  private running = true;
  private lastTime = performance.now();
  private debugVisible = true; // Debug activé par défaut comme V8
  private fpsSMA = 60;
  private rafId: number | null = null;
  private baseLineLength = 15; // m
  private lineK = 150; // raideur augmentée comme V8 (25000 / 150 = ratio adapté)
  private lineElasticity = 0.005; // Élasticité réduite pour plus de stabilité
  private leftTension = 0;
  private rightTension = 0;
  private debugVectors: DebugVectors;
  private flightAnalyzer: FlightAnalyzer;
  private debugOverlay: DebugOverlay;
  private vectorLegend: VectorLegend;

  constructor(container: HTMLElement = document.getElementById('app') as HTMLElement) {
    this.container = container;
    this.rm = new RenderManager(this.container);
    this.renderer = this.rm.renderer;
    this.wind = new WindSimulator(defaultParams.windSpeed, defaultParams.windDirectionDeg);
    this.input = new InputHandler();
    this.control = new ControlBarManager();
    this.environment = new Environment();
    this.pilot = new Pilot3D();
    this.bar = new ControlBar3D();
    this.lines = new LineSystem();
    this.debugVectors = new DebugVectors();
    this.flightAnalyzer = new FlightAnalyzer();
    this.debugOverlay = new DebugOverlay();
    this.vectorLegend = new VectorLegend();
    this.debugVectors.setVisible(this.debugVisible);
    this.debugOverlay.setVisible(this.debugVisible);
    this.vectorLegend.setVisible(this.debugVisible);

    // Objet Kite
    this.kite = new Kite2({ sailColor: '#ff5555' });
    this.kite.position.set(0, 7, -8); // Position plus haute et reculée comme V8
    this.kite.rotation.set(0, 0, 0); // Orientation neutre

    // Moteur
    this.engine = new PhysicsEngine(this.wind);

    // Scène
    this.rm.scene.add(this.environment.object3d);
    this.rm.scene.add(this.kite);
    this.rm.scene.add(this.pilot.object3d);
    this.rm.scene.add(this.bar.object3d);
    this.rm.scene.add(this.lines.object3d);
    this.rm.scene.add(this.debugVectors.object3d as THREE.Object3D);

    // Positionner la barre devant le pilote
    this.bar.object3d.position.add(this.pilot.object3d.position);

    this.loop();
    this.wireUI();
    window.addEventListener('simulation-ui-ready', () => this.wireUI(), { once: true });
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Mise à jour vent
    this.wind.update(dt);

    // Contrôles smooth (inspiré de V9)
    this.control.setTargetTilt(this.input.steer); // Définit la valeur cible
    this.control.update(dt); // Met à jour avec lissage et retour au centre
    this.bar.updateTilt(this.control.tilt);

    // Lignes: positions des poignées (handles) pour les contraintes
    const leftBar = new THREE.Vector3();
    const rightBar = new THREE.Vector3();
    this.bar.getLeftWorldPosition(leftBar);
    this.bar.getRightWorldPosition(rightBar);
    const leftHandle = leftBar.clone();
    const rightHandle = rightBar.clone();

    // PHYSIQUE (PBD + Aéro) — les contraintes gèrent les longueurs asymétriques
    const metrics = this.engine.step(dt, this.kite, { steer: this.control.tilt }, { left: leftHandle, right: rightHandle });

    // Appliquer les contraintes physiques (sol et limites)
    const constraintStatus = this.engine.getConstraintStatus(this.kite);

    // Analyse de vol (comme V9)
    this.flightAnalyzer.addSample(
      this.kite.position,
      this.engine.getVelocity(),
      metrics.force,
      metrics.aoaDeg,
      dt
    );

    // Mise à jour des overlays de debug
    const aeroData = this.engine.getLastAerodynamics();
    const windVector = this.wind.getVector();
    const apparentWind = windVector.clone().sub(this.engine.getVelocity());

    this.debugOverlay.updateMetrics({
      fps: Math.round(1 / dt),
      altitude: this.kite.position.y,
      windSpeed: windVector.length(),
      apparentWind: apparentWind.length(),
      aoa: metrics.aoaDeg,
      stallFactor: metrics.stallFactor,
      lift: aeroData.lift.length(),
      drag: aeroData.drag.length(),
      tension: metrics.tension,
      force: metrics.force,
      oscillations: this.flightAnalyzer.analyzeOscillations()
    });

    // Debug vectors
    const vel = this.engine.getVelocity();
    const windVec = this.wind.getVector();
    const apparent = windVec.clone().sub(vel);
    const aero = this.engine.getLastAerodynamics();
    // Actualiser les lignes (après intégration pour refléter la position actuelle du kite)
    const leftKite = (this.kite as any).getPoint ? (this.kite as any).getPoint('CTRL_GAUCHE') : undefined;
    const rightKite = (this.kite as any).getPoint ? (this.kite as any).getPoint('CTRL_DROIT') : undefined;
    if (leftKite && rightKite) {
      const lk = (leftKite as THREE.Vector3).clone().applyMatrix4(this.kite.matrixWorld);
      const rk = (rightKite as THREE.Vector3).clone().applyMatrix4(this.kite.matrixWorld);
      this.lines.update(leftBar, lk, rightBar, rk);
    }

    this.leftTension = Math.round(metrics.leftTension || 0);
    this.rightTension = Math.round(metrics.rightTension || 0);

    this.debugVectors.update(this.kite.getWorldPosition(new THREE.Vector3()), {
      velocity: vel,
      apparentWind: apparent,
      globalWind: windVec,
      lift: aero.lift,
      drag: aero.drag,
      aoaDeg: metrics.aoaDeg,
      isStalling: metrics.stallFactor < 0.95,
      leftLine: leftKite ? { from: leftBar, to: (leftKite as THREE.Vector3).clone().applyMatrix4(this.kite.matrixWorld) } : undefined,
      rightLine: rightKite ? { from: rightBar, to: (rightKite as THREE.Vector3).clone().applyMatrix4(this.kite.matrixWorld) } : undefined,
    });

    // Aucun asservissement d'orientation: réaction pure aux forces et contraintes

    // Rendu
    this.rm.render();

    // UI Live: FPS et altitude
    const fps = dt > 0 ? 1 / dt : 60;
    this.fpsSMA = this.fpsSMA * 0.9 + fps * 0.1;
    const altitude = this.kite.position.y;
    (window as any).simulationUI?.updateRealTimeValues?.({ fps: Math.round(this.fpsSMA), altitude, force: metrics.force, tension: metrics.tension, airspeed: Math.round((metrics.airspeed || 0) * 10) / 10, aoa: Math.round((metrics.aoaDeg || 0)), ltension: Math.round(this.leftTension), rtension: Math.round(this.rightTension) });
    this.rafId = requestAnimationFrame(this.loop);
  };

  private wireUI(): void {
    // Boutons
    const playPause = document.getElementById('play-pause') as HTMLButtonElement | null;
    if (playPause && !playPause.dataset.bound) {
      playPause.dataset.bound = '1';
      playPause.addEventListener('click', () => {
        if (this.running) {
          this.pause();
          playPause.textContent = '▶️ Lancer';
          (window as any).simulationUI?.updateRealTimeValues?.({ physicsStatus: 'Pause' });
        } else {
          this.resume();
          playPause.textContent = '⏸️ Pause';
          (window as any).simulationUI?.updateRealTimeValues?.({ physicsStatus: 'Active' });
        }
      });
    }

    const resetBtn = document.getElementById('reset-sim') as HTMLButtonElement | null;
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = '1';
      resetBtn.addEventListener('click', () => this.resetSimulation());
    }

    const debugBtn = document.getElementById('debug-physics') as HTMLButtonElement | null;
    if (debugBtn && !debugBtn.dataset.bound) {
      debugBtn.dataset.bound = '1';
      // Initialiser l'état du bouton
      debugBtn.textContent = this.debugVisible ? '🔍 Debug ON' : '🔍 Debug OFF';
      debugBtn.classList.toggle('active', this.debugVisible);

      debugBtn.addEventListener('click', () => {
        this.debugVisible = !this.debugVisible;
        this.debugVectors.setVisible(this.debugVisible);
        this.debugOverlay.setVisible(this.debugVisible);
        this.vectorLegend.setVisible(this.debugVisible);
        (window as any).simulationUI?.toggleDebugPanel?.(this.debugVisible);
        debugBtn.textContent = this.debugVisible ? '🔍 Debug ON' : '🔍 Debug OFF';
        debugBtn.classList.toggle('active', this.debugVisible);
      });
    }

    // Sliders vent/direction
    const windSpeed = document.getElementById('wind-speed') as HTMLInputElement | null;
    const windDir = document.getElementById('wind-direction') as HTMLInputElement | null;
    if (windSpeed && !windSpeed.dataset.bound) {
      windSpeed.dataset.bound = '1';
      const sync = () => {
        const kmh = parseFloat(windSpeed.value || '0');
        const ms = kmh / 3.6;
        const dir = windDir ? parseFloat(windDir.value || '0') : 0;
        this.wind.set(ms, dir);
        const label = document.getElementById('wind-speed-value');
        if (label) label.textContent = `${kmh} km/h`;
        (window as any).simulationUI?.updateRealTimeValues?.({ windSpeed: Math.round(kmh) });
      };
      windSpeed.addEventListener('input', sync);
      sync();
    }
    if (windDir && !windDir.dataset.bound) {
      windDir.dataset.bound = '1';
      const syncDir = () => {
        const dir = parseFloat(windDir.value || '0');
        const speedInput = document.getElementById('wind-speed') as HTMLInputElement | null;
        const ms = speedInput ? (parseFloat(speedInput.value || '0') / 3.6) : defaultParams.windSpeed;
        this.wind.set(ms, dir);
        const label = document.getElementById('wind-direction-value');
        if (label) label.textContent = `${Math.round(dir)}°`;
      };
      windDir.addEventListener('input', syncDir);
      syncDir();
    }

    // Longueur des lignes
    const lineLen = document.getElementById('line-length') as HTMLInputElement | null;
    if (lineLen && !lineLen.dataset.bound) {
      lineLen.dataset.bound = '1';
      const syncLen = () => {
        const m = Math.max(1, Math.min(100, lineLen.valueAsNumber || this.baseLineLength));
        this.baseLineLength = m;
        this.engine.setLineLength(m); // Mettre à jour le système de contraintes
        const lbl = document.getElementById('line-length-value');
        if (lbl) lbl.textContent = `${m}m`;
        try { localStorage.setItem('v10_line_length', String(m)); } catch { }
      };
      // init from storage
      try {
        const saved = parseFloat(localStorage.getItem('v10_line_length') || '');
        if (!isNaN(saved)) { this.baseLineLength = saved; lineLen.value = String(saved); }
      } catch { }
      lineLen.addEventListener('input', syncLen);
      syncLen();
    }


    const windTurb = document.getElementById('wind-turbulence') as HTMLInputElement | null;
    if (windTurb && !windTurb.dataset.bound) {
      windTurb.dataset.bound = '1';
      const syncTurb = () => {
        const turb = Math.max(0, Math.min(1, (parseFloat(windTurb.value || '0') / 100)));
        this.wind.setTurbulence(turb);
        const label = document.getElementById('wind-turbulence-value');
        if (label) label.textContent = `${Math.round(turb * 100)}%`;
      };
      windTurb.addEventListener('input', syncTurb);
      syncTurb();
    }
  }

  private resetSimulation(): void {
    this.kite.position.set(0, 1.2, 0);
    this.kite.rotation.set(0, 0, 0);
    this.engine.reset();
    this.engine.setLineLength(this.baseLineLength); // Restaurer la longueur des lignes
    (window as any).simulationUI?.updateRealTimeValues?.({ physicsStatus: 'Active' });
  }

  pause(): void { this.running = false; }
  resume(): void {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.loop);
    }
  }

  cleanup(): void {
    this.running = false;
    this.input.dispose();
    this.rm.dispose();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }
}
