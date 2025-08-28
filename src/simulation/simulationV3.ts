/**
 * SimulationV3.ts - Version refactorisée et modulaire de la simulation de cerf-volant
 * Lorsqu’un cerf‑volant de voltige est soumis au vent, la voile est repoussée vers l’arrière. Les lignes le retiennent au niveau des poignées et le contraignent à rester à une distance fixe du pilote. Le kite s’oriente alors spontanément dans le vent et adopte une position d’équilibre qui dépend à la fois de la rotation de la barre et de la longueur des brides. Cet équilibre le maintient « fixé » dans le flux : le vent appuie sur la toile avec un certain angle (créé en partie par les whiskers), ce qui génère une portance et une traînée. Ainsi, le cerf‑volant avance et recule dans une sphère imaginaire dont le rayon correspond à la longueur des lignes.

🌬️ Principe physique :

Le vent pousse sur les surfaces du cerf‑volant.

Les lignes reliées aux poignées le retiennent et imposent une distance et un angle.

La combinaison des forces de vent et de tension des lignes détermine la position d’équilibre.

Les paramètres qui influencent cet équilibre sont :

La force du vent sur la toile – plus elle est forte, plus l’angle de vol tend à augmenter.

La tension des lignes – elles contrôlent la distance au pilote et participent au réglage de l’angle.

La longueur des brides – elles définissent l’angle de présentation au vent et la répartition des efforts.

En intégrant ces éléments dans votre modèle, vous reproduisez la physique émergente d’un cerf‑volant : il se stabilise naturellement dans la fenêtre de vent et évolue dans un volume limité par la longueur des lignes.
 * Architecture modulaire avec séparation des responsabilités :
 * - PhysicsEngine : Moteur physique
 * - KiteController : Gestion du cerf-volant  
 * - WindSimulator : Simulation du vent
 * - LineSystem : Système de lignes et tensions
 * 
 * - RenderManager : Gestion du rendu 3D
 * - InputHandler : Gestion des entrées utilisateur
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Kite2 } from '@objects/organic/Kite2';

// ==============================================================================
// CONFIGURATION ET CONSTANTES
// ==============================================================================

/**
 * Configuration globale de la simulation
 */
const CONFIG = {
    physics: {
        gravity: 9.81,              // m/s²
        airDensity: 1.225,          // kg/m³ au niveau de la mer
        deltaTimeMax: 0.016,        // 60 FPS max
        angularDamping: 0.7,        // Amortissement angulaire
        linearDamping: 0.95,        // Amortissement linéaire
        maxAngularSpeed: 2.0,       // rad/s max
        controlBarLerpSpeed: 0.15   // Vitesse d'interpolation de la barre de contrôle
    },
    kite: {
        mass: 0.5,                  // kg
        area: 1.0,                  // m²
        inertia: 0.02,              // kg·m² 
        liftCoefficient: 1.2,       // Coefficient de portance
        dragCoefficient: 0.18,      // Coefficient de traînée
        aspectRatio: 3.5,           // Ratio d'aspect
        stabilizationTorqueFactor: 0.2, // Facteur de force du couple de stabilisation
        angleMultiplierBase: 0.7,   // Base pour le multiplicateur d'angle d'attaque
        angleMultiplierFactor: 0.6, // Facteur pour le multiplicateur d'angle d'attaque
        desiredAngleBase: Math.PI / 6, // Angle de base désiré pour l'orientation (30 degrés)
        minHeight: 1.0              // Hauteur minimale du cerf-volant au-dessus du sol
    },
    lines: {
        defaultLength: 15,          // m - Lignes plus longues pour plus de contrôle
        tensionFactor: 100,         // N/m - Augmenté pour plus de réactivité
        controlFactor: 40,          // Facteur de contrôle (non utilisé actuellement, à revoir)
        maxSag: 0.01,               // Affaissement max des lignes
        minTension: 2.0,            // N - Tension minimale des lignes
        pivotStiffness: 0.5,        // Rigidité des pivots souples
        pivotDamping: 0.9,          // Amortissement des pivots souples
        catenarySagFactor: 4,       // Facteur de forme pour la courbe de la caténaire
        maxDistanceFactor: 0.98     // Facteur de la longueur de ligne pour la contrainte de distance
    },
    wind: {
        defaultSpeed: 15,           // km/h
        defaultDirection: 0,        // degrés
        defaultTurbulence: 0,       // % - Mis à 0 pour commencer
        turbulenceScale: 0.2,       // Échelle de turbulence
        turbulenceFreqBase: 0.5,    // Fréquence de base pour la turbulence
        turbulenceFreqY: 1.3,       // Multiplicateur de fréquence Y pour la turbulence
        turbulenceFreqZ: 0.7,       // Multiplicateur de fréquence Z pour la turbulence
        turbulenceIntensityXZ: 1.0, // Intensité de la turbulence sur XZ (multiplicateur de windSpeedMs)
        turbulenceIntensityY: 0.3   // Intensité de la turbulence sur Y (multiplicateur de windSpeedMs)
    },
    rendering: {
        shadowMapSize: 2048,
        antialias: true,
        fogStart: 100,
        fogEnd: 1000
    }
};

// ==============================================================================
// TYPES ET INTERFACES
// ==============================================================================

interface WindParams {
    speed: number;          // km/h
    direction: number;      // degrés
    turbulence: number;     // pourcentage
}

interface KiteState {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
    orientation: THREE.Quaternion;
}

interface LineState {
    leftPivot: THREE.Vector3;
    rightPivot: THREE.Vector3;
    leftVelocity: THREE.Vector3;
    rightVelocity: THREE.Vector3;
}

// ==============================================================================
// WIND SIMULATOR - Gestion du vent et turbulences
// ==============================================================================

class WindSimulator {
    private params: WindParams;
    private time: number = 0;

    constructor() {
        this.params = {
            speed: CONFIG.wind.defaultSpeed,
            direction: CONFIG.wind.defaultDirection,
            turbulence: CONFIG.wind.defaultTurbulence
        };
    }

    /**
     * Calcule le vecteur de vent apparent
     */
    getApparentWind(kiteVelocity: THREE.Vector3, deltaTime: number): THREE.Vector3 {
        this.time += deltaTime;
        
        // Vent de base en m/s
        const windSpeedMs = this.params.speed / 3.6;
        const windRad = (this.params.direction * Math.PI) / 180;
        
        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windSpeedMs,
            0,
            -Math.cos(windRad) * windSpeedMs
        );

        // Ajouter la turbulence cohérente (onde sinusoïdale pour simuler le Perlin noise)
        if (this.params.turbulence > 0) {
            const turbIntensity = this.params.turbulence / 100 * CONFIG.wind.turbulenceScale;
            const freq = CONFIG.wind.turbulenceFreqBase; // Fréquence des rafales
            
            windVector.x += Math.sin(this.time * freq) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityXZ;
            windVector.y += Math.sin(this.time * freq * CONFIG.wind.turbulenceFreqY) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityY;
            windVector.z += Math.cos(this.time * freq * CONFIG.wind.turbulenceFreqZ) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityXZ;
        }

        // Vent apparent = vent réel - vitesse du cerf-volant
        return windVector.clone().sub(kiteVelocity);
    }

    setParams(params: Partial<WindParams>) {
        Object.assign(this.params, params);
    }

    getParams(): WindParams {
        return { ...this.params };
    }
    
    /**
     * Obtient le vecteur de vent à une position donnée (pour l'instant, vent uniforme)
     */
    getWindAt(position: THREE.Vector3): THREE.Vector3 {
        // Vent de base en m/s
        const windSpeedMs = this.params.speed / 3.6;
        const windRad = (this.params.direction * Math.PI) / 180;
        
        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windSpeedMs,
            0,
            -Math.cos(windRad) * windSpeedMs
        );
        
        // Ajouter la turbulence cohérente
        if (this.params.turbulence > 0) {
            const turbIntensity = this.params.turbulence / 100 * CONFIG.wind.turbulenceScale;
            const freq = 0.5;
            
            windVector.x += Math.sin(this.time * freq) * windSpeedMs * turbIntensity;
            windVector.y += Math.sin(this.time * freq * 1.3) * windSpeedMs * turbIntensity * 0.3;
            windVector.z += Math.cos(this.time * freq * 0.7) * windSpeedMs * turbIntensity;
        }
        
        return windVector;
    }
}

// ==============================================================================
// AERODYNAMICS - Calcul des forces aérodynamiques
// ==============================================================================

class Aerodynamics {
    /**
     * Calcule les forces aérodynamiques sur le cerf-volant
     * PHYSIQUE ÉMERGENTE : Le vent pousse sur les surfaces, créant l'équilibre
     */
    static calculateForces(
        apparentWind: THREE.Vector3,
        kitePosition: THREE.Vector3,
        pilotPosition: THREE.Vector3,
        kiteOrientation: THREE.Quaternion,
        bridleFactor: number = 1.0
    ): { lift: THREE.Vector3; drag: THREE.Vector3; torque: THREE.Vector3 } {
        const windSpeed = apparentWind.length();
        if (windSpeed < 0.1) {
            return { 
                lift: new THREE.Vector3(), 
                drag: new THREE.Vector3(),
                torque: new THREE.Vector3()
            };
        }
        
        // Pression dynamique du vent : q = 0.5 * ρ * V²
        const dynamicPressure = 0.5 * CONFIG.physics.airDensity * windSpeed * windSpeed;
        
        // === CALCUL DE L'ANGLE D'ATTAQUE NATUREL ===
        // Le kite a une forme en delta avec les whiskers qui créent un angle dièdre
        // La normale locale du kite pointe vers l'arrière (où le vent pousse)
        const kiteNormal = new THREE.Vector3(0, 0, -1); // Normale vers l'arrière (opposé au vent)
        kiteNormal.applyQuaternion(kiteOrientation);
        
        // Direction du vent
        const windDir = apparentWind.clone().normalize();
        
        // === EFFET DES BRIDES SUR L'ANGLE D'ÉQUILIBRE ===
        // Les brides définissent comment le kite se présente au vent
        // bridleFactor < 1.0 : NEZ en avant, angle faible avec le vent
        // bridleFactor > 1.0 : NEZ en arrière, angle fort avec le vent
        
        // Angle de base entre la surface et le vent
        const dotProduct = kiteNormal.dot(windDir);
        const baseAngle = Math.acos(Math.abs(dotProduct));
        
        // Les brides modifient l'angle d'incidence
        // Courtes : réduit l'angle (0.7 à 1.0 de l'angle de base)
        // Longues : augmente l'angle (1.0 à 1.3 de l'angle de base)
        const angleMultiplier = CONFIG.kite.angleMultiplierBase + CONFIG.kite.angleMultiplierFactor * bridleFactor; // de 0.7 à 1.3
        const effectiveAngle = Math.min(Math.PI/2, baseAngle * angleMultiplier);
        
        // Coefficient de pression basé sur l'angle d'attaque
        // sin² pour une courbe réaliste (max à 90°, min à 0°)
        const pressureCoeff = Math.sin(effectiveAngle) * Math.sin(effectiveAngle);
        
        // === FORCE DE PRESSION SUR LA TOILE ===
        // Le vent pousse perpendiculairement à la surface
        const pressureMagnitude = dynamicPressure * CONFIG.kite.area * pressureCoeff;
        
        // Direction de la force : perpendiculaire à la surface dans la direction du vent
        const pressureForce = kiteNormal.clone().multiplyScalar(pressureMagnitude);
        
        // === DÉCOMPOSITION EN PORTANCE ET TRAÎNÉE ===
        
        // Traînée : composante dans la direction du vent
        const dragMagnitude = pressureForce.dot(windDir);
        const dragForce = windDir.clone().multiplyScalar(Math.abs(dragMagnitude));
        
        // Portance : composante perpendiculaire au vent
        // Sur la sphère, elle pousse vers l'extérieur et tangentiellement
        const radialDir = kitePosition.clone().sub(pilotPosition).normalize();
        const tangentDir = new THREE.Vector3().crossVectors(windDir, radialDir).normalize();
        
        // La portance est ce qui fait "glisser" le kite sur la sphère
        const liftForce = pressureForce.clone().sub(dragForce);
        
        // === AUTO-STABILISATION PAR LES BRIDES ===
        // Les brides créent un couple qui stabilise l'angle d'attaque
        // Plus les brides sont longues, plus le nez veut se relever
        
        // Angle d'équilibre souhaité basé sur les brides
        const desiredAngle = CONFIG.kite.desiredAngleBase * bridleFactor; // 30° * facteur
        const angleDiff = effectiveAngle - desiredAngle;
        
        // Couple de stabilisation proportionnel à la différence d'angle
        const stabilizationTorque = new THREE.Vector3()
            .crossVectors(kiteNormal, windDir)
            .normalize()
            .multiplyScalar(angleDiff * pressureMagnitude * CONFIG.kite.stabilizationTorqueFactor);
        
        return { 
            lift: liftForce, 
            drag: dragForce,
            torque: stabilizationTorque
        };
    }
}

// ==============================================================================
// LINE SYSTEM - Gestion des lignes et tensions
// ==============================================================================

class LineSystem {
    private leftPivot = new THREE.Vector3();
    private rightPivot = new THREE.Vector3();
    private leftVelocity = new THREE.Vector3();
    private rightVelocity = new THREE.Vector3();
    public lineLength: number;

    constructor(lineLength: number = CONFIG.lines.defaultLength) {
        this.lineLength = lineLength;
    }

    /**
     * Calcule les forces de tension des lignes
     */
    calculateTensions(
        kite: Kite2,
        handleLeft: THREE.Vector3,
        handleRight: THREE.Vector3,
        controlRotation: number
    ): { leftForce: THREE.Vector3; rightForce: THREE.Vector3; torque: THREE.Vector3 } {
        const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = kite.getPoint('CTRL_DROIT');
        const nez = kite.getPoint('NEZ');
        
        if (!ctrlLeft || !ctrlRight || !nez) {
            return {
                leftForce: new THREE.Vector3(),
                rightForce: new THREE.Vector3(),
                torque: new THREE.Vector3()
            };
        }

        // Convertir en coordonnées monde
        const ctrlLeftWorld = ctrlLeft.clone();
        const ctrlRightWorld = ctrlRight.clone();
        const nezWorld = nez.clone();
        kite.localToWorld(ctrlLeftWorld);
        kite.localToWorld(ctrlRightWorld);
        kite.localToWorld(nezWorld);

        // Calculer les tensions des lignes principales (poignées vers points de contrôle)
        const leftForce = this.calculateSingleLineTension(ctrlLeftWorld, handleLeft, this.lineLength);
        const rightForce = this.calculateSingleLineTension(ctrlRightWorld, handleRight, this.lineLength);

        // Les brides n'appliquent plus de forces artificielles
        // Leur longueur influence l'angle d'attaque via Aerodynamics.calculateForces
        
        // Calculer le couple résultant des forces des lignes principales uniquement
        const centerOfMass = kite.position.clone();
        const leftLever = ctrlLeftWorld.clone().sub(centerOfMass);
        const rightLever = ctrlRightWorld.clone().sub(centerOfMass);
        
        // Couple des lignes principales
        const leftTorque = new THREE.Vector3().crossVectors(leftLever, leftForce);
        const rightTorque = new THREE.Vector3().crossVectors(rightLever, rightForce);
        
        const totalTorque = leftTorque.add(rightTorque);

        return {
            leftForce,
            rightForce,
            torque: totalTorque
        };
    }

    /**
     * Calcule la tension d'une ligne unique
     */
    private calculateSingleLineTension(
        controlPoint: THREE.Vector3,
        handle: THREE.Vector3,
        restLengthParam: number
    ): THREE.Vector3 {
        const lineVector = handle.clone().sub(controlPoint);
        const distance = lineVector.length();
        
        // Tension de base : force proportionnelle à l'étirement
        // On commence à appliquer une tension dès que la ligne dépasse 95% de sa longueur au repos
        const restLength = restLengthParam * 0.95;
        
        if (distance > restLength) {
            const direction = lineVector.normalize();
            // Force plus progressive et plus sensible
            const stretch = distance - restLength;
            const magnitude = stretch * CONFIG.lines.tensionFactor;
            return direction.multiplyScalar(magnitude);
        }
        
        // Même si la ligne n'est pas tendue au max, on applique une petite force de rappel
        // pour maintenir une tension minimale
        const minTension = CONFIG.lines.minTension; // Newton
        const direction = lineVector.normalize();
        return direction.multiplyScalar(minTension);
    }


    /**
     * Met à jour la physique des pivots souples
     */
    updatePivots(kite: Kite2, deltaTime: number): void {
        const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = kite.getPoint('CTRL_DROIT');
        
        if (!ctrlLeft || !ctrlRight) return;

        const targetLeft = ctrlLeft.clone();
        const targetRight = ctrlRight.clone();
        kite.localToWorld(targetLeft);
        kite.localToWorld(targetRight);

        // Physique des pivots avec ressort-amortisseur
        const stiffness = CONFIG.lines.pivotStiffness;
        const damping = CONFIG.lines.pivotDamping;
        
        // Pivot gauche
        const forceLeft = targetLeft.clone().sub(this.leftPivot).multiplyScalar(stiffness);
        this.leftVelocity.add(forceLeft);
        this.leftVelocity.multiplyScalar(damping);
        this.leftPivot.add(this.leftVelocity.clone().multiplyScalar(deltaTime));

        // Pivot droit
        const forceRight = targetRight.clone().sub(this.rightPivot).multiplyScalar(stiffness);
        this.rightVelocity.add(forceRight);
        this.rightVelocity.multiplyScalar(damping);
        this.rightPivot.add(this.rightVelocity.clone().multiplyScalar(deltaTime));
    }

    /**
     * Calcule les points d'une caténaire pour l'affichage des lignes
     */
    calculateCatenary(
        start: THREE.Vector3,
        end: THREE.Vector3,
        segments: number = 5
    ): THREE.Vector3[] {
        const directDistance = start.distanceTo(end);
        
        if (directDistance >= this.lineLength) {
            return [start, end];
        }
        
        const points: THREE.Vector3[] = [];
        const slack = this.lineLength - directDistance;
        const sag = slack * CONFIG.lines.maxSag;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3().lerpVectors(start, end, t);
            point.y -= CONFIG.lines.catenarySagFactor * sag * t * (1 - t);
            points.push(point);
        }
        
        return points;
    }

    getPivots() {
        return {
            left: this.leftPivot.clone(),
            right: this.rightPivot.clone()
        };
    }

    setLineLength(length: number) {
        this.lineLength = length;
    }
}

// ==============================================================================
// KITE CONTROLLER - Gestion du cerf-volant et de son orientation
// ==============================================================================

class KiteController {
    private kite: Kite2;
    private state: KiteState;
    private previousPosition: THREE.Vector3;

    constructor(kite: Kite2) {
        this.kite = kite;
        this.state = {
            position: kite.position.clone(),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            orientation: kite.quaternion.clone()
        };
        this.previousPosition = kite.position.clone();
    }

    /**
     * Met à jour la physique du cerf-volant
     */
    update(
        forces: THREE.Vector3,
        torque: THREE.Vector3,
        pilotPosition: THREE.Vector3,
        deltaTime: number
    ): void {
        // Calculer la vélocité
        if (deltaTime > 0) {
            this.state.velocity = this.kite.position.clone()
                .sub(this.previousPosition)
                .divideScalar(deltaTime);
        }

        // Accélération = F / m
        const acceleration = forces.divideScalar(CONFIG.kite.mass);
        
        // Intégration de la vélocité
        this.state.velocity.add(acceleration.multiplyScalar(deltaTime));
        this.state.velocity.multiplyScalar(CONFIG.physics.linearDamping);

        // Nouvelle position
        const newPosition = this.kite.position.clone()
            .add(this.state.velocity.clone().multiplyScalar(deltaTime));

        // Contrainte sphérique
        const distFromPilot = newPosition.distanceTo(pilotPosition);
        const maxDist = CONFIG.lines.defaultLength * CONFIG.lines.maxDistanceFactor;
        if (distFromPilot > maxDist) {
            const dir = newPosition.clone().sub(pilotPosition).normalize();
            newPosition.copy(pilotPosition.clone().add(dir.multiplyScalar(maxDist)));
        }

        // Hauteur minimale
        newPosition.y = Math.max(CONFIG.kite.minHeight, newPosition.y);

        // Appliquer la position
        this.kite.position.copy(newPosition);
        this.previousPosition.copy(newPosition);

        // Mise à jour de l'orientation
        this.updateOrientation(torque, pilotPosition, deltaTime);
    }

    /**
     * Met à jour l'orientation du cerf-volant
     */
    private updateOrientation(
        torque: THREE.Vector3,
        pilotPosition: THREE.Vector3,
        deltaTime: number
    ): void {
        // Accélération angulaire = Couple / Inertie
        const angularAcceleration = torque.clone().divideScalar(CONFIG.kite.inertia);
        
        // Mise à jour de la vitesse angulaire
        this.state.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
        this.state.angularVelocity.multiplyScalar(CONFIG.physics.angularDamping);
        
        // Limiter la vitesse angulaire
        if (this.state.angularVelocity.length() > CONFIG.physics.maxAngularSpeed) {
            this.state.angularVelocity.normalize()
                .multiplyScalar(CONFIG.physics.maxAngularSpeed);
        }

        // Appliquer la rotation angulaire
        if (this.state.angularVelocity.length() > 0.001) {
            const deltaRotation = new THREE.Quaternion();
            const axis = this.state.angularVelocity.clone().normalize();
            const angle = this.state.angularVelocity.length() * deltaTime;
            deltaRotation.setFromAxisAngle(axis, angle);

            this.kite.quaternion.multiply(deltaRotation); // Appliquer la rotation
            this.kite.quaternion.normalize(); // Garder le quaternion normalisé
        }

        
    }

    getState(): KiteState {
        return { ...this.state };
    }

    getKite(): Kite2 {
        return this.kite;
    }
}

// ==============================================================================
// INPUT HANDLER - Gestion des entrées utilisateur
// ==============================================================================

class InputHandler {
    private targetBarRotation: number = 0;
    private keysPressed = new Set<string>();

    constructor() {
        this.setupKeyboardControls();
    }

    private setupKeyboardControls(): void {
        window.addEventListener('keydown', (event) => {
            this.keysPressed.add(event.key);
            
            if (event.key === 'ArrowLeft') {
                this.targetBarRotation = Math.PI / 4; // +45° pour plus d'effet
                event.preventDefault();
            } else if (event.key === 'ArrowRight') {
                this.targetBarRotation = -Math.PI / 4; // -45° pour plus d'effet
                event.preventDefault();
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keysPressed.delete(event.key);
            
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                if (!this.keysPressed.has('ArrowLeft') && !this.keysPressed.has('ArrowRight')) {
                    this.targetBarRotation = 0;
                }
                event.preventDefault();
            }
        });
    }

    getTargetBarRotation(): number {
        return this.targetBarRotation;
    }
}

// ==============================================================================
// RENDER MANAGER - Gestion du rendu 3D
// ==============================================================================

class RenderManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    constructor(container: HTMLElement) {
        // Scène
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, CONFIG.rendering.fogStart, CONFIG.rendering.fogEnd);

        // Caméra
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(3, 5, 12);
        this.camera.lookAt(0, 3, -5);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: CONFIG.rendering.antialias,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        container.appendChild(this.renderer.domElement);

        // Contrôles
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 50;
        this.controls.minDistance = 2;

        // Setup environnement
        this.setupEnvironment();

        // Gestion du redimensionnement
        window.addEventListener('resize', () => this.onResize());
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
        sunLight.shadow.mapSize.width = CONFIG.rendering.shadowMapSize;
        sunLight.shadow.mapSize.height = CONFIG.rendering.shadowMapSize;
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

    addObject(object: THREE.Object3D): void {
        this.scene.add(object);
    }

    removeObject(object: THREE.Object3D): void {
        this.scene.remove(object);
    }

    render(): void {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    private onResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    getScene(): THREE.Scene {
        return this.scene;
    }
}

// ==============================================================================
// PHYSICS ENGINE - Moteur physique principal
// ==============================================================================

class PhysicsEngine {
    private windSimulator: WindSimulator;
    private lineSystem: LineSystem;
    private kiteController: KiteController;
    public controlBarRotation: number = 0;  // Public pour accès depuis SimulationAppV3
    private controlBar: THREE.Group;
    private bridleFactor: number = 1.0;

    // Définit le facteur de bride (0,5 à 1,5)
    setBridleFactor(factor: number): void {
        this.bridleFactor = Math.max(0.5, Math.min(1.5, factor));
    }

    constructor(kite: Kite2, controlBar: THREE.Group) {
        this.windSimulator = new WindSimulator();
        this.lineSystem = new LineSystem();
        this.kiteController = new KiteController(kite);
        this.controlBar = controlBar;
    }

    /**
     * Met à jour la simulation physique
     */
    update(deltaTime: number, targetBarRotation: number): void {
        // Limiter le deltaTime pour éviter les instabilités
        deltaTime = Math.min(deltaTime, CONFIG.physics.deltaTimeMax);

        // Interpoler la rotation de la barre
        const lerpSpeed = CONFIG.physics.controlBarLerpSpeed;
        this.controlBarRotation += (targetBarRotation - this.controlBarRotation) * lerpSpeed;

        // Calculer les positions des poignées
        const handles = this.calculateHandlePositions();

        // Obtenir l'état du cerf-volant
        const kiteState = this.kiteController.getState();
        const kite = this.kiteController.getKite();

        // Calculer le vent apparent
        const apparentWind = this.windSimulator.getApparentWind(kiteState.velocity, deltaTime);

        // Calculer les forces aérodynamiques avec le facteur de brides
        const pilotPosition = this.controlBar.position;
        const { lift, drag, torque: aeroTorque } = Aerodynamics.calculateForces(
            apparentWind,
            kite.position,
            pilotPosition,
            kite.quaternion,
            this.bridleFactor
        );

        // Calculer les tensions des lignes
        const { leftForce, rightForce, torque: lineTorque } = this.lineSystem.calculateTensions(
            kite,
            handles.left,
            handles.right,
            this.controlBarRotation
        );

        // Force de gravité
        const gravity = new THREE.Vector3(0, -CONFIG.kite.mass * CONFIG.physics.gravity, 0);

        // Somme des forces
        const totalForce = new THREE.Vector3()
            .add(lift)
            .add(drag)
            .add(gravity)
            .add(leftForce)
            .add(rightForce);

        // Somme des couples (aérodynamique + lignes)
        const totalTorque = aeroTorque.add(lineTorque);

        // Mettre à jour le cerf-volant
        this.kiteController.update(totalForce, totalTorque, pilotPosition, deltaTime);

        // Mettre à jour les pivots
        this.lineSystem.updatePivots(kite, deltaTime);

        // Mettre à jour la rotation de la barre
        this.updateControlBar(kite);
    }

    /**
     * Calcule les positions des poignées de la barre
     */
    private calculateHandlePositions(): { left: THREE.Vector3; right: THREE.Vector3 } {
        const kite = this.kiteController.getKite();
        const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = kite.getPoint('CTRL_DROIT');

        if (ctrlLeft && ctrlRight) {
            const kiteLeftWorld = ctrlLeft.clone();
            const kiteRightWorld = ctrlRight.clone();
            kite.localToWorld(kiteLeftWorld);
            kite.localToWorld(kiteRightWorld);

            // Calculer l'axe de rotation dans le plan kite->barre
            const centerKite = kiteLeftWorld.clone().add(kiteRightWorld).multiplyScalar(0.5);
            const toKiteVector = centerKite.clone().sub(this.controlBar.position).normalize();
            
            // L'axe de rotation est perpendiculaire au plan formé par:
            // - La direction horizontale de la barre (X)
            // - La direction vers le cerf-volant
            const barDirection = new THREE.Vector3(1, 0, 0);
            const rotationAxis = new THREE.Vector3().crossVectors(barDirection, toKiteVector).normalize();
            
            // Si les vecteurs sont parallèles (cas rare), utiliser un axe par défaut
            if (rotationAxis.length() < 0.01) {
                rotationAxis.set(0, 1, 0); // Axe vertical par défaut
            }

            const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(
                rotationAxis, 
                this.controlBarRotation
            );

            // Positions locales des poignées (barre de 1.5m de large)
            const handleLeftLocal = new THREE.Vector3(-0.75, 0, 0);
            const handleRightLocal = new THREE.Vector3(0.75, 0, 0);
            
            // Appliquer la rotation
            handleLeftLocal.applyQuaternion(rotationQuaternion);
            handleRightLocal.applyQuaternion(rotationQuaternion);

            return {
                left: handleLeftLocal.clone().add(this.controlBar.position),
                right: handleRightLocal.clone().add(this.controlBar.position)
            };
        }

        // Positions par défaut
        return {
            left: new THREE.Vector3(-0.75, 1.2, 8),
            right: new THREE.Vector3(0.75, 1.2, 8)
        };
    }

    /**
     * Met à jour la rotation visuelle de la barre
     */
    private updateControlBar(kite: Kite2): void {
        const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = kite.getPoint('CTRL_DROIT');

        if (ctrlLeft && ctrlRight) {
            const kiteLeftWorld = ctrlLeft.clone();
            const kiteRightWorld = ctrlRight.clone();
            kite.localToWorld(kiteLeftWorld);
            kite.localToWorld(kiteRightWorld);

            // Calculer l'axe de rotation dans le plan kite->barre
            const centerKite = kiteLeftWorld.clone().add(kiteRightWorld).multiplyScalar(0.5);
            const toKiteVector = centerKite.clone().sub(this.controlBar.position).normalize();
            
            // L'axe de rotation est perpendiculaire au plan formé par:
            // - La direction horizontale de la barre (X)
            // - La direction vers le cerf-volant
            const barDirection = new THREE.Vector3(1, 0, 0);
            const rotationAxis = new THREE.Vector3().crossVectors(barDirection, toKiteVector).normalize();
            
            // Si les vecteurs sont parallèles (cas rare), utiliser un axe par défaut
            if (rotationAxis.length() < 0.01) {
                rotationAxis.set(0, 1, 0); // Axe vertical par défaut
            }

            const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(
                rotationAxis, 
                this.controlBarRotation
            );
            
            this.controlBar.quaternion.copy(rotationQuaternion);
        }
    }

    setWindParams(params: Partial<WindParams>): void {
        this.windSimulator.setParams(params);
    }

    setLineLength(length: number): void {
        this.lineSystem.setLineLength(length);
    }

    getKiteController(): KiteController {
        return this.kiteController;
    }
    
    getWindSimulator(): WindSimulator {
        return this.windSimulator;
    }
    
    getLineSystem(): LineSystem {
        return this.lineSystem;
    }
}

// ==============================================================================
// SIMULATION APP - Application principale
// ==============================================================================

export class SimulationAppV3 {
    private renderManager: RenderManager;
    private physicsEngine!: PhysicsEngine;
    private inputHandler: InputHandler;
    private kite!: Kite2;
    private controlBar!: THREE.Group;
    private clock: THREE.Clock;
    private isPlaying: boolean = true;
    private leftLine: THREE.Line | null = null;
    private rightLine: THREE.Line | null = null;
    private debugMode: boolean = false;
    private debugArrows: THREE.ArrowHelper[] = [];

    constructor() {
        console.log('🚀 Démarrage de la Simulation V3 - Architecture Modulaire');

        // Initialiser les modules
        const container = document.getElementById('app');
        if (!container) {
            throw new Error('Container #app non trouvé');
        }

        this.renderManager = new RenderManager(container);
        this.inputHandler = new InputHandler();
        this.clock = new THREE.Clock();

        // Créer le cerf-volant et la barre (initialise this.kite et this.controlBar)
        this.setupKite();
        this.setupControlBar();

        // Initialiser le moteur physique après avoir créé le kite et controlBar
        this.physicsEngine = new PhysicsEngine(this.kite, this.controlBar);

        // Setup UI
        this.setupUIControls();

        // Créer les lignes visuelles
        this.createControlLines();

        // Démarrer l'animation
        this.animate();
    }

    private setupKite(): void {
        this.kite = new Kite2();
        const initialDistance = CONFIG.lines.defaultLength * 0.9;
        this.kite.position.set(0, 5, -initialDistance);  // Position plus haute pour lignes de 15m
        this.renderManager.addObject(this.kite);
    }

    private setupControlBar(): void {
        this.controlBar = new THREE.Group();
        this.controlBar.position.set(0, 1.2, 8);

        // Créer la barre visuelle (1.5m de large)
        const barGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5);
        const barMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.3
        });
        const bar = new THREE.Mesh(barGeometry, barMaterial);
        bar.rotation.z = Math.PI / 2;
        this.controlBar.add(bar);

        // Poignées
        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.15);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.6
        });

        const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        leftHandle.position.set(-0.75, 0, 0);  // Correspondre à la nouvelle largeur
        this.controlBar.add(leftHandle);

        const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        rightHandle.position.set(0.75, 0, 0);  // Correspondre à la nouvelle largeur
        this.controlBar.add(rightHandle);

        // Ajouter le pilote
        const pilotGeometry = new THREE.BoxGeometry(0.4, 1.6, 0.3);
        const pilotMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.8
        });
        const pilot = new THREE.Mesh(pilotGeometry, pilotMaterial);
        pilot.position.set(0, 0.8, 8.5);
        pilot.castShadow = true;

        this.renderManager.addObject(this.controlBar);
        this.renderManager.addObject(pilot);
    }

    private createControlLines(): void {
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x333333,
            linewidth: 2
        });

        const leftGeometry = new THREE.BufferGeometry();
        const rightGeometry = new THREE.BufferGeometry();

        this.leftLine = new THREE.Line(leftGeometry, lineMaterial);
        this.rightLine = new THREE.Line(rightGeometry, lineMaterial);

        this.renderManager.addObject(this.leftLine);
        this.renderManager.addObject(this.rightLine);
    }

    private updateControlLines(): void {
        if (!this.leftLine || !this.rightLine) return;

        const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = this.kite.getPoint('CTRL_DROIT');
        
        if (!ctrlLeft || !ctrlRight) return;

        // Convertir les points de contrôle en coordonnées monde
        const kiteLeftWorld = ctrlLeft.clone();
        const kiteRightWorld = ctrlRight.clone();
        this.kite.localToWorld(kiteLeftWorld);
        this.kite.localToWorld(kiteRightWorld);
        
        // Récupérer la rotation actuelle de la barre depuis le PhysicsEngine
        const controlBarRotation = this.physicsEngine.controlBarRotation || 0;
        
        // Calculer l'axe de rotation dans le plan kite->barre
        const centerKite = kiteLeftWorld.clone().add(kiteRightWorld).multiplyScalar(0.5);
        const toKiteVector = centerKite.clone().sub(this.controlBar.position).normalize();
        
        // L'axe de rotation est perpendiculaire au plan formé par:
        // - La direction horizontale de la barre (X)
        // - La direction vers le cerf-volant
        const barDirection = new THREE.Vector3(1, 0, 0); // Direction de la barre
        const rotationAxis = new THREE.Vector3().crossVectors(barDirection, toKiteVector).normalize();
        
        // Si les vecteurs sont parallèles (cas rare), utiliser un axe par défaut
        if (rotationAxis.length() < 0.01) {
            rotationAxis.set(0, 1, 0); // Axe vertical par défaut
        }
        
        // Créer le quaternion de rotation
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, controlBarRotation);
        
        // Positions locales des poignées (barre de 1.5m de large)
        const handleLeftLocal = new THREE.Vector3(-0.75, 0, 0);
        const handleRightLocal = new THREE.Vector3(0.75, 0, 0);
        
        // Appliquer la rotation
        handleLeftLocal.applyQuaternion(rotationQuaternion);
        handleRightLocal.applyQuaternion(rotationQuaternion);
        
        // Convertir en positions monde
        const handleLeft = handleLeftLocal.clone().add(this.controlBar.position);
        const handleRight = handleRightLocal.clone().add(this.controlBar.position);

        // Connecter directement aux points de contrôle du cerf-volant (pas aux pivots)
        const leftPoints = this.physicsEngine.getLineSystem()
            .calculateCatenary(handleLeft, kiteLeftWorld);
        const rightPoints = this.physicsEngine.getLineSystem()
            .calculateCatenary(handleRight, kiteRightWorld);

        this.leftLine.geometry.setFromPoints(leftPoints);
        this.rightLine.geometry.setFromPoints(rightPoints);
    }

    private setupUIControls(): void {
        // Bouton Reset
        const resetBtn = document.getElementById('reset-sim');
        if (resetBtn) {
            resetBtn.onclick = () => this.resetSimulation();
        }

        // Bouton Play/Pause
        const playBtn = document.getElementById('play-pause');
        if (playBtn) {
            playBtn.onclick = () => this.togglePlayPause();
        }

        // Bouton Debug
        const debugBtn = document.getElementById('debug-physics');
        if (debugBtn) {
            debugBtn.onclick = () => this.toggleDebugMode();
        }

        // Contrôles de vent
        this.setupWindControls();
    }

    private setupWindControls(): void {
        // Vitesse du vent
        const speedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const speedValue = document.getElementById('wind-speed-value');
        if (speedSlider && speedValue) {
            // Initialiser avec la valeur de CONFIG
            speedSlider.value = CONFIG.wind.defaultSpeed.toString();
            speedValue.textContent = `${CONFIG.wind.defaultSpeed} km/h`;
            
            speedSlider.oninput = () => {
                const speed = parseFloat(speedSlider.value);
                this.physicsEngine.setWindParams({ speed });
                speedValue.textContent = `${speed} km/h`;
            };
        }

        // Direction du vent
        const dirSlider = document.getElementById('wind-direction') as HTMLInputElement;
        const dirValue = document.getElementById('wind-direction-value');
        if (dirSlider && dirValue) {
            // Initialiser avec la valeur de CONFIG
            dirSlider.value = CONFIG.wind.defaultDirection.toString();
            dirValue.textContent = `${CONFIG.wind.defaultDirection}°`;
            
            dirSlider.oninput = () => {
                const direction = parseFloat(dirSlider.value);
                this.physicsEngine.setWindParams({ direction });
                dirValue.textContent = `${direction}°`;
            };
        }

        // Turbulence
        const turbSlider = document.getElementById('wind-turbulence') as HTMLInputElement;
        const turbValue = document.getElementById('wind-turbulence-value');
        if (turbSlider && turbValue) {
            // Initialiser avec la valeur de CONFIG
            turbSlider.value = CONFIG.wind.defaultTurbulence.toString();
            turbValue.textContent = `${CONFIG.wind.defaultTurbulence}%`;
            
            turbSlider.oninput = () => {
                const turbulence = parseFloat(turbSlider.value);
                this.physicsEngine.setWindParams({ turbulence });
                turbValue.textContent = `${turbulence}%`;
            };
        }

        // Longueur des lignes
        const lengthSlider = document.getElementById('line-length') as HTMLInputElement;
        const lengthValue = document.getElementById('line-length-value');
        if (lengthSlider && lengthValue) {
            // Initialiser avec la valeur de CONFIG
            lengthSlider.value = CONFIG.lines.defaultLength.toString();
            lengthValue.textContent = `${CONFIG.lines.defaultLength}m`;
            
            lengthSlider.oninput = () => {
                const length = parseFloat(lengthSlider.value);
                this.physicsEngine.setLineLength(length);
                lengthValue.textContent = `${length}m`;
            };
        }
        
        // Longueur des brides (facteur de bride)
        const bridleSlider = document.getElementById('bridle-length') as HTMLInputElement;
        const bridleValue  = document.getElementById('bridle-length-value');
        if (bridleSlider && bridleValue) {
            bridleSlider.value = '100';
            bridleValue.textContent = '100%';

            bridleSlider.oninput = () => {
                const percent = parseFloat(bridleSlider.value);
                // Conversion 50 % → 0,5, 100 % → 1,0, 150 % → 1,5
                const bridleFactor = percent / 100;
                this.physicsEngine.setBridleFactor(bridleFactor);

                bridleValue.textContent = `${percent}%`;
                console.log(`📏 Facteur de bride : ${bridleFactor}`);
            };
        }
    }

    private resetSimulation(): void {
        const initialDistance = CONFIG.lines.defaultLength * 0.9;
        this.kite.position.set(0, 5, -initialDistance);  // Position plus haute pour lignes de 15m
        this.kite.rotation.set(0, 0, 0);
        this.controlBar.quaternion.identity();
        
        console.log('🔄 Simulation réinitialisée');
    }

    private togglePlayPause(): void {
        this.isPlaying = !this.isPlaying;
        const playBtn = document.getElementById('play-pause');
        if (playBtn) {
            playBtn.textContent = this.isPlaying ? '⏸️ Pause' : '▶️ Lancer';
        }
        console.log(this.isPlaying ? '▶️ Simulation démarrée' : '⏸️ Simulation en pause');
    }

    private toggleDebugMode(): void {
        this.debugMode = !this.debugMode;
        const debugBtn = document.getElementById('debug-physics');
        
        if (debugBtn) {
            debugBtn.textContent = this.debugMode ? '🔍 Debug ON' : '🔍 Debug';
            debugBtn.classList.toggle('active', this.debugMode);
        }
        
        // Activer/désactiver l'affichage du panneau de debug
        document.body.classList.toggle('debug-mode', this.debugMode);
        
        // Nettoyer les flèches de debug si on désactive
        if (!this.debugMode) {
            this.clearDebugArrows();
        }
        
        console.log(`🔍 Mode debug: ${this.debugMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    }

    private clearDebugArrows(): void {
        // Supprimer toutes les flèches de debug de la scène
        this.debugArrows.forEach(arrow => {
            this.renderManager.removeObject(arrow);
        });
        this.debugArrows = [];
    }

    private updateDebugArrows(): void {
        if (!this.debugMode) return;
        
        // Nettoyer les anciennes flèches
        this.clearDebugArrows();
        
        // Obtenir l'état du cerf-volant
        const kiteState = this.physicsEngine.getKiteController().getState();
        const kitePosition = this.kite.position.clone();
        
        // Flèche de vitesse (verte)
        if (kiteState.velocity.length() > 0.1) {
            const velocityArrow = new THREE.ArrowHelper(
                kiteState.velocity.clone().normalize(),
                kitePosition,
                kiteState.velocity.length() * 0.5, // Échelle pour la visualisation
                0x00ff00,
                undefined,
                0.3
            );
            this.renderManager.addObject(velocityArrow);
            this.debugArrows.push(velocityArrow);
        }
        
        // Obtenir les forces aérodynamiques depuis le KiteController
        const windSim = this.physicsEngine.getWindSimulator();
        const wind = windSim.getWindAt(kitePosition);
        const relativeWind = wind.clone().sub(kiteState.velocity);
        
        // Flèche de portance (bleue)
        let liftMagnitude = 0;
        let dragMagnitude = 0;
        
        if (relativeWind.length() > 0.1) {
            liftMagnitude = relativeWind.lengthSq() * CONFIG.kite.liftCoefficient * 0.5;
            if (liftMagnitude > 0.1) {
                const liftDir = new THREE.Vector3(0, 1, 0); // Simplifié : la portance est verticale
                const liftArrow = new THREE.ArrowHelper(
                    liftDir,
                    kitePosition,
                    Math.sqrt(liftMagnitude) * 0.3,
                    0x0088ff,
                    undefined,
                    0.3
                );
                this.renderManager.addObject(liftArrow);
                this.debugArrows.push(liftArrow);
            }
        }
        
        // Flèche de traînée (rouge)
        if (relativeWind.length() > 0.1) {
            dragMagnitude = relativeWind.lengthSq() * CONFIG.kite.dragCoefficient * 0.5;
            if (dragMagnitude > 0.1) {
                const dragDir = relativeWind.clone().normalize();
                const dragArrow = new THREE.ArrowHelper(
                    dragDir,
                    kitePosition,
                    Math.sqrt(dragMagnitude) * 0.3,
                    0xff0000,
                    undefined,
                    0.3
                );
                this.renderManager.addObject(dragArrow);
                this.debugArrows.push(dragArrow);
            }
        }
        
        // Afficher les infos de debug dans le panneau
        const forceDisplay = document.getElementById('force-display');
        const tensionDisplay = document.getElementById('tension-display');
        const altitudeDisplay = document.getElementById('altitude-display');
        
        if (forceDisplay) {
            const totalForce = Math.sqrt(liftMagnitude + dragMagnitude);
            forceDisplay.textContent = totalForce.toFixed(1);
        }
        
        if (tensionDisplay) {
            // Calculer la tension approximative des lignes
            const lineLength = this.physicsEngine.getLineSystem().lineLength || CONFIG.lines.defaultLength;
            const distance = kitePosition.length();
            const tension = Math.max(0, (distance - lineLength) * CONFIG.lines.tensionFactor);
            tensionDisplay.textContent = tension.toFixed(1);
        }
        
        if (altitudeDisplay) {
            altitudeDisplay.textContent = kitePosition.y.toFixed(1);
        }
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        if (this.isPlaying) {
            const deltaTime = this.clock.getDelta();
            const targetRotation = this.inputHandler.getTargetBarRotation();
            
            // Mettre à jour la physique
            this.physicsEngine.update(deltaTime, targetRotation);
            
            // Mettre à jour les lignes visuelles
            this.updateControlLines();
            
            // Mettre à jour les flèches de debug si activé
            this.updateDebugArrows();
        }

        // Rendu
        this.renderManager.render();
    }
}

// Démarrer l'application
if (typeof window !== 'undefined') {
    new SimulationAppV3();
}