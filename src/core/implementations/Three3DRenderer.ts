/**
 * Implémentation Three.js de l'interface I3DRenderer
 * Encapsule Three.js pour respecter le Dependency Inversion Principle
 */
import * as THREE from 'three';
import {
  I3DRenderer,
  I3DScene,
  I3DObject,
  I3DCamera,
  I3DGeometry,
  I3DMaterial,
  I3DMesh,
  I3DLight,
  I3DGeometryFactory,
  I3DMaterialFactory,
  I3DLightFactory,
  I3DCameraFactory,
  I3DRendererConfig,
  I3DObjectBuilder
} from '@core/abstractions/I3DRenderer';
import { Vector3D, Quaternion3D } from '@simulation/core/types/PhysicsTypes';
import { Vector3DImpl } from '@simulation/core/implementations/Vector3DImpl';
import { Quaternion3DImpl } from '@simulation/core/implementations/Quaternion3DImpl';

export class Three3DRenderer implements I3DRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: I3DScene;
  private camera: I3DCamera;
  
  // Factories
  private geometryFactory: I3DGeometryFactory;
  private materialFactory: I3DMaterialFactory;
  private lightFactory: I3DLightFactory;
  private cameraFactory: I3DCameraFactory;

  constructor(config: I3DRendererConfig = {}) {
    this.renderer = new THREE.WebGLRenderer(config);
    this.scene = new ThreeSceneWrapper(new THREE.Scene());
    
    // Initialisation des factories
    this.geometryFactory = new ThreeGeometryFactory();
    this.materialFactory = new ThreeMaterialFactory();
    this.lightFactory = new ThreeLightFactory();
    this.cameraFactory = new ThreeCameraFactory();
    
    // Caméra par défaut
    this.camera = this.cameraFactory.createPerspectiveCamera(75, 1, 0.1, 1000);
    this.camera.position = this.createVector3(0, 0, 5);
  }

  async initialize(container: HTMLElement): Promise<void> {
    container.appendChild(this.renderer.domElement);
    this.setSize(container.clientWidth, container.clientHeight);
    
    // Configuration par défaut
    this.enableShadows(true);
    this.setBackgroundColor('#1a1a2e');
    
    // Éclairage par défaut
    const ambientLight = this.lightFactory.createAmbientLight('#404040', 0.6);
    const directionalLight = this.lightFactory.createDirectionalLight('#ffffff', 0.8);
    directionalLight.position = this.createVector3(10, 10, 5);
    
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    if (this.camera.aspect !== undefined) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  render(): void {
    const threeCamera = (this.camera as any).getThreeCamera();
    const threeScene = (this.scene as any).getThreeScene();
    this.renderer.render(threeScene, threeCamera);
  }

  dispose(): void {
    this.scene.clear();
    this.renderer.dispose();
  }

  getScene(): I3DScene { return this.scene; }
  getCamera(): I3DCamera { return this.camera; }

  createVector3(x: number, y: number, z: number): Vector3D {
    return new Vector3DImpl(x, y, z);
  }

  createQuaternion(x: number, y: number, z: number, w: number): Quaternion3D {
    return new Quaternion3DImpl(x, y, z, w);
  }

  setBackgroundColor(color: string): void {
    (this.scene as any).getThreeScene().background = new THREE.Color(color);
  }

  enableShadows(enabled: boolean): void {
    this.renderer.shadowMap.enabled = enabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setFog(enabled: boolean, color = '#ffffff', near = 10, far = 1000): void {
    const threeScene = (this.scene as any).getThreeScene();
    if (enabled) {
      threeScene.fog = new THREE.Fog(color, near, far);
    } else {
      threeScene.fog = null;
    }
  }

  // Accès aux factories
  getGeometryFactory(): I3DGeometryFactory { return this.geometryFactory; }
  getMaterialFactory(): I3DMaterialFactory { return this.materialFactory; }
  getLightFactory(): I3DLightFactory { return this.lightFactory; }
  getCameraFactory(): I3DCameraFactory { return this.cameraFactory; }

  // Builder pattern
  createObjectBuilder(): I3DObjectBuilder {
    return new ThreeObjectBuilder(this);
  }
}

// ==================== WRAPPERS POUR THREE.JS ====================

class ThreeSceneWrapper implements I3DScene {
  constructor(private threeScene: THREE.Scene) {}

  add(object: I3DObject): void {
    const threeObject = (object as any).getThreeObject();
    this.threeScene.add(threeObject);
  }

  remove(object: I3DObject): void {
    const threeObject = (object as any).getThreeObject();
    this.threeScene.remove(threeObject);
  }

  clear(): void {
    // Dispose de tous les objets avant de les supprimer
    this.threeScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        }
      }
    });
    
    // Clear la scène
    while (this.threeScene.children.length > 0) {
      this.threeScene.remove(this.threeScene.children[0]);
    }
  }

  getObjectByName(name: string): I3DObject | null {
    const found = this.threeScene.getObjectByName(name);
    return found ? new ThreeObjectWrapper(found) : null;
  }

  traverse(callback: (object: I3DObject) => void): void {
    this.threeScene.traverse((threeObject) => {
      callback(new ThreeObjectWrapper(threeObject));
    });
  }

  get children(): readonly I3DObject[] {
    return this.threeScene.children.map(child => new ThreeObjectWrapper(child));
  }

  // Accès interne pour le renderer
  getThreeScene(): THREE.Scene { return this.threeScene; }
}

class ThreeObjectWrapper implements I3DObject {
  constructor(protected threeObject: THREE.Object3D) {}

  add(child: I3DObject): void {
    const threeChild = (child as any).getThreeObject();
    this.threeObject.add(threeChild);
  }

  remove(child: I3DObject): void {
    const threeChild = (child as any).getThreeObject();
    this.threeObject.remove(threeChild);
  }

  get parent(): I3DObject | null {
    return this.threeObject.parent ? new ThreeObjectWrapper(this.threeObject.parent) : null;
  }

  get children(): readonly I3DObject[] {
    return this.threeObject.children.map(child => new ThreeObjectWrapper(child));
  }

  get position(): Vector3D {
    return Vector3DImpl.fromThreeVector(this.threeObject.position);
  }

  set position(value: Vector3D) {
    this.threeObject.position.set(value.x, value.y, value.z);
  }

  get rotation(): Vector3D {
    const euler = this.threeObject.rotation;
    return new Vector3DImpl(euler.x, euler.y, euler.z);
  }

  set rotation(value: Vector3D) {
    this.threeObject.rotation.set(value.x, value.y, value.z);
  }

  get scale(): Vector3D {
    return Vector3DImpl.fromThreeVector(this.threeObject.scale);
  }

  set scale(value: Vector3D) {
    this.threeObject.scale.set(value.x, value.y, value.z);
  }

  get quaternion(): Quaternion3D {
    return Quaternion3DImpl.fromThreeQuaternion(this.threeObject.quaternion);
  }

  set quaternion(value: Quaternion3D) {
    this.threeObject.quaternion.set(value.x, value.y, value.z, value.w);
  }

  get name(): string { return this.threeObject.name; }
  set name(value: string) { this.threeObject.name = value; }

  get visible(): boolean { return this.threeObject.visible; }
  set visible(value: boolean) { this.threeObject.visible = value; }

  clone(): I3DObject {
    return new ThreeObjectWrapper(this.threeObject.clone());
  }

  dispose(): void {
    // Dispose logic sera implémentée selon les besoins
  }

  updateMatrix(): void {
    this.threeObject.updateMatrix();
  }

  traverse(callback: (object: I3DObject) => void): void {
    this.threeObject.traverse((threeObject) => {
      callback(new ThreeObjectWrapper(threeObject));
    });
  }

  // Accès interne
  getThreeObject(): THREE.Object3D { return this.threeObject; }
}

// ==================== FACTORIES ====================

class ThreeGeometryFactory implements I3DGeometryFactory {
  createBox(width: number, height: number, depth: number): I3DGeometry {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    return new ThreeGeometryWrapper(geometry);
  }

  createSphere(radius: number, segments = 32): I3DGeometry {
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    return new ThreeGeometryWrapper(geometry);
  }

  createCylinder(radiusTop: number, radiusBottom: number, height: number, segments = 32): I3DGeometry {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
    return new ThreeGeometryWrapper(geometry);
  }

  createPlane(width: number, height: number): I3DGeometry {
    const geometry = new THREE.PlaneGeometry(width, height);
    return new ThreeGeometryWrapper(geometry);
  }

  createCone(radius: number, height: number, segments = 32): I3DGeometry {
    const geometry = new THREE.ConeGeometry(radius, height, segments);
    return new ThreeGeometryWrapper(geometry);
  }
}

class ThreeMaterialFactory implements I3DMaterialFactory {
  createBasicMaterial(color: string, options: Partial<I3DMaterial> = {}): I3DMaterial {
    const material = new THREE.MeshBasicMaterial({ color, ...options });
    return new ThreeMaterialWrapper(material);
  }

  createPhongMaterial(color: string, options: Partial<I3DMaterial> = {}): I3DMaterial {
    const material = new THREE.MeshPhongMaterial({ color, ...options });
    return new ThreeMaterialWrapper(material);
  }

  createLambertMaterial(color: string, options: Partial<I3DMaterial> = {}): I3DMaterial {
    const material = new THREE.MeshLambertMaterial({ color, ...options });
    return new ThreeMaterialWrapper(material);
  }

  createLineMaterial(color: string, linewidth = 1): I3DMaterial {
    const material = new THREE.LineBasicMaterial({ color, linewidth });
    return new ThreeMaterialWrapper(material);
  }

  createPointsMaterial(color: string, size = 1): I3DMaterial {
    const material = new THREE.PointsMaterial({ color, size });
    return new ThreeMaterialWrapper(material);
  }
}

// Implémentation des autres wrappers et factories...
// (Code tronqué pour la lisibilité, mais suit le même pattern)

class ThreeLightFactory implements I3DLightFactory {
  createDirectionalLight(color: string, intensity: number): I3DLight {
    const light = new THREE.DirectionalLight(color, intensity);
    return new ThreeLightWrapper(light);
  }

  createPointLight(color: string, intensity: number, distance = 0): I3DLight {
    const light = new THREE.PointLight(color, intensity, distance);
    return new ThreeLightWrapper(light);
  }

  createAmbientLight(color: string, intensity: number): I3DLight {
    const light = new THREE.AmbientLight(color, intensity);
    return new ThreeLightWrapper(light);
  }

  createSpotLight(color: string, intensity: number, distance = 0, angle = Math.PI / 3): I3DLight {
    const light = new THREE.SpotLight(color, intensity, distance, angle);
    return new ThreeLightWrapper(light);
  }
}

// Autres wrappers suivent le même pattern...
class ThreeGeometryWrapper implements I3DGeometry {
  constructor(private threeGeometry: THREE.BufferGeometry) {}
  
  get vertices(): readonly Vector3D[] {
    const positions = this.threeGeometry.attributes.position.array;
    const vertices: Vector3D[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      vertices.push(new Vector3DImpl(positions[i], positions[i + 1], positions[i + 2]));
    }
    return vertices;
  }

  get faces(): readonly any[] { return []; } // Simplified
  
  computeBoundingBox(): any { return {}; } // Simplified
  computeVertexNormals(): void { this.threeGeometry.computeVertexNormals(); }
  dispose(): void { this.threeGeometry.dispose(); }
  clone(): I3DGeometry { return new ThreeGeometryWrapper(this.threeGeometry.clone()); }
  
  getThreeGeometry(): THREE.BufferGeometry { return this.threeGeometry; }
}

class ThreeMaterialWrapper implements I3DMaterial {
  constructor(private threeMaterial: THREE.Material) {}
  
  get color(): string { return '#' + (this.threeMaterial as any).color?.getHexString() || '000000'; }
  set color(value: string) { (this.threeMaterial as any).color?.set(value); }
  
  get opacity(): number { return this.threeMaterial.opacity; }
  set opacity(value: number) { this.threeMaterial.opacity = value; }
  
  get transparent(): boolean { return this.threeMaterial.transparent; }
  set transparent(value: boolean) { this.threeMaterial.transparent = value; }
  
  get wireframe(): boolean { return (this.threeMaterial as any).wireframe || false; }
  set wireframe(value: boolean) { (this.threeMaterial as any).wireframe = value; }
  
  get type(): 'basic' | 'phong' | 'lambert' | 'standard' { return 'basic'; } // Simplified
  
  clone(): I3DMaterial { return new ThreeMaterialWrapper(this.threeMaterial.clone()); }
  dispose(): void { this.threeMaterial.dispose(); }
  
  getThreeMaterial(): THREE.Material { return this.threeMaterial; }
}

class ThreeLightWrapper extends ThreeObjectWrapper implements I3DLight {
  constructor(private threeLight: THREE.Light) {
    super(threeLight);
  }
  
  get color(): string { return '#' + this.threeLight.color.getHexString(); }
  set color(value: string) { this.threeLight.color.set(value); }
  
  get intensity(): number { return this.threeLight.intensity; }
  set intensity(value: number) { this.threeLight.intensity = value; }
  
  get castShadow(): boolean { return this.threeLight.castShadow; }
  set castShadow(value: boolean) { this.threeLight.castShadow = value; }
}

class ThreeCameraFactory implements I3DCameraFactory {
  createPerspectiveCamera(fov: number, aspect: number, near: number, far: number): I3DCamera {
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    return new ThreeCameraWrapper(camera);
  }

  createOrthographicCamera(left: number, right: number, top: number, bottom: number, near: number, far: number): I3DCamera {
    const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
    return new ThreeCameraWrapper(camera);
  }
}

class ThreeCameraWrapper extends ThreeObjectWrapper implements I3DCamera {
  constructor(private threeCamera: THREE.Camera) {
    super(threeCamera);
  }
  
  get fov(): number | undefined { 
    return (this.threeCamera as THREE.PerspectiveCamera).fov; 
  }
  set fov(value: number | undefined) { 
    if (value !== undefined) (this.threeCamera as THREE.PerspectiveCamera).fov = value; 
  }
  
  get aspect(): number | undefined { 
    return (this.threeCamera as THREE.PerspectiveCamera).aspect; 
  }
  set aspect(value: number | undefined) { 
    if (value !== undefined) (this.threeCamera as THREE.PerspectiveCamera).aspect = value; 
  }
  
  get near(): number { return (this.threeCamera as any).near; }
  set near(value: number) { (this.threeCamera as any).near = value; }
  
  get far(): number { return (this.threeCamera as any).far; }
  set far(value: number) { (this.threeCamera as any).far = value; }
  
  lookAt(target: Vector3D): void {
    this.threeCamera.lookAt(target.x, target.y, target.z);
  }
  
  updateProjectionMatrix(): void {
    (this.threeCamera as any).updateProjectionMatrix();
  }
  
  getThreeCamera(): THREE.Camera { return this.threeCamera; }
}

class ThreeObjectBuilder implements I3DObjectBuilder {
  private name = '';
  private position = new Vector3DImpl();
  private rotation = new Vector3DImpl();
  private scale = new Vector3DImpl(1, 1, 1);
  private geometry?: I3DGeometry;
  private material?: I3DMaterial;

  constructor(private renderer: Three3DRenderer) {}

  setName(name: string): I3DObjectBuilder {
    this.name = name;
    return this;
  }

  setPosition(position: Vector3D): I3DObjectBuilder {
    this.position = new Vector3DImpl(position.x, position.y, position.z);
    return this;
  }

  setRotation(rotation: Vector3D): I3DObjectBuilder {
    this.rotation = new Vector3DImpl(rotation.x, rotation.y, rotation.z);
    return this;
  }

  setScale(scale: Vector3D): I3DObjectBuilder {
    this.scale = new Vector3DImpl(scale.x, scale.y, scale.z);
    return this;
  }

  withGeometry(geometry: I3DGeometry): I3DObjectBuilder {
    this.geometry = geometry;
    return this;
  }

  withMaterial(material: I3DMaterial): I3DObjectBuilder {
    this.material = material;
    return this;
  }

  build(): I3DObject {
    if (!this.geometry || !this.material) {
      throw new Error('Geometry and material are required');
    }

    const threeGeometry = (this.geometry as any).getThreeGeometry();
    const threeMaterial = (this.material as any).getThreeMaterial();
    const mesh = new THREE.Mesh(threeGeometry, threeMaterial);
    
    mesh.name = this.name;
    mesh.position.set(this.position.x, this.position.y, this.position.z);
    mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    mesh.scale.set(this.scale.x, this.scale.y, this.scale.z);

    return new ThreeObjectWrapper(mesh);
  }
}