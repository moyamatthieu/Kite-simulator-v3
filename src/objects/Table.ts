/**
 * Table.ts - Objet 3D représentant une table simple
 * 
 * Ce fichier définit un objet Table pour le système de visualisation 3D.
 * La table est composée de primitives de base : 1 boîte pour le plateau et 4 cylindres pour les pieds.
 * 
 * Utilisation :
 * - Cette classe est automatiquement enregistrée dans le Registry via src/objects/index.ts
 * - Accessible dans l'interface via le bouton "Table" ou registry.create('table')
 * - L'objet créé peut être manipulé avec les contrôles standards (rotation, vue éclatée, etc.)
 * 
 * Structure de l'assemblage :
 * - 1 plateau (box) positionné en haut
 * - 4 pieds (cylindres) positionnés aux coins
 * 
 * Pattern utilisé : Interface ICreatable avec méthode create() retournant un Assembly
 */

import { ICreatable } from '../types';
import { Assembly } from '../core/Assembly';
import { Primitive } from '../core/Primitive';

export class Table implements ICreatable {
  /**
   * Méthode principale pour créer l'objet 3D
   * Appelée par le Registry lors de l'instantiation
   * @returns Assembly contenant toutes les primitives de la table
   */
  create(): Assembly {
    const table = new Assembly("Table");
    
    // Dimensions de la table (en unités Three.js - 1 unité ≈ 1 mètre)
    const width = 1.2;        // Largeur du plateau
    const depth = 0.8;        // Profondeur du plateau  
    const height = 0.75;      // Hauteur de la table
    const topThickness = 0.03; // Épaisseur du plateau
    const legRadius = 0.025;   // Rayon des pieds cylindriques
    
    // Création du plateau - box centrée horizontalement, positionnée en haut
    // Position Y = hauteur + demi-épaisseur pour que le dessus soit à la bonne hauteur
    table.add(
      Primitive.box(width, topThickness, depth, '#8B4513'), // Couleur bois marron
      [0, height + topThickness/2, 0]  // Position [x, y, z]
    );
    
    // Calcul des positions des 4 pieds aux coins
    // Décalage depuis le centre pour positionner aux coins moins le rayon
    const offsetX = width/2 - legRadius;
    const offsetZ = depth/2 - legRadius;
    
    // Tableau des positions [x, y, z] pour chaque pied
    // Y est à mi-hauteur car les cylindres sont centrés verticalement
    const legPositions: [number, number, number][] = [
      [-offsetX, height/2, -offsetZ], // Arrière gauche
      [offsetX, height/2, -offsetZ],  // Arrière droit
      [-offsetX, height/2, offsetZ],  // Avant gauche
      [offsetX, height/2, offsetZ]    // Avant droit
    ];
    
    // Ajout des 4 pieds cylindriques
    legPositions.forEach(pos => {
      table.add(
        Primitive.cylinder(legRadius, height, '#654321'), // Couleur bois foncé
        pos
      );
    });
    
    return table;
  }
  
  /**
   * Retourne le nom de l'objet pour l'affichage dans l'interface
   */
  getName(): string {
    return "Table";
  }
  
  /**
   * Retourne une description courte de l'objet
   * Affichée dans les tooltips ou informations détaillées
   */
  getDescription(): string {
    return "Table simple avec plateau et 4 pieds";
  }
  
  /**
   * Retourne le nombre de primitives utilisées
   * Utile pour les statistiques et l'optimisation
   */
  getPrimitiveCount(): number {
    return 5; // 1 plateau + 4 pieds
  }
}