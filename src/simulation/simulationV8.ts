/**
 * SimulationV8.ts - Simulation de cerf-volant avec physique réaliste
 * 
 * 🌬️ CE QUE FAIT CE CODE :
 * Ce fichier simule un vrai cerf-volant dans le vent. Imaginez que vous tenez
 * une barre de contrôle avec deux lignes attachées au cerf-volant.
 * Quand vous tirez sur une ligne, le cerf-volant tourne de ce côté.
 * 
 * 🎮 COMMENT ÇA MARCHE :
 * - Vous tournez la barre avec les flèches du clavier
 * - La rotation tire une ligne et relâche l'autre
 * - Le côté tiré se rapproche, changeant l'angle du cerf-volant
 * - Le vent pousse différemment sur chaque côté
 * - Cette différence fait tourner le cerf-volant naturellement
 * 
 * 🎯 POURQUOI C'EST SPÉCIAL :
 * Au lieu de "tricher" avec des formules magiques, on simule vraiment
 * la physique : le vent, les lignes, le poids, tout comme dans la vraie vie!
 * 
 * Architecture modulaire avec séparation des responsabilités :
 * - PhysicsEngine : Orchestration de la simulation
 * - KiteController : Gestion du cerf-volant  
 * - WindSimulator : Simulation du vent
 * - LineSystem : Système de lignes et contraintes (MODIFIÉ)
 * - ControlBarManager : Gestion centralisée de la barre
 * - RenderManager : Gestion du rendu 3D
 * - InputHandler : Gestion des entrées utilisateur
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Kite2 } from '@objects/organic/Kite2';

// ==============================================================================
// CONSTANTES PHYSIQUES GLOBALES
// ==============================================================================

/**
 * Les règles du jeu - comme les limites de vitesse sur la route
 * Ces nombres définissent ce qui est possible ou pas dans notre monde virtuel
 */
class PhysicsConstants {
    static readonly EPSILON = 1e-4;                    // Un tout petit nombre pour dire "presque zéro"
    static readonly CONTROL_DEADZONE = 0.01;           // La barre ne réagit pas si vous la bougez très peu
    static readonly LINE_CONSTRAINT_TOLERANCE = 0.005; // Les lignes peuvent s'étirer de 5mm max (marge d'erreur)
    static readonly LINE_TENSION_FACTOR = 0.99;        // Les lignes restent un peu plus courtes pour rester tendues
    static readonly GROUND_FRICTION = 0.85;            // Le sol freine le kite de 15% s'il le touche
    static readonly CATENARY_SEGMENTS = 5;             // Nombre de points pour dessiner la courbe des lignes

    // Limites de sécurité - pour que la simulation ne devienne pas folle
    static readonly MAX_FORCE = 1000;                  // Force max en Newtons (comme soulever 100kg)
    static readonly MAX_VELOCITY = 30;                 // Vitesse max : 30 m/s = 108 km/h
    static readonly MAX_ANGULAR_VELOCITY = 5;          // Rotation max : presque 1 tour par seconde
    static readonly MAX_ACCELERATION = 50;             // Le kite ne peut pas accélérer plus vite qu'une voiture de sport
    static readonly MAX_ANGULAR_ACCELERATION = 20;     // La rotation ne peut pas s'emballer
}

// ==============================================================================
// GÉOMÉTRIE DU CERF-VOLANT
// ==============================================================================

/**
 * La forme du cerf-volant - comme un plan de construction
 * On définit où sont tous les points importants du cerf-volant
 */
class KiteGeometry {
    // Les points clés du cerf-volant (comme les coins d'une maison)
    // Coordonnées en mètres : [gauche/droite, haut/bas, avant/arrière]
    static readonly POINTS = {
        NEZ: new THREE.Vector3(0, 0.65, 0),                      // Le bout pointu en haut
        SPINE_BAS: new THREE.Vector3(0, 0, 0),                   // Le centre en bas
        BORD_GAUCHE: new THREE.Vector3(-0.825, 0, 0),            // L'extrémité de l'aile gauche
        BORD_DROIT: new THREE.Vector3(0.825, 0, 0),              // L'extrémité de l'aile droite
        WHISKER_GAUCHE: new THREE.Vector3(-0.4125, 0.1, -0.15),  // Stabilisateur gauche (légèrement en arrière)
        WHISKER_DROIT: new THREE.Vector3(0.4125, 0.1, -0.15),    // Stabilisateur droit (légèrement en arrière)
        CTRL_GAUCHE: new THREE.Vector3(-0.15, 0.3, 0.4),         // Où s'attache la ligne gauche
        CTRL_DROIT: new THREE.Vector3(0.15, 0.3, 0.4)            // Où s'attache la ligne droite
    };

    // Le cerf-volant est fait de 4 triangles de tissu
    // Chaque triangle a 3 coins (vertices) et une surface en mètres carrés
    static readonly SURFACES = [
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.BORD_GAUCHE,
                KiteGeometry.POINTS.WHISKER_GAUCHE
            ],
            area: 0.23 // m² - Surface haute gauche
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.WHISKER_GAUCHE,
                KiteGeometry.POINTS.SPINE_BAS
            ],
            area: 0.11 // m² - Surface basse gauche
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.BORD_DROIT,
                KiteGeometry.POINTS.WHISKER_DROIT
            ],
            area: 0.23 // m² - Surface haute droite
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.WHISKER_DROIT,
                KiteGeometry.POINTS.SPINE_BAS
            ],
            area: 0.11 // m² - Surface basse droite
        }
    ];

    static readonly TOTAL_AREA = 0.68; // m² - Surface totale
}

// ==============================================================================
// CONFIGURATION ÉPURÉE
// ==============================================================================

/**
 * Les réglages de notre monde virtuel - comme les règles d'un jeu
 * Vous pouvez changer ces valeurs pour voir comment le cerf-volant réagit
 */
const CONFIG = {
    physics: {
        gravity: 9.81,              // La gravité terrestre (fait tomber les objets)
        airDensity: 1.225,          // Densité de l'air (l'air épais pousse plus fort)
        deltaTimeMax: 0.016,        // Mise à jour max 60 fois par seconde (pour rester fluide)
        angularDamping: 0.95,       // Le kite ralentit sa rotation de 5% à chaque instant
        linearDamping: 0.98,        // Le kite perd 2% de sa vitesse à cause du frottement de l'air
        angularDragCoeff: 0.02      // L'air résiste un peu quand le kite tourne
    },
    aero: {
        liftScale: 1.35,            // Facteur d'échelle pour la portance
        dragScale: 1.0              // Facteur d'échelle pour la traînée
    },
    kite: {
        mass: 0.28,                 // kg - Masse du cerf-volant
        area: KiteGeometry.TOTAL_AREA, // m² - Surface totale
        inertia: 0.15,              // kg·m² - Moment d'inertie (augmenté pour stabilité)
        minHeight: 0.0              // m - Altitude minimale (sol)
    },
    lines: {
        defaultLength: 15,          // m - Longueur par défaut
        stiffness: 5000,            // N/m - Raideur des lignes (comme une corde raide)
        maxTension: 500,            // N - Tension maximale par ligne
        maxSag: 0.01,               // Affaissement max pour visuel
        catenarySagFactor: 4        // Facteur de forme caténaire
    },
    wind: {
        defaultSpeed: 18,           // km/h
        defaultDirection: 0,        // degrés
        defaultTurbulence: 3,       // %
        turbulenceScale: 0.15,
        turbulenceFreqBase: 0.3,
        turbulenceFreqY: 1.3,
        turbulenceFreqZ: 0.7,
        turbulenceIntensityXZ: 0.8,
        turbulenceIntensityY: 0.2,
        maxApparentSpeed: 25        // m/s - Limite vent apparent
    },
    rendering: {
        shadowMapSize: 2048,
        antialias: true,
        fogStart: 100,
        fogEnd: 1000
    },
    controlBar: {
        width: 0.6,                 // m - Largeur de la barre
        position: new THREE.Vector3(0, 1.2, 8) // Position initiale
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

interface HandlePositions {
    left: THREE.Vector3;
    right: THREE.Vector3;
}

// ==============================================================================
// CONTROL BAR MANAGER - Gestion centralisée de la barre de contrôle
// ==============================================================================

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
    updateVisual(bar: THREE.Group, kite: Kite2): void {
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

// ==============================================================================
// WIND SIMULATOR - Gestion du vent et turbulences
// ==============================================================================

class WindSimulator {
    private params: WindParams;
    private time: number = 0;  // Compteur de temps pour faire varier les turbulences

    constructor() {
        // On démarre avec les réglages par défaut du vent
        this.params = {
            speed: CONFIG.wind.defaultSpeed,
            direction: CONFIG.wind.defaultDirection,
            turbulence: CONFIG.wind.defaultTurbulence
        };
    }

    /**
     * Calcule le vent que "ressent" le cerf-volant
     * C'est comme quand vous mettez la main par la fenêtre d'une voiture :
     * - Si la voiture roule vite, vous sentez plus de vent
     * - Si vous allez contre le vent, il est plus fort
     * - Si vous allez avec le vent, il est plus faible
     */
    getApparentWind(kiteVelocity: THREE.Vector3, deltaTime: number): THREE.Vector3 {
        this.time += deltaTime;

        const windSpeedMs = this.params.speed / 3.6;
        const windRad = (this.params.direction * Math.PI) / 180;

        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windSpeedMs,
            0,
            -Math.cos(windRad) * windSpeedMs
        );

        // Ajouter des rafales aléatoires mais réalistes
        // Les turbulences font bouger le vent de façon imprévisible
        // Comme les tourbillons qu'on sent parfois dehors
        if (this.params.turbulence > 0) {
            const turbIntensity = this.params.turbulence / 100 * CONFIG.wind.turbulenceScale;
            const freq = CONFIG.wind.turbulenceFreqBase;  // Fréquence des changements

            // On utilise des sinus pour créer des variations douces et naturelles
            windVector.x += Math.sin(this.time * freq) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityXZ;
            windVector.y += Math.sin(this.time * freq * CONFIG.wind.turbulenceFreqY) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityY;
            windVector.z += Math.cos(this.time * freq * CONFIG.wind.turbulenceFreqZ) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityXZ;
        }

        // Le vent apparent = vent réel - vitesse du kite
        // Si le kite va vite vers l'avant, il "crée" du vent de face
        const apparent = windVector.clone().sub(kiteVelocity);
        
        // On limite pour éviter des valeurs irréalistes
        if (apparent.length() > CONFIG.wind.maxApparentSpeed) {
            apparent.setLength(CONFIG.wind.maxApparentSpeed);
        }
        return apparent;
    }

    /**
     * Obtient le vecteur de vent à une position donnée
     */
    getWindAt(_position: THREE.Vector3): THREE.Vector3 {
        const windSpeedMs = this.params.speed / 3.6;
        const windRad = (this.params.direction * Math.PI) / 180;

        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windSpeedMs,
            0,
            -Math.cos(windRad) * windSpeedMs
        );

        if (this.params.turbulence > 0) {
            const turbIntensity = this.params.turbulence / 100 * CONFIG.wind.turbulenceScale;
            const freq = 0.5;

            windVector.x += Math.sin(this.time * freq) * windSpeedMs * turbIntensity;
            windVector.y += Math.sin(this.time * freq * 1.3) * windSpeedMs * turbIntensity * 0.3;
            windVector.z += Math.cos(this.time * freq * 0.7) * windSpeedMs * turbIntensity;
        }

        return windVector;
    }

    setParams(params: Partial<WindParams>): void {
        Object.assign(this.params, params);
    }

    getParams(): WindParams {
        return { ...this.params };
    }
}

// ==============================================================================
// AERODYNAMICS CALCULATOR - Calcul des forces aérodynamiques
// ==============================================================================

class AerodynamicsCalculator {
    /**
     * Calcule comment le vent pousse sur le cerf-volant
     * 
     * COMMENT ÇA MARCHE :
     * 1. On regarde chaque triangle du cerf-volant
     * 2. On calcule sous quel angle le vent frappe ce triangle
     * 3. Plus le vent frappe de face, plus la force est grande
     * 4. On additionne toutes les forces pour avoir la force totale
     * 
     * POURQUOI C'EST IMPORTANT :
     * Si un côté du kite reçoit plus de vent, il sera poussé plus fort
     * Cette différence fait tourner le kite naturellement !
     */
    static calculateForces(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion
    ): { lift: THREE.Vector3; drag: THREE.Vector3; torque: THREE.Vector3; leftForce?: THREE.Vector3; rightForce?: THREE.Vector3 } {
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

        // Forces séparées pour gauche et droite
        let leftForce = new THREE.Vector3();
        let rightForce = new THREE.Vector3();
        let totalForce = new THREE.Vector3();
        let totalTorque = new THREE.Vector3();

        // On examine chaque triangle du cerf-volant un par un
        // C'est comme vérifier comment le vent frappe chaque panneau d'un parasol
        KiteGeometry.SURFACES.forEach((surface) => {
            // Pour comprendre comment le vent frappe ce triangle,
            // on doit savoir dans quelle direction il "regarde"
            // (comme l'orientation d'un panneau solaire)
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleLocale = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

            // 2. Rotation de la normale selon l'orientation du kite
            const normaleMonde = normaleLocale.clone().applyQuaternion(kiteOrientation);

            // Maintenant on vérifie sous quel angle le vent frappe ce triangle
            // C'est comme mettre votre main par la fenêtre de la voiture :
            // - Main à plat face au vent = beaucoup de force
            // - Main de profil = peu de force
            const facing = windDir.dot(normaleMonde);
            const cosIncidence = Math.max(0, Math.abs(facing));

            // Si le vent glisse sur le côté (angle = 0), pas de force
            if (cosIncidence <= PhysicsConstants.EPSILON) {
                return;
            }

            // 4. Force perpendiculaire à la surface (pression aérodynamique)
            const normalDir = facing >= 0 ? normaleMonde.clone() : normaleMonde.clone().negate();

            // 5. Intensité = pression dynamique × surface × cos(angle)
            const forceMagnitude = dynamicPressure * surface.area * cosIncidence;
            const force = normalDir.multiplyScalar(forceMagnitude);

            // 6. Centre de pression = centre géométrique du triangle
            const centre = surface.vertices[0].clone()
                .add(surface.vertices[1])
                .add(surface.vertices[2])
                .divideScalar(3);

            // On note si cette force est sur le côté gauche ou droit
            // C'est important car si un côté a plus de force,
            // le kite va tourner (comme un bateau avec une seule rame)
            const isLeft = centre.x < 0;  // Négatif = gauche, Positif = droite
            
            if (isLeft) {
                leftForce.add(force);  // On additionne à la force totale gauche
            } else {
                rightForce.add(force); // On additionne à la force totale droite
            }
            
            totalForce.add(force);

            // Le couple, c'est ce qui fait tourner le kite
            // Imaginez une porte : si vous poussez près des gonds, elle tourne peu
            // Si vous poussez loin des gonds, elle tourne beaucoup
            // Ici, plus la force est loin du centre, plus elle fait tourner
            const centreWorld = centre.clone().applyQuaternion(kiteOrientation);
            const torque = new THREE.Vector3().crossVectors(centreWorld, force);
            totalTorque.add(torque);
        });

        // PHYSIQUE ÉMERGENTE : Le couple vient de la différence G/D
        // Si leftForce > rightForce → rotation vers la droite
        // Si rightForce > leftForce → rotation vers la gauche
        // AUCUN facteur artificiel nécessaire!

        // 9. Décomposition vectorielle en portance et traînée
        const dragMagnitude = totalForce.dot(windDir);  // Projection sur le vent
        const baseDrag = windDir.clone().multiplyScalar(Math.max(0, dragMagnitude));
        const baseLift = totalForce.clone().sub(baseDrag);  // Composante perpendiculaire

        const lift = baseLift.multiplyScalar(CONFIG.aero.liftScale);
        const drag = baseDrag.multiplyScalar(CONFIG.aero.dragScale);

        // Mise à l'échelle du couple
        const baseTotalMag = Math.max(PhysicsConstants.EPSILON, totalForce.length());
        const scaledTotalMag = lift.clone().add(drag).length();
        const torqueScale = Math.max(0.1, Math.min(3, scaledTotalMag / baseTotalMag));

        return {
            lift,
            drag,
            torque: totalTorque.multiplyScalar(torqueScale),
            leftForce,    // Exposer les forces pour analyse
            rightForce    // Permet de voir l'asym\u00e9trie \u00e9mergente
        };
    }

    /**
     * Calcule des métriques pour le debug
     */
    static computeMetrics(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion
    ): { apparentSpeed: number; liftMag: number; dragMag: number; lOverD: number; aoaDeg: number } {
        const windSpeed = apparentWind.length();
        if (windSpeed < PhysicsConstants.EPSILON) {
            return { apparentSpeed: 0, liftMag: 0, dragMag: 0, lOverD: 0, aoaDeg: 0 };
        }

        const { lift, drag } = this.calculateForces(apparentWind, kiteOrientation);
        const liftMag = lift.length();
        const dragMag = drag.length();
        const lOverD = dragMag > PhysicsConstants.EPSILON ? (liftMag / dragMag) : 0;

        // Calcul approximatif de l'angle d'attaque
        const windDir = apparentWind.clone().normalize();
        let weightedNormal = new THREE.Vector3();

        KiteGeometry.SURFACES.forEach((surface) => {
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleMonde = new THREE.Vector3()
                .crossVectors(edge1, edge2)
                .normalize()
                .applyQuaternion(kiteOrientation);

            const facing = windDir.dot(normaleMonde);
            const cosIncidence = Math.max(0, Math.abs(facing));

            const normalDir = facing >= 0 ? normaleMonde : normaleMonde.clone().negate();
            weightedNormal.add(normalDir.multiplyScalar(surface.area * cosIncidence));
        });

        let aoaDeg = 0;
        if (weightedNormal.lengthSq() > PhysicsConstants.EPSILON * PhysicsConstants.EPSILON) {
            const eff = weightedNormal.normalize();
            const dot = Math.max(-1, Math.min(1, eff.dot(windDir)));
            const phiDeg = Math.acos(dot) * 180 / Math.PI;
            aoaDeg = Math.max(0, 90 - phiDeg);
        }

        return { apparentSpeed: windSpeed, liftMag, dragMag, lOverD, aoaDeg };
    }
}

// ==============================================================================
// LINE SYSTEM - Gestion des lignes et contraintes
// ==============================================================================

class LineSystem {
    public lineLength: number;

    constructor(lineLength: number = CONFIG.lines.defaultLength) {
        this.lineLength = lineLength;
    }

    /**
     * Calcule comment les lignes tirent sur le cerf-volant
     * 
     * PRINCIPE DE BASE :
     * Les lignes sont comme des cordes : elles peuvent tirer mais pas pousser
     * - Ligne tendue = elle tire sur le kite
     * - Ligne molle = aucune force
     * 
     * COMMENT LA BARRE CONTRÔLE :
     * Quand vous tournez la barre :
     * - Rotation à gauche = main gauche recule, main droite avance
     * - La ligne gauche se raccourcit, la droite s'allonge
     * - Le côté gauche du kite est tiré, il se rapproche
     * - Cette asymétrie fait tourner le kite !
     */
    calculateLineTensions(kite: Kite2, controlRotation: number, pilotPosition: THREE.Vector3): {
        leftForce: THREE.Vector3;
        rightForce: THREE.Vector3;
        torque: THREE.Vector3;
    } {
        // Points d'attache des lignes sur le kite (en coordonnées locales)
        const leftAttach = new THREE.Vector3(-0.15, 0.3, 0.4);
        const rightAttach = new THREE.Vector3(0.15, 0.3, 0.4);

        // Transformer en coordonnées monde
        const leftWorld = leftAttach.clone().applyQuaternion(kite.quaternion).add(kite.position);
        const rightWorld = rightAttach.clone().applyQuaternion(kite.quaternion).add(kite.position);

        // On calcule où sont exactement les mains du pilote
        // Imaginez que vous tenez une barre de 60cm de large
        const barHalfWidth = CONFIG.controlBar.width * 0.5;  // 30cm de chaque côté
        const barRight = new THREE.Vector3(1, 0, 0);
        
        // Quand vous tournez la barre (comme un guidon de vélo) :
        // - Tourner à gauche = votre main gauche recule, la droite avance
        // - Tourner à droite = votre main droite recule, la gauche avance
        const leftHandleOffset = barRight.clone().multiplyScalar(-barHalfWidth)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), controlRotation);
        const rightHandleOffset = barRight.clone().multiplyScalar(barHalfWidth)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), controlRotation);
        
        const leftHandlePos = pilotPosition.clone().add(leftHandleOffset);
        const rightHandlePos = pilotPosition.clone().add(rightHandleOffset);
        
        // Vecteurs ligne : du kite vers le pilote
        const leftDistance = leftWorld.distanceTo(leftHandlePos);
        const rightDistance = rightWorld.distanceTo(rightHandlePos);
        
        const leftLineDir = leftHandlePos.clone().sub(leftWorld).normalize();
        const rightLineDir = rightHandlePos.clone().sub(rightWorld).normalize();
        
        // PRINCIPE CLÉ : Les lignes sont des CORDES, pas des ressorts!
        // - Ligne molle (distance < longueur) = AUCUNE force
        // - Ligne tendue (distance > longueur) = Force proportionnelle
        let leftForce = new THREE.Vector3();
        let rightForce = new THREE.Vector3();
        
        // Ligne gauche : F = k × extension (Hooke pour corde rigide)
        if (leftDistance > this.lineLength) {
            const extension = leftDistance - this.lineLength;  // Étirement en mètres
            const tension = Math.min(CONFIG.lines.stiffness * extension, CONFIG.lines.maxTension);
            leftForce = leftLineDir.multiplyScalar(tension);  // Force vers le pilote
        }
        
        // Ligne droite : même physique
        if (rightDistance > this.lineLength) {
            const extension = rightDistance - this.lineLength;
            const tension = Math.min(CONFIG.lines.stiffness * extension, CONFIG.lines.maxTension);
            rightForce = rightLineDir.multiplyScalar(tension);
        }
        
        // COUPLE ÉMERGENT : Résulte de l'asymétrie des tensions
        // Si ligne gauche tire plus fort → rotation horaire
        // Si ligne droite tire plus fort → rotation anti-horaire
        let totalTorque = new THREE.Vector3();
        
        // Couple ligne gauche (si tendue)
        if (leftForce.length() > 0) {
            const leftTorque = new THREE.Vector3().crossVectors(
                leftAttach.clone().applyQuaternion(kite.quaternion),  // Bras de levier
                leftForce                                              // Force appliquée
            );
            totalTorque.add(leftTorque);
        }
        
        // Couple ligne droite (si tendue)
        if (rightForce.length() > 0) {
            const rightTorque = new THREE.Vector3().crossVectors(
                rightAttach.clone().applyQuaternion(kite.quaternion),
                rightForce
            );
            totalTorque.add(rightTorque);
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
        segments: number = PhysicsConstants.CATENARY_SEGMENTS
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

    setLineLength(length: number): void {
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
    private angularWarnCooldown: number;

    constructor(kite: Kite2) {
        this.kite = kite;
        this.state = {
            position: kite.position.clone(),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            orientation: kite.quaternion.clone()
        };
        this.previousPosition = kite.position.clone();
        this.angularWarnCooldown = 0;
        this.kite.userData.lineLength = CONFIG.lines.defaultLength;
    }

    /**
     * Met à jour la position et l'orientation du cerf-volant
     * 
     * CE QUE FAIT CETTE FONCTION :
     * 1. Vérifie que les forces ne sont pas folles (sécurité)
     * 2. Calcule comment le kite accélère (Force = Masse × Accélération)
     * 3. Met à jour la vitesse et la position
     * 4. S'assure que les lignes ne s'étirent pas
     * 5. Empêche le kite de passer sous terre
     * 6. Fait tourner le kite selon les couples appliqués
     */
    update(
        forces: THREE.Vector3,
        torque: THREE.Vector3,
        handles: HandlePositions,
        deltaTime: number
    ): void {
        // Valider les entrées
        forces = this.validateForces(forces);
        torque = this.validateTorque(torque);

        // Intégration physique
        const newPosition = this.integratePhysics(forces, deltaTime);

        // Appliquer les contraintes
        this.enforceLineConstraints(newPosition, handles);
        this.handleGroundCollision(newPosition);
        this.validatePosition(newPosition);

        // Appliquer la position finale
        this.kite.position.copy(newPosition);
        this.previousPosition.copy(newPosition);

        // Mise à jour de l'orientation
        this.updateOrientation(torque, deltaTime);
    }

    /**
     * Valide et limite les forces
     */
    private validateForces(forces: THREE.Vector3): THREE.Vector3 {
        if (!forces || forces.length() > PhysicsConstants.MAX_FORCE || isNaN(forces.length())) {
            console.error(`⚠️ Forces invalides: ${forces ? forces.toArray() : 'undefined'}`);
            return new THREE.Vector3();
        }
        return forces;
    }

    /**
     * Valide le couple
     */
    private validateTorque(torque: THREE.Vector3): THREE.Vector3 {
        if (!torque || isNaN(torque.length())) {
            console.error(`⚠️ Couple invalide: ${torque ? torque.toArray() : 'undefined'}`);
            return new THREE.Vector3();
        }
        return torque;
    }

    /**
     * Intègre les forces pour calculer la nouvelle position (méthode d'Euler)
     * Implémente la 2ème loi de Newton : F = ma → a = F/m
     */
    private integratePhysics(forces: THREE.Vector3, deltaTime: number): THREE.Vector3 {
        // Newton : accélération = Force / masse
        const acceleration = forces.divideScalar(CONFIG.kite.mass);

        // Sécurité : limiter pour éviter l'explosion numérique
        if (acceleration.length() > PhysicsConstants.MAX_ACCELERATION) {
            console.warn(`⚠️ Accélération excessive: ${acceleration.length()}m/s²`);
            acceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ACCELERATION);
        }

        // Intégration d'Euler : v(t+dt) = v(t) + a·dt
        this.state.velocity.add(acceleration.multiplyScalar(deltaTime));
        // Amortissement : simule la résistance de l'air
        this.state.velocity.multiplyScalar(CONFIG.physics.linearDamping);

        // Garde-fou vitesse max (réalisme physique)
        if (this.state.velocity.length() > PhysicsConstants.MAX_VELOCITY) {
            console.warn(`⚠️ Vitesse excessive: ${this.state.velocity.length()}m/s`);
            this.state.velocity.normalize().multiplyScalar(PhysicsConstants.MAX_VELOCITY);
        }

        // Position : x(t+dt) = x(t) + v·dt
        return this.kite.position.clone()
            .add(this.state.velocity.clone().multiplyScalar(deltaTime));
    }

    /**
     * Applique les contraintes des lignes - Solver PBD (Position-Based Dynamics)
     * Algorithme sophistiqué qui respecte la contrainte de distance tout en
     * permettant la rotation naturelle du kite
     */
    private enforceLineConstraints(predictedPosition: THREE.Vector3, handles: HandlePositions): void {
        const lineLength = this.kite.userData.lineLength || CONFIG.lines.defaultLength;
        const tol = PhysicsConstants.LINE_CONSTRAINT_TOLERANCE;

        const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = this.kite.getPoint('CTRL_DROIT');
        if (!ctrlLeft || !ctrlRight) return;

        const mass = CONFIG.kite.mass;
        const inertia = CONFIG.kite.inertia;

        // Résolution PBD pour chaque ligne
        const solveLine = (ctrlLocal: THREE.Vector3, handle: THREE.Vector3) => {
            const q = this.kite.quaternion;
            const cpWorld = ctrlLocal.clone().applyQuaternion(q).add(predictedPosition);
            const diff = cpWorld.clone().sub(handle);
            const dist = diff.length();

            if (dist <= lineLength - tol) return; // Ligne molle

            const n = diff.clone().normalize();
            const C = dist - lineLength;

            const r = cpWorld.clone().sub(predictedPosition);
            const alpha = new THREE.Vector3().crossVectors(r, n);
            const invMass = 1 / mass;
            const invInertia = 1 / Math.max(inertia, PhysicsConstants.EPSILON);
            const denom = invMass + alpha.lengthSq() * invInertia;
            const lambda = C / Math.max(denom, PhysicsConstants.EPSILON);

            // Corrections
            const dPos = n.clone().multiplyScalar(-invMass * lambda);
            predictedPosition.add(dPos);

            const dTheta = alpha.clone().multiplyScalar(-invInertia * lambda);
            const angle = dTheta.length();
            if (angle > PhysicsConstants.EPSILON) {
                const axis = dTheta.normalize();
                const dq = new THREE.Quaternion().setFromAxisAngle(axis, angle);
                this.kite.quaternion.premultiply(dq).normalize();
            }

            // Correction de vitesse
            const q2 = this.kite.quaternion;
            const cpWorld2 = ctrlLocal.clone().applyQuaternion(q2).add(predictedPosition);
            const n2 = cpWorld2.clone().sub(handle).normalize();
            const r2 = cpWorld2.clone().sub(predictedPosition);
            const pointVel = this.state.velocity.clone()
                .add(new THREE.Vector3().crossVectors(this.state.angularVelocity, r2));
            const radialSpeed = pointVel.dot(n2);

            if (radialSpeed > 0) {
                const rxn = new THREE.Vector3().crossVectors(r2, n2);
                const eff = invMass + (rxn.lengthSq() * invInertia);
                const J = -radialSpeed / Math.max(eff, PhysicsConstants.EPSILON);

                this.state.velocity.add(n2.clone().multiplyScalar(J * invMass));
                const angImpulse = new THREE.Vector3().crossVectors(r2, n2.clone().multiplyScalar(J));
                this.state.angularVelocity.add(angImpulse.multiplyScalar(invInertia));
            }
        };

        // Deux passes pour mieux satisfaire les contraintes
        for (let i = 0; i < 2; i++) {
            solveLine(ctrlLeft, handles.left);
            solveLine(ctrlRight, handles.right);
        }
    }

    /**
     * Gère la collision avec le sol
     */
    private handleGroundCollision(newPosition: THREE.Vector3): void {
        const groundY = CONFIG.kite.minHeight;
        const pointsMap = this.kite.getPointsMap?.() as Map<string, [number, number, number]> | undefined;

        if (pointsMap && pointsMap.size > 0) {
            let minY = Infinity;
            const q = this.kite.quaternion;

            pointsMap.forEach(([px, py, pz]) => {
                const world = new THREE.Vector3(px, py, pz).applyQuaternion(q).add(newPosition);
                if (world.y < minY) minY = world.y;
            });

            if (minY < groundY) {
                const lift = groundY - minY;
                newPosition.y += lift;

                if (this.state.velocity.y < 0) this.state.velocity.y = 0;
                this.state.velocity.x *= PhysicsConstants.GROUND_FRICTION;
                this.state.velocity.z *= PhysicsConstants.GROUND_FRICTION;
            }
        } else {
            // Fallback simple
            if (newPosition.y < groundY) {
                newPosition.y = groundY;
                if (this.state.velocity.y < 0) this.state.velocity.y = 0;
                this.state.velocity.x *= PhysicsConstants.GROUND_FRICTION;
                this.state.velocity.z *= PhysicsConstants.GROUND_FRICTION;
            }
        }
    }

    /**
     * Valide la position finale
     */
    private validatePosition(newPosition: THREE.Vector3): void {
        if (isNaN(newPosition.x) || isNaN(newPosition.y) || isNaN(newPosition.z)) {
            console.error(`⚠️ Position NaN détectée! Reset à la position précédente`);
            newPosition.copy(this.previousPosition);
            this.state.velocity.set(0, 0, 0);
        }
    }

    /**
     * Met à jour l'orientation du cerf-volant - Dynamique du corps rigide
     * Implémente : Couple = Moment d'inertie × Accélération angulaire (T = Iα)
     */
    private updateOrientation(torque: THREE.Vector3, deltaTime: number): void {
        this.angularWarnCooldown = Math.max(0, this.angularWarnCooldown - deltaTime);

        // Couple d'amortissement (résistance à la rotation dans l'air)
        const dampTorque = this.state.angularVelocity.clone()
            .multiplyScalar(-CONFIG.physics.angularDragCoeff);
        const effectiveTorque = torque.clone().add(dampTorque);

        // Dynamique rotationnelle : α = T / I
        const angularAcceleration = effectiveTorque.divideScalar(CONFIG.kite.inertia);

        // Limiter l'accélération angulaire
        if (angularAcceleration.length() > PhysicsConstants.MAX_ANGULAR_ACCELERATION) {
            if (this.angularWarnCooldown <= 0) {
                console.warn(`⚠️ Accélération angulaire excessive: ${angularAcceleration.length()}rad/s²`);
                this.angularWarnCooldown = 0.5;
            }
            angularAcceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_ACCELERATION);
        }

        // Mise à jour de la vitesse angulaire
        this.state.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
        this.state.angularVelocity.multiplyScalar(CONFIG.physics.angularDamping);

        // Limiter la vitesse angulaire
        if (this.state.angularVelocity.length() > PhysicsConstants.MAX_ANGULAR_VELOCITY) {
            console.warn(`⚠️ Vitesse angulaire excessive: ${this.state.angularVelocity.length()}rad/s`);
            this.state.angularVelocity.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_VELOCITY);
        }

        // Appliquer la rotation
        if (this.state.angularVelocity.length() > PhysicsConstants.EPSILON) {
            const deltaRotation = new THREE.Quaternion();
            const axis = this.state.angularVelocity.clone().normalize();
            const angle = this.state.angularVelocity.length() * deltaTime;
            deltaRotation.setFromAxisAngle(axis, angle);

            this.kite.quaternion.multiply(deltaRotation);
            this.kite.quaternion.normalize();
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

// ==============================================================================
// RENDER MANAGER - Gestion du rendu 3D
// ==============================================================================

class RenderManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, CONFIG.rendering.fogStart, CONFIG.rendering.fogEnd);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(3, 5, 12);
        this.camera.lookAt(0, 3, -5);

        this.renderer = new THREE.WebGLRenderer({
            antialias: CONFIG.rendering.antialias,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 50;
        this.controls.minDistance = 2;

        this.setupEnvironment();
        window.addEventListener('resize', () => this.onResize());
    }

    private setupEnvironment(): void {
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

        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7CFC00 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

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
    private controlBarManager: ControlBarManager;

    constructor(kite: Kite2, controlBarPosition: THREE.Vector3) {
        this.windSimulator = new WindSimulator();
        this.lineSystem = new LineSystem();
        this.kiteController = new KiteController(kite);
        this.controlBarManager = new ControlBarManager(controlBarPosition);
    }

    /**
     * LE CŒUR DE LA SIMULATION - Appelée 60 fois par seconde
     * 
     * C'est ici que tout se passe ! Cette fonction orchestre toute la physique.
     * 
     * VOICI CE QUI SE PASSE À CHAQUE INSTANT :
     * 1. On regarde comment la barre est tournée
     * 2. On calcule où sont les mains du pilote
     * 3. On calcule le vent que ressent le kite
     * 4. On calcule toutes les forces :
     *    - Le vent qui pousse
     *    - Les lignes qui tirent
     *    - La gravité qui attire vers le bas
     * 5. On fait bouger le kite selon ces forces
     * 
     * C'est comme une boucle infinie qui simule la réalité !
     */
    update(deltaTime: number, targetBarRotation: number): void {
        // Limiter le pas de temps pour éviter l'instabilité numérique
        deltaTime = Math.min(deltaTime, CONFIG.physics.deltaTimeMax);

        // Interpoler la rotation de la barre (lissage des commandes)
        const currentRotation = this.controlBarManager.getRotation();
        const newRotation = currentRotation + (targetBarRotation - currentRotation);
        this.controlBarManager.setRotation(newRotation);

        // Récupérer l'état actuel du système
        const kite = this.kiteController.getKite();
        const handles = this.controlBarManager.getHandlePositions(kite.position);

        // Vent apparent = vent réel - vitesse du kite (principe de relativité)
        const kiteState = this.kiteController.getState();
        const apparentWind = this.windSimulator.getApparentWind(kiteState.velocity, deltaTime);

        // PHYSIQUE ÉMERGENTE 1 : Forces aéro calculées par surface
        // Le couple émerge de la différence gauche/droite naturelle
        const { lift, drag, torque: aeroTorque } = AerodynamicsCalculator.calculateForces(
            apparentWind,
            kite.quaternion
        );

        // Force constante vers le bas (F = mg)
        const gravity = new THREE.Vector3(0, -CONFIG.kite.mass * CONFIG.physics.gravity, 0);

        // PHYSIQUE ÉMERGENTE 2 : Tensions de lignes comme vraies cordes
        // - Force UNIQUEMENT si ligne tendue (distance > longueur)
        // - Couple émerge de l'asymétrie gauche/droite des tensions
        const pilotPosition = this.controlBarManager.getPosition();
        const { leftForce, rightForce, torque: lineTorque } = this.lineSystem.calculateLineTensions(
            kite, 
            newRotation,
            pilotPosition
        );

        // Somme vectorielle de toutes les forces (2ème loi de Newton)
        const totalForce = new THREE.Vector3()
            .add(lift)          // Portance perpendiculaire au vent
            .add(drag)          // Traînée dans le sens du vent
            .add(gravity)       // Poids vers le bas
            .add(leftForce)     // Tension ligne gauche vers pilote
            .add(rightForce);   // Tension ligne droite vers pilote
        
        // Couple total = somme des moments (rotation du corps rigide)
        // Le couple émerge NATURELLEMENT sans facteur artificiel!
        const totalTorque = aeroTorque.clone().add(lineTorque);

        // Intégration physique : F=ma et T=Iα pour calculer nouvelle position/orientation
        this.kiteController.update(totalForce, totalTorque, handles, deltaTime);
    }

    setBridleFactor(_factor: number): void {
        // Fonctionnalité désactivée dans V8 - physique émergente pure
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

    getControlBarManager(): ControlBarManager {
        return this.controlBarManager;
    }
}

// ==============================================================================
// SIMULATION APP - Application principale
// ==============================================================================

export class SimulationAppV8 {
    private renderManager: RenderManager;
    private physicsEngine!: PhysicsEngine;
    private inputHandler: InputHandler;
    private kite!: Kite2;
    private controlBar!: THREE.Group;
    private clock: THREE.Clock;
    private isPlaying: boolean = true;
    private leftLine: THREE.Line | null = null;
    private rightLine: THREE.Line | null = null;
    private debugMode: boolean = false; // Désactivé par défaut en V7
    private debugArrows: THREE.ArrowHelper[] = [];
    private frameCount: number = 0;

    constructor() {
        console.log('🚀 Démarrage de la Simulation V7 - Version refactorisée');

        try {
            const container = document.getElementById('app');
            if (!container) {
                throw new Error('Container #app non trouvé');
            }

            this.renderManager = new RenderManager(container);
            this.inputHandler = new InputHandler();
            this.clock = new THREE.Clock();

            this.setupControlBar();
            this.setupKite();
            this.physicsEngine = new PhysicsEngine(this.kite, this.controlBar.position);
            this.setupUIControls();
            this.createControlLines();
            this.animate();
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de SimulationV7:', error);
            throw error;
        }
    }

    private setupKite(): void {
        this.kite = new Kite2();
        const pilot = this.controlBar.position.clone();
        const initialDistance = CONFIG.lines.defaultLength * 0.95;

        const kiteY = 7;
        const dy = kiteY - pilot.y;
        const horizontal = Math.max(0.1, Math.sqrt(Math.max(0, initialDistance * initialDistance - dy * dy)));

        this.kite.position.set(pilot.x, kiteY, pilot.z - horizontal);
        this.kite.rotation.set(0, 0, 0);
        this.kite.quaternion.identity();

        console.log(`📍 Position initiale du kite: ${this.kite.position.toArray()}`);
        this.renderManager.addObject(this.kite);
    }

    private setupControlBar(): void {
        this.controlBar = new THREE.Group();
        this.controlBar.position.copy(CONFIG.controlBar.position);

        const barGeometry = new THREE.CylinderGeometry(0.02, 0.02, CONFIG.controlBar.width);
        const barMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.3
        });
        const bar = new THREE.Mesh(barGeometry, barMaterial);
        bar.rotation.z = Math.PI / 2;
        this.controlBar.add(bar);

        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.15);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.6
        });

        const halfWidth = CONFIG.controlBar.width / 2;
        const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        leftHandle.position.set(-halfWidth, 0, 0);
        this.controlBar.add(leftHandle);

        const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        rightHandle.position.set(halfWidth, 0, 0);
        this.controlBar.add(rightHandle);

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

        const kiteLeftWorld = ctrlLeft.clone();
        const kiteRightWorld = ctrlRight.clone();
        this.kite.localToWorld(kiteLeftWorld);
        this.kite.localToWorld(kiteRightWorld);

        // Utiliser le ControlBarManager pour obtenir les positions
        const handles = this.physicsEngine.getControlBarManager().getHandlePositions(this.kite.position);

        const leftPoints = this.physicsEngine.getLineSystem()
            .calculateCatenary(handles.left, kiteLeftWorld);
        const rightPoints = this.physicsEngine.getLineSystem()
            .calculateCatenary(handles.right, kiteRightWorld);

        this.leftLine.geometry.setFromPoints(leftPoints);
        this.rightLine.geometry.setFromPoints(rightPoints);

        // Mettre à jour la barre visuelle
        this.physicsEngine.getControlBarManager().updateVisual(this.controlBar, this.kite);
    }

    private setupUIControls(): void {
        const resetBtn = document.getElementById('reset-sim');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetSimulation();
            });
        }

        const playBtn = document.getElementById('play-pause');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePlayPause();
            });
        }

        const debugBtn = document.getElementById('debug-physics');
        if (debugBtn) {
            debugBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDebugMode();
            });
        }

        this.setupWindControls();
    }

    private setupWindControls(): void {
        // Configuration des contrôles de vent (identique à V6)
        const speedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const speedValue = document.getElementById('wind-speed-value');
        if (speedSlider && speedValue) {
            speedSlider.value = CONFIG.wind.defaultSpeed.toString();
            speedValue.textContent = `${CONFIG.wind.defaultSpeed} km/h`;

            speedSlider.oninput = () => {
                const speed = parseFloat(speedSlider.value);
                this.physicsEngine.setWindParams({ speed });
                speedValue.textContent = `${speed} km/h`;
            };
        }

        const dirSlider = document.getElementById('wind-direction') as HTMLInputElement;
        const dirValue = document.getElementById('wind-direction-value');
        if (dirSlider && dirValue) {
            dirSlider.value = CONFIG.wind.defaultDirection.toString();
            dirValue.textContent = `${CONFIG.wind.defaultDirection}°`;

            dirSlider.oninput = () => {
                const direction = parseFloat(dirSlider.value);
                this.physicsEngine.setWindParams({ direction });
                dirValue.textContent = `${direction}°`;
            };
        }

        const turbSlider = document.getElementById('wind-turbulence') as HTMLInputElement;
        const turbValue = document.getElementById('wind-turbulence-value');
        if (turbSlider && turbValue) {
            turbSlider.value = CONFIG.wind.defaultTurbulence.toString();
            turbValue.textContent = `${CONFIG.wind.defaultTurbulence}%`;

            turbSlider.oninput = () => {
                const turbulence = parseFloat(turbSlider.value);
                this.physicsEngine.setWindParams({ turbulence });
                turbValue.textContent = `${turbulence}%`;
            };
        }

        const lengthSlider = document.getElementById('line-length') as HTMLInputElement;
        const lengthValue = document.getElementById('line-length-value');
        if (lengthSlider && lengthValue) {
            lengthSlider.value = CONFIG.lines.defaultLength.toString();
            lengthValue.textContent = `${CONFIG.lines.defaultLength}m`;

            lengthSlider.oninput = () => {
                const length = parseFloat(lengthSlider.value);
                this.physicsEngine.setLineLength(length);
                lengthValue.textContent = `${length}m`;

                const kitePosition = this.kite.position;
                const pilotPosition = this.controlBar.position;
                const distance = kitePosition.distanceTo(pilotPosition);

                if (distance > length) {
                    const direction = kitePosition.clone().sub(pilotPosition).normalize();
                    kitePosition.copy(pilotPosition.clone().add(direction.multiplyScalar(length * 0.95)));
                }
            };
        }

        const bridleSlider = document.getElementById('bridle-length') as HTMLInputElement;
        const bridleValue = document.getElementById('bridle-length-value');
        if (bridleSlider && bridleValue) {
            bridleSlider.value = '100';
            bridleValue.textContent = '100%';

            bridleSlider.oninput = () => {
                const percent = parseFloat(bridleSlider.value);
                const bridleFactor = percent / 100;
                this.physicsEngine.setBridleFactor(bridleFactor);
                bridleValue.textContent = `${percent}%`;
            };
        }
    }

    private resetSimulation(): void {
        const currentLineLength = this.physicsEngine.getLineSystem().lineLength || CONFIG.lines.defaultLength;
        const initialDistance = currentLineLength * 0.95;

        const pilot = this.controlBar.position.clone();
        const kiteY = 7;
        const dy = kiteY - pilot.y;
        const horizontal = Math.max(0.1, Math.sqrt(Math.max(0, initialDistance * initialDistance - dy * dy)));
        this.kite.position.set(pilot.x, kiteY, pilot.z - horizontal);

        this.kite.rotation.set(0, 0, 0);
        this.kite.quaternion.identity();
        this.controlBar.quaternion.identity();

        this.physicsEngine = new PhysicsEngine(this.kite, this.controlBar.position);
        this.physicsEngine.setLineLength(currentLineLength);

        const speedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const dirSlider = document.getElementById('wind-direction') as HTMLInputElement;
        const turbSlider = document.getElementById('wind-turbulence') as HTMLInputElement;
        const bridleSlider = document.getElementById('bridle-length') as HTMLInputElement;

        if (speedSlider && dirSlider && turbSlider) {
            this.physicsEngine.setWindParams({
                speed: parseFloat(speedSlider.value),
                direction: parseFloat(dirSlider.value),
                turbulence: parseFloat(turbSlider.value)
            });
        }
        if (bridleSlider) {
            this.physicsEngine.setBridleFactor(parseFloat(bridleSlider.value) / 100);
        }

        this.updateControlLines();
        console.log(`🔄 Simulation réinitialisée`);
    }

    private togglePlayPause(): void {
        this.isPlaying = !this.isPlaying;
        const playBtn = document.getElementById('play-pause');
        if (playBtn) {
            playBtn.textContent = this.isPlaying ? '⏸️ Pause' : '▶️ Lancer';
        }
    }

    private toggleDebugMode(): void {
        this.debugMode = !this.debugMode;
        const debugBtn = document.getElementById('debug-physics');

        if (debugBtn) {
            debugBtn.textContent = this.debugMode ? '🔍 Debug ON' : '🔍 Debug';
            debugBtn.classList.toggle('active', this.debugMode);
        }

        document.body.classList.toggle('debug-mode', this.debugMode);

        if (!this.debugMode) {
            this.clearDebugArrows();
        }
    }

    private clearDebugArrows(): void {
        this.debugArrows.forEach(arrow => {
            this.renderManager.removeObject(arrow);
        });
        this.debugArrows = [];
    }

    private updateDebugArrows(): void {
        if (!this.debugMode) return;

        this.clearDebugArrows();

        const kiteState = this.physicsEngine.getKiteController().getState();
        const kitePosition = this.kite.position.clone();

        if (kiteState.velocity.length() > 0.1) {
            const velocityArrow = new THREE.ArrowHelper(
                kiteState.velocity.clone().normalize(),
                kitePosition,
                kiteState.velocity.length() * 0.5,
                0x00ff00,
                undefined,
                0.3
            );
            this.renderManager.addObject(velocityArrow);
            this.debugArrows.push(velocityArrow);
        }

        const windSim = this.physicsEngine.getWindSimulator();
        const wind = windSim.getWindAt(kitePosition);
        const relativeWind = wind.clone().sub(kiteState.velocity);

        let cachedForces: { lift: THREE.Vector3; drag: THREE.Vector3 } | undefined;
        
        if (relativeWind.length() > 0.1) {
            const { lift, drag } = AerodynamicsCalculator.calculateForces(
                relativeWind,
                this.kite.quaternion
            );
            
            cachedForces = { lift, drag };

            if (lift.length() > 0.01) {
                const liftArrow = new THREE.ArrowHelper(
                    lift.clone().normalize(),
                    kitePosition,
                    Math.sqrt(lift.length()) * 0.3,
                    0x0088ff,
                    undefined,
                    0.3
                );
                this.renderManager.addObject(liftArrow);
                this.debugArrows.push(liftArrow);
            }

            if (drag.length() > 0.01) {
                const dragArrow = new THREE.ArrowHelper(
                    drag.clone().normalize(),
                    kitePosition,
                    Math.sqrt(drag.length()) * 0.3,
                    0xff0000,
                    undefined,
                    0.3
                );
                this.renderManager.addObject(dragArrow);
                this.debugArrows.push(dragArrow);
            }
        }

        this.updateDebugDisplay(kiteState, kitePosition, cachedForces);
    }

    private updateDebugDisplay(kiteState: KiteState, kitePosition: THREE.Vector3, cachedForces?: { lift: THREE.Vector3; drag: THREE.Vector3 }): void {
        const forceDisplay = document.getElementById('force-display');
        const tensionDisplay = document.getElementById('tension-display');
        const altitudeDisplay = document.getElementById('altitude-display');

        // Utiliser les forces cach\u00e9es si disponibles, sinon recalculer
        let lift: THREE.Vector3, drag: THREE.Vector3;
        if (cachedForces) {
            lift = cachedForces.lift;
            drag = cachedForces.drag;
        } else {
            const windSim = this.physicsEngine.getWindSimulator();
            const wind = windSim.getWindAt(kitePosition);
            const relativeWind = wind.clone().sub(kiteState.velocity);
            const forces = AerodynamicsCalculator.calculateForces(
                relativeWind,
                this.kite.quaternion
            );
            lift = forces.lift;
            drag = forces.drag;
        }

        if (forceDisplay) {
            const totalForce = Math.sqrt(lift.lengthSq() + drag.lengthSq());
            forceDisplay.textContent = totalForce.toFixed(1);
        }

        if (tensionDisplay) {
            const lineLength = this.physicsEngine.getLineSystem().lineLength;
            const handles = this.physicsEngine.getControlBarManager().getHandlePositions(kitePosition);

            const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
            const ctrlRight = this.kite.getPoint('CTRL_DROIT');

            if (ctrlLeft && ctrlRight) {
                const kiteLeftWorld = ctrlLeft.clone();
                const kiteRightWorld = ctrlRight.clone();
                this.kite.localToWorld(kiteLeftWorld);
                this.kite.localToWorld(kiteRightWorld);

                const distL = kiteLeftWorld.distanceTo(handles.left);
                const distR = kiteRightWorld.distanceTo(handles.right);
                const tautL = distL >= lineLength - PhysicsConstants.CONTROL_DEADZONE;
                const tautR = distR >= lineLength - PhysicsConstants.CONTROL_DEADZONE;

                tensionDisplay.textContent = `L:${tautL ? 'T' : 'S'}(${distL.toFixed(2)}) R:${tautR ? 'T' : 'S'}(${distR.toFixed(2)})`;
            }
        }

        if (altitudeDisplay) {
            altitudeDisplay.textContent = kitePosition.y.toFixed(1);
        }
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            const kitePos = this.kite.position.clone();
            const pilotPos = this.controlBar.position.clone();
            const distance = kitePos.distanceTo(pilotPos);
            const state = this.physicsEngine.getKiteController().getState();

            const currentLineLength = this.physicsEngine.getLineSystem().lineLength;
            const windSim = this.physicsEngine.getWindSimulator();
            const wind = windSim.getWindAt(kitePos);
            const apparent = wind.clone().sub(state.velocity);

            const forces = AerodynamicsCalculator.calculateForces(apparent, this.kite.quaternion);
            const isTaut = distance >= currentLineLength * PhysicsConstants.LINE_TENSION_FACTOR;
            
            // Afficher l'asym\u00e9trie des forces gauche/droite
            const leftMag = forces.leftForce?.length() || 0;
            const rightMag = forces.rightForce?.length() || 0;
            const asymmetry = ((leftMag - rightMag) / Math.max(leftMag + rightMag, 1)) * 100;

            console.log(
                `📊 [Frame ${this.frameCount}] ` +
                `Dist: ${distance.toFixed(2)}/${currentLineLength}m ` +
                `| Pos: [${kitePos.x.toFixed(1)}, ${kitePos.y.toFixed(1)}, ${kitePos.z.toFixed(1)}] ` +
                `| Vel: ${state.velocity.length().toFixed(2)}m/s ` +
                `| Line: ${isTaut ? 'T' : 'S'} ` +
                `| F(G/D): ${leftMag.toFixed(1)}/${rightMag.toFixed(1)}N (${asymmetry > 0 ? '+' : ''}${asymmetry.toFixed(0)}%)`
            );
        }

        if (this.isPlaying) {
            try {
                const deltaTime = this.clock.getDelta();
                this.inputHandler.update(deltaTime);
                const targetRotation = this.inputHandler.getTargetBarRotation();

                this.physicsEngine.update(deltaTime, targetRotation);
                this.updateControlLines();
                this.updateDebugArrows();
            } catch (error) {
                console.error('❌ Erreur dans la boucle d\'animation:', error);
                this.isPlaying = false;
            }
        }

        this.renderManager.render();
    }

    public cleanup(): void {
        console.log('🧹 Nettoyage de SimulationV7...');
        this.isPlaying = false;

        this.debugArrows.forEach(arrow => {
            this.renderManager.removeObject(arrow);
        });
        this.debugArrows = [];

        if (this.leftLine) {
            this.renderManager.removeObject(this.leftLine);
            this.leftLine = null;
        }
        if (this.rightLine) {
            this.renderManager.removeObject(this.rightLine);
            this.rightLine = null;
        }

        if (this.kite) {
            this.renderManager.removeObject(this.kite);
        }

        if (this.controlBar) {
            this.renderManager.removeObject(this.controlBar);
        }

        console.log('✅ SimulationV7 nettoyée');
    }
}