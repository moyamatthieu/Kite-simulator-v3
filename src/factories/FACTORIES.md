# 🏭 Système de Factories CAO

## Vue d'ensemble

Le système de factories implémente des patterns de construction CAO pour créer des objets 3D de manière modulaire et réutilisable. Chaque factory représente une opération ou un pattern de construction spécifique.

## Architecture

```
src/factories/
├── PointFactory.ts      # Gestion des points anatomiques
├── CircularPatternFactory.ts # Motifs circulaires (engrenages, rayons)
├── FrameFactory.ts      # Structures filaires (tubes, barres)
├── SurfaceFactory.ts    # Surfaces tendues (toiles, membranes)
├── PyramidFactory.ts    # Pyramides géométriques
├── ChairFactory.ts      # Chaises paramétriques
├── ModularChairFactory.ts # Chaises modulaires
├── SimpleChairFactory.ts  # Chaises simples
├── FurnitureTableFactory.ts # Tables de mobilier
├── GearFactory.ts       # Engrenages mécaniques
├── FractalTreeFactory.ts # Arbres fractals génératifs
├── KiteFactory.ts       # Cerfs-volants
├── BoxFactory.ts        # Boîtes paramétriques
├── CarFactory.ts        # Voitures paramétriques
├── CubeFactory.ts       # Cubes paramétriques
├── TestSphereFactory.ts # Sphères de test
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
const pointsObject = pointFactory.createObject({
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

Les méthodes utilitaires pour les points sont maintenant centralisées dans [`src/utils/ThreeJSUtils.ts`](src/utils/ThreeJSUtils.ts).

---

## ⭕ CircularPatternFactory

Gère la création de patterns circulaires pour des éléments répétitifs comme les dents d'engrenage ou les rayons de roue.

### Utilisation

```typescript
import { CircularPatternFactory } from '@factories/CircularPatternFactory';
import { MechanicalGeometryUtils } from '@/utils/MechanicalGeometryUtils';

const circularPatternFactory = new CircularPatternFactory();

// Créer un engrenage avec la helper utility
const gearTeeths = circularPatternFactory.createObject(
  MechanicalGeometryUtils.createGearTeeth({
    radius: 1,
    teethCount: 20,
    toothHeight: 0.1,
    toothWidth: 0.05,
    thickness: 0.08
  })
);
```

### Paramètres
Le `CircularPatternFactory` accepte les paramètres suivants, souvent passés via les méthodes utilitaires de `MechanicalGeometryUtils` :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `centerPoint` | `[x, y, z]` | Centre du pattern (défaut: `[0, 0, 0]`) |
| `radius` | `number` | Rayon du cercle |
| `count` | `number` | Nombre d'éléments |
| `elementType` | `'box' | 'cylinder' | 'cone' | 'custom'` | Type de primitive pour chaque élément |
| `elementSize` | `object` | Taille de l'élément (dépend du `elementType`) |
| `material` | `MaterialConfig` | Matériau des éléments |
| `startAngle` | `number` | Angle de départ en radians (défaut: `0`) |
| `endAngle` | `number` | Angle de fin en radians (défaut: `2 * Math.PI`) |
| `alignToRadius` | `boolean` | Oriente les éléments vers le centre (défaut: `true`) |
| `alternating` | `boolean` | Active les positions/tailles alternées (défaut: `false`) |

### Méthodes utilitaires

Les méthodes utilitaires pour les géométries mécaniques sont maintenant centralisées dans [`src/utils/MechanicalGeometryUtils.ts`](src/utils/MechanicalGeometryUtils.ts).

---

## 🔧 FrameFactory

Crée des structures filaires (frames) à partir de connexions entre points.

### Utilisation

```typescript
import { FrameFactory } from '@factories/FrameFactory';

const frameFactory = new FrameFactory();

// Créer une structure
const frameObject = frameFactory.createObject({
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
const surfaceObject = surfaceFactory.createObject({
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

## ▲ PyramidFactory

Crée des pyramides géométriques paramétriques.

### Utilisation

```typescript
import { PyramidFactory } from '@factories/PyramidFactory';

const pyramidFactory = new PyramidFactory();

// Créer une pyramide
const pyramidObject = pyramidFactory.createObject({
  size: 2,
  height: 3,
  color: '#0077FF'
});
```

### Paramètres

| Paramètre | Type | Description |
|-----------|------|-------------|
| `size` | `number` | Largeur de la base (défaut: `1`) |
| `height` | `number` | Hauteur de la pyramide (défaut: `1.5`) |
| `color` | `string` | Couleur de la pyramide (défaut: `'#FFD700'`) |

---

## 🪑 ChairFactory

Crée des chaises paramétriques avec différentes configurations.

### Utilisation

```typescript
import { ChairFactory, CHAIR_VARIANTS } from '@factories/ChairFactory';

const chairFactory = new ChairFactory();

// Créer une chaise de salle à manger
const diningChair = chairFactory.createObject(CHAIR_VARIANTS.dining);

// Créer un tabouret de bar
const barStool = chairFactory.createObject(CHAIR_VARIANTS.bar);
```

### Paramètres

Le `ChairFactory` accepte les paramètres suivants (voir `DEFAULT_CHAIR_CONFIG` dans le fichier pour les valeurs par défaut) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `seatWidth` | `number` | Largeur de l'assise |
| `seatDepth` | `number` | Profondeur de l'assise |
| `seatHeight` | `number` | Hauteur de l'assise |
| `seatThickness` | `number` | Épaisseur de l'assise |
| `backHeight` | `number` | Hauteur du dossier |
| `backThickness` | `number` | Épaisseur du dossier |
| `backAngle` | `number` | Inclinaison du dossier en degrés |
| `legRadius` | `number` | Rayon des pieds (cylindriques) |
| `legStyle` | `'round' | 'square'` | Style des pieds |
| `seatColor` | `string` | Couleur de l'assise |
| `backColor` | `string` | Couleur du dossier |
| `legColor` | `string` | Couleur des pieds |
| `hasArmrests` | `boolean` | Indique si la chaise a des accoudoirs |
| `armrestHeight` | `number` | Hauteur des accoudoirs |
| `style` | `'modern' | 'classic' | 'scandinavian'` | Style général de la chaise |

---

## 🪑 ModularChairFactory

Crée des chaises modulaires avec des configurations prédéfinies comme des chaises de bureau ou des tabourets de bar.

### Utilisation

```typescript
import { ModularChairFactory, MODULAR_CHAIR_VARIANTS } from '@factories/ModularChairFactory';

const modularChairFactory = new ModularChairFactory();

// Créer une chaise de bureau modulaire
const officeChair = modularChairFactory.createObject(MODULAR_CHAIR_VARIANTS.office);

// Créer un tabouret de bar modulaire
const barStoolModular = modularChairFactory.createObject(MODULAR_CHAIR_VARIANTS.bar);
```

### Paramètres

Le `ModularChairFactory` accepte les paramètres suivants (voir `DEFAULT_MODULAR_CHAIR_CONFIG` dans le fichier pour les valeurs par défaut) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `seat_width` | `number` | Largeur de l'assise |
| `seat_depth` | `number` | Profondeur de l'assise |
| `seat_height` | `number` | Hauteur de l'assise |
| `seat_thickness` | `number` | Épaisseur de l'assise |
| `back_height` | `number` | Hauteur du dossier |
| `back_thickness` | `number` | Épaisseur du dossier |
| `leg_size` | `number` | Taille des pieds (carrés) |
| `wood_color` | `string` | Couleur principale du bois |
| `leg_color` | `string` | Couleur des pieds |

---

## 🪑 SimpleChairFactory

Crée des chaises simples paramétriques.

### Utilisation

```typescript
import { SimpleChairFactory, DEFAULT_SIMPLE_CHAIR_CONFIG } from '@factories/SimpleChairFactory';

const simpleChairFactory = new SimpleChairFactory();

// Créer une chaise simple
const basicChair = simpleChairFactory.createObject(DEFAULT_SIMPLE_CHAIR_CONFIG);
```

### Paramètres

Le `SimpleChairFactory` accepte les paramètres suivants (voir `DEFAULT_SIMPLE_CHAIR_CONFIG` dans le fichier pour les valeurs par défaut) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `seatWidth` | `number` | Largeur de l'assise |
| `seatDepth` | `number` | Profondeur de l'assise |
| `seatHeight` | `number` | Hauteur de l'assise |
| `seatThickness` | `number` | Épaisseur de l'assise |
| `backHeight` | `number` | Hauteur du dossier |
| `backThickness` | `number` | Épaisseur du dossier |
| `legRadius` | `number` | Rayon des pieds |
| `woodColor` | `string` | Couleur du bois |

---

## 🛋️ FurnitureTableFactory

Crée des tables simples paramétriques pour l'ameublement.

### Utilisation

```typescript
import { FurnitureTableFactory, DEFAULT_TABLE_CONFIG } from '@factories/FurnitureTableFactory';

const tableFactory = new FurnitureTableFactory();

// Créer une table par défaut
const simpleTable = tableFactory.createObject(DEFAULT_TABLE_CONFIG);

// Créer une table personnalisée
const customTable = tableFactory.createObject({
  width: 1.5,
  height: 0.8,
  depth: 0.9,
  woodColor: '#A0522D'
});
```

### Paramètres

Le `FurnitureTableFactory` accepte les paramètres suivants (voir `DEFAULT_TABLE_CONFIG` dans le fichier pour les valeurs par défaut) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `width` | `number` | Largeur de la table |
| `depth` | `number` | Profondeur de la table |
| `height` | `number` | Hauteur de la table |
| `topThickness` | `number` | Épaisseur du plateau |
| `legRadius` | `number` | Rayon des pieds |
| `woodColor` | `string` | Couleur du bois |

---

## ⚙️ GearFactory

Crée des engrenages paramétriques avec un nombre de dents et des dimensions configurables.

### Utilisation

```typescript
import { GearFactory, GEAR_VARIANTS } from '@factories/GearFactory';

const gearFactory = new GearFactory();

// Créer un engrenage de taille moyenne
const mediumGear = gearFactory.createObject(GEAR_VARIANTS.medium);

// Créer un petit engrenage personnalisé
const customSmallGear = gearFactory.createObject({
  outerRadius: 0.03,
  teethCount: 15,
  thickness: 0.007,
  color: '#808080'
});
```

### Paramètres

Le `GearFactory` accepte les paramètres suivants (voir `DEFAULT_GEAR_CONFIG` dans le fichier pour les valeurs par défaut) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `outerRadius` | `number` | Rayon extérieur de la roue dentée |
| `innerRadius` | `number` | Rayon intérieur (base des dents) |
| `thickness` | `number` | Épaisseur de la roue dentée |
| `holeRadius` | `number` | Rayon du trou central |
| `teethCount` | `number` | Nombre de dents |
| `toothHeight` | `number` | Hauteur des dents |
| `toothWidth` | `number` | Largeur relative des dents |
| `style` | `'standard' | 'simple'` | Style de l'engrenage |
| `hasSpokes` | `boolean` | Indique si l'engrenage a des rayons |
| `spokeCount` | `number` | Nombre de rayons |
| `color` | `string` | Couleur principale |
| `accentColor` | `string` | Couleur d'accentuation (si applicable) |

---

## 🌳 FractalTreeFactory

Crée des arbres fractals génératifs avec une profondeur et un nombre de branches configurables.

### Utilisation

```typescript
import { FractalTreeFactory } from '@factories/FractalTreeFactory';

const fractalTreeFactory = new FractalTreeFactory();

// Créer un arbre fractal par défaut
const smallTree = fractalTreeFactory.createObject({ depth: 3, branches: 3 });

// Créer un grand arbre fractal
const forestGiant = fractalTreeFactory.createObject({
  depth: 5,
  branches: 4
});
```

### Paramètres

Le `FractalTreeFactory` accepte les paramètres suivants (voir les valeurs par défaut dans le fichier) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `depth` | `number` | Profondeur de récursivité de l'arbre (nombre de niveaux de branches) |
| `branches` | `number` | Nombre de branches générées à chaque niveau |

---

## 🪁 KiteFactory

Crée des cerfs-volants delta paramétriques.

### Utilisation

```typescript
import { KiteFactory, DEFAULT_KITE_CONFIG } from '@factories/KiteFactory';

const kiteFactory = new KiteFactory();

// Créer un cerf-volant par défaut
const basicKite = kiteFactory.createObject(DEFAULT_KITE_CONFIG);

// Créer un cerf-volant personnalisé
const customKite = kiteFactory.createObject({
  width: 2.0,
  height: 0.8,
  sailColor: '#00FF00',
  frameColor: '#555555'
});
```

### Paramètres

Le `KiteFactory` accepte les paramètres suivants (voir `DEFAULT_KITE_CONFIG` dans le fichier pour les valeurs par défaut) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `width` | `number` | Envergure du cerf-volant |
| `height` | `number` | Hauteur du cerf-volant |
| `depth` | `number` | Profondeur des "whiskers" |
| `frameDiameter` | `number` | Diamètre des tubes de la structure |
| `frameColor` | `string` | Couleur de la structure |
| `sailColor` | `string` | Couleur de la voile |
| `sailOpacity` | `number` | Opacité de la voile (0-1) |
| `bridleLengthFactor` | `number` | Facteur de longueur virtuelle des brides principales |

---

### Orchestration côté `Kite.ts` (points de contrôle)

L’objet `Kite` (AutoLoader) orchestre la construction via des outils utilitaires et expose des paramètres supplémentaires pour positionner les points de contrôle (ancrage des lignes de pilotage) — par défaut alignés sur la simulation (simulationV8):

- `ctrlX`: abscisse des points `CTRL_GAUCHE`/`CTRL_DROIT` (par défaut `0.15` → positions à `±ctrlX`)
- `ctrlY`: ordonnée des points de contrôle (par défaut `0.3`)
- `ctrlZ`: profondeur des points de contrôle (par défaut `0.4`)

Exemple d’utilisation:

```ts
import { createKite } from '@/objects/Kite';

// Cerf-volant avec points de contrôle personnalisés
const kite = createKite({ ctrlX: 0.18, ctrlY: 0.32, ctrlZ: 0.45 });
```

Notes:
- Les valeurs par défaut de `ctrlX/Y/Z` sont également utilisées comme fallbacks dans `KiteFactoryTools.computePoints`.
- `KiteFactory` reste la source unique pour la géométrie; `Kite.ts` coordonne l’assemblage proprement.

### Outils utilitaires (KiteFactoryTools)

Pour éviter les duplications et faciliter la composition, des helpers dédiés sont fournis:

- `computePoints({ width, height, depth, ctrlX?, ctrlY?, ctrlZ? })` → Map des points
- `createMainFrame(points, { diameter, material })` → frame principal
- `createWhiskerFrame(points, { diameter, material? })` → whiskers
- `createSail(points, material)` → toile (4 panneaux)
- `createBridleLines(points)` → brides visuelles

Ces outils sont utilisés par `KiteFactory` et `Kite.ts` pour garantir un chemin de construction DRY et cohérent.

## 🚗 CarFactory

Crée des voitures paramétriques avec des dimensions et une couleur configurables.

### Utilisation

```typescript
import { CarFactory, DEFAULT_CAR_CONFIG } from '@factories/CarFactory';

const carFactory = new CarFactory();

// Créer une voiture par défaut
const basicCar = carFactory.createObject(DEFAULT_CAR_CONFIG);

// Créer une voiture personnalisée
const customCar = carFactory.createObject({
  length: 0.7,
  width: 0.3,
  height: 0.2,
  color: '#FF0000',
  wheelRadius: 0.06
});
```

### Paramètres

Le `CarFactory` accepte les paramètres suivants (voir `DEFAULT_CAR_CONFIG` dans le fichier pour les valeurs par défaut) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `length` | `number` | Longueur de la voiture |
| `width` | `number` | Largeur de la voiture |
| `height` | `number` | Hauteur de la voiture (châssis) |
| `wheelRadius` | `number` | Rayon des roues |
| `color` | `string` | Couleur principale de la voiture |

---

## 🧊 CubeFactory

Crée des cubes paramétriques, avec une option pour une géométrie optimisée pour l'impression 3D.

### Utilisation

```typescript
import { CubeFactory, DEFAULT_CUBE_CONFIG } from '@factories/CubeFactory';

const cubeFactory = new CubeFactory();

// Créer un cube simple par défaut
const simpleCube = cubeFactory.createObject(DEFAULT_CUBE_CONFIG);

// Créer un cube pour impression 3D
const printableCube = cubeFactory.createObject({
  size: 2,
  printable: true,
  color: '#00AAFF'
});
```

### Paramètres

Le `CubeFactory` accepte les paramètres suivants (voir `DEFAULT_CUBE_CONFIG` dans le fichier pour les valeurs par défaut) :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `size` | `number` | Taille de chaque côté du cube |
| `printable` | `boolean` | `true` pour optimiser la géométrie pour l'impression 3D (défaut: `false`) |
| `color` | `string` | Couleur du cube |

---

## 🔨 AssemblyFactory

**⚠️ Non implémentée - Documentation pour usage futur**

Assemblera des composants complexes avec gestion des contraintes.

### Concept

```typescript
// FUTUR - Ne fonctionne pas encore
const assembly = new AssemblyFactory().createObject({
  components: [
    {
      type: 'frame',
      params: /* frameParams pour FrameFactory */ {},
      transform: { position: [0, 0, 0] }
    },
    {
      type: 'surface',
      params: /* surfaceParams pour SurfaceFactory */ {},
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
import { FrameFactory } from '@factories/FrameFactory';
import { SurfaceFactory } from '@factories/SurfaceFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@/types';
import * as THREE from 'three';

const frameFactory = new FrameFactory();
const surfaceFactory = new SurfaceFactory();

// 1. Définir les points
const points = new Map([
  ['A', [0, 0, 0]],
  ['B', [1, 0, 0]],
  ['C', [0.5, 0.866, 0]]
]);

// 2. Créer le frame via sa factory
const frameObject = frameFactory.createObject({
  points: Array.from(points.entries()),
  connections: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'A']
  ],
  diameter: 0.02,
  material: '#666666'
});

// 3. Créer la surface via sa factory
const surfaceObject = surfaceFactory.createObject({
  points: Array.from(points.entries()),
  panels: [['A', 'B', 'C']],
  material: {
    color: '#00ff00',
    opacity: 0.8,
    transparent: true,
    side: THREE.DoubleSide
  }
});

// 4. Créer un StructuredObject composite
class CompositeTriangle extends StructuredObject implements ICreatable {
    constructor() {
        super('CompositeTriangle');
        this.init();
    }
    protected definePoints(): void {
        // Points définis par les sous-objets, peuvent être accédés via getPoint
        points.forEach(([name, pos]) => this.setPoint(name, pos as [number, number, number]));
    }
    protected buildStructure() {
        this.add(frameObject);
    }
    protected buildSurfaces() {
        this.add(surfaceObject);
    }
    getName(): string { return 'CompositeTriangle'; }
    getDescription(): string { return 'Un triangle composé de structure et surface'; }
    getPrimitiveCount(): number { return frameObject.getPrimitiveCount() + surfaceObject.getPrimitiveCount(); }
}
const customTriangle = new CompositeTriangle();
```

### Utilisation dans Kite

```typescript
import { KiteFactory } from '@factories/KiteFactory';
// ... autres imports nécessaires
// import { KITE_POINTS, KITE_SURFACES } from '@simulation/simu_V10/data/KiteGeometryData';
// La classe Kite est maintenant remplacée par KiteFactory

const kiteFactory = new KiteFactory();
const basicKite = kiteFactory.createObject(); // Crée un cerf-volant par défaut
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
  // Cette méthode pourrait être déléguée à une factory PointFactory ou FrameFactory
  // qui prendrait des paramètres de symétrie.
  // Exemple: new PointFactory().createObject({ basePoints, symmetric: true });
  return new FrameFactory().createObject({
    points: [], // Obtenir les points symétriques d'une source externe ou calculer ici
    connections: [] // Obtenir les connexions
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
- [ ] Revoir `BaseFactory` pour s'assurer qu'il est bien générique et abstrait.
- [ ] Terminer l'implémentation de `AssemblyFactory` (Actuellement un placeholder)
- [ ] Ajouter validation de contraintes dans PointFactory
- [ ] Support de différents profils dans FrameFactory
- [ ] Convertir `src/objects/shapes/TestSphere.ts` en `TestSphereFactory`.

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
- [KiteFactory](../src/factories/KiteFactory.ts) - Exemple d'utilisation complète pour le cerf-volant

---

*Documentation v2.3 - Système de Factories CAO KISS*
