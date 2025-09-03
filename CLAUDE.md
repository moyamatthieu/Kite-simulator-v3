ug# CLAUDE.md

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
- **`/src/simulationV4.ts`** : Version avec améliorations de performance
- **`/src/simulationV5.ts`** : Version avec physique émergente pure
- **`/src/simulationV6.ts`** : Version avec améliorations de stabilité
- **`/src/simulationV7.ts`** : Version avec système de brides physiques
- **`/src/simulationV8.ts`** : Version avec physique naturelle simplifiée
- **`/src/simulationV9.ts`** : Version avec analyse de vol et historique
- **`/src/simulationV10.ts`** : Version modulaire avancée avec architecture KISS (ACTUELLEMENT UTILISÉE)
- **`/simulation.html`** : Interface HTML de la simulation

### 🎯 Physique Émergente Pure (SimulationV5)

#### Principe Fondamental : Le Cerf-volant comme Convertisseur de Vitesse

Le cerf-volant transforme la vitesse **horizontale** du vent en mouvement **omnidirectionnel** sur une sphère :

```
Vent horizontal → Pression sur surfaces → Forces 3D → Mouvement sur la sphère
      →                    ↓                   ↓              ↗ ↑ ↘
                     (4 triangles)        (émergentes)    (omnidirectionnel)
```

#### Architecture Physique

La simulation implémente une **physique 100% émergente** sans coefficients artificiels :

1. **Calcul des Forces sur 4 Surfaces Triangulaires**
   - Chaque surface a sa normale propre (peut pointer dans n'importe quelle direction)
   - Force = 0.5 × ρ × V² × Area × cos(angle) dans la direction de la normale
   - Les forces ne sont PAS forcément alignées avec le vent
   - Whiskers à Z=-0.15 créent un angle dièdre naturel

2. **Contrainte de Distance Stricte (Corde Réelle)**
   ```typescript
   // Les lignes sont des cordes : limite dure, pas de ressort
   if (distance > lineLength) {
       // Projection sur la sphère
       newPosition = pilotPosition + direction * lineLength * 0.99
       
       // CRUCIAL : Annuler la composante radiale qui éloigne
       if (radialVelocity > 0) {
           velocity -= direction * radialVelocity
       }
   }
   ```
   - La corde ne peut JAMAIS s'étirer
   - Seul le mouvement tangentiel est permis
   - Le kite "glisse" sur la sphère invisible

3. **Orientation Naturelle par les Brides**
   - Points CTRL_GAUCHE et CTRL_DROIT à Z=0.4 (40cm avant)
   - Créent un moment de redressement naturel
   - PAS d'inclinaison artificielle forcée
   - L'orientation émerge de la physique

4. **Conversion d'Énergie**
   ```
   Énergie cinétique du vent (horizontale)
              ↓
    Pression sur surfaces inclinées
              ↓
    Forces dans toutes les directions
              ↓
    Mouvement complexe sur la sphère
              ↓
    Patterns de vol (boucles, huit, etc.)
   ```

#### Paramètres Physiques Clés
- **Masse** : 0.28 kg
- **Surface totale** : 0.68 m² (4 triangles)
- **Inertie** : 0.015 kg·m²
- **Densité de l'air** : 1.225 kg/m³
- **Garde-fous** : Force max 1000N, Vitesse max 30m/s, Vitesse angulaire max 5rad/s

### Commandes Clavier Simulation
- **Flèche gauche** : Rotation barre +45° (tire côté gauche)
- **Flèche droite** : Rotation barre -45° (tire côté droit)
- **Bouton Debug** : Active l'affichage des vecteurs de force

### Paramètres de Vent
- **Vitesse** : 0-50 km/h (18 km/h par défaut)
- **Direction** : 0-360 degrés (0° = vent de face poussant vers -Z)
- **Turbulence** : 0-100% d'intensité (3% par défaut)
- **Longueur des lignes** : 10-50 mètres (15m par défaut)

### Points d'Ancrage du Kite
Les points `CTRL_GAUCHE` et `CTRL_DROIT` dans Kite2.ts (Z=0.4) définissent où les lignes se connectent et créent le moment de redressement naturel.

### 🎯 SimulationV10 - Architecture Modulaire Avancée

#### Vue d'Ensemble
La SimulationV10 représente l'évolution ultime du simulateur de cerf-volant, combinant les meilleures pratiques de toutes les versions précédentes dans une architecture modulaire KISS (Keep It Simple, Stupid).

#### Architecture Modulaire KISS

```text
/src/simulation/simu_V10/
├── constants.ts          # Constantes physiques et paramètres
├── control.ts           # Gestion simple de la barre
├── control_bar.ts       # Barre de contrôle 3D
├── debug.ts            # Vecteurs de debug colorés
├── engine.ts           # Moteur physique principal
├── environment.ts      # Sol, ciel et ambiance
├── history.ts          # Historique de vol léger
├── input.ts            # Gestion des entrées utilisateur
├── lines.ts            # Système de lignes simple
├── pilot.ts            # Représentation 3D du pilote
├── render.ts           # Gestion du rendu Three.js
├── wind.ts             # Génération du vent réaliste
├── analysis/           # Analyse de vol avancée
├── cache/              # Cache de calculs aérodynamiques
├── config/             # Configuration centralisée
├── interfaces/         # Types TypeScript
├── memory/             # Gestion mémoire optimisée
└── utils/              # Utilitaires partagés
```

#### Principes Fondamentaux V10

1. **KISS First** : Architecture simple mais extensible
2. **Modularité Pure** : Chaque classe dans son fichier
3. **Performance Optimisée** : Cache intelligent et gestion mémoire
4. **Debug Complet** : Visualisation avancée des forces
5. **Physique Naturelle** : Calculs émergents sans artifices

#### Modules Clés

##### PhysicsEngine (`engine.ts`)
- **Moteur physique principal** orchestrant la simulation
- **Calculs émergents** : Forces naturelles sans coefficients artificiels
- **Intégration optimisée** : Méthode d'Euler avec amortissement adaptatif
- **Cache intelligent** : Réduction des recalculs répétitifs

##### AerodynamicsCalculator (`aerodynamics.ts`)
- **Calcul par face** : Forces sur chaque triangle du kite
- **Physique émergente** : Portance et traînée naturelles
- **Stall factor** : Décrochage réaliste
- **Cache avancé** : Optimisation des calculs répétitifs

##### WindSimulator (`wind.ts`)
- **Vent réaliste** : Turbulences cohérentes
- **Performance** : Calcul optimisé avec cache
- **Paramètres ajustables** : Vitesse, direction, turbulence

##### DebugVectors (`debug.ts`)
- **Visualisation complète** : Forces, vitesses, vent apparent
- **Légende interactive** : Explication des couleurs
- **Performance** : Mise à jour optimisée

#### Configuration Centralisée

```typescript
// Paramètres physiques équilibrés
export const defaultParams: SimParams = {
  windSpeed: 12,        // Vent plus fort pour vol naturel
  windDirectionDeg: 0,
  paused: false,
};

// Amortissement naturel (comme V8)
linearDamping: 0.92,    // Résistance air réaliste
angularDamping: 0.85,   // Rotation naturelle
```

#### Améliorations par Rapport aux Versions Précédentes

##### Par Rapport à V8
- ✅ **Architecture modulaire** : Code organisé et maintenable
- ✅ **Cache intelligent** : Performance améliorée
- ✅ **Debug avancé** : Visualisation complète des forces
- ✅ **Gestion mémoire** : Object pools et optimisation
- ✅ **Configuration centralisée** : Paramètres faciles à ajuster

##### Par Rapport à V9
- ✅ **Simplification** : Suppression des contraintes PBD complexes
- ✅ **Performance** : Cache et optimisation mémoire
- ✅ **Stabilité** : Amortissement naturel comme V8
- ✅ **Maintenabilité** : Architecture KISS claire

#### Points Forts de V10

1. **Performance Exceptionnelle**
   - Cache multi-niveaux pour les calculs aérodynamiques
   - Object pools pour la gestion mémoire
   - Mise à jour optimisée des vecteurs de debug

2. **Architecture KISS**
   - Un fichier par classe pour une séparation claire
   - Interfaces TypeScript pour la communication
   - Configuration centralisée et modifiable

3. **Debug et Analyse**
   - Vecteurs colorés pour toutes les forces
   - Métriques temps réel complètes
   - Historique de vol avec analyse

4. **Physique Naturelle**
   - Calculs émergents sans coefficients artificiels
   - Amortissement réaliste comme V8
   - Réponse naturelle aux commandes

#### Utilisation Recommandée

```typescript
// Lancement simple
import { SimulationAppV10 } from '@simulation/simulationV10';
const sim = new SimulationAppV10();

// Configuration personnalisée
const customParams = {
  windSpeed: 15,        // km/h
  windDirectionDeg: 45, // degrés
  debugMode: true
};
```

#### Perspectives d'Évolution

- **IA de pilotage** : Contrôle automatique du kite
- **Multi-kite** : Simulation de plusieurs cerfs-volants
- **Export données** : Analyse détaillée des vols
- **Réalité virtuelle** : Support WebXR
- **Performance** : Optimisation pour mobile

**🎯 V10 représente l'aboutissement de l'évolution du simulateur : simplicité, performance et physique naturelle dans une architecture modulaire maintenable.**

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