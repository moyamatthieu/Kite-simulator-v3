/**
 * StructuredObject.ts - Classe de base unifiée pour TOUS les objets 3D
 * Architecture orientée objet avec points anatomiques nommés
 * Pattern unique utilisé par tous les objets du projet
 * 🎮 Compatible Godot via Node3D (version refactorisée)
 */

import * as THREE from 'three';
import { Position3D, NamedPoint, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import { Node3D } from '@core/Node3D';
import { logger } from '@core/Logger';
import { ThreeJSUtils } from '@/utils/ThreeJSUtils'; // Import de ThreeJSUtils

/**
 * Classe abstraite de base pour tous les objets 3D structurés
 * 🎮 Hérite de Node3D pour la compatibilité Godot
 * Refactorisée pour utiliser le logger centralisé
 */
export abstract class StructuredObject extends Node3D {
  /**
   * Points anatomiques nommés de l'objet
   */
  protected points: Map<string, THREE.Vector3> = new Map();

  /**
   * Points avec marqueurs visuels (debug)
   */
  protected namedPoints: NamedPoint[] = [];

  /**
   * Affichage des labels en mode debug
   */
  public showDebugPoints: boolean = false;

  /**
   * Affichage des labels de texte
   */
  public showLabels: boolean = false;

  constructor(name: string, showDebugPoints: boolean = false) {
    super(name);
    this.nodeType = 'StructuredObject';
    this.showDebugPoints = showDebugPoints;
    // L'initialisation sera appelée par la classe enfant après configuration
  }

  /**
   * Initialisation automatique de l'objet
   */
  protected initialize(): void {
    logger.debug(`Initialisation de ${this.name}`, 'StructuredObject');

    // Vider le groupe au cas où
    this.clear();

    // Construire l'objet dans l'ordre
    this.definePoints();
    this.buildStructure();
    this.buildSurfaces();

    // Afficher les points de debug si demandé
    if (this.showDebugPoints) {
      this.createDebugMarkers();
    }

    logger.debug(`Initialisation terminée pour ${this.name} - ${this.children.length} enfants`, 'StructuredObject');
  }

  /**
   * Initialisation publique à appeler par les classes enfants
   */
  public init(): void {
    this.initialize();
  }

  /**
   * Définit tous les points anatomiques de l'objet
   * À implémenter dans chaque classe dérivée
   */
  protected abstract definePoints(): void;

  /**
   * Construit la structure rigide de l'objet (frame, squelette)
   * À implémenter dans chaque classe dérivée
   */
  protected abstract buildStructure(): void;

  /**
   * Construit les surfaces et détails visuels
   * À implémenter dans chaque classe dérivée
   */
  protected abstract buildSurfaces(): void;

  /**
   * Définit un point nommé dans l'espace
   */
  protected setPoint(name: string, position: Position3D): void {
    const vector = ThreeJSUtils.toVector3(position); // Utilisation de ThreeJSUtils
    this.points.set(name, vector);

    // Ajouter aux points nommés pour le debug
    this.namedPoints.push({
      name,
      position: vector.clone(),
      visible: this.showDebugPoints
    });

    logger.debug(`Point défini: ${name} = [${position.join(', ')}]`, 'StructuredObject');
  }

  /**
   * Récupère un point par son nom
   */
  public getPoint(name: string): THREE.Vector3 | undefined {
    return this.points.get(name);
  }

  /**
   * Crée un cylindre entre deux points nommés
   */
  protected addCylinderBetweenPoints(
    point1Name: string,
    point2Name: string,
    radius: number,
    material: string | MaterialConfig
  ): THREE.Mesh | null {
    const p1 = this.getPoint(point1Name);
    const p2 = this.getPoint(point2Name);

    if (!p1 || !p2) {
      logger.warn(`Points ${point1Name} ou ${point2Name} non trouvés`, 'StructuredObject');
      return null;
    }

    // Calculer la distance et l'orientation en utilisant ThreeJSUtils
    const distance = p1.distanceTo(p2); // Three.js native
    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5); // Three.js native (ou ThreeJSUtils.midpoint si p1 et p2 étaient Position3D)

    // Créer le cylindre
    const cylinder = Primitive.cylinder(radius, distance, material);

    // Orienter le cylindre
    const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction
    );
    cylinder.quaternion.copy(quaternion);
    cylinder.position.copy(midpoint);

    // Ajouter au groupe
    this.add(cylinder);
    logger.debug(`Cylindre ajouté entre ${point1Name} et ${point2Name}`, 'StructuredObject');
    return cylinder;
  }

  /**
   * Crée une surface entre des points nommés
   */
  protected addSurfaceBetweenPoints(
    pointNames: string[],
    material: string | MaterialConfig
  ): THREE.Mesh | null {
    if (pointNames.length < 3) {
      logger.warn('Il faut au moins 3 points pour créer une surface', 'StructuredObject');
      return null;
    }

    const points: THREE.Vector3[] = [];

    // Récupérer tous les points
    for (const name of pointNames) {
      const point = this.getPoint(name);
      if (!point) {
        logger.warn(`Point ${name} non trouvé`, 'StructuredObject');
        return null;
      }
      points.push(point);
    }

    // Créer la surface
    const surface = Primitive.surface(points, material);
    this.add(surface);
    logger.debug(`Surface créée avec ${pointNames.length} points`, 'StructuredObject');
    return surface;
  }

  /**
   * Ajoute une primitive à une position donnée
   */
  protected addPrimitiveAt(
    primitive: THREE.Mesh,
    position: Position3D
  ): void {
    primitive.position.set(position[0], position[1], position[2]);
    this.add(primitive);
    logger.debug(`Primitive ajoutée à position [${position.join(', ')}]`, 'StructuredObject');
  }

  /**
   * Ajoute une primitive à la position d'un point nommé
   */
  protected addPrimitiveAtPoint(
    primitive: THREE.Mesh,
    pointName: string
  ): boolean {
    const point = this.getPoint(pointName);
    if (!point) {
      logger.warn(`Point ${pointName} non trouvé`, 'StructuredObject');
      return false;
    }

    primitive.position.copy(point);
    this.add(primitive);
    logger.debug(`Primitive ajoutée au point ${pointName}`, 'StructuredObject');
    return true;
  }

  /**
   * Crée des marqueurs visuels pour tous les points (debug)
   */
  protected createDebugMarkers(): void {
    logger.debug(`Création de ${this.points.size} marqueurs de debug`, 'StructuredObject');

    this.points.forEach((position, name) => {
      // Petite sphère jaune pour marquer le point
      const marker = Primitive.sphere(0.02, '#ffff00');
      marker.position.copy(position);
      this.add(marker);

      // Ajouter label texte si activé
      if (this.showLabels) {
        const label = this.createTextLabel(name);
        label.position.copy(position);
        label.position.y += 0.05; // Décaler le label au-dessus du point
        this.add(label);
      }
    });
  }

  /**
   * Crée un label de texte pour un point
   */
  private createTextLabel(text: string): THREE.Sprite {
    // Créer un canvas pour le texte
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    // Style du texte
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'Bold 24px Arial';
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Créer une texture depuis le canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Créer un sprite avec la texture
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Ajuster la taille du sprite
    sprite.scale.set(0.3, 0.075, 1);

    return sprite;
  }

  /**
   * Active/désactive l'affichage des marqueurs de debug
   */
  public setShowDebugPoints(show: boolean): void {
    this.showDebugPoints = show;
    logger.info(`Debug points: ${show ? 'activé' : 'désactivé'}`, 'StructuredObject');
    // Reconstruire l'objet pour appliquer le changement
    this.initialize();
  }

  /**
   * Active/désactive l'affichage des labels de texte
   */
  public setShowLabels(show: boolean): void {
    this.showLabels = show;
    // Si les points de debug ne sont pas activés et qu'on veut les labels, activer les deux
    if (show && !this.showDebugPoints) {
      this.showDebugPoints = true;
    }
    logger.info(`Labels: ${show ? 'activé' : 'désactivé'}`, 'StructuredObject');
    // Reconstruire l'objet pour appliquer le changement
    this.initialize();
  }

  /**
   * Retourne tous les noms de points définis
   */
  public getPointNames(): string[] {
    return Array.from(this.points.keys());
  }

  /**
   * Retourne le nombre de points définis
   */
  public getPointCount(): number {
    return this.points.size;
  }

  /**
   * Retourne les informations sur un point
   */
  public getPointInfo(name: string): NamedPoint | undefined {
    const point = this.getPoint(name);
    if (!point) return undefined;

    return {
      name,
      position: point.clone(),
      visible: this.showDebugPoints
    };
  }

  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    super.dispose();
    this.points.clear();
    this.namedPoints = [];
    logger.debug(`StructuredObject nettoyé: ${this.name}`, 'StructuredObject');
  }
}