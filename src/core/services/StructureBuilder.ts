/**
 * Constructeur de structures 3D - respect du Single Responsibility Principle
 * Sépare la logique de construction 3D de StructuredObject
 */
import { Vector3D } from '@simulation/core/types/PhysicsTypes';
import { I3DObject, I3DRenderer } from '@core/abstractions/I3DRenderer';
import { IPoint3D } from './PointManager';
import { logger } from '@core/Logger';

export interface IPrimitive3D {
  readonly type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'cone' | 'custom';
  readonly geometry: any;
  readonly material: any;
  readonly name?: string;
}

export interface IStructuralElement {
  readonly id: string;
  readonly primitive: IPrimitive3D;
  readonly object: I3DObject;
  readonly anchorPoint?: string;
  readonly category: 'structure' | 'surface' | 'decoration';
}

export interface ISurface {
  readonly points: string[]; // Noms des points définissant la surface
  readonly color: string;
  readonly material?: any;
}

/**
 * Service de construction de structures 3D à partir de points anatomiques
 */
export class StructureBuilder {
  private elements = new Map<string, IStructuralElement>();
  private readonly renderer: I3DRenderer;
  private readonly parentObject: I3DObject;
  private readonly objectName: string;
  private elementCounter: number = 0;

  constructor(renderer: I3DRenderer, parentObject: I3DObject, objectName: string) {
    this.renderer = renderer;
    this.parentObject = parentObject;
    this.objectName = objectName;
  }

  /**
   * Ajoute une primitive à une position spécifique
   */
  addPrimitive(
    primitive: IPrimitive3D,
    position: Vector3D | [number, number, number],
    category: IStructuralElement['category'] = 'structure'
  ): string {
    const elementId = `element_${this.elementCounter++}`;

    try {
      // Conversion de position si nécessaire
      const pos = Array.isArray(position) 
        ? { x: position[0], y: position[1], z: position[2] }
        : position;

      // Création de l'objet 3D
      const object = (this.renderer as any).createObjectBuilder()
        .setName(primitive.name || `primitive_${elementId}`)
        .setPosition(pos)
        .withGeometry(primitive.geometry)
        .withMaterial(primitive.material)
        .build();

      const element: IStructuralElement = {
        id: elementId,
        primitive,
        object,
        category
      };

      this.elements.set(elementId, element);
      this.parentObject.add(object);

      logger.debug(`Primitive ${primitive.type} ajoutée à ${this.objectName} (ID: ${elementId})`, 'StructureBuilder');
      return elementId;

    } catch (error) {
      logger.error(`Erreur lors de l'ajout de primitive: ${error}`, 'StructureBuilder');
      return '';
    }
  }

  /**
   * Ajoute une primitive à un point nommé
   */
  addPrimitiveAtPoint(
    primitive: IPrimitive3D,
    pointName: string,
    points: Map<string, IPoint3D>,
    category: IStructuralElement['category'] = 'structure'
  ): string {
    const point = points.get(pointName);
    if (!point) {
      logger.error(`Point '${pointName}' introuvable pour ajouter primitive`, 'StructureBuilder');
      return '';
    }

    const elementId = this.addPrimitive(primitive, point.position, category);
    
    if (elementId) {
      // Associer l'élément au point
      const element = this.elements.get(elementId);
      if (element) {
        const updatedElement: IStructuralElement = {
          ...element,
          anchorPoint: pointName
        };
        this.elements.set(elementId, updatedElement);
      }
    }

    return elementId;
  }

  /**
   * Crée une primitive box
   */
  createBox(
    width: number, 
    height: number, 
    depth: number, 
    color: string = '#808080',
    name?: string
  ): IPrimitive3D {
    const geometry = (this.renderer as any).getGeometryFactory().createBox(width, height, depth);
    const material = (this.renderer as any).getMaterialFactory().createBasicMaterial(color);
    
    return {
      type: 'box',
      geometry,
      material,
      name
    };
  }

  /**
   * Crée une primitive sphere
   */
  createSphere(
    radius: number, 
    segments: number = 32, 
    color: string = '#808080',
    name?: string
  ): IPrimitive3D {
    const geometry = (this.renderer as any).getGeometryFactory().createSphere(radius, segments);
    const material = (this.renderer as any).getMaterialFactory().createBasicMaterial(color);
    
    return {
      type: 'sphere',
      geometry,
      material,
      name
    };
  }

  /**
   * Crée une primitive cylinder
   */
  createCylinder(
    radiusTop: number, 
    radiusBottom: number, 
    height: number, 
    segments: number = 32,
    color: string = '#808080',
    name?: string
  ): IPrimitive3D {
    const geometry = (this.renderer as any).getGeometryFactory()
      .createCylinder(radiusTop, radiusBottom, height, segments);
    const material = (this.renderer as any).getMaterialFactory().createBasicMaterial(color);
    
    return {
      type: 'cylinder',
      geometry,
      material,
      name
    };
  }

  /**
   * Crée une surface entre plusieurs points
   */
  addSurfaceBetweenPoints(
    pointNames: string[],
    points: Map<string, IPoint3D>,
    color: string = '#808080'
  ): string {
    if (pointNames.length < 3) {
      logger.error('Au moins 3 points sont nécessaires pour créer une surface', 'StructureBuilder');
      return '';
    }

    const surfacePoints: Vector3D[] = [];
    
    // Collecter les positions des points
    for (const pointName of pointNames) {
      const point = points.get(pointName);
      if (!point) {
        logger.error(`Point '${pointName}' introuvable pour créer surface`, 'StructureBuilder');
        return '';
      }
      surfacePoints.push(point.position);
    }

    return this.createTriangularSurface(surfacePoints, color);
  }

  /**
   * Crée une surface triangulaire à partir de points
   */
  private createTriangularSurface(positions: Vector3D[], color: string): string {
    // Pour simplifier, nous créons un plan entre les 3 premiers points
    if (positions.length < 3) return '';

    const elementId = `surface_${this.elementCounter++}`;

    try {
      // Calculer la position centrale
      const centerX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
      const centerY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
      const centerZ = positions.reduce((sum, p) => sum + p.z, 0) / positions.length;

      // Calculer les dimensions approximatives
      const minX = Math.min(...positions.map(p => p.x));
      const maxX = Math.max(...positions.map(p => p.x));
      const minY = Math.min(...positions.map(p => p.y));
      const maxY = Math.max(...positions.map(p => p.y));
      
      const width = Math.max(0.01, maxX - minX);
      const height = Math.max(0.01, maxY - minY);

      // Créer un plan simple pour représenter la surface
      const geometry = (this.renderer as any).getGeometryFactory().createPlane(width, height);
      const material = (this.renderer as any).getMaterialFactory().createBasicMaterial(color, {
        transparent: true,
        opacity: 0.7
      });

      const object = (this.renderer as any).createObjectBuilder()
        .setName(`surface_${elementId}`)
        .setPosition({ x: centerX, y: centerY, z: centerZ })
        .withGeometry(geometry)
        .withMaterial(material)
        .build();

      const primitive: IPrimitive3D = {
        type: 'plane',
        geometry,
        material,
        name: `surface_${elementId}`
      };

      const element: IStructuralElement = {
        id: elementId,
        primitive,
        object,
        category: 'surface'
      };

      this.elements.set(elementId, element);
      this.parentObject.add(object);

      logger.debug(`Surface triangulaire créée pour ${this.objectName} (ID: ${elementId})`, 'StructureBuilder');
      return elementId;

    } catch (error) {
      logger.error(`Erreur lors de la création de surface: ${error}`, 'StructureBuilder');
      return '';
    }
  }

  /**
   * Met à jour la position d'un élément ancré à un point
   */
  updateElementPosition(pointName: string, newPosition: Vector3D): void {
    for (const element of this.elements.values()) {
      if (element.anchorPoint === pointName) {
        element.object.position = newPosition;
      }
    }
  }

  /**
   * Supprime un élément spécifique
   */
  removeElement(elementId: string): boolean {
    const element = this.elements.get(elementId);
    if (!element) {
      return false;
    }

    this.parentObject.remove(element.object);
    element.object.dispose();
    this.elements.delete(elementId);

    logger.debug(`Élément ${elementId} supprimé de ${this.objectName}`, 'StructureBuilder');
    return true;
  }

  /**
   * Supprime tous les éléments d'une catégorie
   */
  removeElementsByCategory(category: IStructuralElement['category']): number {
    let removedCount = 0;
    const elementsToRemove: string[] = [];

    for (const [id, element] of this.elements) {
      if (element.category === category) {
        elementsToRemove.push(id);
      }
    }

    for (const id of elementsToRemove) {
      if (this.removeElement(id)) {
        removedCount++;
      }
    }

    logger.debug(`${removedCount} éléments de catégorie '${category}' supprimés de ${this.objectName}`, 'StructureBuilder');
    return removedCount;
  }

  /**
   * Efface tous les éléments
   */
  clearAllElements(): void {
    const elementCount = this.elements.size;
    
    for (const element of this.elements.values()) {
      this.parentObject.remove(element.object);
      element.object.dispose();
    }

    this.elements.clear();
    this.elementCounter = 0;

    logger.debug(`${elementCount} éléments supprimés de ${this.objectName}`, 'StructureBuilder');
  }

  /**
   * Obtient tous les éléments d'une catégorie
   */
  getElementsByCategory(category: IStructuralElement['category']): IStructuralElement[] {
    return Array.from(this.elements.values())
      .filter(element => element.category === category);
  }

  /**
   * Obtient un élément par son ID
   */
  getElementById(id: string): IStructuralElement | null {
    return this.elements.get(id) || null;
  }

  /**
   * Obtient des statistiques sur la structure
   */
  getStatistics(): {
    totalElements: number;
    elementsByCategory: { [category: string]: number };
    elementsByType: { [type: string]: number };
    anchordElements: number;
  } {
    const elementsByCategory: { [category: string]: number } = {};
    const elementsByType: { [type: string]: number } = {};
    let anchordElements = 0;

    for (const element of this.elements.values()) {
      // Compter par catégorie
      elementsByCategory[element.category] = (elementsByCategory[element.category] || 0) + 1;
      
      // Compter par type
      elementsByType[element.primitive.type] = (elementsByType[element.primitive.type] || 0) + 1;
      
      // Compter les éléments ancrés
      if (element.anchorPoint) {
        anchordElements++;
      }
    }

    return {
      totalElements: this.elements.size,
      elementsByCategory,
      elementsByType,
      anchordElements
    };
  }
}