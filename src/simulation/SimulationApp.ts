/**
 * SimulationApp.ts - Application principale avec intégration V8 complète
 * Architecture modulaire avec séparation des responsabilités
 * Physique émergente pure + améliorations V8
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Kite } from '@objects/Kite';
import { PhysicsEngine } from './physics/PhysicsEngine';
import { DebugVisualizer } from './physics/DebugVisualizer';
import { CONFIG, PhysicsConstants, WindParams, KiteState, HandlePositions } from './core/constants';
import { CompactUI } from './ui/CompactUI';
import { WindSimulator } from './physics/WindSimulator';
import { AerodynamicsCalculator } from './physics/AerodynamicsCalculator';
import { LineSystem } from './physics/lines';

// ==============================================================================
// INTÉGRATION COMPLÈTE V8 - ARCHITECTURE MODULAIRE
// ==============================================================================

/**
 * ControlBarManager V8 - Gestion centralisée de la barre de contrôle
 * Méthode unique centralisée pour calculer les positions des poignées
 */
class ControlBarManager {
    private position: THREE.Vector3;
    private rotation: number = 0;

    constructor(position: THREE.Vector3 = CONFIG.controlBar.position) {
        this.position = position.clone();
    }

    /**
     * Calcule le quaternion de rotation de la barre
     */
    private computeRotationQuaternion(toKiteVector: THREE.Vector3): THREE.Quaternion {
        const barDirection = new THREE.Vector3(1, 0, 0);
        const rotationAxis = new THREE.Vector3().crossVectors(barDirection, toKiteVector).normalize();

        if (rotationAxis.length() < PhysicsConstants.CONTROL_DEADZONE) {
            rotationAxis.set(0, 1, 0);
        }

        return new THREE.Quaternion().setFromAxisAngle(rotationAxis, this.rotation);
    }

    /**
     * Obtient les positions des poignées (méthode unique centralisée)
     */
    getHandlePositions(kitePosition: THREE.Vector3): HandlePositions {
        const toKiteVector = kitePosition.clone().sub(this.position).normalize();
        const rotationQuaternion = this.computeRotationQuaternion(toKiteVector);

        const halfWidth = CONFIG.controlBar.width / 2;
        const handleLeftLocal = new THREE.Vector3(-halfWidth, 0, 0);
        const handleRightLocal = new THREE.Vector3(halfWidth, 0, 0);

        handleLeftLocal.applyQuaternion(rotationQuaternion);
        handleRightLocal.applyQuaternion(rotationQuaternion);

        return {
            left: handleLeftLocal.clone().add(this.position),
            right: handleRightLocal.clone().add(this.position)
        };
    }

    /**
     * Met à jour la rotation de la barre
     */
    setRotation(rotation: number): void {
        this.rotation = rotation;
    }

    getRotation(): number {
        return this.rotation;
    }

    getPosition(): THREE.Vector3 {
        return this.position.clone();
    }

    /**
     * Met à jour l'objet 3D visuel de la barre
     */
    updateVisual(bar: THREE.Group, kite: Kite): void {
        if (!bar) return;

        const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = kite.getPoint('CTRL_DROIT');

        if (ctrlLeft && ctrlRight) {
            const kiteLeftWorld = ctrlLeft.clone();
            const kiteRightWorld = ctrlRight.clone();
            kite.localToWorld(kiteLeftWorld);
            kite.localToWorld(kiteRightWorld);

            const centerKite = kiteLeftWorld.clone().add(kiteRightWorld).multiplyScalar(0.5);
            const toKiteVector = centerKite.clone().sub(this.position).normalize();

            bar.quaternion.copy(this.computeRotationQuaternion(toKiteVector));
        }
    }
}

/**
 * InputHandler V8 - Gestion des entrées utilisateur
 * Séparation claire des responsabilités d'entrée
 */
class InputHandler {
    private currentRotation: number = 0;
    private keysPressed = new Set<string>();
    private rotationSpeed: number = 2.5;
    private returnSpeed: number = 3.0;
    private maxRotation: number = Math.PI / 6;

    constructor() {
        this.setupKeyboardControls();
    }

    private setupKeyboardControls(): void {
        window.addEventListener('keydown', (event) => {
            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
            this.keysPressed.add(key);

            if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'q' || key === 'a' || key === 'd') {
                event.preventDefault();
            }
        });

        window.addEventListener('keyup', (event) => {
            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
            this.keysPressed.delete(key);

            if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'q' || key === 'a' || key === 'd') {
                event.preventDefault();
            }
        });
    }

    update(deltaTime: number): void {
        const left = this.keysPressed.has('ArrowLeft') || this.keysPressed.has('q') || this.keysPressed.has('a');
        const right = this.keysPressed.has('ArrowRight') || this.keysPressed.has('d');
        const dir = (left ? 1 : 0) + (right ? -1 : 0);

        if (dir !== 0) {
            this.currentRotation += dir * this.rotationSpeed * deltaTime;
        } else {
            if (Math.abs(this.currentRotation) > PhysicsConstants.EPSILON) {
                const sign = Math.sign(this.currentRotation);
                this.currentRotation -= sign * this.returnSpeed * deltaTime;
                if (Math.sign(this.currentRotation) !== sign) {
                    this.currentRotation = 0;
                }
            } else {
                this.currentRotation = 0;
            }
        }

        this.currentRotation = Math.max(-this.maxRotation, Math.min(this.maxRotation, this.currentRotation));
    }

    getTargetBarRotation(): number {
        return this.currentRotation;
    }
}

export class SimulationApp {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private controls!: OrbitControls;
    private kite!: Kite;
    private controlBar!: THREE.Group;

    // Composants V8 intégrés
    private windSimulator!: WindSimulator;
    private lineSystem!: LineSystem;
    private controlBarManager!: ControlBarManager;
    private inputHandler!: InputHandler;
    private debugVisualizer!: DebugVisualizer;

    private clock!: THREE.Clock;
    private kiteState!: KiteState;
    private ui!: CompactUI;

    // État de simulation
    private isPlaying = true;
    private debugMode = true; // Activé par défaut
    private frameCount = 0;

    // Lissage temporel des forces (amélioration V8)
    private smoothedForce = new THREE.Vector3();
    private smoothedTorque = new THREE.Vector3();
    private readonly FORCE_SMOOTHING = 0.15; // Lissage léger (85% de la nouvelle force appliquée)

    // Debug visuel des forces
    private debugArrows: THREE.ArrowHelper[] = [];
    private debugLegend: HTMLElement | null = null;

    // Validation et sécurité physique (amélioration V8)
    private hasExcessiveAccel = false;
    private hasExcessiveVelocity = false;
    private hasExcessiveAngular = false;
    private lastAccelMagnitude = 0;
    private lastVelocityMagnitude = 0;
    private previousPosition = new THREE.Vector3();

    // Propriétés pour compatibilité
    private leftLine: THREE.Line | null = null;
    private rightLine: THREE.Line | null = null;
    private targetBarRotation = 0;
    private currentBarRotation = 0;

    constructor(container?: HTMLElement) {
        const targetContainer = container || document.getElementById('app');
        if (!targetContainer) {
            throw new Error('Container non trouvé');
        }

        console.log('🚀 Démarrage Simulation V8-Style');
        this.init(targetContainer);
        this.setupControls();
        this.animate();
    }

    private init(container: HTMLElement): void {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.rendering.backgroundColor);
        this.scene.fog = new THREE.Fog(0x87CEEB, CONFIG.rendering.fogStart, CONFIG.rendering.fogEnd);

        // Caméra
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(3, 5, 12);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: CONFIG.rendering.antialias });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Contrôles
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 3, -5);

        // Environnement
        this.setupEnvironment();

        // Cerf-volant avec Kite.ts
        this.setupKite();

        // Barre de contrôle
        this.setupControlBar();

        // Lignes
        this.createControlLines();

        // Physique
        this.windSimulator = new WindSimulator();
        this.lineSystem = new LineSystem();
        this.scene.add(this.lineSystem.object3d); // Ajouter le système de lignes à la scène
        this.clock = new THREE.Clock();

        // Composants V8 intégrés 
        this.controlBarManager = new ControlBarManager();
        this.inputHandler = new InputHandler();
        this.debugVisualizer = new DebugVisualizer(this.scene);

        // État initial du kite
        this.kiteState = {
            position: this.kite.position.clone(),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            orientation: this.kite.quaternion.clone()
        };

        // Stocker l'état dans userData pour compatibilité PBD
        this.kite.userData.velocity = this.kiteState.velocity;
        this.kite.userData.angularVelocity = this.kiteState.angularVelocity;

        // Initialiser position précédente pour validation
        this.previousPosition.copy(this.kite.position);

        // Interface utilisateur compacte
        this.ui = new CompactUI(this);

        // Créer la légende de debug
        this.createDebugLegend();

        // Redimensionnement
        window.addEventListener('resize', () => this.onResize(container));
    }

    private setupEnvironment(): void {
        // Lumières
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 50, 50);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -20;
        sunLight.shadow.camera.right = 20;
        sunLight.shadow.camera.top = 20;
        sunLight.shadow.camera.bottom = -20;
        sunLight.shadow.mapSize.setScalar(CONFIG.rendering.shadowMapSize);
        this.scene.add(sunLight);

        // Sol
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7CFC00 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grille
        const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
        this.scene.add(gridHelper);
    }

    private setupKite(): void {
        // Utiliser Kite.ts au lieu d'un simple cube
        this.kite = new Kite({
            sailColor: '#ff3333',
            frameColor: '#2a2a2a'
        });

        // Position initiale réaliste
        const pilotPos = CONFIG.controlBar.position;
        const initialDistance = CONFIG.lines.defaultLength * 0.95;
        const kiteY = 7;
        const dy = kiteY - pilotPos.y;
        const horizontal = Math.max(0.1, Math.sqrt(Math.max(0, initialDistance * initialDistance - dy * dy)));

        this.kite.position.set(pilotPos.x, kiteY, pilotPos.z - horizontal);
        this.kite.castShadow = true;

        this.scene.add(this.kite);
    }

    private setupControlBar(): void {
        this.controlBar = new THREE.Group();
        this.controlBar.position.copy(CONFIG.controlBar.position);

        // Barre
        const barGeometry = new THREE.CylinderGeometry(0.02, 0.02, CONFIG.controlBar.width);
        const barMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const bar = new THREE.Mesh(barGeometry, barMaterial);
        bar.rotation.z = Math.PI / 2;
        this.controlBar.add(bar);

        // Poignées
        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.15);
        const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

        const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        leftHandle.position.set(-CONFIG.controlBar.width / 2, 0, 0);
        this.controlBar.add(leftHandle);

        const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        rightHandle.position.set(CONFIG.controlBar.width / 2, 0, 0);
        this.controlBar.add(rightHandle);

        // Pilote
        const pilotGeometry = new THREE.BoxGeometry(0.4, 1.6, 0.3);
        const pilotMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
        const pilot = new THREE.Mesh(pilotGeometry, pilotMaterial);
        pilot.position.set(0, 0.8, 8.5);
        pilot.castShadow = true;

        this.scene.add(this.controlBar);
        this.scene.add(pilot);
    }

    private createControlLines(): void {
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });

        this.leftLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial);
        this.rightLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial);

        this.scene.add(this.leftLine);
        this.scene.add(this.rightLine);
    }

    private updateControlLines(): void {
        if (!this.leftLine || !this.rightLine) return;

        const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = this.kite.getPoint('CTRL_DROIT');

        if (!ctrlLeft || !ctrlRight) return;

        const kiteLeftWorld = ctrlLeft.clone();
        const kiteRightWorld = ctrlRight.clone();
        this.kite.localToWorld(kiteLeftWorld);
        this.kite.localToWorld(kiteRightWorld);

        const handles = this.getHandlePositions();

        this.leftLine.geometry.setFromPoints([handles.left, kiteLeftWorld]);
        this.rightLine.geometry.setFromPoints([handles.right, kiteRightWorld]);
    }

    private getHandlePositions(): HandlePositions {
        const barHalfWidth = CONFIG.controlBar.width * 0.5;
        const barRight = new THREE.Vector3(1, 0, 0);

        const leftOffset = barRight.clone().multiplyScalar(-barHalfWidth)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentBarRotation);
        const rightOffset = barRight.clone().multiplyScalar(barHalfWidth)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentBarRotation);

        return {
            left: this.controlBar.position.clone().add(leftOffset),
            right: this.controlBar.position.clone().add(rightOffset)
        };
    }

    private setupControls(): void {
        // Contrôles clavier
        const keysPressed = new Set<string>();

        window.addEventListener('keydown', (event) => {
            keysPressed.add(event.key);
        });

        window.addEventListener('keyup', (event) => {
            keysPressed.delete(event.key);
        });

        // Mise à jour des contrôles
        const updateControls = (deltaTime: number) => {
            const left = keysPressed.has('ArrowLeft') || keysPressed.has('q') || keysPressed.has('a');
            const right = keysPressed.has('ArrowRight') || keysPressed.has('d');
            const dir = (left ? 1 : 0) + (right ? -1 : 0);

            const maxRotation = Math.PI / 6;
            const rotationSpeed = 2.5;
            const returnSpeed = 3.0;

            if (dir !== 0) {
                this.targetBarRotation += dir * rotationSpeed * deltaTime;
            } else {
                if (Math.abs(this.targetBarRotation) > PhysicsConstants.EPSILON) {
                    const sign = Math.sign(this.targetBarRotation);
                    this.targetBarRotation -= sign * returnSpeed * deltaTime;
                    if (Math.sign(this.targetBarRotation) !== sign) {
                        this.targetBarRotation = 0;
                    }
                }
            }

            this.targetBarRotation = Math.max(-maxRotation, Math.min(maxRotation, this.targetBarRotation));
        };

        this.updateControls = updateControls;
    }

    private updateControls!: (deltaTime: number) => void;

    private updatePhysics(deltaTime: number): void {
        if (!this.isPlaying) return;

        // Limiter le pas de temps
        deltaTime = Math.min(deltaTime, CONFIG.physics.deltaTimeMax);

        // Lisser la rotation de la barre
        this.currentBarRotation += (this.targetBarRotation - this.currentBarRotation) * 0.1;

        // Vent apparent
        const apparentWind = this.windSimulator.getApparentWind(this.kiteState.velocity, deltaTime);

        // Forces aérodynamiques (V8 style - physique émergente)
        const { lift, drag, torque } = AerodynamicsCalculator.calculateForces(
            apparentWind,
            this.kite.quaternion,
            this.kite
        );

        // Gravité
        const gravity = new THREE.Vector3(0, -CONFIG.kite.mass * CONFIG.physics.gravity, 0);

        // PHYSIQUE GÉOMÉTRIQUE : Tensions basées sur distances réelles (SimulationV8 style)
        // Rotation barre → nouvelles positions poignées → nouvelles distances → nouvelles forces
        const { leftForce, rightForce, torque: lineTorque } = this.lineSystem.calculateLineTensions(
            this.kite,
            this.currentBarRotation,
            this.controlBar.position
        );

        // Force totale émergente : somme vectorielle de toutes les forces physiques
        const totalForce = new THREE.Vector3()
            .add(lift)          // Forces aérodynamiques (vent sur surfaces)
            .add(drag)          // (Vide - traînée intégrée dans lift)
            .add(gravity)       // Poids constant vers le bas
            .add(leftForce)     // Force ligne gauche (si distance > longueur max)
            .add(rightForce);   // Force ligne droite (si distance > longueur max)

        // Couple total émergent : aéro (asymétrie vent) + lignes (asymétrie distances)
        const totalTorque = torque.clone().add(lineTorque);

        // LISSAGE TEMPOREL DES FORCES (Style SimulationV8)
        // Appliquer le lissage temporel (filtre passe-bas)
        // Cela simule l'inertie du tissu et la viscosité de l'air
        this.smoothedForce.lerp(totalForce, 1 - this.FORCE_SMOOTHING);
        this.smoothedTorque.lerp(totalTorque, 1 - this.FORCE_SMOOTHING);

        // VALIDATION ET INTÉGRATION SÉCURISÉE (Style SimulationV8)
        // Valider et limiter les forces avant intégration
        const validatedForce = this.validateForces(this.smoothedForce.clone());
        const validatedTorque = this.validateTorque(this.smoothedTorque.clone());

        // Intégration physique avec forces validées (2ème loi de Newton : F = ma)
        const acceleration = validatedForce.divideScalar(CONFIG.kite.mass);
        this.lastAccelMagnitude = acceleration.length();

        // Sécurité : limiter pour éviter l'explosion numérique
        if (acceleration.length() > PhysicsConstants.MAX_ACCELERATION) {
            this.hasExcessiveAccel = true;
            acceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ACCELERATION);
        } else {
            this.hasExcessiveAccel = false;
        }

        this.kiteState.velocity.add(acceleration.multiplyScalar(deltaTime));
        this.kiteState.velocity.multiplyScalar(CONFIG.physics.linearDamping);
        this.lastVelocityMagnitude = this.kiteState.velocity.length();

        // Garde-fou vitesse max (réalisme physique)
        if (this.kiteState.velocity.length() > PhysicsConstants.MAX_VELOCITY) {
            this.hasExcessiveVelocity = true;
            this.kiteState.velocity.normalize().multiplyScalar(PhysicsConstants.MAX_VELOCITY);
        } else {
            this.hasExcessiveVelocity = false;
        }

        // Mise à jour position
        this.kite.position.add(this.kiteState.velocity.clone().multiplyScalar(deltaTime));

        // *** CONTRAINTES GÉOMÉTRIQUES PURES (distance seulement) ***
        this.lineSystem.updateAndEnforceConstraints(
            this.kite,
            this.currentBarRotation,
            this.controlBar.position
        );

        // Empêcher de passer sous le sol
        if (this.kite.position.y < CONFIG.kite.minHeight) {
            this.kite.position.y = CONFIG.kite.minHeight;
            if (this.kiteState.velocity.y < 0) {
                this.kiteState.velocity.y = 0;
            }
        }

        // Rotation émergente avec validation (couple lissé = aéro + lignes)
        const angularAcceleration = validatedTorque.clone().divideScalar(CONFIG.kite.inertia);

        // Limiter l'accélération angulaire
        if (angularAcceleration.length() > PhysicsConstants.MAX_ANGULAR_ACCELERATION) {
            angularAcceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_ACCELERATION);
        }

        this.kiteState.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
        this.kiteState.angularVelocity.multiplyScalar(CONFIG.physics.angularDamping);

        // Limiter la vitesse angulaire
        if (this.kiteState.angularVelocity.length() > PhysicsConstants.MAX_ANGULAR_VELOCITY) {
            this.hasExcessiveAngular = true;
            this.kiteState.angularVelocity.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_VELOCITY);
        } else {
            this.hasExcessiveAngular = false;
        }

        if (this.kiteState.angularVelocity.length() > PhysicsConstants.EPSILON) {
            const deltaRotation = new THREE.Quaternion();
            const axis = this.kiteState.angularVelocity.clone().normalize();
            const angle = this.kiteState.angularVelocity.length() * deltaTime;
            deltaRotation.setFromAxisAngle(axis, angle);

            this.kite.quaternion.multiply(deltaRotation);
            this.kite.quaternion.normalize();
        }

        // VALIDATION POSITION FINALE (évite les NaN)
        this.validatePosition();

        // Mise à jour position précédente pour prochaine frame
        this.previousPosition.copy(this.kite.position);
    }

    /**
     * Valide et limite les forces (style SimulationV8)
     */
    private validateForces(forces: THREE.Vector3): THREE.Vector3 {
        if (!forces || forces.length() > PhysicsConstants.MAX_FORCE || isNaN(forces.length())) {
            console.error(`⚠️ Forces invalides: ${forces ? forces.toArray() : 'undefined'}`);
            return new THREE.Vector3();
        }
        return forces;
    }

    /**
     * Valide le couple (style SimulationV8)
     */
    private validateTorque(torque: THREE.Vector3): THREE.Vector3 {
        if (!torque || isNaN(torque.length())) {
            console.error(`⚠️ Couple invalide: ${torque ? torque.toArray() : 'undefined'}`);
            return new THREE.Vector3();
        }
        return torque;
    }

    /**
     * Valide la position finale (style SimulationV8)
     */
    private validatePosition(): void {
        if (isNaN(this.kite.position.x) || isNaN(this.kite.position.y) || isNaN(this.kite.position.z)) {
            console.error(`⚠️ Position NaN détectée! Reset à la position précédente`);
            this.kite.position.copy(this.previousPosition);
            this.kiteState.velocity.set(0, 0, 0);
            this.kiteState.angularVelocity.set(0, 0, 0);
        }
    }

    /**
     * Retourne les états de warning pour l'affichage (style SimulationV8)
     */
    public getWarnings(): {
        accel: boolean;
        velocity: boolean;
        angular: boolean;
        accelValue: number;
        velocityValue: number;
    } {
        return {
            accel: this.hasExcessiveAccel,
            velocity: this.hasExcessiveVelocity,
            angular: this.hasExcessiveAngular,
            accelValue: this.lastAccelMagnitude,
            velocityValue: this.lastVelocityMagnitude
        };
    }

    /**
     * Met à jour l'interface avec les métriques avancées (style SimulationV8)
     */
    private updateUIWithV8Metrics(): void {
        // Calculer les métriques de vol avancées
        const kitePos = this.kite.position.clone();
        const pilotPos = this.controlBar.position.clone();
        const distance = kitePos.distanceTo(pilotPos);
        const windSim = this.windSimulator;
        const wind = windSim.getWindAt(kitePos);
        const apparent = wind.clone().sub(this.kiteState.velocity);

        // Calculer les métriques aérodynamiques
        const aeroMetrics = AerodynamicsCalculator.computeMetrics ?
            AerodynamicsCalculator.computeMetrics(apparent, this.kite.quaternion) :
            { apparentSpeed: apparent.length(), liftMag: 0, dragMag: 0, lOverD: 0, aoaDeg: 0 };

        // Calculer l'asymétrie des forces
        const lineTensions = this.lineSystem.getLineTensions();

        // Calculer la position dans la fenêtre de vol
        const deltaX = kitePos.x - pilotPos.x;
        const deltaY = kitePos.y - pilotPos.y;
        const deltaZ = kitePos.z - pilotPos.z;

        // Angles de fenêtre de vol
        const angleX = Math.atan2(deltaX, -deltaZ) * 180 / Math.PI;
        const angleY = Math.atan2(deltaY, Math.sqrt(deltaX * deltaX + deltaZ * deltaZ)) * 180 / Math.PI;

        // Rotation de la barre
        const barRotationDeg = Math.round(this.currentBarRotation * 180 / Math.PI);
        const barDirection = this.currentBarRotation > 0.01 ? '←' : (this.currentBarRotation < -0.01 ? '→' : '─');

        // Warnings physiques
        const warnings = this.getWarnings();
        let warningText = '';
        if (warnings.accel) warningText += ` ⚠️A:${warnings.accelValue.toFixed(0)}`;
        if (warnings.velocity) warningText += ` ⚠️V:${warnings.velocityValue.toFixed(0)}`;
        if (warnings.angular) warningText += ' ⚠️Ω';

        // Mise à jour UI standard
        this.ui.updateUI(
            this.frameCount,
            this.kite.position,
            this.kiteState.velocity.length(),
            this.isPlaying,
            this.debugMode
        );

        // Affichage métriques avancées dans console si debug
        if (this.debugMode) {
            const metricsInfo = {
                frame: this.frameCount,
                window: `X:${angleX.toFixed(0)}° Y:${angleY.toFixed(0)}°`,
                position: `[${kitePos.x.toFixed(1)}, ${kitePos.y.toFixed(1)}, ${kitePos.z.toFixed(1)}]`,
                velocity: `${this.kiteState.velocity.length().toFixed(1)}m/s`,
                wind: `${wind.length().toFixed(1)}m/s (${(wind.length() * 3.6).toFixed(0)}km/h)`,
                apparent: `${aeroMetrics.apparentSpeed.toFixed(1)}m/s`,
                aoa: `${aeroMetrics.aoaDeg.toFixed(0)}°`,
                bar: `${barDirection}${Math.abs(barRotationDeg)}°`,
                lines: `L:${lineTensions.leftDistance.toFixed(1)}m D:${lineTensions.rightDistance.toFixed(1)}m`,
                tensions: `G:${lineTensions.leftTaut ? 'T' : 'S'} D:${lineTensions.rightTaut ? 'T' : 'S'}`,
                warnings: warningText
            };

            // Pas de spam - seulement toutes les 60 frames en mode debug (réduction spam)
            if (this.frameCount % 60 === 0) {
                console.log('🔍 Métriques V8:', metricsInfo);
            }
        }
    }

    /**
     * Log détaillé des métriques (style SimulationV8)
     */
    private logDetailedMetrics(): void {
        const kitePos = this.kite.position;
        const pilotPos = this.controlBar.position;
        const distance = kitePos.distanceTo(pilotPos);
        const currentLineLength = this.lineSystem.getLineLength();

        // Distance ratio pour sur-tension (seuils ajustés pour réalisme)
        const distanceRatio = distance / currentLineLength;
        const isNearOverTension = distanceRatio > 0.98;   // 98% = proche sur-tension
        const isOverTensioned = distanceRatio > 1.05;     // 105% = sur-tension confirmée
        const tensionWarning = isOverTensioned ? '🚨 SUR-TENSION!' : (isNearOverTension ? '⚠️ Proche sur-tension' : '');

        // Asymétrie des forces
        const lineTensions = this.lineSystem.getLineTensions();
        const leftTension = lineTensions.leftTension;
        const rightTension = lineTensions.rightTension;
        const asymmetry = ((leftTension - rightTension) / Math.max(leftTension + rightTension, 1)) * 100;

        const warnings = this.getWarnings();

        const logMessage =
            `[V8 Frame ${this.frameCount}] ` +
            `Pos: [${kitePos.x.toFixed(1)}, ${kitePos.y.toFixed(1)}, ${kitePos.z.toFixed(1)}] ` +
            `| Vel: ${this.kiteState.velocity.length().toFixed(1)}m/s ` +
            `| Dist: ${distance.toFixed(1)}/${currentLineLength}m (${(distanceRatio * 100).toFixed(0)}%) ` +
            `| Asymétrie: ${asymmetry > 0 ? '+' : ''}${asymmetry.toFixed(0)}% ` +
            `| Accel: ${this.lastAccelMagnitude.toFixed(1)} ` +
            (warnings.accel || warnings.velocity || warnings.angular ? '⚠️ WARNINGS' : '✅') +
            (tensionWarning ? ` ${tensionWarning}` : '');

        console.log(`📊 ${logMessage}`);
    }

    /**
     * Met à jour les visualisations de debug des forces (style SimulationV8)
     */
    private updateDebugVisuals(): void {
        // Nettoyer les flèches précédentes
        this.clearDebugArrows();

        // Calculer le centre géométrique du kite
        const centerLocal = new THREE.Vector3(0, 0.325, 0); // Entre NEZ et SPINE_BAS
        const centerWorld = centerLocal.clone()
            .applyQuaternion(this.kite.quaternion)
            .add(this.kite.position);

        // 1. Flèche de vitesse (VERT)
        if (this.kiteState.velocity.length() > 0.1) {
            const velocityArrow = new THREE.ArrowHelper(
                this.kiteState.velocity.clone().normalize(),
                centerWorld,
                Math.min(this.kiteState.velocity.length() * 1.0, 3), // Échelle visible
                0x00ff00, // Vert
                0.4,
                0.3
            );
            this.scene.add(velocityArrow);
            this.debugArrows.push(velocityArrow);
        }

        // 2. Flèche du vent apparent (VERT CLAIR)
        const apparentWind = this.windSimulator.getApparentWind(this.kiteState.velocity, 0);
        if (apparentWind.length() > 0.1) {
            const windArrow = new THREE.ArrowHelper(
                apparentWind.clone().normalize(),
                centerWorld.clone().add(new THREE.Vector3(0, 1.5, 0)), // Décalée vers le haut
                Math.min(apparentWind.length() * 0.3, 2),
                0x88ff88, // Vert clair
                0.3,
                0.25
            );
            this.scene.add(windArrow);
            this.debugArrows.push(windArrow);
        }

        // 3. Forces aérodynamiques (BLEU pour portance, ROUGE pour traînée)
        const { lift, drag } = AerodynamicsCalculator.calculateForces(
            apparentWind,
            this.kite.quaternion,
            this.kite
        );

        // Flèche de portance (BLEU)
        if (lift.length() > 1) { // Seuil plus élevé pour éviter micro-flèches
            const liftArrow = new THREE.ArrowHelper(
                lift.clone().normalize(),
                centerWorld.clone().add(new THREE.Vector3(-0.5, 0, 0)), // Décalée à gauche
                Math.min(Math.sqrt(lift.length()) * 0.4, 2.5),
                0x0088ff, // Bleu
                0.3,
                0.25
            );
            this.scene.add(liftArrow);
            this.debugArrows.push(liftArrow);
        }

        // Flèche de traînée (ROUGE)
        if (drag.length() > 0.1) {
            const dragArrow = new THREE.ArrowHelper(
                drag.clone().normalize(),
                centerWorld.clone().add(new THREE.Vector3(0.5, 0, 0)), // Décalée à droite
                Math.min(Math.sqrt(drag.length()) * 0.4, 2),
                0xff4444, // Rouge
                0.3,
                0.25
            );
            this.scene.add(dragArrow);
            this.debugArrows.push(dragArrow);
        }

        // 4. Flèche de gravité (ORANGE)
        const gravityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            centerWorld.clone().add(new THREE.Vector3(0, -0.5, 0)), // Décalée vers le bas
            Math.min((CONFIG.kite.mass * CONFIG.physics.gravity) * 0.15, 1.5),
            0xffaa00, // Orange
            0.25,
            0.2
        );
        this.scene.add(gravityArrow);
        this.debugArrows.push(gravityArrow);

        // 5. Tensions des lignes (ROSE)
        this.addLineTensionDebugArrows(centerWorld);

        // 6. Couple/rotation (VIOLET) 
        if (this.kiteState.angularVelocity.length() > 0.01) {
            const torqueArrow = new THREE.ArrowHelper(
                this.kiteState.angularVelocity.clone().normalize(),
                centerWorld.clone().add(new THREE.Vector3(0, -1.2, 0)), // En bas
                Math.min(this.kiteState.angularVelocity.length() * 3, 2),
                0x8800ff, // Violet
                0.25,
                0.2
            );
            this.scene.add(torqueArrow);
            this.debugArrows.push(torqueArrow);
        }
    }

    /**
     * Ajoute les flèches de debug pour les tensions des lignes
     */
    private addLineTensionDebugArrows(centerWorld: THREE.Vector3): void {
        const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = this.kite.getPoint('CTRL_DROIT');

        if (ctrlLeft && ctrlRight) {
            const leftWorld = ctrlLeft.clone().applyQuaternion(this.kite.quaternion).add(this.kite.position);
            const rightWorld = ctrlRight.clone().applyQuaternion(this.kite.quaternion).add(this.kite.position);

            const handles = this.getHandlePositions();
            const lineTensions = this.lineSystem.getLineTensions();

            // Flèche tension ligne gauche (ROSE)
            if (lineTensions.leftTaut) {
                const leftDir = handles.left.clone().sub(leftWorld).normalize();
                const leftArrow = new THREE.ArrowHelper(
                    leftDir,
                    leftWorld,
                    Math.min(lineTensions.leftTension * 0.02 + 0.5, 1.5), // Visible même faible tension
                    0xff0088, // Rose
                    0.2,
                    0.15
                );
                this.scene.add(leftArrow);
                this.debugArrows.push(leftArrow);
            }

            // Flèche tension ligne droite (ROSE CLAIR)
            if (lineTensions.rightTaut) {
                const rightDir = handles.right.clone().sub(rightWorld).normalize();
                const rightArrow = new THREE.ArrowHelper(
                    rightDir,
                    rightWorld,
                    Math.min(lineTensions.rightTension * 0.02 + 0.5, 1.5), // Visible même faible tension
                    0xff88aa, // Rose clair
                    0.2,
                    0.15
                );
                this.scene.add(rightArrow);
                this.debugArrows.push(rightArrow);
            }
        }
    }

    /**
     * Nettoie toutes les flèches de debug
     */
    private clearDebugArrows(): void {
        this.debugArrows.forEach(arrow => {
            this.scene.remove(arrow);
            arrow.dispose?.(); // Nettoyage mémoire si disponible
        });
        this.debugArrows = [];
    }

    /**
     * Crée la légende des vecteurs de debug dans le coin inférieur droit
     */
    private createDebugLegend(): void {
        this.debugLegend = document.createElement('div');
        this.debugLegend.id = 'debug-legend';
        this.debugLegend.innerHTML = `
            <h3>🔍 Vecteurs de Debug</h3>
            <div class="legend-item">
                <span class="legend-color" style="background: #00ff00;"></span>
                <span class="legend-text">🟢 Vitesse du kite</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #88ff88;"></span>
                <span class="legend-text">🟢 Vent apparent</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #0088ff;"></span>
                <span class="legend-text">🔵 Portance aéro</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #ff4444;"></span>
                <span class="legend-text">🔴 Traînée aéro</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #ffaa00;"></span>
                <span class="legend-text">🟠 Gravité</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #ff0088;"></span>
                <span class="legend-text">🩷 Tension ligne G</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #ff88aa;"></span>
                <span class="legend-text">🩷 Tension ligne D</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background: #8800ff;"></span>
                <span class="legend-text">🟣 Couple/rotation</span>
            </div>
        `;

        // Styles CSS inline pour la légende
        Object.assign(this.debugLegend.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.4',
            minWidth: '220px',
            maxWidth: '280px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            zIndex: '1000',
            display: this.debugMode ? 'block' : 'none'
        });

        // Style pour le titre
        const title = this.debugLegend.querySelector('h3') as HTMLElement;
        if (title) {
            Object.assign(title.style, {
                margin: '0 0 8px 0',
                fontSize: '13px',
                fontWeight: 'bold',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                paddingBottom: '4px',
                color: '#88ff88'
            });
        }

        // Styles pour les items de légende
        const legendItems = this.debugLegend.querySelectorAll('.legend-item') as NodeListOf<HTMLElement>;
        legendItems.forEach(item => {
            Object.assign(item.style, {
                display: 'flex',
                alignItems: 'center',
                marginBottom: '4px',
                gap: '8px'
            });
        });

        // Styles pour les carrés de couleur
        const colorSquares = this.debugLegend.querySelectorAll('.legend-color') as NodeListOf<HTMLElement>;
        colorSquares.forEach(square => {
            Object.assign(square.style, {
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                flexShrink: '0'
            });
        });

        // Styles pour le texte
        const legendTexts = this.debugLegend.querySelectorAll('.legend-text') as NodeListOf<HTMLElement>;
        legendTexts.forEach(text => {
            Object.assign(text.style, {
                color: '#e0e0e0',
                fontSize: '11px'
            });
        });

        document.body.appendChild(this.debugLegend);
    }

    /**
     * Met à jour la visibilité de la légende selon le mode debug
     */
    private updateDebugLegendVisibility(): void {
        if (this.debugLegend) {
            this.debugLegend.style.display = this.debugMode ? 'block' : 'none';
        }
    }

    private onResize(container: HTMLElement): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        const deltaTime = this.clock.getDelta();
        this.frameCount++;

        // Mise à jour
        this.updateControls(deltaTime);
        this.updatePhysics(deltaTime);
        this.updateControlLines();

        // Debug visuel des forces (si activé)
        if (this.debugMode) {
            this.updateDebugVisuals();
        } else {
            // S'assurer que les flèches sont nettoyées si debug désactivé
            if (this.debugArrows.length > 0) {
                this.clearDebugArrows();
            }
        }

        // Rendu
        this.controls.update();
        this.renderer.render(this.scene, this.camera);

        // Mise à jour UI avec métriques V8
        this.updateUIWithV8Metrics();

        // Log périodique détaillé (style SimulationV8)
        if (this.frameCount % 60 === 0) {
            this.logDetailedMetrics();
        }
    };

    // Méthodes publiques pour l'interface
    public setWindParams(params: Partial<WindParams>): void {
        this.windSimulator.setParams(params);
    }

    public setLineLength(length: number): void {
        // Utiliser le système de lignes V8 avec contraintes PBD
        if (this.lineSystem) {
            this.lineSystem.setLineLength(length);
            console.log(`🔗 Longueur lignes mise à jour: ${length}m (avec contraintes PBD)`);

            // Repositionner le kite si les lignes deviennent trop courtes
            const kitePosition = this.kite.position;
            const pilotPosition = CONFIG.controlBar.position;
            const currentDistance = kitePosition.distanceTo(pilotPosition);

            if (currentDistance > length) {
                const direction = kitePosition.clone().sub(pilotPosition).normalize();
                const newPosition = pilotPosition.clone().add(direction.multiplyScalar(length * 0.95));
                this.kite.position.copy(newPosition);
                this.kiteState.position.copy(newPosition);
                console.log(`📍 Kite repositionné pour respecter les nouvelles contraintes de lignes`);
            }
        } else {
            console.log(`🔗 Longueur lignes: ${length}m (système non initialisé)`);
        }
    }

    public togglePlayPause(): void {
        this.isPlaying = !this.isPlaying;
    }

    public toggleDebugMode(): void {
        this.debugMode = !this.debugMode;
        console.log(`🔍 Mode debug: ${this.debugMode ? 'ON' : 'OFF'}`);

        if (this.debugMode) {
            this.showDebugInfo();
        } else {
            this.hideDebugInfo();
        }

        // Mettre à jour la visibilité de la légende
        this.updateDebugLegendVisibility();
    }

    private showDebugInfo(): void {
        // Afficher des informations debug dans la console
        const kiteState = this.kiteState;
        const windParams = this.windSimulator.getParams();

        console.log('🔍 Debug Info:', {
            kitePosition: kiteState.position.toArray().map(x => x.toFixed(2)),
            kiteVelocity: kiteState.velocity.length().toFixed(2) + ' m/s',
            windSpeed: windParams.speed + ' km/h',
            windDirection: windParams.direction + '°',
            turbulence: windParams.turbulence + '%',
            barRotation: (this.currentBarRotation * 180 / Math.PI).toFixed(1) + '°'
        });
    }

    private hideDebugInfo(): void {
        console.log('🔍 Debug mode désactivé');
        // Nettoyer les flèches de debug
        this.clearDebugArrows();
        // Masquer la légende
        if (this.debugLegend) {
            this.debugLegend.style.display = 'none';
        }
    }

    public resetSimulation(): void {
        // Reset position
        const pilotPos = CONFIG.controlBar.position;
        const initialDistance = CONFIG.lines.defaultLength * 0.95;
        const kiteY = 7;
        const dy = kiteY - pilotPos.y;
        const horizontal = Math.max(0.1, Math.sqrt(Math.max(0, initialDistance * initialDistance - dy * dy)));

        this.kite.position.set(pilotPos.x, kiteY, pilotPos.z - horizontal);
        this.kite.quaternion.identity();

        // Reset état
        this.kiteState.velocity.set(0, 0, 0);
        this.kiteState.angularVelocity.set(0, 0, 0);
        this.targetBarRotation = 0;
        this.currentBarRotation = 0;
    }
}
