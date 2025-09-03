/**
 * Visualisateur de debug - respect du Single Responsibility Principle
 * Sépare la logique de debug visuel de StructuredObject
 */
import { Vector3D } from '@simulation/core/types/PhysicsTypes';
import { I3DObject, I3DRenderer } from '@core/abstractions/I3DRenderer';
import { IPoint3D } from './PointManager';
import { logger } from '@core/Logger';

export interface IDebugMarker {
  readonly id: string;
  readonly pointName: string;
  readonly marker: I3DObject;
  readonly label?: I3DObject;
  visible: boolean;
}

export interface IDebugVisualizerConfig {
  markerSize: number;
  markerColor: string;
  labelColor: string;
  labelSize: number;
  showLabels: boolean;
  showMarkers: boolean;
  fadeDistance?: number; // Distance à laquelle les marqueurs commencent à s'estomper
}

/**
 * Service de visualisation des éléments de debug (marqueurs, labels, etc.)
 */
export class DebugVisualizer {
  private markers = new Map<string, IDebugMarker>();
  private readonly renderer: I3DRenderer;
  private readonly parentObject: I3DObject;
  private readonly objectName: string;
  
  private config: IDebugVisualizerConfig = {
    markerSize: 0.05,
    markerColor: '#FF0000',
    labelColor: '#FFFFFF',
    labelSize: 12,
    showLabels: true,
    showMarkers: true,
    fadeDistance: 50
  };

  constructor(renderer: I3DRenderer, parentObject: I3DObject, objectName: string, config?: Partial<IDebugVisualizerConfig>) {
    this.renderer = renderer;
    this.parentObject = parentObject;
    this.objectName = objectName;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Crée un marqueur de debug pour un point
   */
  createPointMarker(point: IPoint3D): string {
    const markerId = `marker_${point.name}_${Date.now()}`;
    
    try {
      // Créer le marqueur géométrique (petite sphère)
      const markerGeometry = (this.renderer as any).getGeometryFactory()
        .createSphere(this.config.markerSize, 8);
      const markerMaterial = (this.renderer as any).getMaterialFactory()
        .createBasicMaterial(this.config.markerColor, { transparent: true, opacity: 0.7 });

      const marker = (this.renderer as any).createObjectBuilder()
        .setName(`${point.name}_marker`)
        .setPosition(point.position)
        .withGeometry(markerGeometry)
        .withMaterial(markerMaterial)
        .build();

      let label: I3DObject | undefined = undefined;

      // Créer le label si configuré
      if (this.config.showLabels) {
        label = this.createTextLabel(point.name, point.position);
      }

      const debugMarker: IDebugMarker = {
        id: markerId,
        pointName: point.name,
        marker,
        label,
        visible: this.config.showMarkers
      };

      this.markers.set(markerId, debugMarker);

      // Ajouter à la scène
      if (debugMarker.visible) {
        this.parentObject.add(marker);
        if (label) {
          this.parentObject.add(label);
        }
      }

      logger.debug(`Marqueur de debug créé pour le point '${point.name}' de ${this.objectName}`, 'DebugVisualizer');
      return markerId;

    } catch (error) {
      logger.error(`Erreur lors de la création du marqueur pour '${point.name}': ${error}`, 'DebugVisualizer');
      return '';
    }
  }

  /**
   * Crée un label de texte pour un point
   */
  private createTextLabel(text: string, position: Vector3D): I3DObject {
    // Pour une implémentation complète, il faudrait utiliser une bibliothèque de texte 3D
    // Ici, nous créons un placeholder simple
    
    const labelGeometry = (this.renderer as any).getGeometryFactory()
      .createPlane(0.2, 0.1);
    const labelMaterial = (this.renderer as any).getMaterialFactory()
      .createBasicMaterial(this.config.labelColor, { 
        transparent: true, 
        opacity: 0.8 
      });

    const label = (this.renderer as any).createObjectBuilder()
      .setName(`${text}_label`)
      .setPosition({
        x: position.x,
        y: position.y + 0.1, // Légèrement au-dessus du point
        z: position.z
      })
      .withGeometry(labelGeometry)
      .withMaterial(labelMaterial)
      .build();

    return label;
  }

  /**
   * Met à jour la position d'un marqueur
   */
  updateMarkerPosition(pointName: string, newPosition: Vector3D): boolean {
    const marker = this.findMarkerByPointName(pointName);
    if (!marker) {
      logger.warn(`Aucun marqueur trouvé pour le point '${pointName}'`, 'DebugVisualizer');
      return false;
    }

    marker.marker.position = newPosition;
    
    if (marker.label) {
      marker.label.position = this.renderer.createVector3(
        newPosition.x,
        newPosition.y + 0.1,
        newPosition.z
      );
    }

    logger.debug(`Position du marqueur '${pointName}' mise à jour`, 'DebugVisualizer');
    return true;
  }

  /**
   * Trouve un marqueur par nom de point
   */
  private findMarkerByPointName(pointName: string): IDebugMarker | null {
    for (const marker of this.markers.values()) {
      if (marker.pointName === pointName) {
        return marker;
      }
    }
    return null;
  }

  /**
   * Affiche ou cache tous les marqueurs
   */
  setMarkersVisible(visible: boolean): void {
    this.config.showMarkers = visible;

    for (const marker of this.markers.values()) {
      marker.visible = visible;
      marker.marker.visible = visible;
      
      if (marker.label) {
        marker.label.visible = visible && this.config.showLabels;
      }
    }

    logger.debug(`Marqueurs ${visible ? 'affichés' : 'cachés'} pour ${this.objectName}`, 'DebugVisualizer');
  }

  /**
   * Affiche ou cache tous les labels
   */
  setLabelsVisible(visible: boolean): void {
    this.config.showLabels = visible;

    for (const marker of this.markers.values()) {
      if (marker.label) {
        marker.label.visible = visible && marker.visible;
      }
    }

    logger.debug(`Labels ${visible ? 'affichés' : 'cachés'} pour ${this.objectName}`, 'DebugVisualizer');
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(newConfig: Partial<IDebugVisualizerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Appliquer les changements aux marqueurs existants
    this.applyConfigToMarkers();
    
    logger.debug(`Configuration de debug mise à jour pour ${this.objectName}`, 'DebugVisualizer');
  }

  /**
   * Applique la configuration actuelle aux marqueurs
   */
  private applyConfigToMarkers(): void {
    for (const marker of this.markers.values()) {
      // Mettre à jour la couleur du marqueur
      if ((marker.marker as any).material) {
        (marker.marker as any).material.color = this.config.markerColor;
      }

      // Mettre à jour la visibilité
      marker.marker.visible = this.config.showMarkers && marker.visible;
      
      if (marker.label) {
        marker.label.visible = this.config.showLabels && this.config.showMarkers && marker.visible;
        
        // Mettre à jour la couleur du label
        if ((marker.label as any).material) {
          (marker.label as any).material.color = this.config.labelColor;
        }
      }
    }
  }

  /**
   * Supprime un marqueur spécifique
   */
  removeMarker(markerId: string): boolean {
    const marker = this.markers.get(markerId);
    if (!marker) {
      return false;
    }

    // Retirer de la scène
    this.parentObject.remove(marker.marker);
    if (marker.label) {
      this.parentObject.remove(marker.label);
    }

    // Disposer des ressources
    marker.marker.dispose();
    marker.label?.dispose();

    // Supprimer de la map
    this.markers.delete(markerId);

    logger.debug(`Marqueur '${markerId}' supprimé pour ${this.objectName}`, 'DebugVisualizer');
    return true;
  }

  /**
   * Supprime tous les marqueurs
   */
  clearAllMarkers(): void {
    const markerCount = this.markers.size;
    
    for (const marker of this.markers.values()) {
      this.parentObject.remove(marker.marker);
      if (marker.label) {
        this.parentObject.remove(marker.label);
      }
      
      marker.marker.dispose();
      marker.label?.dispose();
    }

    this.markers.clear();
    
    logger.debug(`${markerCount} marqueurs supprimés pour ${this.objectName}`, 'DebugVisualizer');
  }

  /**
   * Créée tous les marqueurs pour une collection de points
   */
  createMarkersForPoints(points: Map<string, IPoint3D>): string[] {
    const markerIds: string[] = [];
    
    for (const point of points.values()) {
      const markerId = this.createPointMarker(point);
      if (markerId) {
        markerIds.push(markerId);
      }
    }

    logger.debug(`${markerIds.length} marqueurs créés pour ${this.objectName}`, 'DebugVisualizer');
    return markerIds;
  }

  /**
   * Met à jour l'affichage selon la distance de la caméra
   */
  updateDistanceFade(cameraPosition: Vector3D): void {
    if (!this.config.fadeDistance) return;

    // Calculer la distance moyenne aux marqueurs
    let avgDistance = 0;
    let count = 0;

    for (const marker of this.markers.values()) {
      const distance = cameraPosition.distanceTo(marker.marker.position);
      avgDistance += distance;
      count++;
    }

    if (count === 0) return;
    avgDistance /= count;

    // Calculer l'opacité basée sur la distance
    const opacity = Math.max(0.1, Math.min(1.0, this.config.fadeDistance / avgDistance));

    // Appliquer l'opacité aux marqueurs
    for (const marker of this.markers.values()) {
      if ((marker.marker as any).material) {
        (marker.marker as any).material.opacity = opacity;
      }
      if (marker.label && (marker.label as any).material) {
        (marker.label as any).material.opacity = opacity * 0.8; // Labels légèrement plus transparents
      }
    }
  }

  /**
   * Obtient des statistiques sur les marqueurs
   */
  getStatistics(): {
    totalMarkers: number;
    visibleMarkers: number;
    markersWithLabels: number;
    config: IDebugVisualizerConfig;
  } {
    let visibleMarkers = 0;
    let markersWithLabels = 0;

    for (const marker of this.markers.values()) {
      if (marker.visible) visibleMarkers++;
      if (marker.label) markersWithLabels++;
    }

    return {
      totalMarkers: this.markers.size,
      visibleMarkers,
      markersWithLabels,
      config: { ...this.config }
    };
  }
}