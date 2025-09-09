/**
 * `render.ts` - Gestionnaire du rendu 3D avec Three.js.
 *
 * Cette classe initialise et gère la scène Three.js, la caméra, le renderer WebGL,
 * et les contrôles de la caméra (OrbitControls). Elle est responsable de la configuration
 * de l'environnement visuel et du cycle de rendu de la simulation.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Constantes de Configuration du Rendu ---
// Caméra
const CAMERA_FOV = 60;                          // Champ de vision vertical en degrés
const CAMERA_NEAR = 0.1;                        // Distance minimale de rendu
const CAMERA_FAR = 1000;                        // Distance maximale de rendu
const CAMERA_INITIAL_POSITION = new THREE.Vector3(0, 5, 15); // Position initiale de la caméra
const CAMERA_LOOK_AT_TARGET = new THREE.Vector3(0, 3, -5);   // Point que la caméra regarde initialement
const ORBIT_CONTROLS_TARGET = new THREE.Vector3(0, 3, -5);  // Point autour duquel les contrôles orbitent

// Scène et Lumières
const SCENE_BACKGROUND_COLOR = 0x222222;        // Gris foncé pour debug
const SCENE_FOG_COLOR = 0x87ceeb;               // Couleur du brouillard
const SCENE_FOG_NEAR = 30;                      // Distance à laquelle le brouillard commence
const SCENE_FOG_FAR = 120;                      // Distance à laquelle le brouillard est le plus dense

const HEMISPHERE_LIGHT_SKY_COLOR = 0xe7f3ff;    // Couleur du ciel pour la lumière hémisphérique
const HEMISPHERE_LIGHT_GROUND_COLOR = 0x335533; // Couleur du sol pour la lumière hémisphérique
const HEMISPHERE_LIGHT_INTENSITY = 0.9;         // Intensité de la lumière hémisphérique

const DIRECTIONAL_LIGHT_COLOR = 0xffffff;       // Couleur de la lumière directionnelle (blanche)
const DIRECTIONAL_LIGHT_INTENSITY = 0.9;        // Intensité de la lumière directionnelle
const DIRECTIONAL_LIGHT_POSITION = new THREE.Vector3(12, 18, 10); // Position de la lumière directionnelle


/**
 * @class RenderManager
 * @description Gère l'initialisation et le cycle de rendu de la scène 3D avec Three.js.
 *              Inclut la scène, la caméra, le renderer, les contrôles de navigation
 *              et les lumières.
 */
export class RenderManager {
  public readonly scene: THREE.Scene;           // La scène Three.js où sont ajoutés les objets
  public readonly camera: THREE.PerspectiveCamera; // La caméra utilisée pour visualiser la scène
  public readonly renderer: THREE.WebGLRenderer;   // Le renderer WebGL qui affiche la scène
  public readonly controls: OrbitControls;       // Les contrôles pour naviguer autour de la scène
  private defaultGroundGroup: THREE.Group | null = null; // Groupe sol/grille par défaut

  /**
   * Crée une instance de RenderManager.
   * @param {HTMLElement} container - L'élément DOM dans lequel le rendu sera affiché.
   */
  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE_BACKGROUND_COLOR); // Définit la couleur du ciel
    this.scene.fog = new THREE.Fog(SCENE_FOG_COLOR, SCENE_FOG_NEAR, SCENE_FOG_FAR); // Ajoute du brouillard

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      container.clientWidth / container.clientHeight, // Ratio d'aspect
      CAMERA_NEAR,
      CAMERA_FAR
    );
    this.camera.position.copy(CAMERA_INITIAL_POSITION); // Définit la position initiale de la caméra
    this.camera.lookAt(CAMERA_LOOK_AT_TARGET);           // Définit le point que la caméra regarde

    this.renderer = new THREE.WebGLRenderer({ antialias: true }); // Initialise le renderer avec anti-aliasing
    this.renderer.setSize(container.clientWidth, container.clientHeight); // Définit la taille du renderer
    this.renderer.setPixelRatio(window.devicePixelRatio); // Gère la résolution sur les écrans HiDPI
    // Activer les ombres douces pour un rendu plus lisible
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Un rendu plus lisible par défaut
    // (sans imposer de pipeline PBR complet)
    try {
      (this.renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
      (this.renderer as any).toneMapping = (THREE as any).ACESFilmicToneMapping ?? (THREE as any).NoToneMapping;
      (this.renderer as any).toneMappingExposure = 1.0;
    } catch { /* compat */ }
    container.appendChild(this.renderer.domElement);      // Ajoute le canvas au conteneur DOM

    this.controls = new OrbitControls(this.camera, this.renderer.domElement); // Crée les contrôles de la caméra
    this.controls.target.copy(ORBIT_CONTROLS_TARGET); // Définit le point focal des contrôles
    this.controls.update();                           // Met à jour les contrôles après modification de la cible

    // Ajout des lumières à la scène
    const hemiLight = new THREE.HemisphereLight(
      HEMISPHERE_LIGHT_SKY_COLOR,
      HEMISPHERE_LIGHT_GROUND_COLOR,
      HEMISPHERE_LIGHT_INTENSITY
    );
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(
      DIRECTIONAL_LIGHT_COLOR,
      DIRECTIONAL_LIGHT_INTENSITY
    );
    dirLight.position.copy(DIRECTIONAL_LIGHT_POSITION);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.bias = -0.0002;
    this.scene.add(dirLight);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25)); // Remplit légèrement les ombres pour le sol

    // Gère le redimensionnement de la fenêtre
    window.addEventListener('resize', () => this.onResize(container));
  }

  /**
   * Gère le redimensionnement de la fenêtre pour ajuster la caméra et le renderer.
   * @param {HTMLElement} container - L'élément DOM qui contient le renderer.
   */
  onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix(); // Met à jour la matrice de projection de la caméra
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  /**
   * Effectue un cycle de rendu de la scène.
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Nettoie les ressources Three.js pour éviter les fuites de mémoire.
   */
  dispose(): void {
    this.controls.dispose();  // Dispose les contrôles Orbit
    this.renderer.dispose();  // Dispose le renderer WebGL
    // Optionnel: nettoyer la scène si elle contient beaucoup d'objets dynamiques
    // this.scene.children.forEach(child => {
    //     if (child instanceof THREE.Mesh) {
    //         child.geometry.dispose();
    //         if (Array.isArray(child.material)) {
    //             child.material.forEach(material => material.dispose());
    //         } else {
    //             child.material.dispose();
    //         }
    //     }
    // });
    // this.scene.clear();
  }

  /**
   * Ajoute un sol et une grille par défaut si aucun sol n'est déjà présent.
   * Utilise les noms d'objets ("Ground") pour détecter un environnement existant.
   */
  ensureGroundAndGrid(): void {
    const existingGround = this.scene.getObjectByName('Ground');
    if (existingGround) {
      // Un environnement gère déjà le sol/grille
      if (this.defaultGroundGroup) {
        this.scene.remove(this.defaultGroundGroup);
        this.defaultGroundGroup = null;
      }
      return;
    }

    if (this.defaultGroundGroup) return; // Déjà ajouté

    const group = new THREE.Group();
    group.name = 'DefaultGroundGroup';

    // Grille
    const grid = new THREE.GridHelper(120, 120, 0x335533, 0x224422);
    const gridMat = grid.material as THREE.Material;
    (gridMat as any).transparent = true;
    (gridMat as any).opacity = 0.4;
    group.add(grid);

    // Sol (disque large, reçoit les ombres)
    const groundGeo = new THREE.CircleGeometry(90, 72);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a9e4f });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.name = 'Ground';
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    // Aide axes discrète près de l'origine
    const axes = new THREE.AxesHelper(1.25);
    axes.position.set(0.7, 0, 0.7);
    group.add(axes);

    this.scene.add(group);
    this.defaultGroundGroup = group;
  }
}

