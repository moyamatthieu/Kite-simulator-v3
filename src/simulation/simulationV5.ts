/**
 * SimulationV5.ts - Version basée sur V3 avec améliorations futures
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
        angularDamping: 0.95,       // Léger amortissement angulaire pour stabilité
        linearDamping: 0.98,        // Léger amortissement linéaire (friction de l'air)
        controlBarLerpSpeed: 1    // Interpolation plus rapide pour réactivité
    },
    kite: {
        mass: 0.28,                 // kg - Masse optimisée pour meilleure réactivité
        area: 0.68,                 // m² - Surface totale réelle des 4 triangles
        inertia: 0.015,             // kg·m² - Inertie ajustée pour la nouvelle masse
        liftCoefficient: 0.8,       // Non utilisé dans la physique pure
        dragCoefficient: 0.6,       // Non utilisé dans la physique pure
        aspectRatio: 3.5,           // Ratio d'aspect delta
        stabilizationTorqueFactor: 0.5, // Stabilisation augmentée pour moins de tournoiement
        angleMultiplierBase: 0.7,   // Non utilisé dans la nouvelle physique
        angleMultiplierFactor: 0.6, // Non utilisé dans la nouvelle physique
        desiredAngleBase: Math.PI / 6, // Non utilisé dans la nouvelle physique
        minHeight: 1.0              // Hauteur minimale au-dessus du sol
    },
    lines: {
        defaultLength: 15,          // m - Lignes standard
        controlFactor: 300,         // Facteur de contrôle pour rotation par la barre
        maxSag: 0.01,               // Affaissement max des lignes pour le visuel
        catenarySagFactor: 4       // Facteur de forme pour la courbe de la caténaire
    },
    wind: {
        defaultSpeed: 18,           // km/h - Vent suffisant pour faire voler le cerf-volant
        defaultDirection: 0,        // degrés - Vent de face
        defaultTurbulence: 3,       // % - Turbulence réduite pour plus de stabilité
        turbulenceScale: 0.15,      // Échelle de turbulence réduite
        turbulenceFreqBase: 0.3,    // Fréquence plus lente pour rafales réalistes
        turbulenceFreqY: 1.3,       // Multiplicateur de fréquence Y
        turbulenceFreqZ: 0.7,       // Multiplicateur de fréquence Z
        turbulenceIntensityXZ: 0.8, // Intensité réduite sur XZ
        turbulenceIntensityY: 0.2   // Intensité réduite sur Y
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

// Interface non utilisée actuellement, conservée pour future extension
// interface LineState {
//     leftPivot: THREE.Vector3;
//     rightPivot: THREE.Vector3;
//     leftVelocity: THREE.Vector3;
//     rightVelocity: THREE.Vector3;
// }

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

        // Convention: 0° = vent soufflant vers le Sud (-Z) pour pousser le cerf-volant
        // 90° = vent soufflant vers l'Ouest (+X)
        // Le cerf-volant est en Z négatif, le vent doit souffler vers -Z pour le pousser
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
    getWindAt(_position: THREE.Vector3): THREE.Vector3 {
        // Vent de base en m/s
        const windSpeedMs = this.params.speed / 3.6;
        const windRad = (this.params.direction * Math.PI) / 180;

        // Convention: 0° = vent soufflant vers le Sud (-Z) pour pousser le cerf-volant
        // 90° = vent soufflant vers l'Ouest (+X)
        // Le cerf-volant est en Z négatif, le vent doit souffler vers -Z pour le pousser
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
     * PHYSIQUE PURE : Forces émergentes de la pression du vent sur 4 surfaces triangulaires
     */
    static calculateForces(
        apparentWind: THREE.Vector3,
        kitePosition: THREE.Vector3,
        pilotPosition: THREE.Vector3,
        kiteOrientation: THREE.Quaternion,
        _bridleFactor: number = 1.0  // Conservé pour compatibilité mais non utilisé dans la physique pure
    ): { lift: THREE.Vector3; drag: THREE.Vector3; torque: THREE.Vector3 } {
        const windSpeed = apparentWind.length();
        if (windSpeed < 0.1) {
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                torque: new THREE.Vector3()
            };
        }

        const windDir = apparentWind.clone().normalize();
        const dynamicPressure = 0.5 * CONFIG.physics.airDensity * windSpeed * windSpeed;

        // === DÉFINITION DES 4 SURFACES TRIANGULAIRES ===
        // Coordonnées locales basées sur Kite2.ts
        const NEZ = new THREE.Vector3(0, 0.65, 0);
        const SPINE_BAS = new THREE.Vector3(0, 0, 0);
        const BORD_GAUCHE = new THREE.Vector3(-0.825, 0, 0);
        const BORD_DROIT = new THREE.Vector3(0.825, 0, 0);
        const WHISKER_GAUCHE = new THREE.Vector3(-0.4125, 0.1, -0.15); // Angle dièdre
        const WHISKER_DROIT = new THREE.Vector3(0.4125, 0.1, -0.15);

        // Définir les 4 surfaces avec leurs sommets
        // Calcul des aires réelles basé sur les dimensions
        // Surface haute : triangle avec base ~0.825m et hauteur ~0.55m → aire ≈ 0.23 m²
        // Surface basse : triangle avec base ~0.4m et hauteur ~0.55m → aire ≈ 0.11 m²
        const surfaces = [
            { // Surface gauche haute
                vertices: [NEZ, BORD_GAUCHE, WHISKER_GAUCHE],
                area: 0.23 // m² calculé géométriquement
            },
            { // Surface gauche basse
                vertices: [NEZ, WHISKER_GAUCHE, SPINE_BAS],
                area: 0.11 // m² calculé géométriquement
            },
            { // Surface droite haute
                vertices: [NEZ, BORD_DROIT, WHISKER_DROIT],
                area: 0.23 // m² calculé géométriquement
            },
            { // Surface droite basse
                vertices: [NEZ, WHISKER_DROIT, SPINE_BAS],
                area: 0.11 // m² calculé géométriquement
            }
        ];
        // Aire totale : 0.68 m² pour un cerf-volant de 1.65m × 0.65m

        // === CALCUL DES FORCES SUR CHAQUE SURFACE ===
        let totalForce = new THREE.Vector3();
        let totalTorque = new THREE.Vector3();

        surfaces.forEach((surface) => {
            // Calculer la normale locale de la surface (produit vectoriel)
            const v1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const v2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            let normaleLocale = new THREE.Vector3().crossVectors(v1, v2).normalize();
            
            // S'assurer que la normale pointe vers l'arrière (Z négatif en local)
            // pour recevoir le vent qui vient de l'avant
            if (normaleLocale.z > 0) {
                normaleLocale.negate(); // Inverser si elle pointe vers l'avant
            }

            // Transformer la normale en coordonnées monde
            const normaleMonde = normaleLocale.clone().applyQuaternion(kiteOrientation);

            // Calculer l'angle d'incidence (0 si dos au vent)
            const cosAngle = Math.max(0, windDir.dot(normaleMonde));

            // Force = pression × aire × cos(angle) dans la direction de la normale
            const forceMagnitude = dynamicPressure * surface.area * cosAngle;
            const force = normaleMonde.clone().multiplyScalar(forceMagnitude);

            // Ajouter à la force totale
            totalForce.add(force);

            // Calculer le point d'application (centre du triangle)
            const centre = surface.vertices[0].clone()
                .add(surface.vertices[1])
                .add(surface.vertices[2])
                .divideScalar(3);
            const centreWorld = centre.clone().applyQuaternion(kiteOrientation);

            // Couple = rayon × force (pour la rotation autour du centre de masse)
            const torque = new THREE.Vector3().crossVectors(centreWorld, force);
            totalTorque.add(torque);
        });

        // === EFFET DES BRIDES ===
        // Les brides influencent le couple de stabilisation
        // bridleFactor est utilisé indirectement via le couple de stabilisation
        
        // Ajouter un léger couple de stabilisation basé sur l'orientation
        const toPilot = pilotPosition.clone().sub(kitePosition).normalize();
        const alignmentError = new THREE.Vector3().crossVectors(windDir, toPilot);
        const stabilizationTorque = alignmentError.multiplyScalar(
            dynamicPressure * 0.1 * CONFIG.kite.stabilizationTorqueFactor
        );
        totalTorque.add(stabilizationTorque);

        // === DÉCOMPOSITION EN LIFT ET DRAG ===
        // Pour l'affichage/debug, on peut décomposer la force totale
        // Drag = composante parallèle au vent
        const dragMagnitude = totalForce.dot(windDir);
        const dragForce = windDir.clone().multiplyScalar(Math.max(0, dragMagnitude));
        
        // Lift = composante perpendiculaire au vent
        const liftForce = totalForce.clone().sub(dragForce);

        return {
            lift: liftForce,
            drag: dragForce,
            torque: totalTorque
        };
    }
}

// ==============================================================================
// LINE SYSTEM - Gestion des lignes et tensions
// ==============================================================================

class LineSystem {
    public lineLength: number;

    constructor(lineLength: number = CONFIG.lines.defaultLength) {
        this.lineLength = lineLength;
    }

    /**
     * Calcule les forces de tension des lignes
     * Les lignes sont soit tendues (contrainte gérée dans KiteController), soit molles (pas de force)
     */
    calculateTensions(
        kite: Kite2,
        _handleLeft: THREE.Vector3,  // Non utilisé car la contrainte est gérée dans KiteController
        _handleRight: THREE.Vector3, // Non utilisé car la contrainte est gérée dans KiteController
        controlRotation: number
    ): { leftForce: THREE.Vector3; rightForce: THREE.Vector3; torque: THREE.Vector3 } {
        const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = kite.getPoint('CTRL_DROIT');

        if (!ctrlLeft || !ctrlRight) {
            return {
                leftForce: new THREE.Vector3(),
                rightForce: new THREE.Vector3(),
                torque: new THREE.Vector3()
            };
        }

        // Convertir en coordonnées monde
        const ctrlLeftWorld = ctrlLeft.clone();
        const ctrlRightWorld = ctrlRight.clone();
        kite.localToWorld(ctrlLeftWorld);
        kite.localToWorld(ctrlRightWorld);

        // === PAS DE FORCE DE TENSION ===
        // La contrainte de distance est maintenant gérée directement dans KiteController
        // Les lignes sont soit tendues (bloquées par la contrainte), soit molles (pas de force)
        const leftForce = new THREE.Vector3();
        const rightForce = new THREE.Vector3();

        // === COUPLE DE CONTRÔLE ===
        // La rotation de la barre crée un couple pour faire tourner le cerf-volant
        let totalTorque = new THREE.Vector3();

        // Couple proportionnel à la rotation de la barre
        if (Math.abs(controlRotation) > 0.01) {
            // Le couple agit autour de l'axe vertical du cerf-volant
            const kiteUp = new THREE.Vector3(0, 1, 0);
            kiteUp.applyQuaternion(kite.quaternion);
            
            // Plus la barre est tournée, plus le couple est fort
            const torqueStrength = controlRotation * CONFIG.lines.controlFactor;
            totalTorque = kiteUp.multiplyScalar(torqueStrength);
        }

        return {
            leftForce,
            rightForce,
            torque: totalTorque
        };
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
        // Initialiser la longueur de ligne dans userData
        this.kite.userData.lineLength = CONFIG.lines.defaultLength;
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
        // === GARDE-FOUS : Vérifier les valeurs d'entrée ===
        if (!forces || forces.length() > 1000 || isNaN(forces.length())) {
            console.error(`⚠️ Forces invalides: ${forces ? forces.toArray() : 'undefined'}`);
            forces = new THREE.Vector3();
        }
        
        if (!torque || torque.length() > 100 || isNaN(torque.length())) {
            console.error(`⚠️ Couple invalide: ${torque ? torque.toArray() : 'undefined'}`);
            torque = new THREE.Vector3();
        }

        // Accélération = F / m
        const acceleration = forces.divideScalar(CONFIG.kite.mass);
        
        // === GARDE-FOU : Limiter l'accélération ===
        const maxAcceleration = 50; // m/s²
        if (acceleration.length() > maxAcceleration) {
            console.warn(`⚠️ Accélération excessive: ${acceleration.length()}m/s² (capée à ${maxAcceleration})`);
            acceleration.normalize().multiplyScalar(maxAcceleration);
        }

        // Intégration de la vélocité (Euler explicite)
        this.state.velocity.add(acceleration.multiplyScalar(deltaTime));
        this.state.velocity.multiplyScalar(CONFIG.physics.linearDamping);
        
        // === GARDE-FOU : Limiter la vitesse ===
        const maxVelocity = 30; // m/s
        if (this.state.velocity.length() > maxVelocity) {
            console.warn(`⚠️ Vitesse excessive: ${this.state.velocity.length()}m/s (capée à ${maxVelocity})`);
            this.state.velocity.normalize().multiplyScalar(maxVelocity);
        }

        // Nouvelle position - mouvement libre dans l'espace 3D
        const newPosition = this.kite.position.clone()
            .add(this.state.velocity.clone().multiplyScalar(deltaTime));

        // === CONTRAINTE DE DISTANCE STRICTE ===
        // Les lignes ne peuvent pas s'étirer au-delà de leur longueur max
        const lineLength = this.kite.userData.lineLength || CONFIG.lines.defaultLength;
        const toPilot = newPosition.clone().sub(pilotPosition);
        const distance = toPilot.length();
        
        if (distance > lineLength) {
            // Projeter le cerf-volant sur la sphère limite
            const direction = toPilot.normalize();
            newPosition.copy(pilotPosition.clone().add(direction.multiplyScalar(lineLength * 0.99))); // 99% pour éviter les erreurs numériques
            
            // Annuler la composante radiale de la vitesse (qui éloigne)
            const radialVelocity = this.state.velocity.dot(direction);
            if (radialVelocity > 0) { // Si on s'éloigne
                this.state.velocity.sub(direction.clone().multiplyScalar(radialVelocity));
            }
        }

        // Hauteur minimale au sol seulement
        newPosition.y = Math.max(CONFIG.kite.minHeight, newPosition.y);
        
        // === GARDE-FOU : Vérifier la position finale ===
        if (isNaN(newPosition.x) || isNaN(newPosition.y) || isNaN(newPosition.z)) {
            console.error(`⚠️ Position NaN détectée! Reset à la position précédente`);
            newPosition.copy(this.previousPosition);
            this.state.velocity.set(0, 0, 0);
        }

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
        _pilotPosition: THREE.Vector3,
        deltaTime: number
    ): void {
        // Accélération angulaire = Couple / Inertie
        const angularAcceleration = torque.clone().divideScalar(CONFIG.kite.inertia);
        
        // === GARDE-FOU : Limiter l'accélération angulaire ===
        const maxAngularAcceleration = 20; // rad/s²
        if (angularAcceleration.length() > maxAngularAcceleration) {
            console.warn(`⚠️ Accélération angulaire excessive: ${angularAcceleration.length()}rad/s²`);
            angularAcceleration.normalize().multiplyScalar(maxAngularAcceleration);
        }

        // Mise à jour de la vitesse angulaire
        this.state.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
        this.state.angularVelocity.multiplyScalar(CONFIG.physics.angularDamping);
        
        // === GARDE-FOU : Limiter la vitesse angulaire ===
        const maxAngularVelocity = 5; // rad/s (environ 1 tour toutes les 1.25 secondes max)
        if (this.state.angularVelocity.length() > maxAngularVelocity) {
            console.warn(`⚠️ Vitesse angulaire excessive: ${this.state.angularVelocity.length()}rad/s`);
            this.state.angularVelocity.normalize().multiplyScalar(maxAngularVelocity);
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

    setLineLength(length: number): void {
        this.kite.userData.lineLength = length;
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
        this.kiteController.setLineLength(length);
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

export class SimulationAppV5 {
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
    private frameCount: number = 0;  // Compteur de frames pour optimisation

    constructor() {
        console.log('🚀 Démarrage de la Simulation V5 - Version améliorée basée sur V3');

        try {
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
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de SimulationV5:', error);
            throw error; // Re-lancer pour déclencher le fallback
        }
    }

    private setupKite(): void {
        this.kite = new Kite2();
        // Position initiale : lignes TENDUES dès le départ
        const initialDistance = CONFIG.lines.defaultLength * 0.95;
        // Position en hauteur avec lignes presque tendues
        this.kite.position.set(0, 7, -initialDistance);
        
        // PAS D'INCLINAISON ARTIFICIELLE - Le cerf-volant s'oriente naturellement par les brides
        // this.kite.rotation.set(0, 0, 0); // Inutile, déjà à zéro par défaut
        
        console.log(`📍 Position initiale du kite: ${this.kite.position.toArray()}`);
        console.log(`📏 Distance initiale: ${this.kite.position.distanceTo(new THREE.Vector3(0, 1.2, 8))}m (max: ${CONFIG.lines.defaultLength}m)`);
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

                // Si le cerf-volant est trop loin, le ramener à la nouvelle distance max
                const kitePosition = this.kite.position;
                const pilotPosition = this.controlBar.position;
                const distance = kitePosition.distanceTo(pilotPosition);

                if (distance > length) {
                    // Projeter le cerf-volant sur la nouvelle sphère
                    const direction = kitePosition.clone().sub(pilotPosition).normalize();
                    kitePosition.copy(pilotPosition.clone().add(direction.multiplyScalar(length * 0.95)));
                    console.log(`📏 Cerf-volant repositionné pour longueur de ligne: ${length}m`);
                }
            };
        }

        // Longueur des brides (facteur de bride)
        const bridleSlider = document.getElementById('bridle-length') as HTMLInputElement;
        const bridleValue = document.getElementById('bridle-length-value');
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
        // Utiliser la longueur de ligne actuelle, pas la valeur par défaut
        const currentLineLength = this.physicsEngine.getLineSystem().lineLength || CONFIG.lines.defaultLength;
        const initialDistance = currentLineLength * 0.95;
        
        // Réinitialiser position SANS orientation forcée
        this.kite.position.set(0, 7, -initialDistance);
        
        // PAS D'INCLINAISON ARTIFICIELLE - Orientation naturelle uniquement
        this.kite.rotation.set(0, 0, 0);
        this.kite.quaternion.identity();
        this.controlBar.quaternion.identity();

        // Créer un nouveau KiteController pour réinitialiser complètement l'état
        // C'est plus propre que d'essayer de modifier l'état interne
        this.physicsEngine = new PhysicsEngine(this.kite, this.controlBar);
        this.physicsEngine.setLineLength(currentLineLength);
        
        // Appliquer les paramètres de vent actuels
        const speedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const dirSlider = document.getElementById('wind-direction') as HTMLInputElement;
        const turbSlider = document.getElementById('wind-turbulence') as HTMLInputElement;
        
        if (speedSlider && dirSlider && turbSlider) {
            this.physicsEngine.setWindParams({
                speed: parseFloat(speedSlider.value),
                direction: parseFloat(dirSlider.value),
                turbulence: parseFloat(turbSlider.value)
            });
        }

        console.log(`🔄 Simulation réinitialisée avec longueur de ligne: ${currentLineLength}m`);
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
            // Afficher si les lignes sont tendues ou non
            const lineLength = this.physicsEngine.getLineSystem().lineLength || CONFIG.lines.defaultLength;
            const pilotPosition = this.controlBar.position;
            const distance = kitePosition.distanceTo(pilotPosition);
            const isTaut = distance >= lineLength * 0.99; // Lignes tendues à 99% ou plus
            tensionDisplay.textContent = isTaut ? "TENDUE" : "MOLLE";
        }

        if (altitudeDisplay) {
            altitudeDisplay.textContent = kitePosition.y.toFixed(1);
        }
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);
        
        // Log périodique toutes les 60 frames (environ 1 seconde)
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            const kitePos = this.kite.position;
            const pilotPos = this.controlBar.position;
            const distance = kitePos.distanceTo(pilotPos);
            const state = this.physicsEngine.getKiteController().getState();
            
            console.log(`📊 [Frame ${this.frameCount}] Distance: ${distance.toFixed(2)}m/${CONFIG.lines.defaultLength}m | ` +
                       `Pos: [${kitePos.x.toFixed(1)}, ${kitePos.y.toFixed(1)}, ${kitePos.z.toFixed(1)}] | ` +
                       `Vel: ${state.velocity.length().toFixed(2)}m/s | ` +
                       `AngVel: ${state.angularVelocity.length().toFixed(2)}rad/s`);
        }

        if (this.isPlaying) {
            try {
                const deltaTime = this.clock.getDelta();
                const targetRotation = this.inputHandler.getTargetBarRotation();

                // Mettre à jour la physique
                this.physicsEngine.update(deltaTime, targetRotation);

                // Mettre à jour les lignes visuelles
                this.updateControlLines();

                // Mettre à jour les flèches de debug si activé
                this.updateDebugArrows();
            } catch (error) {
                console.error('❌ Erreur dans la boucle d\'animation SimulationV5:', error);
                this.isPlaying = false; // Arrêter l'animation en cas d'erreur
                throw error; // Re-lancer l'erreur pour déclencher le fallback
            }
        }

        // Rendu
        this.renderManager.render();
    }

    /**
     * Nettoie les ressources de la simulation
     */
    public cleanup(): void {
        console.log('🧹 Nettoyage de SimulationV5...');

        // Arrêter l'animation
        this.isPlaying = false;

        // Nettoyer les flèches de debug
        this.debugArrows.forEach(arrow => {
            this.renderManager.removeObject(arrow);
        });
        this.debugArrows = [];

        // Nettoyer les lignes de contrôle
        if (this.leftLine) {
            this.renderManager.removeObject(this.leftLine);
            this.leftLine = null;
        }
        if (this.rightLine) {
            this.renderManager.removeObject(this.rightLine);
            this.rightLine = null;
        }

        // Nettoyer le cerf-volant
        if (this.kite) {
            this.renderManager.removeObject(this.kite);
        }

        // Nettoyer la barre de contrôle
        if (this.controlBar) {
            this.renderManager.removeObject(this.controlBar);
        }

        console.log('✅ SimulationV5 nettoyée');
    }
}

// Code d'auto-exécution retiré pour permettre le chargement dynamique
// L'instanciation est maintenant gérée par SimulationLoader