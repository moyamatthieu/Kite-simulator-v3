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
        
        // Récupérer les positions des poignées de la barre de contrôle en coordonnées monde
        const handleLeftLocal = new THREE.Vector3(-0.5, -0.075, 0);
        const handleRightLocal = new THREE.Vector3(0.5, -0.075, 0);
        const handleLeft = handleLeftLocal.clone();
        const handleRight = handleRightLocal.clone();
        this.controlBar.localToWorld(handleLeft);
        this.controlBar.localToWorld(handleRight);
        
        const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = this.kite.getPoint('CTRL_DROIT');
        
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
            this.controlBar.rotation.y = 0;
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
    
    private updateDebugVectors(delta: number, windVector: THREE.Vector3): void {
        if (!this.debugMode || !this.kite) return;
        
        // Calculer le centre de portance (approximativement au centre du cerf-volant)
        const centerOfLift = this.kite.position.clone();
        centerOfLift.y += 0.3; // Légèrement au-dessus du centre géométrique
        
        // Calculer la vitesse
        const currentPos = this.kite.position.clone();
        if (this.previousKitePosition.length() > 0) {
            this.kiteVelocity.subVectors(currentPos, this.previousKitePosition).divideScalar(delta);
        }
        this.previousKitePosition.copy(currentPos);
        
        // Calculer les forces
        const speed = this.kiteVelocity.length();
        const windSpeed = windVector.length();
        
        // Vecteur vitesse (relatif au mouvement du cerf-volant)
        if (this.debugVectors.velocity && speed > 0.01) {
            const velocityNorm = this.kiteVelocity.clone().normalize();
            const velocityMagnitude = Math.min(speed * 0.5, 3); // Limiter la taille visuelle
            this.debugVectors.velocity.position.copy(centerOfLift);
            this.debugVectors.velocity.setDirection(velocityNorm);
            this.debugVectors.velocity.setLength(velocityMagnitude, velocityMagnitude * 0.2, velocityMagnitude * 0.2);
            this.debugVectors.velocity.visible = true;
        } else if (this.debugVectors.velocity) {
            this.debugVectors.velocity.visible = false;
        }
        
        // Vecteur portance (perpendiculaire au vent et aux lignes)
        if (this.debugVectors.lift) {
            const liftDirection = new THREE.Vector3(0, 1, 0); // La portance va vers le haut
            const liftMagnitude = windSpeed * 3; // Proportionnel à la vitesse du vent
            this.debugVectors.lift.position.copy(centerOfLift);
            this.debugVectors.lift.setDirection(liftDirection);
            this.debugVectors.lift.setLength(liftMagnitude, liftMagnitude * 0.2, liftMagnitude * 0.2);
        }
        
        // Vecteur traînée (opposé au vent relatif)
        if (this.debugVectors.drag) {
            const relativeWind = windVector.clone().sub(this.kiteVelocity);
            if (relativeWind.length() > 0.01) {
                const dragDirection = relativeWind.clone().normalize().negate();
                const dragMagnitude = relativeWind.length() * 2;
                this.debugVectors.drag.position.copy(centerOfLift);
                this.debugVectors.drag.setDirection(dragDirection);
                this.debugVectors.drag.setLength(dragMagnitude, dragMagnitude * 0.2, dragMagnitude * 0.2);
            }
        }
    }
    
    private updateWindDisplay(): void {
        const windSpeedDisplay = document.getElementById('wind-speed-display');
        if (windSpeedDisplay) {
            windSpeedDisplay.textContent = `${this.windParams.speed}`;
        }
    }
    
    private simulatePhysics(_delta: number): void {
        if (!this.kite || !this.isPlaying) return;
        
        // Marquer que la simulation a démarré
        if (!this.hasStarted) {
            this.hasStarted = true;
            this.clock.start(); // Démarrer/réinitialiser le chronomètre
        }
        
        const time = this.clock.getElapsedTime();
        
        // PHYSIQUE RÉALISTE DU CERF-VOLANT
        // Direction et vitesse du vent
        const windRad = (this.windParams.direction * Math.PI) / 180;
        // Conversion km/h vers force normalisée (0-50 km/h → 0-1)
        const windForce = this.windParams.speed / 50;
        const turbulence = this.windParams.turbulence / 100;
        
        // Vecteur de vent 3D
        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windForce,
            0.1 * windForce, // Légère composante verticale
            -Math.cos(windRad) * windForce
        );
        
        // Position du point d'ancrage (milieu entre les deux mains sur la barre)
        const anchorPoint = this.controlBar ? this.controlBar.position.clone() : new THREE.Vector3(0, 1.2, 8);
        
        // Calcul de l'angle de vol basé sur la tension des lignes et le vent
        // Le cerf-volant vole dans une fenêtre de vent (wind window)
        const baseAngle = Math.atan2(windVector.x, -windVector.z);
        // Altitude basée sur la vitesse du vent (45° à 75°)
        const elevationAngle = Math.PI / 4 + windForce * Math.PI / 6;
        
        // Position de base du cerf-volant (sur la sphère de rayon = longueur des lignes)
        const sphericalRadius = this.lineLength * 0.98; // Lignes tendues
        
        // Ajout du contrôle par la barre (inversé pour correspondre au mouvement de traction)
        const controlOffset = -this.controlBarRotation * 2; // Déplacement latéral inversé
        
        // Oscillations naturelles (figure de 8)
        const figure8X = Math.sin(time * 1.5) * 0.3 * windForce;
        const figure8Y = Math.sin(time * 3) * 0.2 * windForce;
        
        // Turbulence
        const turbX = (Math.random() - 0.5) * turbulence * 0.05;
        const turbY = (Math.random() - 0.5) * turbulence * 0.05;
        
        // Calculer la position sur la sphère (fenêtre de vent)
        const azimuth = baseAngle + controlOffset + figure8X + turbX;
        const elevation = elevationAngle + figure8Y + turbY;
        
        // Conversion sphérique vers cartésienne
        let targetX = anchorPoint.x + sphericalRadius * Math.sin(azimuth) * Math.cos(elevation);
        let targetY = anchorPoint.y + sphericalRadius * Math.sin(elevation);
        let targetZ = anchorPoint.z - sphericalRadius * Math.cos(azimuth) * Math.cos(elevation);
        
        // Contraintes physiques
        // Empêcher le cerf-volant de toucher le sol
        targetY = Math.max(0.5, targetY);
        
        // Vérifier la distance maximale (longueur des lignes)
        if (this.controlBar) {
            const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
            const distance = anchorPoint.distanceTo(targetPos);
            
            // Si trop loin, ramener sur la sphère
            if (distance > this.lineLength) {
                const direction = new THREE.Vector3().subVectors(targetPos, anchorPoint).normalize();
                const constrainedPos = anchorPoint.clone().add(direction.multiplyScalar(this.lineLength * 0.98));
                targetX = constrainedPos.x;
                targetY = Math.max(0.5, constrainedPos.y);
                targetZ = constrainedPos.z;
            }
        }
        
        // Appliquer le mouvement
        this.kite.position.x = targetX;
        this.kite.position.y = targetY;
        this.kite.position.z = targetZ;
        
        // ORIENTATION RÉALISTE DU CERF-VOLANT
        // Le cerf-volant doit être perpendiculaire aux lignes ET orienté face au vent
        if (this.controlBar) {
            const kitePos = this.kite.position.clone();
            
            // Vecteur de direction des lignes (du cerf-volant vers la barre)
            const lineDirection = new THREE.Vector3().subVectors(anchorPoint, kitePos).normalize();
            
            
            // Le cerf-volant s'oriente perpendiculairement aux lignes
            // avec son dos face au vent (et son ventre face au pilote)
            
            // Calculer l'orientation de base (dos au pilote, face au vent)
            const lookAtDirection = Math.atan2(lineDirection.x, lineDirection.z);
            
            // Angle d'attaque (pitch) - crucial pour la portance
            const angleOfAttack = -Math.PI / 10; // -18 degrés (optimal pour la portance)
            const pitchAdjustment = Math.asin(-lineDirection.y) * 0.5;
            
            // Orientation finale - le cerf-volant a son dos face au pilote
            this.kite.rotation.y = lookAtDirection; // Dos au pilote, face au vent
            this.kite.rotation.x = angleOfAttack + pitchAdjustment;
            
            // Inclinaison latérale (roll) basée sur le contrôle
            if (this.controlBarRotation !== 0) {
                // Virage réaliste : le cerf-volant s'incline dans la direction du virage
                const bankAngle = this.controlBarRotation * 0.8; // Inclinaison bancaire
                this.kite.rotation.z = bankAngle;
                
                // Ajuster aussi le lacet (yaw) pour le virage
                this.kite.rotation.y += this.controlBarRotation * 0.3;
            } else {
                // Stabilisation naturelle avec légères oscillations
                const naturalSway = Math.sin(time * 2) * 0.02 * windForce;
                this.kite.rotation.z = naturalSway;
            }
            
            // Effets de la turbulence sur l'orientation
            if (turbulence > 0) {
                this.kite.rotation.x += (Math.random() - 0.5) * turbulence * 0.1;
                this.kite.rotation.z += (Math.random() - 0.5) * turbulence * 0.05;
            }
        }
        
        // Animer la barre de contrôle
        if (this.controlBar) {
            // Interpolation douce vers la position cible
            const lerpSpeed = 0.15; // Vitesse d'interpolation
            this.controlBarRotation += (this.targetBarRotation - this.controlBarRotation) * lerpSpeed;
            
            // Appliquer la rotation à la barre
            this.controlBar.rotation.y = this.controlBarRotation;
            
            // Le déplacement latéral est déjà géré dans le calcul sphérique ci-dessus
            // via controlOffset dans l'azimuth
        }
        
        // Mettre à jour la physique des pivots souples
        this.updatePivotPhysics(_delta);
        
        // Mettre à jour les lignes de contrôle pour qu'elles suivent le cerf-volant
        this.updateControlLines();
        
        // Mettre à jour les vecteurs de debug
        this.updateDebugVectors(_delta, windVector);
        
        // Mise à jour des indicateurs debug
        if (this.debugMode) {
            const force = document.getElementById('force-display');
            const tension = document.getElementById('tension-display');
            const altitude = document.getElementById('altitude-display');
            
            if (force) force.textContent = (windForce * 10).toFixed(1);
            if (tension) tension.textContent = (windForce * 15).toFixed(1);
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