/**
 * TreeManager.ts - Gestionnaire d'arbre de nodes pour Node3D
 * Séparation des responsabilités selon le principe SRP
 */

import * as THREE from 'three';
import { Node3D } from './Node3D';
import { logger } from './Logger';

/**
 * Gestionnaire d'arbre de nodes - Responsabilité unique : gestion de la hiérarchie
 */
export class TreeManager {
  private node: any; // Accepter Node3D ou Node3DRefactored

  constructor(node: any) {
    this.node = node;
  }

  /**
   * Ajoute un enfant (compatible Godot)
   */
  addChild(child: Node3D): void {
    this.node.add(child);
    child._ready(); // Appel automatique de _ready()
    logger.debug(`Enfant ajouté: ${child.name} à ${this.node.name}`, 'TreeManager');
  }

  /**
   * Retire un enfant
   */
  removeChild(child: Node3D): void {
    this.node.remove(child);
    logger.debug(`Enfant retiré: ${child.name} de ${this.node.name}`, 'TreeManager');
  }

  /**
   * Trouve un enfant par nom
   */
  getNode(path: string): Node3D | null {
    const found = this.node.getObjectByName(path) as Node3D;
    if (found) {
      logger.debug(`Node trouvé: ${path}`, 'TreeManager');
    } else {
      logger.debug(`Node non trouvé: ${path}`, 'TreeManager');
    }
    return found || null;
  }

  /**
   * Trouve tous les enfants d'un type donné
   */
  getChildrenOfType<T extends Node3D>(type: new (...args: any[]) => T): T[] {
    const result: T[] = [];
    this.node.traverse((obj: any) => {
      if (obj instanceof type && obj !== this.node) {
        result.push(obj);
      }
    });
    logger.debug(`${result.length} enfants de type ${type.name} trouvés`, 'TreeManager');
    return result;
  }

  /**
   * Obtient tous les enfants directs
   */
  getChildren(): Node3D[] {
    return this.node.children.filter((child: any) => child instanceof Node3D) as Node3D[];
  }

  /**
   * Obtient le parent
   */
  getParent(): Node3D | null {
    const parent = this.node.parent as Node3D;
    return parent instanceof Node3D ? parent : null;
  }

  /**
   * Vérifie si le node a des enfants
   */
  hasChildren(): boolean {
    return this.getChildren().length > 0;
  }

  /**
   * Compte le nombre d'enfants
   */
  getChildCount(): number {
    return this.getChildren().length;
  }

  /**
   * Obtient la profondeur dans l'arbre
   */
  getDepth(): number {
    let depth = 0;
    let current = this.getParent();
    while (current) {
      depth++;
      current = current.treeManager.getParent();
    }
    return depth;
  }

  /**
   * Affiche l'arbre des nodes (debug)
   */
  printTree(indent: number = 0): void {
    const spaces = '  '.repeat(indent);
    console.log(`${spaces}${this.node.get_description()}`);

    this.getChildren().forEach(child => {
      child.treeManager.printTree(indent + 1);
    });
  }

  /**
   * Parcourt tous les descendants
   */
  traverse(callback: (node: Node3D) => void): void {
    this.node.traverse((obj: any) => {
      if (obj instanceof Node3D) {
        callback(obj);
      }
    });
  }

  /**
   * Recherche un node par critère personnalisé
   */
  findNode(predicate: (node: Node3D) => boolean): Node3D | null {
    if (predicate(this.node)) {
      return this.node;
    }

    for (const child of this.getChildren()) {
      const found = child.treeManager.findNode(predicate);
      if (found) {
        return found;
      }
    }

    return null;
  }
}