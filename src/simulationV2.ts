/**
 * Simulation physique réaliste d'un cerf-volant delta de voltige
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Kite2 } from '@objects/organic/Kite2';

class SimulationApp {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private kite: Kite2 | null = null;
    private isPlaying = true;
    private debugMode = false;
    private hasStarted = false;
    
    // Vecteurs de debug
    private debugVectors: {
        velocity: THREE.ArrowHelper | null;
        lift: THREE.ArrowHelper | null;
        drag: THREE.ArrowHelper | null;
    } = {
        velocity: null,
        lift: null,
        drag: null
    };
    
    // État physique pour les vecteurs
    private kiteVelocity: THREE.Vector3 = new THREE.Vector3();
    private previousKitePosition: THREE.Vector3 = new THREE.Vector3();
    private kiteAngularVelocity: THREE.Vector3 = new THREE.Vector3(); // Vitesse angulaire avec inertie
    
    // Paramètres aérodynamiques du cerf-volant
    private kiteParams = {
        mass: 0.5,           // Masse du cerf-volant en kg
        area: 0.8,           // Surface du cerf-volant en m²
        Cl: 0.8,             // Coefficient de portance de base (sera modifié dynamiquement)
        Cd: 0.15,            // Coefficient de traînée de base (sera modifié dynamiquement)
        inertia: 0.02        // Moment d'inertie simplifié (kg·m²) - plus petit = tourne plus facilement
    };
    
    // Angle d'attaque fixe créé par les whiskers du cerf-volant
    private readonly FIXED_ANGLE_OF_ATTACK: number = 18; // 18° créé par la structure
    
    // Constantes physiques
    private readonly AIR_DENSITY = 1.225; // Densité de l'air au niveau de la mer (kg/m³)
    private readonly GRAVITY = 9.81;      // Gravité (m/s²)
    
    // Lignes de contrôle
    private leftLine: THREE.Line | null = null;
    private rightLine: THREE.Line | null = null;
    private lineLength: number = 10;
    
    // Points de connexion souples (pivots)
    private leftPivot: THREE.Vector3 = new THREE.Vector3();
    private rightPivot: THREE.Vector3 = new THREE.Vector3();
    private pivotVelocityLeft: THREE.Vector3 = new THREE.Vector3();
    private pivotVelocityRight: THREE.Vector3 = new THREE.Vector3();
    
    // Barre de contrôle
    private controlBar: THREE.Group | null = null;
    private controlBarRotation: number = 0;
    private targetBarRotation: number = 0;
    private keysPressed: Set<string> = new Set();
    
    // Paramètres de vent
    private windParams = {
        speed: 15, // Vitesse en km/h (15 km/h = vent léger)
        direction: 0, // Direction en degrés
        turbulence: 10 // Turbulence en pourcentage
    };
    
    // Animation
    private clock = new THREE.Clock();
    private frameId: number = 0;
    
    constructor() {
        console.log('🎮 Démarrage du Mode Simulation');
        
        // Initialiser Three.js
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);
        
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
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Ajouter au DOM
        const container = document.getElementById('app');
        if (container) {
            container.appendChild(this.renderer.domElement);
        }
        
        // Contrôles
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 50;
        this.controls.minDistance = 2;
        
        // Initialiser la scène
        this.setupEnvironment();
        this.setupKite();
        this.setupControls();
        this.setupWindControls();
        
        // Mettre à jour l'affichage du bouton play/pause au démarrage
        this.updatePlayButton();
        
        // Démarrer l'animation
        this.animate();
        
        console.log('🚀 Simulation lancée automatiquement');
        
        // Gérer le redimensionnement
        window.addEventListener('resize', () => this.onResize());
        
        // Gérer les contrôles clavier
        this.setupKeyboardControls();
    }
    
    private setupEnvironment(): void {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Lumière directionnelle (soleil)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 50, 50);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -20;
        sunLight.shadow.camera.right = 20;
        sunLight.shadow.camera.top = 20;
        sunLight.shadow.camera.bottom = -20;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);
        
        // Sol (plage/herbe)
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x7CFC00 // Vert herbe
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Grille d'aide
        const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
        this.scene.add(gridHelper);
        
        // Ciel (utilise le gradient CSS du body)
        this.renderer.setClearColor(0x87CEEB, 0);
    }
    
    private setupKite(): void {
        // Créer le cerf-volant
        this.kite = new Kite2();
        
        // Positionner au sol derrière le pilote
        const initialDistance = this.lineLength * 0.9; // 90% de la longueur pour garder un peu de tension
        this.kite.position.set(0, 0.1, -initialDistance); // Derrière le pilote
        this.kite.rotation.set(0, 0, 0); // Orientation neutre au départ
        
        // Ajouter à la scène
        this.scene.add(this.kite);
        
        // Barre de contrôle et lignes
        this.setupControlBar();
        this.addControlLines();
    }
    
    private setupControlBar(): void {
        // Créer le groupe pour la barre de contrôle
        this.controlBar = new THREE.Group();
        
        // Position de la barre (position du pilote)
        this.controlBar.position.set(0, 1.2, 8); // Hauteur des mains
        
        // Créer la barre principale (cylindre horizontal)
        const barGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.2);
        const barMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.3
        });
        const bar = new THREE.Mesh(barGeometry, barMaterial);
        bar.rotation.z = Math.PI / 2; // Tourner pour être horizontal
        this.controlBar.add(bar);
        
        // Créer les poignées gauche et droite
        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.15);
        const handleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513, // Marron pour les poignées
            roughness: 0.6
        });
        
        // Poignée gauche
        const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        leftHandle.position.set(-0.5, 0, 0);
        this.controlBar.add(leftHandle);
        
        // Poignée droite
        const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        rightHandle.position.set(0.5, 0, 0);
        this.controlBar.add(rightHandle);
        
        // Ajouter des embouts colorés pour mieux voir les extrémités
        const endCapGeometry = new THREE.SphereGeometry(0.04);
        const leftCapMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const rightCapMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        
        const leftCap = new THREE.Mesh(endCapGeometry, leftCapMaterial);
        leftCap.position.set(-0.5, -0.075, 0);
        this.controlBar.add(leftCap);
        
        const rightCap = new THREE.Mesh(endCapGeometry, rightCapMaterial);
        rightCap.position.set(0.5, -0.075, 0);
        this.controlBar.add(rightCap);
        
        // Ajouter à la scène
        this.scene.add(this.controlBar);
        
        // Ajouter un cube pour représenter le pilote
        const pilotGeometry = new THREE.BoxGeometry(0.4, 1.6, 0.3);
        const pilotMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a4a4a,
            roughness: 0.8
        });
        const pilot = new THREE.Mesh(pilotGeometry, pilotMaterial);
        pilot.position.set(0, 0.8, 8.5); // Devant la barre de contrôle
        pilot.castShadow = true;
        pilot.receiveShadow = true;
        pilot.name = 'pilot';
        this.scene.add(pilot);
    }
    
    private addControlLines(): void {
        if (!this.kite || !this.controlBar) return;
        
        // Matériau pour les lignes
        const material = new THREE.LineBasicMaterial({ 
            color: 0x333333,
            linewidth: 2 
        });
        
        // Créer les géométries des lignes (seront mises à jour dynamiquement)
        const geometryLeft = new THREE.BufferGeometry();
        const geometryRight = new THREE.BufferGeometry();
        
        // Créer les lignes
        this.leftLine = new THREE.Line(geometryLeft, material);
        this.rightLine = new THREE.Line(geometryRight, material);
        
        // Ajouter à la scène
        this.scene.add(this.leftLine);
        this.scene.add(this.rightLine);
        
        // Mise à jour initiale
        this.updateControlLines();
    }
    
    private updatePivotPhysics(delta: number): void {
        if (!this.kite) return;
        
        // Récupérer les positions cibles des points de contrôle du cerf-volant
        const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = this.kite.getPoint('CTRL_DROIT');
        
        if (ctrlLeft && ctrlRight) {
            const targetLeft = ctrlLeft.clone();
            const targetRight = ctrlRight.clone();
            this.kite.localToWorld(targetLeft);
            this.kite.localToWorld(targetRight);
            
            // Paramètres de souplesse du pivot
            const stiffness = 0.5;
            const damping = 0.9;
            const gravity = -0.01;
            
            // Calculer les forces pour le pivot gauche
            const forceLeft = new THREE.Vector3()
                .subVectors(targetLeft, this.leftPivot)
                .multiplyScalar(stiffness);
            
            // Ajouter un peu de gravité et turbulence
            forceLeft.y += gravity;
            if (this.windParams.turbulence > 0) {
                const turb = this.windParams.turbulence / 5000;
                forceLeft.x += (Math.random() - 0.5) * turb;
                forceLeft.z += (Math.random() - 0.5) * turb;
            }
            
            // Mettre à jour la vélocité et la position du pivot gauche
            this.pivotVelocityLeft.add(forceLeft);
            this.pivotVelocityLeft.multiplyScalar(damping);
            
            // Limiter la distance maximale au point de contrôle
            const newPosLeft = this.leftPivot.clone().add(this.pivotVelocityLeft.clone().multiplyScalar(delta * 60));
            const distLeft = newPosLeft.distanceTo(targetLeft);
            if (distLeft > 0.2) {
                const dir = new THREE.Vector3().subVectors(targetLeft, newPosLeft).normalize();
                newPosLeft.copy(targetLeft).sub(dir.multiplyScalar(0.2));
            }
            this.leftPivot.copy(newPosLeft);
            
            // Calculer les forces pour le pivot droit
            const forceRight = new THREE.Vector3()
                .subVectors(targetRight, this.rightPivot)
                .multiplyScalar(stiffness);
            
            // Ajouter un peu de gravité et turbulence
            forceRight.y += gravity;
            if (this.windParams.turbulence > 0) {
                const turb = this.windParams.turbulence / 5000;
                forceRight.x += (Math.random() - 0.5) * turb;
                forceRight.z += (Math.random() - 0.5) * turb;
            }
            
            // Mettre à jour la vélocité et la position du pivot droit
            this.pivotVelocityRight.add(forceRight);
            this.pivotVelocityRight.multiplyScalar(damping);
            
            // Limiter la distance maximale au point de contrôle
            const newPosRight = this.rightPivot.clone().add(this.pivotVelocityRight.clone().multiplyScalar(delta * 60));
            const distRight = newPosRight.distanceTo(targetRight);
            if (distRight > 0.2) {
                const dir = new THREE.Vector3().subVectors(targetRight, newPosRight).normalize();
                newPosRight.copy(targetRight).sub(dir.multiplyScalar(0.2));
            }
            this.rightPivot.copy(newPosRight);
        }
    }
    
    private calculateCatenary(start: THREE.Vector3, end: THREE.Vector3, lineLength: number, segments: number = 5): THREE.Vector3[] {
        const directDistance = start.distanceTo(end);
        
        if (directDistance >= lineLength) {
            return [start, end];
        }
        
        const points: THREE.Vector3[] = [];
        const slack = lineLength - directDistance;
        const sag = slack * 0.01;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3().lerpVectors(start, end, t);
            point.y -= 4 * sag * t * (1 - t);
            points.push(point);
        }
        
        return points;
    }
    
    private updateControlLines(): void {
        if (!this.kite || !this.leftLine || !this.rightLine || !this.controlBar) return;
        
        // Récupérer les points de contrôle du cerf-volant
        const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = this.kite.getPoint('CTRL_DROIT');
        
        if (!ctrlLeft || !ctrlRight) return;
        
        // Convertir en coordonnées monde
        const kiteLeftWorld = ctrlLeft.clone();
        const kiteRightWorld = ctrlRight.clone();
        this.kite.localToWorld(kiteLeftWorld);
        this.kite.localToWorld(kiteRightWorld);
        
        // Position de base de la barre
        const barCenter = this.controlBar.position.clone();
        
        // === CALCUL CORRECT DE L'AXE DE ROTATION ===
        // 1. Vecteur de la barre (gauche vers droite)
        const barVector = new THREE.Vector3(1, 0, 0); // Direction horizontale de la barre
        
        // 2. Vecteur vers le cerf-volant (du centre de la barre vers le centre du cerf-volant)
        const centerKite = kiteLeftWorld.clone().add(kiteRightWorld).multiplyScalar(0.5);
        const toKiteVector = centerKite.clone().sub(barCenter);
        
        // 3. L'axe de rotation est PERPENDICULAIRE au plan contenant la barre et la direction vers le kite
        // C'est le produit vectoriel de ces deux vecteurs
        const rotationAxis = new THREE.Vector3().crossVectors(barVector, toKiteVector).normalize();
        
        // Si l'axe est invalide (vecteurs parallèles), utiliser un axe par défaut
        if (rotationAxis.length() < 0.01) {
            rotationAxis.set(0, 0, 1); // Axe Z par défaut
        }
        
        // Rotation de la barre autour de cet axe
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, this.controlBarRotation);
        
        // Positions locales des poignées (au bout de la barre, pas au centre)
        const handleLeftLocal = new THREE.Vector3(-0.5, 0, 0); // Poignée gauche
        const handleRightLocal = new THREE.Vector3(0.5, 0, 0);  // Poignée droite
        
        // Appliquer la rotation aux poignées
        handleLeftLocal.applyQuaternion(rotationQuaternion);
        handleRightLocal.applyQuaternion(rotationQuaternion);
        
        // Convertir en coordonnées monde
        const handleLeft = handleLeftLocal.clone().add(barCenter);
        const handleRight = handleRightLocal.clone().add(barCenter);
        
        if (ctrlLeft) {
            const targetLeft = ctrlLeft.clone();
            this.kite.localToWorld(targetLeft);
            
            if (this.leftPivot.length() === 0 || this.leftPivot.distanceTo(targetLeft) > 1) {
                this.leftPivot.copy(targetLeft);
                this.pivotVelocityLeft.set(0, 0, 0);
            }
        }
        
        if (ctrlRight) {
            const targetRight = ctrlRight.clone();
            this.kite.localToWorld(targetRight);
            
            if (this.rightPivot.length() === 0 || this.rightPivot.distanceTo(targetRight) > 1) {
                this.rightPivot.copy(targetRight);
                this.pivotVelocityRight.set(0, 0, 0);
            }
        }
        
        const leftLinePoints = this.calculateCatenary(handleLeft, this.leftPivot, this.lineLength);
        const rightLinePoints = this.calculateCatenary(handleRight, this.rightPivot, this.lineLength);
        
        this.leftLine.geometry.setFromPoints(leftLinePoints);
        this.rightLine.geometry.setFromPoints(rightLinePoints);
        
        this.updatePivotVisuals();
    }
    
    private updatePivotVisuals(): void {
        // Créer ou mettre à jour les sphères représentant les nœuds
        let leftKnot = this.scene.getObjectByName('leftKnot') as THREE.Mesh;
        let rightKnot = this.scene.getObjectByName('rightKnot') as THREE.Mesh;
        
        if (!leftKnot) {
            const knotGeometry = new THREE.SphereGeometry(0.05);
            const leftMaterial = new THREE.MeshBasicMaterial({ color: 0xff6666 });
            leftKnot = new THREE.Mesh(knotGeometry, leftMaterial);
            leftKnot.name = 'leftKnot';
            this.scene.add(leftKnot);
        }
        
        if (!rightKnot) {
            const knotGeometry = new THREE.SphereGeometry(0.05);
            const rightMaterial = new THREE.MeshBasicMaterial({ color: 0x6666ff });
            rightKnot = new THREE.Mesh(knotGeometry, rightMaterial);
            rightKnot.name = 'rightKnot';
            this.scene.add(rightKnot);
        }
        
        // Mettre à jour les positions des nœuds
        leftKnot.position.copy(this.leftPivot);
        rightKnot.position.copy(this.rightPivot);
    }
    
    private setupControls(): void {
        // Bouton CAO
        const caoBtn = document.getElementById('mode-cao');
        if (caoBtn) {
            caoBtn.onclick = () => {
                window.location.href = '/';
            };
        }
        
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
            debugBtn.onclick = () => this.toggleDebug();
        }
    }
    
    private setupKeyboardControls(): void {
        // Gestion des touches pressées
        window.addEventListener('keydown', (event) => {
            this.keysPressed.add(event.key);
            
            // Rotation de la barre selon les touches
            // Flèche gauche = tirer le côté gauche de la barre (rotation positive)
            if (event.key === 'ArrowLeft') {
                this.targetBarRotation = Math.PI / 6; // +30 degrés (tire à gauche)
                event.preventDefault();
            } else if (event.key === 'ArrowRight') {
                this.targetBarRotation = -Math.PI / 6; // -30 degrés (tire à droite)
                event.preventDefault();
            }
        });
        
        // Gestion des touches relâchées
        window.addEventListener('keyup', (event) => {
            this.keysPressed.delete(event.key);
            
            // Retour à la position neutre si aucune flèche n'est pressée
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                if (!this.keysPressed.has('ArrowLeft') && !this.keysPressed.has('ArrowRight')) {
                    this.targetBarRotation = 0; // Retour à la position d'équilibre
                }
                event.preventDefault();
            }
        });
    }
    
    private setupWindControls(): void {
        // Vitesse du vent
        const speedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const speedValue = document.getElementById('wind-speed-value');
        if (speedSlider && speedValue) {
            speedSlider.oninput = () => {
                this.windParams.speed = parseFloat(speedSlider.value);
                speedValue.textContent = `${this.windParams.speed} km/h`;
                this.updateWindDisplay();
            };
        }
        
        // Direction du vent
        const dirSlider = document.getElementById('wind-direction') as HTMLInputElement;
        const dirValue = document.getElementById('wind-direction-value');
        if (dirSlider && dirValue) {
            dirSlider.oninput = () => {
                this.windParams.direction = parseFloat(dirSlider.value);
                dirValue.textContent = `${this.windParams.direction}°`;
            };
        }
        
        // Turbulence
        const turbSlider = document.getElementById('wind-turbulence') as HTMLInputElement;
        const turbValue = document.getElementById('wind-turbulence-value');
        if (turbSlider && turbValue) {
            turbSlider.oninput = () => {
                this.windParams.turbulence = parseFloat(turbSlider.value);
                turbValue.textContent = `${this.windParams.turbulence}%`;
            };
        }
        
        // Longueur des lignes
        const lengthSlider = document.getElementById('line-length') as HTMLInputElement;
        const lengthValue = document.getElementById('line-length-value');
        if (lengthSlider && lengthValue) {
            lengthSlider.oninput = () => {
                this.lineLength = parseFloat(lengthSlider.value);
                lengthValue.textContent = `${this.lineLength}m`;
                this.updateControlLines(); // Mettre à jour immédiatement les lignes
            };
        }
    }
    
    private resetSimulation(): void {
        if (this.kite) {
            const initialDistance = this.lineLength * 0.9;
            this.kite.position.set(0, 0.1, -initialDistance);
            this.kite.rotation.set(-Math.PI / 8, 0, 0);
        }
        
        // Réinitialiser la barre de contrôle
        if (this.controlBar) {
            this.controlBarRotation = 0;
            this.targetBarRotation = 0;
            this.controlBar.quaternion.identity(); // Réinitialiser à la rotation d'identité
        }
        
        // Réinitialiser les pivots souples
        if (this.kite) {
            const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
            const ctrlRight = this.kite.getPoint('CTRL_DROIT');
            
            if (ctrlLeft) {
                this.leftPivot.copy(ctrlLeft);
                this.kite.localToWorld(this.leftPivot);
                this.pivotVelocityLeft.set(0, 0, 0);
            }
            
            if (ctrlRight) {
                this.rightPivot.copy(ctrlRight);
                this.kite.localToWorld(this.rightPivot);
                this.pivotVelocityRight.set(0, 0, 0);
            }
        }
        
        // Mettre à jour les lignes après le reset
        this.updateControlLines();
        
        // Mettre en pause après reset et réinitialiser le chronomètre
        this.isPlaying = false;
        this.hasStarted = false; // Reset du flag de démarrage
        this.clock.stop(); // Arrêter le chronomètre
        this.clock.elapsedTime = 0;
        this.updatePlayButton();
        console.log('🔄 Simulation réinitialisée - En attente du lancement');
    }
    
    private togglePlayPause(): void {
        this.isPlaying = !this.isPlaying;
        this.updatePlayButton();
        
        if (this.isPlaying) {
            console.log('▶️ Simulation démarrée');
        } else {
            console.log('⏸️ Simulation en pause');
        }
    }
    
    private updatePlayButton(): void {
        const playBtn = document.getElementById('play-pause');
        if (playBtn) {
            playBtn.textContent = this.isPlaying ? '⏸️ Pause' : '▶️ Lancer';
            playBtn.classList.toggle('active', this.isPlaying);
        }
        
        const status = document.getElementById('physics-status');
        if (status) {
            status.textContent = this.isPlaying ? 'Active' : 'En pause';
        }
    }
    
    private toggleDebug(): void {
        this.debugMode = !this.debugMode;
        document.body.classList.toggle('debug-mode', this.debugMode);
        
        const debugBtn = document.getElementById('debug-physics');
        if (debugBtn) {
            debugBtn.classList.toggle('active', this.debugMode);
        }
        
        // Gérer l'affichage des vecteurs
        if (this.debugMode) {
            this.createDebugVectors();
        } else {
            this.removeDebugVectors();
        }
        
        console.log(`🔍 Mode debug: ${this.debugMode ? 'ON' : 'OFF'}`);
    }
    
    private createDebugVectors(): void {
        // Créer les vecteurs si ils n'existent pas
        if (!this.debugVectors.velocity) {
            // Vecteur vitesse (vert)
            const velocityDir = new THREE.Vector3(0, 1, 0);
            const velocityOrigin = new THREE.Vector3(0, 0, 0);
            this.debugVectors.velocity = new THREE.ArrowHelper(
                velocityDir, velocityOrigin, 1, 0x00ff00, 0.3, 0.3
            );
            this.scene.add(this.debugVectors.velocity);
        }
        
        if (!this.debugVectors.lift) {
            // Vecteur portance (bleu)
            const liftDir = new THREE.Vector3(0, 1, 0);
            const liftOrigin = new THREE.Vector3(0, 0, 0);
            this.debugVectors.lift = new THREE.ArrowHelper(
                liftDir, liftOrigin, 1, 0x0088ff, 0.3, 0.3
            );
            this.scene.add(this.debugVectors.lift);
        }
        
        if (!this.debugVectors.drag) {
            // Vecteur traînée/inertie (rouge)
            const dragDir = new THREE.Vector3(0, 0, 1);
            const dragOrigin = new THREE.Vector3(0, 0, 0);
            this.debugVectors.drag = new THREE.ArrowHelper(
                dragDir, dragOrigin, 1, 0xff0000, 0.3, 0.3
            );
            this.scene.add(this.debugVectors.drag);
        }
    }
    
    private removeDebugVectors(): void {
        // Supprimer les vecteurs de la scène
        if (this.debugVectors.velocity) {
            this.scene.remove(this.debugVectors.velocity);
            this.debugVectors.velocity.dispose();
            this.debugVectors.velocity = null;
        }
        
        if (this.debugVectors.lift) {
            this.scene.remove(this.debugVectors.lift);
            this.debugVectors.lift.dispose();
            this.debugVectors.lift = null;
        }
        
        if (this.debugVectors.drag) {
            this.scene.remove(this.debugVectors.drag);
            this.debugVectors.drag.dispose();
            this.debugVectors.drag = null;
        }
    }
    
    private updateDebugVectors(dragForce: THREE.Vector3, liftForce: THREE.Vector3, velocity: THREE.Vector3): void {
        if (!this.debugMode || !this.kite) return;
        
        // Calculer le centre de portance (approximativement au centre du cerf-volant)
        const centerOfLift = this.kite.position.clone();
        centerOfLift.y += 0.3; // Légèrement au-dessus du centre géométrique
        
        // Facteur d'échelle pour la visualisation (les forces sont en Newtons, on les réduit pour l'affichage)
        const forceScale = 0.1;
        const velocityScale = 0.5;
        
        // Vecteur vitesse (vert) - mouvement du cerf-volant
        if (this.debugVectors.velocity) {
            const speed = velocity.length();
            if (speed > 0.01) {
                const velocityNorm = velocity.clone().normalize();
                const velocityMagnitude = Math.min(speed * velocityScale, 3); // Limiter la taille visuelle
                this.debugVectors.velocity.position.copy(centerOfLift);
                this.debugVectors.velocity.setDirection(velocityNorm);
                this.debugVectors.velocity.setLength(velocityMagnitude, velocityMagnitude * 0.2, velocityMagnitude * 0.2);
                this.debugVectors.velocity.visible = true;
            } else {
                this.debugVectors.velocity.visible = false;
            }
        }
        
        // Vecteur portance (bleu) - force de portance aérodynamique
        if (this.debugVectors.lift) {
            const liftMagnitude = liftForce.length() * forceScale;
            if (liftMagnitude > 0.01) {
                const liftDirection = liftForce.clone().normalize();
                this.debugVectors.lift.position.copy(centerOfLift);
                this.debugVectors.lift.setDirection(liftDirection);
                this.debugVectors.lift.setLength(liftMagnitude, liftMagnitude * 0.2, liftMagnitude * 0.2);
                this.debugVectors.lift.visible = true;
            } else {
                this.debugVectors.lift.visible = false;
            }
        }
        
        // Vecteur traînée (rouge) - force de traînée aérodynamique
        if (this.debugVectors.drag) {
            const dragMagnitude = dragForce.length() * forceScale;
            if (dragMagnitude > 0.01) {
                const dragDirection = dragForce.clone().normalize();
                this.debugVectors.drag.position.copy(centerOfLift);
                this.debugVectors.drag.setDirection(dragDirection);
                this.debugVectors.drag.setLength(dragMagnitude, dragMagnitude * 0.2, dragMagnitude * 0.2);
                this.debugVectors.drag.visible = true;
            } else {
                this.debugVectors.drag.visible = false;
            }
        }
    }
    
    private updateWindDisplay(): void {
        const windSpeedDisplay = document.getElementById('wind-speed-display');
        if (windSpeedDisplay) {
            windSpeedDisplay.textContent = `${this.windParams.speed}`;
        }
    }
    
    private simulatePhysics(delta: number): void {
        if (!this.kite || !this.isPlaying) return;
        
        // Marquer que la simulation a démarré
        if (!this.hasStarted) {
            this.hasStarted = true;
            this.clock.start();
            // Initialiser la position précédente
            this.previousKitePosition.copy(this.kite.position);
        }
        
        // Position actuelle du cerf-volant
        const currentPos = this.kite.position.clone();
        
        // Calculer la vélocité du cerf-volant
        if (delta > 0) {
            this.kiteVelocity = currentPos.clone().sub(this.previousKitePosition).divideScalar(delta);
        }
        
        // ==== CALCUL DU VENT APPARENT ====
        // Vitesse du vent en m/s (conversion depuis km/h)
        const windSpeedMs = this.windParams.speed / 3.6;
        const windRad = (this.windParams.direction * Math.PI) / 180;
        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windSpeedMs,
            0,
            -Math.cos(windRad) * windSpeedMs
        );
        
        // Vent apparent = vent réel - vitesse du cerf-volant
        const apparentWind = windVector.clone().sub(this.kiteVelocity);
        let apparentWindSpeed = apparentWind.length();
        
        // Ajouter de la turbulence au vent
        if (this.windParams.turbulence > 0) {
            const turbIntensity = this.windParams.turbulence / 100 * 0.2; // 20% max de variation
            apparentWind.x += (Math.random() - 0.5) * windSpeedMs * turbIntensity;
            apparentWind.y += (Math.random() - 0.5) * windSpeedMs * turbIntensity * 0.3;
            apparentWind.z += (Math.random() - 0.5) * windSpeedMs * turbIntensity;
            apparentWindSpeed = apparentWind.length();
        }
        
        // ==== CALCUL DES FORCES AÉRODYNAMIQUES AVEC COEFFICIENTS VARIABLES ====
        // Pression dynamique : q = 0.5 * ρ * V²
        const dynamicPressure = 0.5 * this.AIR_DENSITY * apparentWindSpeed * apparentWindSpeed;
        
        // ==== ANGLE D'ATTAQUE FIXE PAR LES WHISKERS ====
        // Pour un cerf-volant delta à deux lignes, l'angle d'attaque est fixe
        // Il est créé par la structure même du cerf-volant (whiskers)
        // L'épine dorsale reste tangente à la sphère de vol
        
        // ==== COEFFICIENTS AÉRODYNAMIQUES POUR CERF-VOLANT DELTA ====
        // Les whiskers créent naturellement l'angle d'attaque
        // Le cerf-volant vole tangent à la sphère, les coefficients sont constants
        
        // Coefficient de portance typique pour un delta de voltige
        let Cl = 1.2; // Bonne portance pour un delta avec whiskers
        
        // Correction pour l'aspect ratio d'un delta
        const aspectRatio = 3.5;
        Cl *= Math.sqrt(aspectRatio / 3);
        
        // Coefficient de traînée pour un delta profilé
        let Cd = 0.18; // Traînée modérée pour un delta avec bridage
        
        // Force de portance : L = Cl * A * q
        const liftMagnitude = Cl * this.kiteParams.area * dynamicPressure;
        
        // Force de traînée : D = Cd * A * q
        const dragMagnitude = Cd * this.kiteParams.area * dynamicPressure;
        
        // Direction de la traînée (dans la direction du vent apparent)
        const dragDirection = apparentWind.clone().normalize();
        const dragForce = dragDirection.clone().multiplyScalar(dragMagnitude);
        
        // Direction de la portance pour un cerf-volant tangent à la sphère
        // La portance est perpendiculaire au vent ET perpendiculaire à l'épine dorsale
        // Elle pousse le cerf-volant "vers l'extérieur" de la sphère
        const pilotPos = this.controlBar ? this.controlBar.position : new THREE.Vector3(0, 1.2, 8);
        const radialDir = currentPos.clone().sub(pilotPos).normalize();
        
        // La portance est dans le plan perpendiculaire au vent, orientée radialement
        const liftDirection = new THREE.Vector3()
            .crossVectors(dragDirection, radialDir)
            .cross(dragDirection)
            .normalize();
            
        // S'assurer que la portance pousse vers l'extérieur (pas vers l'intérieur)
        if (liftDirection.dot(radialDir) < 0) {
            liftDirection.negate();
        }
        
        const liftForce = liftDirection.multiplyScalar(liftMagnitude);
        
        // Force de gravité
        const gravityForce = new THREE.Vector3(0, -this.kiteParams.mass * this.GRAVITY, 0);
        
        // ==== CALCUL DU CENTRE DE GRAVITÉ ET CENTRE DE PRESSION ====
        // Centre de gravité : basé sur la géométrie du cerf-volant
        // Pour un delta, le CG est généralement à 1/3 depuis le nez
        const nosePoint = this.kite.getPoint('NEZ');
        const spineBottom = this.kite.getPoint('SPINE_BAS');
        let centerOfGravity = this.kite.position.clone(); // Par défaut
        
        if (nosePoint && spineBottom) {
            // Convertir en coordonnées monde
            const noseWorld = nosePoint.clone();
            const spineWorld = spineBottom.clone();
            this.kite.localToWorld(noseWorld);
            this.kite.localToWorld(spineWorld);
            
            // CG à 1/3 depuis le nez vers l'arrière
            centerOfGravity = noseWorld.clone().lerp(spineWorld, 0.33);
        }
        
        // Centre de pression : où les forces aérodynamiques s'appliquent
        // Pour un delta, le CP est généralement à 40-45% depuis le nez
        let centerOfPressure = this.kite.position.clone(); // Par défaut
        
        if (nosePoint && spineBottom) {
            const noseWorld = nosePoint.clone();
            const spineWorld = spineBottom.clone();
            this.kite.localToWorld(noseWorld);
            this.kite.localToWorld(spineWorld);
            
            // CP à environ 42% depuis le nez pour un angle fixe de 18°
            const cpPosition = 0.42; // Position fixe pour l'angle de 18°
            centerOfPressure = noseWorld.clone().lerp(spineWorld, cpPosition);
        }
        
        // ==== CONTRAINTES DES LIGNES ====
        // Récupérer les points de contrôle du cerf-volant
        const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = this.kite.getPoint('CTRL_DROIT');
        
        // Positions des poignées de la barre de contrôle
        let handleLeft = new THREE.Vector3(-0.5, 1.2, 8);
        let handleRight = new THREE.Vector3(0.5, 1.2, 8);
        
        if (this.controlBar && ctrlLeft && ctrlRight) {
            // Convertir les points de contrôle en coordonnées monde
            const kiteLeftWorld = ctrlLeft.clone();
            const kiteRightWorld = ctrlRight.clone();
            this.kite.localToWorld(kiteLeftWorld);
            this.kite.localToWorld(kiteRightWorld);
            
            // === CALCUL CORRECT DE L'AXE DE ROTATION ===
            // 1. Vecteur de la barre (gauche vers droite)
            const barVector = new THREE.Vector3(1, 0, 0);
            
            // 2. Vecteur vers le cerf-volant
            const centerKite = kiteLeftWorld.clone().add(kiteRightWorld).multiplyScalar(0.5);
            const toKiteVector = centerKite.clone().sub(this.controlBar.position);
            
            // 3. Axe de rotation = perpendiculaire au plan (barre × direction kite)
            const rotationAxis = new THREE.Vector3().crossVectors(barVector, toKiteVector).normalize();
            
            if (rotationAxis.length() < 0.01) {
                rotationAxis.set(0, 0, 1);
            }
            
            // Appliquer la rotation de la barre autour de cet axe
            const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, this.controlBarRotation);
            
            // Positions locales des poignées (au bout de la barre)
            const handleLeftLocal = new THREE.Vector3(-0.5, 0, 0);
            const handleRightLocal = new THREE.Vector3(0.5, 0, 0);
            
            // Appliquer la rotation aux poignées
            handleLeftLocal.applyQuaternion(rotationQuaternion);
            handleRightLocal.applyQuaternion(rotationQuaternion);
            
            // Convertir en coordonnées monde
            handleLeft = handleLeftLocal.clone().add(this.controlBar.position);
            handleRight = handleRightLocal.clone().add(this.controlBar.position);
        }
        
        // Calculer la tension pour chaque ligne et le couple résultant
        let tensionForce = new THREE.Vector3();
        let totalTorque = new THREE.Vector3(); // Couple total autour du centre de masse
        
        if (ctrlLeft && ctrlRight) {
            // Position des points de contrôle en coordonnées monde
            const ctrlLeftWorld = ctrlLeft.clone();
            const ctrlRightWorld = ctrlRight.clone();
            this.kite.localToWorld(ctrlLeftWorld);
            this.kite.localToWorld(ctrlRightWorld);
            
            // Utiliser le vrai centre de gravité calculé précédemment
            const centerOfMass = centerOfGravity.clone();
            
            // Force de tension ligne gauche
            let leftTensionForce = new THREE.Vector3();
            // Vecteur de la ligne (du point de contrôle vers la poignée)
            const leftLineVector = handleLeft.clone().sub(ctrlLeftWorld);
            const leftDistance = leftLineVector.length();
            
            // Tension de base de la ligne gauche
            if (leftDistance > this.lineLength * 0.98) {
                // La force tire le cerf-volant VERS la poignée
                const leftDirection = leftLineVector.normalize();
                const leftMagnitude = (leftDistance - this.lineLength * 0.98) * 50; // Réduit de 120 à 50
                leftTensionForce = leftDirection.multiplyScalar(leftMagnitude);
            }
            
            // Force de tension ligne droite
            let rightTensionForce = new THREE.Vector3();
            // Vecteur de la ligne (du point de contrôle vers la poignée)
            const rightLineVector = handleRight.clone().sub(ctrlRightWorld);
            const rightDistance = rightLineVector.length();
            
            // Tension de base de la ligne droite
            if (rightDistance > this.lineLength * 0.98) {
                // La force tire le cerf-volant VERS la poignée
                const rightDirection = rightLineVector.normalize();
                const rightMagnitude = (rightDistance - this.lineLength * 0.98) * 50; // Réduit de 120 à 50
                rightTensionForce = rightDirection.multiplyScalar(rightMagnitude);
            }
            
            // ==== CONTRÔLE PAR DIFFÉRENCE DE TENSION ====
            // La rotation de la barre modifie la position des poignées
            // Ce qui change la direction et l'intensité de la tension sur chaque ligne
            
            // Quand on tire à gauche (rotation positive), la poignée gauche recule
            // Ce qui raccourcit la ligne gauche et augmente sa tension
            if (this.controlBarRotation !== 0) {
                const controlFactor = Math.abs(this.controlBarRotation) * 40; // Réduit de 80 à 40
                
                if (this.controlBarRotation > 0) {
                    // Rotation positive = tirer côté gauche
                    // La ligne gauche tire plus fort vers la poignée gauche
                    const leftDirection = handleLeft.clone().sub(ctrlLeftWorld).normalize();
                    leftTensionForce.add(leftDirection.multiplyScalar(controlFactor));
                    
                    // La ligne droite est relâchée (moins de tension)
                    rightTensionForce.multiplyScalar(0.7); // Moins agressif
                } else {
                    // Rotation négative = tirer côté droit
                    // La ligne droite tire plus fort vers la poignée droite
                    const rightDirection = handleRight.clone().sub(ctrlRightWorld).normalize();
                    rightTensionForce.add(rightDirection.multiplyScalar(controlFactor));
                    
                    // La ligne gauche est relâchée (moins de tension)
                    leftTensionForce.multiplyScalar(0.7); // Moins agressif
                }
            }
            
            // ==== CALCUL DU COUPLE (TORQUE) ====
            // PRINCIPE : La différence de tension fait tourner l'épine DANS le plan tangent
            // Cette rotation dans le plan tangent contrôle la direction de vol !
            
            // Position relative au pilote pour calculer le vecteur radial
            const currentPilotPosition = this.controlBar ? this.controlBar.position.clone() : new THREE.Vector3(0, 1.2, 8);
            const relativeKitePos = centerOfMass.clone().sub(currentPilotPosition);
            const radialAxis = relativeKitePos.normalize(); // Axe radial (normal à la sphère)
            
            // Calculer le couple pour chaque ligne
            const leftLever = ctrlLeftWorld.clone().sub(centerOfMass);
            const leftTorqueVector = new THREE.Vector3().crossVectors(leftLever, leftTensionForce);
            
            const rightLever = ctrlRightWorld.clone().sub(centerOfMass);
            const rightTorqueVector = new THREE.Vector3().crossVectors(rightLever, rightTensionForce);
            
            // Couple total des lignes
            const totalTorqueVector = leftTorqueVector.clone().add(rightTorqueVector);
            
            // ==== COUPLE AÉRODYNAMIQUE (CP - CG) ====
            // La force aérodynamique appliquée au CP crée un couple autour du CG
            // Quand le CP est derrière le CG, le cerf-volant est stable
            // Le couple résultant tend à ramener le cerf-volant vers son attitude d'équilibre
            const aerodynamicLever = centerOfPressure.clone().sub(centerOfGravity);
            const totalAeroForce = liftForce.clone().add(dragForce);
            
            // Calcul du couple aérodynamique avec facteur de stabilité
            const aerodynamicTorque = new THREE.Vector3().crossVectors(aerodynamicLever, totalAeroForce);
            
            // Facteur de stabilité : plus le CP est derrière le CG, plus le couple est stabilisant
            const stabilityFactor = 1.0 + aerodynamicLever.length() * 0.5;
            aerodynamicTorque.multiplyScalar(stabilityFactor);
            
            // Ajouter le couple aérodynamique au couple total
            const combinedTorque = totalTorqueVector.clone().add(aerodynamicTorque);
            
            // IMPORTANT : Projeter le couple sur l'axe RADIAL
            // Cela fait tourner l'épine dans le plan tangent à la sphère
            const torqueOnRadialAxis = combinedTorque.dot(radialAxis);
            
            // Le couple résultant est autour de l'axe radial
            // Cela fait tourner l'épine dans le plan tangent (gauche/droite, haut/bas)
            totalTorque = radialAxis.clone().multiplyScalar(torqueOnRadialAxis);
            
            // Force totale de tension (somme des deux lignes)
            tensionForce.add(leftTensionForce);
            tensionForce.add(rightTensionForce);
        }
        
        // Pas de force latérale artificielle, le contrôle se fait par différence de tension
        // Si pas de points de contrôle, pas de couple
        if (!ctrlLeft || !ctrlRight) {
            totalTorque = new THREE.Vector3();
        }
        
        // ==== INTÉGRATION DES FORCES ====
        // Force totale = Portance + Traînée + Gravité + Tension
        const totalForce = new THREE.Vector3()
            .add(liftForce)
            .add(dragForce)
            .add(gravityForce)
            .add(tensionForce);
        
        // Accélération linéaire = F / m
        const acceleration = totalForce.divideScalar(this.kiteParams.mass);
        
        // ==== INTÉGRATION DU COUPLE AVEC INERTIE ====
        // Le couple crée une accélération angulaire qui fait progressivement
        // tourner le cerf-volant vers sa position d'équilibre
        const angularAcceleration = totalTorque.divideScalar(this.kiteParams.inertia);
        
        // Mise à jour de la vitesse angulaire
        this.kiteAngularVelocity.add(angularAcceleration.multiplyScalar(delta));
        
        // Amortissement très fort pour la stabilité (friction aérodynamique)
        this.kiteAngularVelocity.multiplyScalar(0.7); // Plus d'amortissement pour réduire les oscillations
        
        // Limiter la vitesse angulaire maximale
        const maxAngularSpeed = 2; // rad/s
        if (this.kiteAngularVelocity.length() > maxAngularSpeed) {
            this.kiteAngularVelocity.normalize().multiplyScalar(maxAngularSpeed);
        }
        
        // Mise à jour de la vélocité (intégration d'Euler)
        const newVelocity = this.kiteVelocity.clone().add(acceleration.multiplyScalar(delta));
        
        // Amortissement pour stabilité
        newVelocity.multiplyScalar(0.95);
        
        // ==== POSITION DÉTERMINÉE PAR LES CONTRAINTES DES LIGNES ====
        // Le cerf-volant se positionne là où les deux lignes le contraignent
        let newPosition = currentPos.clone();
        
        const pilotPosition = this.controlBar ? this.controlBar.position.clone() : new THREE.Vector3(0, 1.2, 8);
        
        // Si on a les positions des poignées et des points de contrôle
        if (ctrlLeft && ctrlRight && handleLeft && handleRight) {
            // Calculer où le cerf-volant DOIT être pour respecter les contraintes
            // Les points de contrôle doivent être à lineLength des poignées
            
            // Direction depuis chaque poignée vers le cerf-volant actuel
            const leftDir = currentPos.clone().sub(handleLeft).normalize();
            const rightDir = currentPos.clone().sub(handleRight).normalize();
            
            // Positions cibles des points de contrôle (à distance fixe)
            const targetLeftCtrl = handleLeft.clone().add(leftDir.multiplyScalar(this.lineLength));
            const targetRightCtrl = handleRight.clone().add(rightDir.multiplyScalar(this.lineLength));
            
            // Centre du cerf-volant = milieu entre les deux points de contrôle
            const targetCenter = targetLeftCtrl.clone().add(targetRightCtrl).multiplyScalar(0.5);
            
            // Interpoler vers la position cible (pour éviter les sauts brusques)
            newPosition.lerp(targetCenter, 0.3);
        } else {
            // Fallback : utiliser la physique normale
            newPosition.add(newVelocity.clone().multiplyScalar(delta));
        }
        
        // Contrainte sphérique de sécurité (ne pas dépasser la longueur des lignes)
        const distFromPilot = newPosition.distanceTo(pilotPosition);
        if (distFromPilot > this.lineLength * 0.98) {
            const dir = newPosition.clone().sub(pilotPosition).normalize();
            newPosition.copy(pilotPosition.clone().add(dir.multiplyScalar(this.lineLength * 0.98)));
        }
        
        // Hauteur minimale
        newPosition.y = Math.max(1, newPosition.y);
        
        // Appliquer la nouvelle position
        this.kite.position.copy(newPosition);
        
        // Sauvegarder pour le prochain frame
        this.previousKitePosition.copy(newPosition);
        this.kiteVelocity.copy(newVelocity);
        
        // ==== ORIENTATION TANGENTIELLE À LA SPHÈRE AVEC CONTRÔLE DIRECTIONNEL ====
        // PRINCIPE FONDAMENTAL :
        // 1. L'épine dorsale (NEZ vers SPINE_BAS) doit être TANGENTIELLE à la sphère
        // 2. MAIS elle peut s'orienter dans TOUTES les directions du plan tangent
        // 3. C'est cette orientation qui contrôle la trajectoire du cerf-volant !
        
        // Position relative au pilote
        const relativePos = newPosition.clone().sub(pilotPosition);
        
        // Vecteur radial (normale à la sphère)
        const radialVector = relativePos.clone().normalize();
        
        // ==== CALCUL DU PLAN TANGENT ====
        // Le plan tangent est perpendiculaire au vecteur radial
        
        // ==== DIRECTION DE L'ÉPINE DANS LE PLAN TANGENT ====
        // Par défaut, l'épine pointe "vers le haut" (projection de UP)
        const upVector = new THREE.Vector3(0, 1, 0);
        let spineDirection = upVector.clone().sub(radialVector.clone().multiplyScalar(upVector.dot(radialVector)));
        
        // Si on a une vitesse significative, l'épine s'aligne avec la direction du mouvement
        const speed = this.kiteVelocity.length();
        if (speed > 0.5) {
            // Projeter la vitesse sur le plan tangent
            const velocityInTangentPlane = this.kiteVelocity.clone()
                .sub(radialVector.clone().multiplyScalar(this.kiteVelocity.dot(radialVector)));
            
            if (velocityInTangentPlane.length() > 0.1) {
                // L'épine s'aligne avec la direction du mouvement
                spineDirection = velocityInTangentPlane.normalize();
            }
        }
        
        // ==== ORIENTATION HYBRIDE : CONTRAINTES + DYNAMIQUE ====
        // L'orientation cible est déterminée par les contraintes géométriques
        // MAIS le cerf-volant y arrive progressivement via la vitesse angulaire
        
        let targetSpineDirection = spineDirection.clone(); // Direction actuelle par défaut
        
        // Calculer la direction cible basée sur les contraintes
        if (ctrlLeft && ctrlRight && handleLeft && handleRight) {
            // Vecteurs depuis les poignées vers le centre actuel du cerf-volant
            const centerKite = this.kite.position.clone();
            const leftToKite = centerKite.clone().sub(handleLeft);
            const rightToKite = centerKite.clone().sub(handleRight);
            
            // Positions cibles des points de contrôle (à distance fixe des poignées)
            const targetLeftCtrl = handleLeft.clone().add(
                leftToKite.normalize().multiplyScalar(this.lineLength)
            );
            const targetRightCtrl = handleRight.clone().add(
                rightToKite.normalize().multiplyScalar(this.lineLength)
            );
            
            // Centre cible du cerf-volant = milieu des points de contrôle cibles
            const targetCenter = targetLeftCtrl.clone().add(targetRightCtrl).multiplyScalar(0.5);
            
            // Vecteur entre les points de contrôle cibles (largeur du cerf-volant)
            const targetSpan = targetRightCtrl.clone().sub(targetLeftCtrl);
            
            // L'épine dorsale cible doit être perpendiculaire à ce vecteur
            const radialAtTarget = targetCenter.clone().normalize();
            targetSpineDirection = new THREE.Vector3().crossVectors(targetSpan, radialAtTarget).normalize();
            
            // Si le cerf-volant est inversé, corriger
            if (targetSpineDirection.dot(this.kiteVelocity) < 0 && this.kiteVelocity.length() > 0.1) {
                targetSpineDirection.negate();
            }
        }
        
        // ==== INTÉGRATION DE LA VITESSE ANGULAIRE ====
        // La vitesse angulaire fait tourner l'épine dorsale progressivement
        if (this.kiteAngularVelocity.length() > 0.001) {
            const rotationDelta = this.kiteAngularVelocity.clone().multiplyScalar(delta);
            
            // Appliquer la rotation autour du vecteur radial
            // (rotation dans le plan tangent à la sphère)
            const rotationQuat = new THREE.Quaternion();
            rotationQuat.setFromAxisAngle(radialVector, rotationDelta.y);
            spineDirection.applyQuaternion(rotationQuat);
        }
        
        // Interpoler légèrement vers la direction cible pour la stabilité
        spineDirection.lerp(targetSpineDirection, 0.1);
        
        // Normaliser la direction de l'épine
        if (spineDirection.length() < 0.01) {
            // Cas spécial au zénith : utiliser une direction par défaut
            spineDirection.set(0, 0, -1);
        } else {
            spineDirection.normalize();
        }
        
        // ==== CONSTRUCTION DE L'ORIENTATION ====
        // Axes du cerf-volant dans Three.js :
        // - Axe Y local = épine dorsale (NEZ vers SPINE_BAS) = tangent à la sphère
        // - Axe Z local = "ventre" vers le pilote (whiskers pointent vers l'arrière)
        // - Axe X local = envergure (perpendiculaire aux deux autres)
        
        // L'axe Z pointe vers le pilote (le ventre fait face au pilote)
        const forwardDirection = radialVector.clone().negate(); // Vers le pilote
        
        // L'axe X est perpendiculaire à l'épine et à la direction forward
        const rightVector = new THREE.Vector3().crossVectors(spineDirection, forwardDirection);
        if (rightVector.length() > 0.01) {
            rightVector.normalize();
        } else {
            // Cas dégénéré : utiliser un vecteur perpendiculaire par défaut
            rightVector.set(1, 0, 0);
        }
        
        // Recalculer l'axe Z pour qu'il soit exactement perpendiculaire
        const adjustedForward = new THREE.Vector3().crossVectors(rightVector, spineDirection).normalize();
        
        // Matrice de rotation : makeBasis(xAxis, yAxis, zAxis)
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeBasis(rightVector, spineDirection, adjustedForward);
        
        // Appliquer l'orientation de base
        this.kite.quaternion.setFromRotationMatrix(rotationMatrix);
        
        // === L'INCLINAISON EST DÉTERMINÉE PAR LA GÉOMÉTRIE ===
        // L'orientation du cerf-volant, incluant son inclinaison (roll),
        // est entièrement déterminée par les contraintes géométriques ci-dessus.
        // Les points de contrôle suivent les lignes, ce qui oriente naturellement le cerf-volant.
        
        // ==== PAS DE ROTATION DE PITCH SUPPLÉMENTAIRE ====
        // Pour un cerf-volant delta à deux lignes, l'épine dorsale RESTE TANGENTE à la sphère
        // L'angle d'attaque est créé par la FORME du cerf-volant (whiskers), pas par une rotation
        // Le cerf-volant vole "à plat" sur la sphère, avec les whiskers créant naturellement
        // l'angle nécessaire pour générer de la portance
        
        // Animer la barre de contrôle
        if (this.controlBar) {
            // Interpolation douce vers la position cible
            const lerpSpeed = 0.15; // Vitesse d'interpolation
            this.controlBarRotation += (this.targetBarRotation - this.controlBarRotation) * lerpSpeed;
            
            // Récupérer les points de contrôle du cerf-volant pour calculer l'axe
            const ctrlLeft = this.kite!.getPoint('CTRL_GAUCHE');
            const ctrlRight = this.kite!.getPoint('CTRL_DROIT');
            
            if (ctrlLeft && ctrlRight) {
                // Convertir en coordonnées monde
                const kiteLeftWorld = ctrlLeft.clone();
                const kiteRightWorld = ctrlRight.clone();
                this.kite!.localToWorld(kiteLeftWorld);
                this.kite!.localToWorld(kiteRightWorld);
                
                // === CALCUL CORRECT DE L'AXE DE ROTATION ===
                // 1. Vecteur de la barre (gauche vers droite)
                const barVector = new THREE.Vector3(1, 0, 0);
                
                // 2. Vecteur vers le cerf-volant
                const centerKite = kiteLeftWorld.clone().add(kiteRightWorld).multiplyScalar(0.5);
                const toKiteVector = centerKite.clone().sub(this.controlBar.position);
                
                // 3. Axe de rotation = perpendiculaire au plan (barre × direction kite)
                const rotationAxis = new THREE.Vector3().crossVectors(barVector, toKiteVector).normalize();
                
                if (rotationAxis.length() < 0.01) {
                    rotationAxis.set(0, 0, 1);
                }
                
                // Appliquer la rotation de la barre autour de cet axe
                const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, this.controlBarRotation);
                this.controlBar.quaternion.copy(rotationQuaternion);
            }
            
            // Le déplacement latéral est déjà géré dans le calcul sphérique ci-dessus
            // via controlOffset dans l'azimuth
        }
        
        // Mettre à jour la physique des pivots souples
        this.updatePivotPhysics(delta);
        
        // Mettre à jour les lignes de contrôle pour qu'elles suivent le cerf-volant
        this.updateControlLines();
        
        // ==== MISE À JOUR DES VECTEURS DE DEBUG ====
        if (this.debugMode) {
            // Mettre à jour les vecteurs de debug avec les nouvelles forces
            this.updateDebugVectors(dragForce, liftForce, this.kiteVelocity);
            
            // Mise à jour des indicateurs debug
            const force = document.getElementById('force-display');
            const tension = document.getElementById('tension-display');
            const altitude = document.getElementById('altitude-display');
            
            if (force) force.textContent = liftMagnitude.toFixed(1);
            if (tension) tension.textContent = dragMagnitude.toFixed(1);
            if (altitude) altitude.textContent = this.kite.position.y.toFixed(1);
        }
    }
    
    private animate = (): void => {
        this.frameId = requestAnimationFrame(this.animate);
        
        const delta = this.clock.getDelta();
        
        // Mise à jour de la physique
        this.simulatePhysics(delta);
        
        // Mise à jour des contrôles
        this.controls.update();
        
        // Rendu
        this.renderer.render(this.scene, this.camera);
        
        // FPS
        this.updateFPS();
    }
    
    private updateFPS(): void {
        const fps = document.getElementById('fps');
        if (fps && this.frameId % 30 === 0) {
            fps.textContent = Math.round(1 / this.clock.getDelta()).toString();
        }
    }
    
    private onResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Démarrer l'application
new SimulationApp();