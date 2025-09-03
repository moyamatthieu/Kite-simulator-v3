/**
 * Interface d'abstraction 3D - Dependency Inversion Principle
 * Élimine la dépendance directe à Three.js dans 51+ fichiers
 */
import { Vector3D, Quaternion3D } from '@simulation/core/types/PhysicsTypes';

// ==================== INTERFACES PRINCIPALES ====================

export interface I3DRenderer {
  // Initialisation et configuration
  initialize(container: HTMLElement): Promise<void>;
  setSize(width: number, height: number): void;
  render(): void;
  dispose(): void;

  // Gestion de scène
  getScene(): I3DScene;
  getCamera(): I3DCamera;
  
  // Utilitaires
  createVector3(x: number, y: number, z: number): Vector3D;
  createQuaternion(x: number, y: number, z: number, w: number): Quaternion3D;
  
  // Configuration
  setBackgroundColor(color: string): void;
  enableShadows(enabled: boolean): void;
  setFog(enabled: boolean, color?: string, near?: number, far?: number): void;
}

export interface I3DScene {
  // Gestion des objets
  add(object: I3DObject): void;
  remove(object: I3DObject): void;
  clear(): void;
  
  // Recherche
  getObjectByName(name: string): I3DObject | null;
  traverse(callback: (object: I3DObject) => void): void;
  
  // Propriétés
  children: readonly I3DObject[];
}

export interface I3DObject {
  // Hiérarchie
  add(child: I3DObject): void;
  remove(child: I3DObject): void;
  parent: I3DObject | null;
  children: readonly I3DObject[];
  
  // Transformation
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  quaternion: Quaternion3D;
  
  // Propriétés
  name: string;
  visible: boolean;
  
  // Méthodes
  clone(): I3DObject;
  dispose(): void;
  updateMatrix(): void;
  
  // Événements
  traverse(callback: (object: I3DObject) => void): void;
}

export interface I3DGeometry {
  // Propriétés géométriques
  vertices: readonly Vector3D[];
  faces: readonly I3DFace[];
  
  // Méthodes
  computeBoundingBox(): I3DBoundingBox;
  computeVertexNormals(): void;
  dispose(): void;
  clone(): I3DGeometry;
}

export interface I3DMaterial {
  // Propriétés visuelles
  color: string;
  opacity: number;
  transparent: boolean;
  wireframe: boolean;
  
  // Méthodes
  clone(): I3DMaterial;
  dispose(): void;
  
  // Types de matériaux
  type: 'basic' | 'phong' | 'lambert' | 'standard';
}

export interface I3DMesh extends I3DObject {
  geometry: I3DGeometry;
  material: I3DMaterial;
}

export interface I3DCamera extends I3DObject {
  // Propriétés de caméra
  fov?: number; // pour PerspectiveCamera
  aspect?: number;
  near: number;
  far: number;
  
  // Méthodes
  lookAt(target: Vector3D): void;
  updateProjectionMatrix(): void;
}

export interface I3DLight extends I3DObject {
  color: string;
  intensity: number;
  castShadow: boolean;
}

// ==================== INTERFACES UTILITAIRES ====================

export interface I3DFace {
  vertices: [number, number, number]; // indices des vertex
  normal: Vector3D;
}

export interface I3DBoundingBox {
  min: Vector3D;
  max: Vector3D;
  size: Vector3D;
  center: Vector3D;
}

export interface I3DRay {
  origin: Vector3D;
  direction: Vector3D;
}

export interface I3DIntersection {
  object: I3DObject;
  point: Vector3D;
  distance: number;
  normal: Vector3D;
}

// ==================== FACTORY INTERFACES ====================

export interface I3DGeometryFactory {
  createBox(width: number, height: number, depth: number): I3DGeometry;
  createSphere(radius: number, segments?: number): I3DGeometry;
  createCylinder(radiusTop: number, radiusBottom: number, height: number, segments?: number): I3DGeometry;
  createPlane(width: number, height: number): I3DGeometry;
  createCone(radius: number, height: number, segments?: number): I3DGeometry;
}

export interface I3DMaterialFactory {
  createBasicMaterial(color: string, options?: Partial<I3DMaterial>): I3DMaterial;
  createPhongMaterial(color: string, options?: Partial<I3DMaterial>): I3DMaterial;
  createLambertMaterial(color: string, options?: Partial<I3DMaterial>): I3DMaterial;
  createLineMaterial(color: string, linewidth?: number): I3DMaterial;
  createPointsMaterial(color: string, size?: number): I3DMaterial;
}

export interface I3DLightFactory {
  createDirectionalLight(color: string, intensity: number): I3DLight;
  createPointLight(color: string, intensity: number, distance?: number): I3DLight;
  createAmbientLight(color: string, intensity: number): I3DLight;
  createSpotLight(color: string, intensity: number, distance?: number, angle?: number): I3DLight;
}

export interface I3DCameraFactory {
  createPerspectiveCamera(fov: number, aspect: number, near: number, far: number): I3DCamera;
  createOrthographicCamera(left: number, right: number, top: number, bottom: number, near: number, far: number): I3DCamera;
}

// ==================== BUILDER PATTERN ====================

export interface I3DObjectBuilder {
  // Configuration de base
  setName(name: string): I3DObjectBuilder;
  setPosition(position: Vector3D): I3DObjectBuilder;
  setRotation(rotation: Vector3D): I3DObjectBuilder;
  setScale(scale: Vector3D): I3DObjectBuilder;
  
  // Construction géométrique
  withGeometry(geometry: I3DGeometry): I3DObjectBuilder;
  withMaterial(material: I3DMaterial): I3DObjectBuilder;
  
  // Construction finale
  build(): I3DObject;
}

// ==================== ÉVÉNEMENTS ET ANIMATION ====================

export interface I3DAnimationMixer {
  update(deltaTime: number): void;
  clipAction(clip: I3DAnimationClip): I3DAnimationAction;
}

export interface I3DAnimationClip {
  name: string;
  duration: number;
}

export interface I3DAnimationAction {
  play(): void;
  stop(): void;
  pause(): void;
  reset(): void;
  setLoop(loop: boolean): void;
  setTimeScale(scale: number): void;
}

// ==================== CONFIGURATION ====================

export interface I3DRendererConfig {
  antialias?: boolean;
  alpha?: boolean;
  premultipliedAlpha?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: 'high-performance' | 'low-power' | 'default';
  failIfMajorPerformanceCaveat?: boolean;
  stencil?: boolean;
  depth?: boolean;
}

export interface I3DSceneConfig {
  fog?: {
    enabled: boolean;
    color: string;
    near: number;
    far: number;
  };
  background?: {
    type: 'color' | 'texture' | 'skybox';
    value: string;
  };
}