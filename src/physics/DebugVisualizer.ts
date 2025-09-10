/**
 * DebugVisualizer.ts - Système de debug visuel avancé
 * Intégration complète du système de debug de SimulationV8
 *
 * AMÉLIORATIONS V8 :
 * - Flèches visuelles pour forces, vitesses, couples
 * - Métriques aérodynamiques en temps réel
 * - Indicateurs de warnings visuels
 * - Trajectoire du kite
 * - Visualisation des contraintes de lignes
 */

import * as THREE from 'three';
import { AerodynamicsCalculator } from './AerodynamicsCalculator';
import { WindSimulator } from './WindSimulator';
import { KiteController, KiteWarnings } from './KiteController';
import { CONFIG, WindParams } from '@core/constants';
import { Kite } from '@objects/Kite';

export class DebugVisualizer {
    private scene: THREE.Scene;
    private debugArrows: THREE.ArrowHelper[] = [];
    private trajectoryPoints: THREE.Vector3[] = [];
    private trajectoryLine: THREE.Line | null = null;
    private forceLabels: Map<string, THREE.Sprite> = new Map();
    private isEnabled: boolean = false;
    private maxTrajectoryPoints: number = 200;

    // Couleurs pour les différentes forces
    private readonly COLORS = {
        velocity: 0x00ff00,      // Vert - vitesse
        lift: 0x0088ff,          // Bleu - portance
        drag: 0xff0000,          // Rouge - traînée
        gravity: 0xffaa00,       // Orange - gravité
        wind: 0x88ff00,          // Vert clair - vent
        lineTension: 0xff0088,   // Rose - tension lignes
        torque: 0x8800ff         // Violet - couple
    };

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.setupTrajectoryLine();
    }

    /**
     * Active/désactive le mode debug
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        if (!enabled) {
            this.clearAllVisuals();
        }
    }

    /**
     * Met à jour toutes les visualisations de debug
     */
    update(
        kite: Kite,
        kiteController: KiteController,
        windSimulator: WindSimulator,
        lineSystem: LineSystemV8,
        controlRotation: number,
        pilotPosition: THREE.Vector3,
        deltaTime: number
    ): void {
        if (!this.isEnabled) return;

        this.clearDebugArrows();

        const kiteState = kiteController.getState();
        const kitePosition = kite.position.clone();

        // Calculer le centre géométrique du kite
        const centerLocal = new THREE.Vector3(0, 0.325, 0); // Entre NEZ et SPINE_BAS
        const centerWorld = centerLocal.clone()
            .applyQuaternion(kite.quaternion)
            .add(kitePosition);

        // 1. Flèche de vitesse
        this.addVelocityArrow(centerWorld, kiteState.velocity);

        // 2. Flèches des forces aérodynamiques
        this.addAerodynamicArrows(centerWorld, kite, windSimulator);

        // 3. Flèche de gravité
        this.addGravityArrow(centerWorld);

        // 4. Flèche du vent
        this.addWindArrow(centerWorld, windSimulator, kitePosition);

        // 5. Flèches de tension des lignes
        this.addLineTensionArrows(kite, lineSystem, controlRotation, pilotPosition);

        // 6. Flèche de couple (si présent)
        this.addTorqueArrow(centerWorld, kiteState.angularVelocity);

        // 7. Mettre à jour la trajectoire
        this.updateTrajectory(kitePosition);

        // 8. Mettre à jour les labels de forces
        this.updateForceLabels(kite, kiteController, windSimulator, lineSystem, controlRotation, pilotPosition);
    }

    /**
     * Ajoute la flèche de vitesse
     */
    private addVelocityArrow(position: THREE.Vector3, velocity: THREE.Vector3): void {
        if (velocity.length() > 0.1) {
            const velocityArrow = new THREE.ArrowHelper(
                velocity.clone().normalize(),
                position,
                Math.min(velocity.length() * 0.5, 3), // Limiter la longueur
                this.COLORS.velocity,
                0.3,
                0.2
            );
            this.scene.add(velocityArrow);
            this.debugArrows.push(velocityArrow);
        }
    }

    /**
     * Ajoute les flèches des forces aérodynamiques
     */
    private addAerodynamicArrows(position: THREE.Vector3, kite: Kite, windSimulator: WindSimulator): void {
        const apparentWind = windSimulator.getApparentWind(
            new THREE.Vector3(), // vélocité temporaire pour le calcul
            0
        );

        const { lift, drag } = AerodynamicsCalculator.calculateForces(
            apparentWind,
            kite.quaternion,
            kite
        );

        // Flèche de portance
        if (lift.length() > 0.01) {
            const liftArrow = new THREE.ArrowHelper(
                lift.clone().normalize(),
                position,
                Math.min(Math.sqrt(lift.length()) * 0.3, 2),
                this.COLORS.lift,
                0.2,
                0.15
            );
            this.scene.add(liftArrow);
            this.debugArrows.push(liftArrow);
        }

        // Flèche de traînée
        if (drag.length() > 0.01) {
            const dragArrow = new THREE.ArrowHelper(
                drag.clone().normalize(),
                position,
                Math.min(Math.sqrt(drag.length()) * 0.3, 2),
                this.COLORS.drag,
                0.2,
                0.15
            );
            this.scene.add(dragArrow);
            this.debugArrows.push(dragArrow);
        }
    }

    /**
     * Ajoute la flèche de gravité
     */
    private addGravityArrow(position: THREE.Vector3): void {
        const gravity = new THREE.Vector3(0, -CONFIG.physics.gravity * CONFIG.kite.mass, 0);
        const gravityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            position,
            Math.min(gravity.length() * 0.1, 1),
            this.COLORS.gravity,
            0.15,
            0.1
        );
        this.scene.add(gravityArrow);
        this.debugArrows.push(gravityArrow);
    }

    /**
     * Ajoute la flèche du vent
     */
    private addWindArrow(position: THREE.Vector3, windSimulator: WindSimulator, kitePosition: THREE.Vector3): void {
        const wind = windSimulator.getWindAt(kitePosition);
        if (wind.length() > 0.1) {
            const windArrow = new THREE.ArrowHelper(
                wind.clone().normalize(),
                position.clone().add(new THREE.Vector3(0, 1, 0)), // Décaler vers le haut
                Math.min(wind.length() * 0.2, 2),
                this.COLORS.wind,
                0.2,
                0.15
            );
            this.scene.add(windArrow);
            this.debugArrows.push(windArrow);
        }
    }

    /**
     * Ajoute les flèches de tension des lignes
     */
    private addLineTensionArrows(
        kite: Kite,
        lineSystem: LineSystemV8,
        controlRotation: number,
        pilotPosition: THREE.Vector3
    ): void {
        const metrics = lineSystem.getLineMetrics(kite, controlRotation, pilotPosition);

        // Points d'attache sur le kite
        const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = kite.getPoint('CTRL_DROIT');

        if (ctrlLeft && ctrlRight) {
            const leftWorld = ctrlLeft.clone().applyQuaternion(kite.quaternion).add(kite.position);
            const rightWorld = ctrlRight.clone().applyQuaternion(kite.quaternion).add(kite.position);

            // Flèche tension gauche
            if (metrics.leftTension > 0) {
                const leftDir = pilotPosition.clone().sub(leftWorld).normalize();
                const leftArrow = new THREE.ArrowHelper(
                    leftDir,
                    leftWorld,
                    Math.min(metrics.leftTension * 0.01, 1),
                    this.COLORS.lineTension,
                    0.1,
                    0.08
                );
                this.scene.add(leftArrow);
                this.debugArrows.push(leftArrow);
            }

            // Flèche tension droite
            if (metrics.rightTension > 0) {
                const rightDir = pilotPosition.clone().sub(rightWorld).normalize();
                const rightArrow = new THREE.ArrowHelper(
                    rightDir,
                    rightWorld,
                    Math.min(metrics.rightTension * 0.01, 1),
                    this.COLORS.lineTension,
                    0.1,
                    0.08
                );
                this.scene.add(rightArrow);
                this.debugArrows.push(rightArrow);
            }
        }
    }

    /**
     * Ajoute la flèche de couple (vitesse angulaire)
     */
    private addTorqueArrow(position: THREE.Vector3, angularVelocity: THREE.Vector3): void {
        if (angularVelocity.length() > 0.01) {
            const torqueArrow = new THREE.ArrowHelper(
                angularVelocity.clone().normalize(),
                position.clone().add(new THREE.Vector3(0, -1, 0)), // Décaler vers le bas
                Math.min(angularVelocity.length() * 2, 1.5),
                this.COLORS.torque,
                0.15,
                0.12
            );
            this.scene.add(torqueArrow);
            this.debugArrows.push(torqueArrow);
        }
    }

    /**
     * Met à jour la trajectoire du kite
     */
    private updateTrajectory(position: THREE.Vector3): void {
        this.trajectoryPoints.push(position.clone());

        // Limiter le nombre de points
        if (this.trajectoryPoints.length > this.maxTrajectoryPoints) {
            this.trajectoryPoints.shift();
        }

        // Mettre à jour la ligne de trajectoire
        if (this.trajectoryLine) {
            this.scene.remove(this.trajectoryLine);
        }

        if (this.trajectoryPoints.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(this.trajectoryPoints);
            const material = new THREE.LineBasicMaterial({
                color: 0x444444,
                transparent: true,
                opacity: 0.6
            });
            this.trajectoryLine = new THREE.Line(geometry, material);
            this.scene.add(this.trajectoryLine);
        }
    }

    /**
     * Met à jour les labels de forces
     */
    private updateForceLabels(
        kite: Kite,
        kiteController: KiteController,
        windSimulator: WindSimulator,
        lineSystem: LineSystemV8,
        controlRotation: number,
        pilotPosition: THREE.Vector3
    ): void {
        // Supprimer les anciens labels
        this.forceLabels.forEach(label => this.scene.remove(label));
        this.forceLabels.clear();

        const kiteState = kiteController.getState();
        const centerLocal = new THREE.Vector3(0, 0.325, 0);
        const centerWorld = centerLocal.clone()
            .applyQuaternion(kite.quaternion)
            .add(kite.position);

        // Créer les labels avec les valeurs
        const labels = [
            {
                text: `V: ${kiteState.velocity.length().toFixed(1)}m/s`,
                position: centerWorld.clone().add(new THREE.Vector3(0, 2, 0)),
                color: this.COLORS.velocity
            },
            {
                text: `A: ${kiteController.getWarnings().accelValue.toFixed(1)}m/s²`,
                position: centerWorld.clone().add(new THREE.Vector3(0, 1.8, 0)),
                color: kiteController.getWarnings().accel ? 0xff0000 : 0x00ff00
            }
        ];

        labels.forEach(label => {
            const sprite = this.createTextSprite(label.text, label.color);
            sprite.position.copy(label.position);
            this.scene.add(sprite);
            this.forceLabels.set(label.text, sprite);
        });
    }

    /**
     * Crée un sprite de texte pour les labels
     */
    private createTextSprite(text: string, color: number): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        const fontSize = 32;

        context.font = `Bold ${fontSize}px Arial`;
        const metrics = context.measureText(text);
        canvas.width = metrics.width + 20;
        canvas.height = fontSize + 10;

        // Fond semi-transparent
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Bordure
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.lineWidth = 2;
        context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

        // Texte
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = `Bold ${fontSize}px Arial`;
        context.fillText(text, 10, fontSize);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);

        sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);
        return sprite;
    }

    /**
     * Configure la ligne de trajectoire
     */
    private setupTrajectoryLine(): void {
        // La trajectoire sera créée dynamiquement
    }

    /**
     * Efface toutes les flèches de debug
     */
    private clearDebugArrows(): void {
        this.debugArrows.forEach(arrow => {
            this.scene.remove(arrow);
        });
        this.debugArrows = [];
    }

    /**
     * Efface toutes les visualisations
     */
    private clearAllVisuals(): void {
        this.clearDebugArrows();

        this.forceLabels.forEach(label => this.scene.remove(label));
        this.forceLabels.clear();

        if (this.trajectoryLine) {
            this.scene.remove(this.trajectoryLine);
            this.trajectoryLine = null;
        }

        this.trajectoryPoints = [];
    }

    /**
     * Obtient les métriques de debug formatées
     */
    getDebugMetrics(
        kite: Kite,
        kiteController: KiteController,
        windSimulator: WindSimulator,
        lineSystem: LineSystemV8,
        controlRotation: number,
        pilotPosition: THREE.Vector3
    ): {
        kitePosition: string;
        kiteVelocity: string;
        windSpeed: string;
        warnings: KiteWarnings;
        lineMetrics: any;
        aeroMetrics: any;
    } {
        const kiteState = kiteController.getState();
        const windParams = windSimulator.getParams();
        const warnings = kiteController.getWarnings();
        const lineMetrics = lineSystem.getLineMetrics(kite, controlRotation, pilotPosition);

        const apparentWind = windSimulator.getApparentWind(kiteState.velocity, 0);
        const aeroMetrics = AerodynamicsCalculator.computeMetrics(apparentWind, kite.quaternion);

        return {
            kitePosition: `[${kite.position.x.toFixed(1)}, ${kite.position.y.toFixed(1)}, ${kite.position.z.toFixed(1)}]`,
            kiteVelocity: `${kiteState.velocity.length().toFixed(1)} m/s`,
            windSpeed: `${windParams.speed} km/h (${(windParams.speed / 3.6).toFixed(1)} m/s)`,
            warnings,
            lineMetrics,
            aeroMetrics
        };
    }

    /**
     * Reset les visualisations
     */
    reset(): void {
        this.clearAllVisuals();
        this.trajectoryPoints = [];
    }
}
