# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Directives Importantes

**TOUJOURS communiquer en français** lorsque vous travaillez sur ce projet. Toutes les réponses, explications et commentaires doivent être en français.

**NE PAS lancer npm run dev** : L'utilisateur lance le serveur de développement dans un terminal externe. Claude ne doit jamais exécuter cette commande. On dev en Hotreload

## Architecture v3.0 - KISS + Godot Compatible

### Système Principal (Fonctionnel)

Le projet implémente un **Pattern StructuredObject + Node3D** compatible Godot :

- **Node3D** : Couche d'abstraction compatible Godot (signals, _ready(), _process(), transform)
- **StructuredObject** : Pattern unifié avec points anatomiques (definePoints → buildStructure → buildSurfaces)
- **ThreeRenderer** : Renderer Three.js isolé et modulaire
- **GodotExporter** : Export automatique vers fichiers .tscn Godot
- **Registry** : Gestionnaire centralisé des objets créables
- **AutoLoader** : 🔥 Chargement automatique via import.meta.glob

### Flux Architecture

```typescript
// 1. Node3D (Base Godot-compatible)
class Node3D extends THREE.Group {
    transform: Transform3D;
    _ready(), _process(), emit_signal(), connect()
}

// 2. StructuredObject (Pattern unifié)
class StructuredObject extends Node3D {
    definePoints() → buildStructure() → buildSurfaces()
}

// 3. Objets concrets
class Chair extends StructuredObject implements ICreatable {
    create(): this { return this; }
}

// 4. AutoLoader découvre automatiquement
// Plus besoin d'enregistrement manuel !

// 5. Rendu
renderer.setRootNode(await autoLoader.create('chair'));
```

## Conventions de Nommage et Imports

### Conventions de Nommage

- **Classes** : PascalCase (`Node3D`, `StructuredObject`, `ThreeRenderer`)
- **Interfaces** : PascalCase avec préfixe `I` (`ICreatable`) ou sans (`Transform3D`, `Signal`)
- **Méthodes** :
  - snake_case pour compatibilité Godot : `_ready()`, `_process()`, `emit_signal()`, `add_child()`
  - camelCase pour méthodes JS standard : `definePoints()`, `buildStructure()`, `setPoint()`
- **Propriétés** : camelCase (`nodeId`, `nodeType`, `showDebugPoints`)
- **Constantes** : UPPER_SNAKE_CASE (`DEFAULT_CONFIG`, `VARIANTS`)
- **Types** : PascalCase (`Position3D`, `NamedPoint`, `MaterialConfig`)
- **Fichiers** : PascalCase pour les classes (`Node3D.ts`, `StructuredObject.ts`)

### Imports avec Alias

**TOUJOURS utiliser les alias** définis dans `tsconfig.json` pour les imports :

```typescript
// ✅ CORRECT - Utiliser les alias
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import { Primitive } from '@core/Primitive';
import { ThreeRenderer } from '@renderer';

// ❌ INCORRECT - Ne pas utiliser les chemins relatifs
import { StructuredObject } from '../core/StructuredObject';
import { ICreatable } from '../types';
```

**Alias disponibles** :
- `@core/*` : Classes du noyau (Node3D, StructuredObject, Registry, etc.)
- `@types` : Types et interfaces TypeScript
- `@renderer` : Système de rendu
- `@export` : Exportateurs (Godot, OBJ, etc.)
- `@objects/*` : Objets 3D par catégorie
  - `@objects/furniture/*` : Meubles
  - `@objects/shapes/*` : Formes géométriques
  - `@objects/mechanical/*` : Objets mécaniques
  - `@objects/organic/*` : Objets organiques
- `@base/*` : Classes de base et patterns
- `@factories/*` : Factory patterns
- `@abstractions/*` : Classes abstraites

### Organisation des Fichiers v3.0

```text
/src/
├── main.ts                 # App principale avec ThreeRenderer et AutoLoader
├── simulation.ts          # Version stable de la simulation physique
├── simulationV2.ts        # Version de développement pour nouvelles fonctionnalités
├── abstractions/          # Classes abstraites de base (optionnel)
├── base/                  # Classes de base et patterns (optionnel)
├── core/                  # Noyau du système
│   ├── Node3D.ts          # Couche d'abstraction Godot 🎮
│   ├── StructuredObject.ts # Pattern objet unifié
│   ├── Primitive.ts       # Générateurs géométriques
│   ├── Registry.ts        # Registry singleton (legacy)
│   └── AutoLoader.ts      # 🔥 Chargement automatique via import.meta.glob
├── export/                # Exportateurs
│   ├── GodotExporter.ts   # Export .tscn Godot 🎮
│   ├── OBJExporter.ts     # Export OBJ pour impression 3D
│   └── index.ts          
├── factories/             # Factory patterns (optionnel)
├── objects/               # 📦 Tous les objets 3D (auto-découverts)
│   ├── furniture/         # Meubles
│   │   ├── Chair.ts      
│   │   ├── ModularChair.ts
│   │   ├── SimpleChair.ts
│   │   └── Table.ts      
│   ├── mechanical/        # Objets mécaniques
│   │   └── Gear.ts       
│   ├── organic/           # Objets organiques
│   │   ├── FractalTree.ts
│   │   ├── Kite.ts        # Cerf-volant simple
│   │   └── Kite2.ts       # Cerf-volant pour simulation
│   ├── shapes/            # Formes géométriques
│   │   ├── Box.ts        
│   │   ├── Car.ts        
│   │   ├── Cube.ts       
│   │   ├── Pyramid.ts    
│   │   └── TestSphere.ts 
│   └── index.ts           # Plus utilisé - AutoLoader gère tout
├── renderer/              # Système de rendu
│   ├── ThreeRenderer.ts   # Renderer modulaire isolé 🎨
│   └── index.ts          
└── types/                 # Définitions TypeScript
    ├── index.ts           # Types principaux
    └── vite-env.d.ts      # Types Vite HMR
```

## Commandes

### Développement

```bash
npm run dev        # Démarre le serveur Vite sur port 3000/3001 avec HMR
npm run build      # Compile pour production dans dist/
npm run preview    # Prévisualise le build de production

# Vérification TypeScript
npx tsc --noEmit   # Vérification des types TypeScript sans émission de fichiers
```

### Tests et Qualité

Il n'y a actuellement pas de scripts de test ou de linting configurés. Utiliser `npx tsc --noEmit` pour vérifier les types TypeScript.

## Créer de Nouveaux Objets v3.0

### Structure Standard

```typescript
// src/objects/[categorie]/MonObjet.ts (ou src/objects/MonObjet.ts)
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import { Primitive } from '@core/Primitive';

export class MonObjet extends StructuredObject implements ICreatable {
    private params = {
        width: 1,
        height: 2,
        color: '#808080'
    };
    
    constructor(customParams = {}) {
        super("Mon Objet");  // Node3D name
        this.params = { ...this.params, ...customParams };
        this.init(); // IMPORTANT: Appeler init() pour construire l'objet
    }
    
    // 🎮 Points anatomiques (compatible Godot)
    protected definePoints(): void {
        this.setPoint('center', [0, 0, 0]);
        this.setPoint('top', [0, this.params.height, 0]);
    }
    
    // Structure rigide
    protected buildStructure(): void {
        const box = Primitive.box(this.params.width, this.params.height, 0.1, this.params.color);
        this.addPrimitiveAtPoint(box, 'center');
    }
    
    // Détails visuels
    protected buildSurfaces(): void {
        // Optionnel : surfaces supplémentaires
    }
    
    // Interface ICreatable
    create(): this { return this; }
    getName(): string { return "Mon Objet"; }
    getDescription(): string { return "Description de mon objet"; }
    getPrimitiveCount(): number { return 1; }
}

// ✨ PAS BESOIN D'ENREGISTREMENT MANUEL !
// L'AutoLoader détecte automatiquement le fichier et charge la classe
// Le nom de classe doit correspondre au nom du fichier (ex: MonObjet.ts → export class MonObjet)
```

### Points Clés v3.0

1. **Héritage** : StructuredObject → Node3D → THREE.Group
2. **Pattern** : definePoints() → buildStructure() → buildSurfaces()
3. **Godot** : Points anatomiques deviennent des Node3D enfants
4. **Export** : Automatique vers .tscn via GodotExporter
5. **Debug** : showDebugPoints pour visualiser les points
6. **Auto-découverte** : Pas besoin d'enregistrement manuel - l'AutoLoader trouve automatiquement les classes
7. **Convention** : Le nom de classe doit correspondre au nom du fichier (ex: `Chair.ts` → `export class Chair`)

## Nouvelles Fonctionnalités v3.0

### 🎮 Export Godot
```typescript
// Usage direct
import { GodotExporter } from '@export';
GodotExporter.downloadTSCN(monObjet, 'fichier.tscn');

// Export programmé
const tscnContent = GodotExporter.exportToTSCN(monObjet);
```

### 🎨 Renderer Modulaire
```typescript
// Configuration personnalisée
const renderer = new ThreeRenderer({
    canvasContainer: document.getElementById('app')!,
    backgroundColor: '#1a1a2e',
    cameraPosition: [3, 2, 3],
    shadows: true,
    fog: true
});

// Gestion des objets
renderer.setRootNode(monObjet);
renderer.focusOn(monObjet);
renderer.clearScene();
```

### 🔧 Node3D Godot-Like
```typescript
// Cycle de vie
class MonObjet extends StructuredObject {
    protected _ready(): void {
        console.log('Objet prêt !');
    }
    
    protected _process(delta: number): void {
        // Animation, logique frame
    }
    
    // Signaux
    protected _ready(): void {
        this.define_signal('clicked');
        this.emit_signal('clicked', this);
    }
}
```

### 🔥 AutoLoader - Chargement Automatique
```typescript
// L'AutoLoader découvre automatiquement tous les objets
const autoLoader = new AutoLoader();

// Créer une instance
const objet = await autoLoader.create('chair');

// Obtenir les catégories (basées sur les dossiers réels)
const categories = await autoLoader.getCategories();
// => { '🏠 Mobilier': [...], '🔺 Formes': [...], ... }

// Plus besoin d'enregistrement manuel !
// Il suffit d'ajouter un fichier .ts dans /src/objects/
```

## Mode Simulation - Cerf-volant

### Fichiers de Simulation
- **`/src/simulation.ts`** : Version stable de la simulation physique
- **`/src/simulationV2.ts`** : Version de développement pour nouvelles fonctionnalités
- **`/src/simulationV3.ts`** : Version modulaire refactorisée avec architecture propre
- **`/simulation.html`** : Interface HTML de la simulation (utilise actuellement simulationV3.ts)

### Architecture de la Simulation

La simulation implémente une physique réaliste de cerf-volant delta avec :
- **Fenêtre de vent sphérique** : Le cerf-volant vole sur une sphère de rayon = longueur des lignes
- **Contrôle par tension différentielle** : Tirer sur une ligne fait tourner le cerf-volant
- **Vecteurs de force en mode debug** : Visualisation de la vitesse, portance et traînée
- **Points de pivot souples** : Simulation des nœuds de connexion avec physique élastique

### Commandes Clavier Simulation
- **Flèche gauche** : Tire le côté gauche de la barre (+30°)
- **Flèche droite** : Tire le côté droit de la barre (-30°)
- **Bouton Debug** : Active l'affichage des vecteurs de force

### Paramètres de Vent
- **Vitesse** : 0-50 km/h (affichage en km/h, pas en pourcentage)
- **Direction** : 0-360 degrés
- **Turbulence** : 0-100% d'intensité
- **Longueur des lignes** : 10-50 mètres

### Points d'Ancrage du Kite
Les points `CTRL_GAUCHE` et `CTRL_DROIT` dans Kite2.ts définissent où les lignes se connectent au cerf-volant.

### Architecture SimulationV3
La version V3 introduit une architecture modulaire avec séparation des responsabilités :

#### Modules Principaux
- **PhysicsEngine** : Moteur physique principal orchestrant la simulation
- **WindSimulator** : Simulation du vent avec turbulences cohérentes
- **Aerodynamics** : Calcul des forces aérodynamiques (portance et traînée)
- **LineSystem** : Gestion des lignes, tensions et pivots souples
- **KiteController** : Contrôle du cerf-volant et gestion de son état
- **InputHandler** : Gestion des entrées clavier
- **RenderManager** : Gestion du rendu Three.js isolée
- **SimulationAppV3** : Application principale orchestrant tous les modules

#### Configuration Centralisée
Tous les paramètres de simulation sont centralisés dans l'objet `CONFIG` :
- **physics** : Gravité, densité de l'air, amortissements
- **kite** : Masse, surface, coefficients aérodynamiques
- **lines** : Longueur, tension, facteurs de contrôle
- **wind** : Vitesse, direction, turbulence
- **rendering** : Options de rendu Three.js

#### Patterns et Principes
- **Séparation des responsabilités** : Chaque module a une responsabilité unique
- **Interfaces typées** : `WindParams`, `KiteState`, `LineState` pour la communication
- **Configuration centralisée** : Un seul objet `CONFIG` pour tous les paramètres
- **Classes autonomes** : Chaque classe peut être testée indépendamment
- **Méthodes privées** : Encapsulation forte avec méthodes privées pour la logique interne

## Patterns de Code SimulationV3

### Organisation des Classes
```typescript
class Module {
    private propriétés;      // État interne privé
    constructor() { }        // Initialisation
    public methods() { }     // API publique
    private helpers() { }    // Méthodes privées
}
```

### Flux de Données
1. **InputHandler** capture les entrées → targetBarRotation
2. **PhysicsEngine.update()** orchestre chaque frame :
   - Calcule le vent apparent via **WindSimulator**
   - Calcule les forces aérodynamiques via **Aerodynamics**
   - Calcule les tensions via **LineSystem**
   - Met à jour le cerf-volant via **KiteController**
3. **RenderManager** affiche le résultat

### Points d'Extension
- Ajouter de nouveaux types de cerfs-volants : créer une nouvelle classe héritant de `StructuredObject`
- Modifier la physique : ajuster les paramètres dans `CONFIG`
- Ajouter des visualisations : étendre `RenderManager`
- Nouvelles entrées : étendre `InputHandler`

## Contraintes de Design

### Limites d'Assemblage v3.0
- **Points anatomiques nommés** pour structure claire
- **Pas d'opérations CSG** - composition pure
- **Compatible Godot** - mapping direct vers Node3D
- **Maximum 10-15 primitives** par objet pour la maintenabilité

### Workflow Godot

1. **Développer** : Créer l'objet dans le navigateur
2. **Tester** : Debug points, rotation, etc.
3. **Exporter** : Bouton "🎮 Export Godot"
4. **Importer** : Ouvrir .tscn dans Godot Engine
5. **Finaliser** : Ajouter physique, scripts Godot

## Notes Techniques v3.0

1. **Hot Reload** : Vite HMR configuré dans vite-env.d.ts
2. **TypeScript** : Mode strict, cible ES2020, module ESNext
3. **Compatibilité** : Node3D API proche de Godot
4. **Modularité** : Renderer/Export séparés pour isolation
5. **KISS** : Architecture simple mais extensible
6. **Auto-découverte** : L'AutoLoader charge automatiquement tous les objets depuis `/src/objects/` via `import.meta.glob`
7. **Coordonnées Three.js** : Système de coordonnées Y-up
8. **Couleurs** : Accepte les chaînes hexadécimales ('#FF0000') ou les paramètres du constructeur Three.js Color

## Flux de Développement v3.0

1. L'utilisateur lance npm run dev dans un terminal externe
2. Éditer les objets dans `/src/objects/[categorie]/`
3. HMR recompile automatiquement
4. Tester avec Explode pour voir les points anatomiques
5. Exporter vers Godot avec le bouton dédié
6. Importer le .tscn dans Godot pour finalisation

**🎯 Objectif v3.0** : Architecture KISS qui facilite la transition web → Godot tout en gardant la productivité maximale avec auto-découverte des objets !