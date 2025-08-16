/**
 * CAO KISS - Point d'entrée principal
 * Architecture modulaire avec objets séparés
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Registry } from './core/Registry';
import { Assembly } from './core/Assembly';
import { registerAllObjects } from './objects';

// === Application principale ===

class App {
    scene!: THREE.Scene;
    camera!: THREE.PerspectiveCamera;
    renderer!: THREE.WebGLRenderer;
    controls!: OrbitControls;
    registry: Registry;
    currentObject: Assembly | null = null;
    isAnimating = false;
    labelsVisible = true;
    clock = new THREE.Clock();
    
    constructor() {
        // Initialiser le registre et enregistrer tous les objets
        this.registry = Registry.getInstance();
        registerAllObjects();
        
        this.init();
        this.loadObject('chair'); // Chaise par défaut
        this.animate();
        this.setupControls();
    }
    
    init(): void {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(3, 2, 3);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('app')!.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 0.5, 0);
        this.controls.update();
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 20;
        directionalLight.shadow.camera.left = -5;
        directionalLight.shadow.camera.right = 5;
        directionalLight.shadow.camera.top = 5;
        directionalLight.shadow.camera.bottom = -5;
        this.scene.add(directionalLight);
        
        // Ground
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222233,
            roughness: 0.8,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Grid
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
        this.scene.add(gridHelper);
        
        // Axes Helper - Repère orthogonal (X=rouge, Y=vert, Z=bleu)
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        
        // Labels pour les axes
        this.addAxisLabels();
        
        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    addAxisLabels(): void {
        // Créer les labels avec des sprites texte
        const createTextSprite = (text: string, color: string) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.width = 64;
            canvas.height = 64;
            
            context.font = 'Bold 48px Arial';
            context.fillStyle = color;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, 32, 32);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                depthTest: false,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.5, 0.5, 1);
            return sprite;
        };
        
        // Label X (rouge)
        const labelX = createTextSprite('X', '#ff0000');
        labelX.position.set(5.5, 0, 0);
        this.scene.add(labelX);
        
        // Label Y (vert)
        const labelY = createTextSprite('Y', '#00ff00');
        labelY.position.set(0, 5.5, 0);
        this.scene.add(labelY);
        
        // Label Z (bleu)
        const labelZ = createTextSprite('Z', '#0080ff');
        labelZ.position.set(0, 0, 5.5);
        this.scene.add(labelZ);
        
        // Ajouter l'origine O
        const labelO = createTextSprite('O', '#ffffff');
        labelO.position.set(-0.5, -0.5, -0.5);
        labelO.scale.set(0.3, 0.3, 1);
        this.scene.add(labelO);
    }
    
    loadObject(type: string): void {
        // Remove current object
        if (this.currentObject) {
            this.scene.remove(this.currentObject);
        }
        
        // Create new object from registry
        const newObject = this.registry.create(type);
        if (newObject) {
            this.currentObject = newObject;
            this.scene.add(this.currentObject);
            
            // Update UI
            const creator = this.registry.get(type);
            if (creator) {
                document.getElementById('object-name')!.textContent = creator.getName();
                document.getElementById('primitive-count')!.textContent = 
                    creator.getPrimitiveCount().toString();
            }
        } else {
            console.error(`Object type '${type}' not found in registry`);
        }
    }
    
    generateObjectButtons(): void {
        const selector = document.querySelector('.object-selector');
        if (!selector) return;
        
        // Vider le sélecteur existant
        selector.innerHTML = '';
        
        // Récupérer tous les objets du registre
        const objects = this.registry.getAll();
        
        // Organiser par catégories
        const categories: Record<string, Array<{id: string, name: string}>> = {
            'Mobilier': [],
            'Contenants': [],
            'Mécaniques': [],
            'Génératifs': [],
            'Géométrie': [],
            'Autres': []
        };
        
        // Icônes par défaut pour chaque type d'objet
        const icons: Record<string, string> = {
            'chair': '🪑',
            'table': '🪟',
            'box': '📦',
            'gear': '⚙️',
            'tree': '🌳',
            'pyramid': '🔺',
            'default': '🔷'
        };
        
        // Classer les objets
        objects.forEach((obj, id) => {
            const name = obj.getName();
            let category = 'Autres';
            
            // Déterminer la catégorie
            if (id.includes('chair') || id.includes('table')) {
                category = 'Mobilier';
            } else if (id.includes('box')) {
                category = 'Contenants';
            } else if (id.includes('gear')) {
                category = 'Mécaniques';
            } else if (id.includes('tree')) {
                category = 'Génératifs';
            } else if (id.includes('pyramid')) {
                category = 'Géométrie';
            }
            
            categories[category].push({ id, name });
        });
        
        // Créer les boutons par catégorie
        let firstButton: HTMLButtonElement | null = null;
        
        Object.entries(categories).forEach(([categoryName, items]) => {
            if (items.length === 0) return;
            
            // Ajouter le label de catégorie
            const label = document.createElement('div');
            label.className = 'category-label';
            label.textContent = categoryName;
            selector.appendChild(label);
            
            // Ajouter les boutons
            items.forEach(({ id, name }) => {
                const button = document.createElement('button');
                button.id = `btn-${id}`;
                
                // Déterminer l'icône
                let icon = icons.default;
                for (const [key, value] of Object.entries(icons)) {
                    if (id.includes(key)) {
                        icon = value;
                        break;
                    }
                }
                
                button.textContent = `${icon} ${name}`;
                
                // Premier bouton actif par défaut
                if (!firstButton) {
                    firstButton = button;
                    button.classList.add('active');
                }
                
                button.addEventListener('click', () => {
                    console.log(`Loading object: ${id}`);
                    
                    // Update active button
                    selector.querySelectorAll('button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    button.classList.add('active');
                    
                    // Load object
                    this.loadObject(id);
                });
                
                selector.appendChild(button);
            });
        });
    }
    
    setupControls(): void {
        // Bouton Explode
        document.getElementById('btn-explode')!.addEventListener('click', () => {
            if (this.currentObject) {
                this.currentObject.explode(2);
            }
        });
        
        // Bouton Reset
        document.getElementById('btn-reset')!.addEventListener('click', () => {
            if (this.currentObject) {
                this.currentObject.reset();
            }
        });
        
        // Bouton Animate
        document.getElementById('btn-animate')!.addEventListener('click', () => {
            this.isAnimating = !this.isAnimating;
            const btn = document.getElementById('btn-animate')!;
            btn.textContent = this.isAnimating ? '⏸️ Pause' : '▶️ Animer';
        });
        
        // Bouton Labels
        document.getElementById('btn-labels')!.addEventListener('click', () => {
            this.labelsVisible = !this.labelsVisible;
            if (this.currentObject) {
                this.currentObject.toggleLabels(this.labelsVisible);
            }
            const btn = document.getElementById('btn-labels')!;
            btn.textContent = this.labelsVisible ? '🏷️ Labels' : '👁️ Labels';
        });
        
        // Générer dynamiquement les boutons pour tous les objets disponibles
        this.generateObjectButtons();
    }
    
    animate(): void {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        
        // Update controls
        this.controls.update();
        
        // Animate object
        if (this.isAnimating && this.currentObject) {
            this.currentObject.getGroup().rotation.y += delta * 0.5;
        }
        
        // Update FPS
        const fps = Math.round(1 / delta);
        document.getElementById('fps')!.textContent = fps.toString();
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// === Démarrage ===
new App();

// Hot Module Replacement
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        console.log('♻️ Module rechargé');
        window.location.reload();
    });
}