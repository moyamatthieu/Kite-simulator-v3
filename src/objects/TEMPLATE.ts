/**
 * TEMPLATE.ts - Template standard pour créer des objets
 * 
 * Structure recommandée pour les fichiers objets :
 * 1. Constantes de configuration
 * 2. Fonction de construction principale (pure)
 * 3. Fonctions auxiliaires (pures)
 * 4. Actions optionnelles (transformations)
 * 5. Export ICreatable si nécessaire
 */

import { union, cube, cylinder, sphere, translate, rotate, color } from '../core/CAD';
import { ICreatable } from '../types';
import { Assembly } from '../core/Assembly';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Configuration par défaut de l'objet
 */
export const DEFAULT_CONFIG = {
  // Dimensions
  width: 100,
  height: 100,
  depth: 100,
  
  // Couleurs
  primaryColor: '#3498db',
  secondaryColor: '#2c3e50',
  
  // Options
  complexity: 'medium' as 'simple' | 'medium' | 'complex',
  animated: false
};

/**
 * Variantes prédéfinies
 */
export const VARIANTS = {
  small: { width: 50, height: 50, depth: 50 },
  medium: { ...DEFAULT_CONFIG },
  large: { width: 200, height: 200, depth: 200 }
};

// ============================================
// CONSTRUCTION (Fonctions Pures)
// ============================================

/**
 * Fonction principale de construction
 * PURE : Pas d'effets de bord, retourne toujours le même résultat
 */
export function myObject(params = {}) {
  const p = { ...DEFAULT_CONFIG, ...params };
  
  return union(
    mainPart(p),
    details(p),
    decorations(p)
  );
}

/**
 * Partie principale de l'objet
 */
function mainPart(p: typeof DEFAULT_CONFIG) {
  return color(
    p.primaryColor,
    cube({ size: [p.width, p.height, p.depth] })
  );
}

/**
 * Détails de l'objet
 */
function details(p: typeof DEFAULT_CONFIG) {
  if (p.complexity === 'simple') return null;
  
  return union(
    // Ajout de détails selon la complexité
    cylinder({ height: p.height * 0.5, radius: p.width * 0.1 }),
    sphere({ radius: p.width * 0.15 })
  );
}

/**
 * Décorations optionnelles
 */
function decorations(p: typeof DEFAULT_CONFIG) {
  if (p.complexity !== 'complex') return null;
  
  // Décorations complexes
  return union(
    // Pattern de décoration
    ...Array.from({ length: 4 }, (_, i) => 
      translate(
        [Math.cos(i * Math.PI/2) * p.width/3, 0, Math.sin(i * Math.PI/2) * p.depth/3],
        sphere({ radius: 5 })
      )
    )
  );
}

// ============================================
// ACTIONS (Transformations d'État)
// ============================================

/**
 * Actions disponibles sur l'objet
 * Retournent une NOUVELLE instance (immutabilité)
 */
export const actions = {
  /**
   * Faire pivoter l'objet
   */
  rotate: (obj: Assembly, angle: number) => {
    const copy = obj.clone();
    copy.rotation.y = angle;
    return copy;
  },
  
  /**
   * Changer l'échelle
   */
  scale: (obj: Assembly, factor: number) => {
    const copy = obj.clone();
    copy.scale.set(factor, factor, factor);
    return copy;
  },
  
  /**
   * Animation frame par frame
   */
  animate: (obj: Assembly, time: number) => {
    const copy = obj.clone();
    // Animation basée sur le temps
    copy.rotation.y = time * 0.001;
    copy.position.y = Math.sin(time * 0.002) * 10;
    return copy;
  }
};

// ============================================
// HELPERS
// ============================================

/**
 * Générateur de variantes
 */
export function* generateVariants() {
  for (const [name, config] of Object.entries(VARIANTS)) {
    yield { name, object: myObject(config) };
  }
}

/**
 * Validation des paramètres
 */
export function validateParams(params: any): boolean {
  if (params.width && params.width < 0) return false;
  if (params.height && params.height < 0) return false;
  return true;
}

// ============================================
// EXPORT ICREABLE (pour Registry)
// ============================================

/**
 * Classe wrapper pour l'interface ICreatable
 * Utilisée uniquement pour la compatibilité avec le Registry
 */
export class MyObject implements ICreatable {
  private params: any;
  
  constructor(params = {}) {
    this.params = params;
  }
  
  create(): Assembly {
    const assembly = new Assembly("MyObject");
    const obj = myObject(this.params);
    
    // Convertir le résultat en Assembly
    if (obj) {
      assembly.add(obj as any);
    }
    
    return assembly;
  }
  
  getName(): string {
    return "Mon Objet";
  }
  
  getDescription(): string {
    return "Description de mon objet";
  }
  
  getPrimitiveCount(): number {
    // Calculer selon la complexité
    const p = { ...DEFAULT_CONFIG, ...this.params };
    let count = 1; // Base
    if (p.complexity !== 'simple') count += 2; // Détails
    if (p.complexity === 'complex') count += 4; // Décorations
    return count;
  }
}

// ============================================
// METADATA (pour éditeur/documentation)
// ============================================

export const metadata = {
  name: "Mon Objet",
  category: "Exemples",
  author: "Développeur",
  version: "1.0.0",
  tags: ["exemple", "template", "paramétrique"],
  
  parameters: {
    width: { type: "number", min: 10, max: 500, default: 100 },
    height: { type: "number", min: 10, max: 500, default: 100 },
    depth: { type: "number", min: 10, max: 500, default: 100 },
    primaryColor: { type: "color", default: "#3498db" },
    complexity: { 
      type: "enum", 
      values: ["simple", "medium", "complex"],
      default: "medium"
    }
  }
};