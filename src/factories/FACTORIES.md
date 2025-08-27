# 🏭 Système de Factories CAO

## Vue d'ensemble

Le système de factories implémente des patterns de construction CAO pour créer des objets 3D de manière modulaire et réutilisable. Chaque factory représente une opération ou un pattern de construction spécifique.

## Architecture

```
src/factories/
├── PointFactory.ts      # Gestion des points anatomiques
├── FrameFactory.ts      # Structures filaires (tubes, barres)
├── SurfaceFactory.ts    # Surfaces tendues (toiles, membranes)
└── AssemblyFactory.ts   # Assemblage de composants (futur)
```

## Philosophie KISS

- **Simple** : Chaque factory fait une chose et la fait bien
- **Modulaire** : Les factories peuvent être combinées
- **Évolutif** : Structure prête pour des fonctionnalités futures
- **CAO-oriented** : Basé sur des opérations CAO, pas des catégories d'objets

---

## 📍 PointFactory

Gère la création et manipulation de points anatomiques dans l'espace 3D.

### Utilisation

```typescript
import { PointFactory } from '@factories/PointFactory';

const pointFactory = new PointFactory();

// Créer un ensemble de points
const points = pointFactory.createObject({
  points: new Map([
    ['ORIGIN', [0, 0, 0]],
    ['TOP', [0, 1, 0]],
    ['SIDE', [1, 0, 0]]
  ]),
  symmetric: true  // Génère automatiquement SIDE_GAUCHE et SIDE_DROIT
});
```

### Paramètres

| Paramètre | Type | Description |
|-----------|------|-------------|
| `points` | `Map<string, [x, y, z]>` | Points nommés avec leurs coordonnées |
| `symmetric` | `boolean` | Génère automatiquement les points symétriques |
| `constraints` | `Array` | Contraintes géométriques (futur) |

### Fonctionnalités

✅ **Implémentées** :
- Définition de points nommés
- Génération automatique de points symétriques (_GAUCHE/_DROIT)

🔮 **Futures** :
- Validation de contraintes géométriques
- Import depuis sketches 2D
- Hiérarchie parent/enfant
- Snapping sur grille

### Méthodes utilitaires

```typescript
// Créer un point miroir
const mirrored = PointFactory.mirrorPoint([1, 0, 0], 'X'); // [-1, 0, 0]

// Interpoler entre deux points
const middle = PointFactory.interpolate([0, 0, 0], [2, 2, 0], 0.5); // [1, 1, 0]
```

---

## 🔧 FrameFactory

Crée des structures filaires (frames) à partir de connexions entre points.

### Utilisation

```typescript
import { FrameFactory } from '@factories/FrameFactory';

const frameFactory = new FrameFactory();

// Créer une structure
const frame = frameFactory.createObject({
  diameter: 0.01,
  material: '#333333',
  points: [
    ['A', [0, 0, 0]],
    ['B', [1, 0, 0]],
    ['C', [0.5, 1, 0]]
  ],
  connections: [
    ['A', 'B'] as [string, string],
    ['B', 'C'] as [string, string],
    ['C', 'A'] as [string, string]
  ]
});
```

### Paramètres

| Paramètre | Type | Description |
|-----------|------|-------------|
| `diameter` | `number` | Diamètre des tubes (défaut: 0.01) |
| `material` | `string` | Couleur/matériau (défaut: '#333333') |
| `points` | `Array<[name, [x,y,z]]>` | Points de la structure |
| `connections` | `Array<[from, to]>` | Connexions entre points |

### Cas d'usage

- **Structures mécaniques** : Châssis, cadres
- **Cerfs-volants** : Épine dorsale, bords d'attaque, barres transversales
- **Architecture** : Treillis, poutres
- **Mobilier** : Pieds de table, structure de chaise

### Évolutions futures

- Différents profils de section (carré, I-beam)
- Jonctions automatiques aux intersections
- Calcul de résistance structurelle
- Support de courbes/splines

---

## 🎨 SurfaceFactory

Crée des surfaces tendues entre des points.

### Utilisation

```typescript
import { SurfaceFactory } from '@factories/SurfaceFactory';
import * as THREE from 'three';

const surfaceFactory = new SurfaceFactory();

// Créer une surface
const surface = surfaceFactory.createObject({
  points: [
    ['P1', [0, 0, 0]],
    ['P2', [1, 0, 0]],
    ['P3', [0.5, 1, 0]],
    ['P4', [0.5, 0, -1]]
  ],
  panels: [
    ['P1', 'P2', 'P3'],  // Triangle 1
    ['P1', 'P3', 'P4']   // Triangle 2
  ],
  material: {
    color: '#ff0000',
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  }
});
```

### Paramètres

| Paramètre | Type | Description |
|-----------|------|-------------|
| `points` | `Array<[name, [x,y,z]]>` | Points de référence |
| `panels` | `Array<string[]>` | Groupes de 3-4 points formant des panneaux |
| `material` | `MaterialConfig` | Configuration du matériau |
| `tension` | `number` | Tension de la toile (futur) |

### Configuration matériau

```typescript
interface MaterialConfig {
  color: string;           // Couleur hex
  transparent?: boolean;   // Transparence
  opacity?: number;        // Opacité (0-1)
  side?: THREE.Side;       // THREE.DoubleSide recommandé
}
```

### Cas d'usage

- **Toiles de cerf-volant** : Panneaux triangulaires
- **Voiles** : Surfaces tendues
- **Tentes** : Membranes architecturales
- **Habillage** : Surfaces de recouvrement

### Évolutions futures

- Subdivision automatique pour plus de détail
- Simulation de tension physique
- Textures procédurales (ripstop, tissage)
- Gestion des plis et déformations

---

## 🔨 AssemblyFactory

**⚠️ Non implémentée - Documentation pour usage futur**

Assemblera des composants complexes avec gestion des contraintes.

### Concept

```typescript
// FUTUR - Ne fonctionne pas encore
const assembly = assemblyFactory.createObject({
  components: [
    { 
      type: 'frame',
      params: frameParams,
      transform: { position: [0, 0, 0] }
    },
    {
      type: 'surface',
      params: surfaceParams,
      transform: { rotation: [0, Math.PI/4, 0] }
    }
  ],
  constraints: [
    {
      type: 'coincident',
      component1: 'frame.point1',
      component2: 'surface.point1'
    }
  ]
});
```

### Contraintes prévues

- `coincident` : Points coïncidents
- `parallel` : Éléments parallèles
- `perpendicular` : Éléments perpendiculaires
- `distance` : Distance fixe entre éléments

### Fonctionnalités futures

- Résolution automatique de contraintes
- Détection de collisions
- Vue éclatée automatique
- Génération de nomenclature (BOM)
- Animation d'assemblage

---

## 💡 Exemples pratiques

### Créer un triangle structuré

```typescript
// 1. Définir les points
const points = new Map([
  ['A', [0, 0, 0]],
  ['B', [1, 0, 0]],
  ['C', [0.5, 0.866, 0]]
]);

// 2. Créer le frame
const frame = frameFactory.createObject({
  points: Array.from(points.entries()),
  connections: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'A']
  ],
  diameter: 0.02,
  material: '#666666'
});

// 3. Créer la surface
const surface = surfaceFactory.createObject({
  points: Array.from(points.entries()),
  panels: [['A', 'B', 'C']],
  material: {
    color: '#00ff00',
    opacity: 0.8,
    transparent: true,
    side: THREE.DoubleSide
  }
});

// 4. Combiner dans un StructuredObject
class Triangle extends StructuredObject {
  protected buildStructure() {
    this.add(frame);
  }
  protected buildSurfaces() {
    this.add(surface);
  }
}
```

### Utilisation dans Kite2

```typescript
// Kite2 utilise les factories pour modularité
class Kite2 extends StructuredObject {
  private frameFactory = new FrameFactory();
  private surfaceFactory = new SurfaceFactory();
  
  protected buildStructure() {
    // Créer plusieurs frames avec différents paramètres
    const mainFrame = this.frameFactory.createObject({...});
    const whiskers = this.frameFactory.createObject({...});
    const bridle = this.frameFactory.createObject({...});
    
    this.add(mainFrame);
    this.add(whiskers);
    this.add(bridle);
  }
  
  protected buildSurfaces() {
    // Créer la toile
    const sail = this.surfaceFactory.createObject({...});
    this.add(sail);
  }
}
```

---

## 🎯 Bonnes pratiques

### 1. Nommage des points
Utilisez des noms sémantiques clairs :
- ✅ `NEZ`, `BORD_GAUCHE`, `CENTRE`
- ❌ `p1`, `point2`, `temp`

### 2. Organisation du code
```typescript
class MonObjet extends StructuredObject {
  // 1. D'abord les points
  protected definePoints() { /* ... */ }
  
  // 2. Puis la structure
  protected buildStructure() { 
    // Utiliser FrameFactory
  }
  
  // 3. Enfin les surfaces
  protected buildSurfaces() {
    // Utiliser SurfaceFactory
  }
}
```

### 3. Réutilisabilité
Créez des méthodes helper pour les patterns répétitifs :
```typescript
private createSymmetricFrame(baseName: string) {
  return this.frameFactory.createObject({
    points: this.getSymmetricPoints(baseName),
    connections: this.getMirroredConnections()
  });
}
```

### 4. Performance
- Limitez le nombre de primitives (10-15 max)
- Réutilisez les matériaux
- Groupez les géométries similaires

---

## 🚀 Évolution future

### Court terme
- [ ] Implémenter AssemblyFactory
- [ ] Ajouter validation de contraintes dans PointFactory
- [ ] Support de différents profils dans FrameFactory

### Moyen terme
- [ ] Import/export de points depuis CAO externe
- [ ] Bibliothèque de contraintes d'assemblage
- [ ] Optimisation automatique de structures

### Long terme
- [ ] Simulation physique (tension, résistance)
- [ ] Génération procédurale avancée
- [ ] Export vers formats CAO standards

---

## 📚 Références

- [BaseFactory](../src/base/BaseFactory.ts) - Classe abstraite de base
- [StructuredObject](../src/core/StructuredObject.ts) - Pattern Points→Structure→Surfaces
- [Kite2](../src/objects/organic/Kite2.ts) - Exemple d'utilisation complète

---

*Documentation v1.0 - Système de Factories CAO KISS*