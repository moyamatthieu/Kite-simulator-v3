/**
 * Utilitaire de migration pour remplacer les imports Three.js directs
 * Facilite la transition vers l'architecture abstraite
 */
import { I3DRenderer, I3DGeometryFactory, I3DMaterialFactory } from '@core/abstractions/I3DRenderer';
import { Three3DRenderer } from '@core/implementations/Three3DRenderer';
import { Vector3D, Quaternion3D } from '@simulation/core/types/PhysicsTypes';

/**
 * Service de migration pour remplacer les usages directs de Three.js
 */
export class ThreeJSMigrationHelper {
  private renderer: I3DRenderer;
  
  constructor(renderer?: I3DRenderer) {
    this.renderer = renderer || new Three3DRenderer();
  }

  /**
   * Remplace les créations directes de THREE.Vector3
   * 
   * AVANT: new THREE.Vector3(x, y, z)
   * APRÈS: this.migrationHelper.createVector3(x, y, z)
   */
  createVector3(x: number = 0, y: number = 0, z: number = 0): Vector3D {
    return this.renderer.createVector3(x, y, z);
  }

  /**
   * Remplace les créations directes de THREE.Quaternion
   * 
   * AVANT: new THREE.Quaternion(x, y, z, w)
   * APRÈS: this.migrationHelper.createQuaternion(x, y, z, w)
   */
  createQuaternion(x: number = 0, y: number = 0, z: number = 0, w: number = 1): Quaternion3D {
    return this.renderer.createQuaternion(x, y, z, w);
  }

  /**
   * Remplace les créations de géométries Three.js
   * 
   * AVANT: new THREE.BoxGeometry(w, h, d)
   * APRÈS: this.migrationHelper.createBox(w, h, d)
   */
  createBox(width: number, height: number, depth: number) {
    return (this.renderer as Three3DRenderer).getGeometryFactory().createBox(width, height, depth);
  }

  createSphere(radius: number, segments?: number) {
    return (this.renderer as Three3DRenderer).getGeometryFactory().createSphere(radius, segments);
  }

  createCylinder(radiusTop: number, radiusBottom: number, height: number, segments?: number) {
    return (this.renderer as Three3DRenderer).getGeometryFactory().createCylinder(radiusTop, radiusBottom, height, segments);
  }

  /**
   * Remplace les créations de matériaux Three.js
   * 
   * AVANT: new THREE.MeshBasicMaterial({ color })
   * APRÈS: this.migrationHelper.createBasicMaterial(color)
   */
  createBasicMaterial(color: string, options: any = {}) {
    return (this.renderer as Three3DRenderer).getMaterialFactory().createBasicMaterial(color, options);
  }

  createPhongMaterial(color: string, options: any = {}) {
    return (this.renderer as Three3DRenderer).getMaterialFactory().createPhongMaterial(color, options);
  }

  /**
   * Remplace les créations de mesh Three.js
   * 
   * AVANT: new THREE.Mesh(geometry, material)
   * APRÈS: this.migrationHelper.createMesh(geometry, material)
   */
  createMesh(geometry: any, material: any) {
    return (this.renderer as Three3DRenderer)
      .createObjectBuilder()
      .withGeometry(geometry)
      .withMaterial(material)
      .build();
  }

  /**
   * Factory method pour créer des primitives communes
   * Remplace les patterns répétitifs dans Primitive.ts
   */
  createPrimitive(type: 'box' | 'sphere' | 'cylinder', params: any) {
    const geometryFactory = (this.renderer as Three3DRenderer).getGeometryFactory();
    const materialFactory = (this.renderer as Three3DRenderer).getMaterialFactory();

    let geometry;
    switch (type) {
      case 'box':
        geometry = geometryFactory.createBox(params.width, params.height, params.depth);
        break;
      case 'sphere':
        geometry = geometryFactory.createSphere(params.radius, params.segments);
        break;
      case 'cylinder':
        geometry = geometryFactory.createCylinder(params.radiusTop, params.radiusBottom, params.height, params.segments);
        break;
      default:
        throw new Error(`Type de primitive non supporté: ${type}`);
    }

    const material = materialFactory.createBasicMaterial(params.color || '#808080');
    
    return (this.renderer as Three3DRenderer)
      .createObjectBuilder()
      .setName(params.name || type)
      .withGeometry(geometry)
      .withMaterial(material)
      .build();
  }

  /**
   * Utilitaire pour convertir les opérations mathématiques Three.js
   * 
   * AVANT: THREE.MathUtils.degToRad(degrees)
   * APRÈS: this.migrationHelper.degToRad(degrees)
   */
  degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Remplace les opérations de couleur Three.js
   * 
   * AVANT: new THREE.Color(color)
   * APRÈS: this.migrationHelper.normalizeColor(color)
   */
  normalizeColor(color: string | number): string {
    if (typeof color === 'number') {
      return '#' + color.toString(16).padStart(6, '0');
    }
    return color;
  }

  /**
   * Crée un pattern de remplacement pour les imports
   * Génère du code pour migrer automatiquement
   */
  generateMigrationPattern(): { [key: string]: string } {
    return {
      // Imports
      "import * as THREE from 'three';": "import { ThreeJSMigrationHelper } from '@core/utils/ThreeJSMigrationHelper';",
      
      // Créations d'objets
      "new THREE.Vector3(": "migrationHelper.createVector3(",
      "new THREE.Quaternion(": "migrationHelper.createQuaternion(",
      "new THREE.BoxGeometry(": "migrationHelper.createBox(",
      "new THREE.SphereGeometry(": "migrationHelper.createSphere(",
      "new THREE.CylinderGeometry(": "migrationHelper.createCylinder(",
      "new THREE.MeshBasicMaterial(": "migrationHelper.createBasicMaterial(",
      "new THREE.MeshPhongMaterial(": "migrationHelper.createPhongMaterial(",
      "new THREE.Mesh(": "migrationHelper.createMesh(",
      
      // Utilitaires mathématiques
      "THREE.MathUtils.degToRad(": "migrationHelper.degToRad(",
      "THREE.MathUtils.radToDeg(": "migrationHelper.radToDeg(",
      
      // Couleurs
      "new THREE.Color(": "migrationHelper.normalizeColor("
    };
  }
}

/**
 * Instance globale pour faciliter la migration
 */
export const migrationHelper = new ThreeJSMigrationHelper();

/**
 * Décorateur pour injecter automatiquement le migration helper
 */
export function WithMigrationHelper<T extends { new(...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    protected migrationHelper = migrationHelper;
  };
}

/**
 * Mixin pour ajouter les capacités de migration
 */
export const MigrationMixin = {
  migrationHelper,
  
  // Méthodes de convenance
  createVector3: (x?: number, y?: number, z?: number) => migrationHelper.createVector3(x, y, z),
  createQuaternion: (x?: number, y?: number, z?: number, w?: number) => migrationHelper.createQuaternion(x, y, z, w),
  createBox: (w: number, h: number, d: number) => migrationHelper.createBox(w, h, d),
  createSphere: (r: number, s?: number) => migrationHelper.createSphere(r, s),
  createCylinder: (rt: number, rb: number, h: number, s?: number) => migrationHelper.createCylinder(rt, rb, h, s),
  degToRad: (deg: number) => migrationHelper.degToRad(deg),
  radToDeg: (rad: number) => migrationHelper.radToDeg(rad)
};

/**
 * Guide de migration par étapes
 */
export const MIGRATION_GUIDE = {
  step1: "Remplacer les imports Three.js par ThreeJSMigrationHelper",
  step2: "Utiliser migrationHelper.createXxx() au lieu de new THREE.Xxx()",
  step3: "Migrer les opérations mathématiques vers migrationHelper",
  step4: "Tester que tout fonctionne avec l'abstraction",
  step5: "Supprimer les références directes à Three.js",
  
  benefits: [
    "Migration possible vers d'autres moteurs 3D (Babylon.js, etc.)",
    "Tests unitaires plus faciles avec mocking",
    "Code plus maintenable et découplé",
    "Respect du Dependency Inversion Principle"
  ],
  
  filesAffected: [
    "src/core/Primitive.ts",
    "src/core/StructuredObject.ts", 
    "src/renderer/ThreeRenderer.ts",
    "src/simulation/simu_V10/**/*.ts",
    "Plus de 51 fichiers au total"
  ]
};