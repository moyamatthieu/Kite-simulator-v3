/**
 * Gestionnaire des points anatomiques - respect du Single Responsibility Principle
 * Sépare la logique de gestion des points de StructuredObject
 */
import { Vector3D } from '@simulation/core/types/PhysicsTypes';
import { Vector3DImpl } from '@simulation/core/implementations/Vector3DImpl';
import { logger } from '@core/Logger';

export interface IPoint3D {
  readonly name: string;
  readonly position: Vector3D;
  readonly metadata?: {
    description?: string;
    category?: string;
    visible?: boolean;
  };
}

export interface IPointConstraint {
  pointName: string;
  constraint: (point: Vector3D, allPoints: Map<string, IPoint3D>) => Vector3D;
  description?: string;
}

/**
 * Service de gestion des points anatomiques d'un objet 3D
 */
export class PointManager {
  private points = new Map<string, IPoint3D>();
  private constraints = new Map<string, IPointConstraint[]>();
  private readonly objectName: string;

  constructor(objectName: string) {
    this.objectName = objectName;
  }

  /**
   * Définit un point anatomique
   */
  setPoint(
    name: string, 
    position: Vector3D | [number, number, number], 
    metadata?: IPoint3D['metadata']
  ): void {
    // Conversion si nécessaire
    const pos = Array.isArray(position) 
      ? new Vector3DImpl(position[0], position[1], position[2])
      : position;

    // Validation du nom
    if (!name || name.trim().length === 0) {
      logger.error('Nom de point invalide', 'PointManager');
      return;
    }

    // Avertissement si le point existe déjà
    if (this.points.has(name)) {
      logger.warn(`Point '${name}' redéfini pour ${this.objectName}`, 'PointManager');
    }

    const point: IPoint3D = {
      name,
      position: pos,
      metadata: metadata || {}
    };

    this.points.set(name, point);
    
    // Appliquer les contraintes si elles existent
    this.applyConstraintsToPoint(name);
    
    logger.debug(`Point '${name}' défini à (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}) pour ${this.objectName}`, 'PointManager');
  }

  /**
   * Obtient un point par son nom
   */
  getPoint(name: string): IPoint3D | null {
    const point = this.points.get(name);
    if (!point) {
      logger.warn(`Point '${name}' introuvable dans ${this.objectName}`, 'PointManager');
      return null;
    }
    return point;
  }

  /**
   * Obtient la position d'un point
   */
  getPointPosition(name: string): Vector3D | null {
    const point = this.getPoint(name);
    return point ? point.position : null;
  }

  /**
   * Obtient tous les noms de points définis
   */
  getPointNames(): string[] {
    return Array.from(this.points.keys());
  }

  /**
   * Obtient tous les points
   */
  getAllPoints(): Map<string, IPoint3D> {
    return new Map(this.points); // Copie défensive
  }

  /**
   * Filtre les points selon un critère
   */
  getPointsByCategory(category: string): IPoint3D[] {
    return Array.from(this.points.values())
      .filter(point => point.metadata?.category === category);
  }

  /**
   * Met à jour la position d'un point existant
   */
  updatePointPosition(name: string, newPosition: Vector3D | [number, number, number]): boolean {
    if (!this.points.has(name)) {
      logger.error(`Tentative de mise à jour d'un point inexistant: '${name}'`, 'PointManager');
      return false;
    }

    const pos = Array.isArray(newPosition)
      ? new Vector3DImpl(newPosition[0], newPosition[1], newPosition[2])
      : newPosition;

    const existingPoint = this.points.get(name)!;
    const updatedPoint: IPoint3D = {
      ...existingPoint,
      position: pos
    };

    this.points.set(name, updatedPoint);
    
    // Appliquer les contraintes après mise à jour
    this.applyConstraintsToPoint(name);
    
    logger.debug(`Point '${name}' mis à jour pour ${this.objectName}`, 'PointManager');
    return true;
  }

  /**
   * Ajoute une contrainte à un point
   */
  addConstraint(constraint: IPointConstraint): void {
    if (!this.constraints.has(constraint.pointName)) {
      this.constraints.set(constraint.pointName, []);
    }
    
    this.constraints.get(constraint.pointName)!.push(constraint);
    
    // Appliquer immédiatement la contrainte
    this.applyConstraintsToPoint(constraint.pointName);
    
    logger.debug(`Contrainte ajoutée au point '${constraint.pointName}' pour ${this.objectName}`, 'PointManager');
  }

  /**
   * Applique toutes les contraintes à un point
   */
  private applyConstraintsToPoint(pointName: string): void {
    const constraints = this.constraints.get(pointName);
    if (!constraints || constraints.length === 0) return;

    const point = this.points.get(pointName);
    if (!point) return;

    let newPosition = point.position;
    
    for (const constraint of constraints) {
      try {
        newPosition = constraint.constraint(newPosition, this.points);
      } catch (error) {
        logger.error(`Erreur dans contrainte pour le point '${pointName}': ${error}`, 'PointManager');
      }
    }

    // Mettre à jour le point avec la nouvelle position si elle a changé
    if (newPosition !== point.position) {
      const updatedPoint: IPoint3D = {
        ...point,
        position: newPosition
      };
      this.points.set(pointName, updatedPoint);
    }
  }

  /**
   * Calcule le centre de masse de tous les points
   */
  calculateCentroid(): Vector3D {
    if (this.points.size === 0) {
      return new Vector3DImpl();
    }

    let sumX = 0, sumY = 0, sumZ = 0;
    
    for (const point of this.points.values()) {
      sumX += point.position.x;
      sumY += point.position.y;
      sumZ += point.position.z;
    }

    const count = this.points.size;
    return new Vector3DImpl(sumX / count, sumY / count, sumZ / count);
  }

  /**
   * Calcule la boîte englobante de tous les points
   */
  calculateBoundingBox(): { min: Vector3D; max: Vector3D; size: Vector3D } {
    if (this.points.size === 0) {
      const zero = new Vector3DImpl();
      return { min: zero, max: zero, size: zero };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const point of this.points.values()) {
      minX = Math.min(minX, point.position.x);
      minY = Math.min(minY, point.position.y);
      minZ = Math.min(minZ, point.position.z);
      maxX = Math.max(maxX, point.position.x);
      maxY = Math.max(maxY, point.position.y);
      maxZ = Math.max(maxZ, point.position.z);
    }

    const min = new Vector3DImpl(minX, minY, minZ);
    const max = new Vector3DImpl(maxX, maxY, maxZ);
    const size = new Vector3DImpl(maxX - minX, maxY - minY, maxZ - minZ);

    return { min, max, size };
  }

  /**
   * Trouve les points les plus proches d'une position donnée
   */
  findNearestPoints(position: Vector3D, count: number = 1): IPoint3D[] {
    const distances = Array.from(this.points.values())
      .map(point => ({
        point,
        distance: position.distanceTo(point.position)
      }))
      .sort((a, b) => a.distance - b.distance);

    return distances.slice(0, count).map(item => item.point);
  }

  /**
   * Valide la cohérence des points
   */
  validatePoints(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Vérifier les doublons de position
    const positions = new Map<string, string>();
    for (const [name, point] of this.points) {
      const posKey = `${point.position.x.toFixed(6)},${point.position.y.toFixed(6)},${point.position.z.toFixed(6)}`;
      if (positions.has(posKey)) {
        errors.push(`Points '${positions.get(posKey)}' et '${name}' ont la même position`);
      } else {
        positions.set(posKey, name);
      }
    }

    // Vérifier les valeurs NaN
    for (const [name, point] of this.points) {
      if (isNaN(point.position.x) || isNaN(point.position.y) || isNaN(point.position.z)) {
        errors.push(`Point '${name}' contient des valeurs NaN`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Efface tous les points
   */
  clearAllPoints(): void {
    const pointCount = this.points.size;
    const constraintCount = Array.from(this.constraints.values()).reduce((acc, arr) => acc + arr.length, 0);
    
    this.points.clear();
    this.constraints.clear();
    
    logger.debug(`${pointCount} points et ${constraintCount} contraintes supprimés pour ${this.objectName}`, 'PointManager');
  }

  /**
   * Obtient des statistiques sur les points
   */
  getStatistics(): {
    pointCount: number;
    constraintCount: number;
    boundingBox: { min: Vector3D; max: Vector3D; size: Vector3D };
    centroid: Vector3D;
    categories: string[];
  } {
    const boundingBox = this.calculateBoundingBox();
    const centroid = this.calculateCentroid();
    
    const categories = Array.from(new Set(
      Array.from(this.points.values())
        .map(p => p.metadata?.category)
        .filter(cat => cat !== undefined)
    )) as string[];

    const constraintCount = Array.from(this.constraints.values())
      .reduce((acc, arr) => acc + arr.length, 0);

    return {
      pointCount: this.points.size,
      constraintCount,
      boundingBox,
      centroid,
      categories
    };
  }
}