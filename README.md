# CAO Paramétrique - Modélisation 3D 🎨

Un logiciel de CAO paramétrique simple et élégant, inspiré d'OpenSCAD/JSCAD, utilisant TypeScript et Three.js.
**🎮 Compatible Godot Engine** pour faciliter la migration vers un moteur de jeu.

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.170-green)
![Godot](https://img.shields.io/badge/Godot-Compatible-purple)

## 🚀 Quick Start

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Compiler pour production
npm run build

# Vérifier les types
npx tsc --noEmit
```

Ouvrir http://localhost:3001 dans votre navigateur.

## 🏗️ Architecture KISS + Godot-Compatible

```
src/
├── core/              # Système central
│   ├── Node3D.ts      # 🎮 Couche d'abstraction Godot
│   ├── StructuredObject.ts # Pattern objet unifié
│   ├── Primitive.ts   # Primitives de base
│   └── Registry.ts    # Registre d'objets
├── renderer/          # 🎨 Rendu Three.js isolé
│   ├── ThreeRenderer.ts # Renderer modulaire
│   └── index.ts       # Exports
├── export/            # 🎮 Export Godot Engine
│   ├── GodotExporter.ts # Export .tscn
│   └── index.ts       # Exports
├── objects/           # 📦 Objets paramétriques
│   ├── Chair.ts       # Mobilier
│   ├── Box.ts         # Formes
│   └── ...           # Autres objets
├── types/            # 📝 Types TypeScript
└── main.ts           # 🚀 Application principale
```

## 🎮 Nouveautés v3.0 - Compatible Godot

### 🔧 Node3D - Couche d'Abstraction Godot
```typescript
export class Node3D extends THREE.Group {
    // Transform compatible Godot
    public transform: Transform3D;
    
    // Cycle de vie Godot
    protected _ready(): void { /* ... */ }
    protected _process(delta: number): void { /* ... */ }
    
    // Signaux Godot-like
    public emit_signal(name: string, ...args: any[]): void;
    public connect(signal: string, target: Node3D, method: string): void;
    
    // Gestion hiérarchique
    public add_child(child: Node3D): void;
    public get_node(path: string): Node3D | null;
}
```

### 🏗️ StructuredObject Amélioré
Tous les objets héritent maintenant de `Node3D` au lieu de `THREE.Group` :

```typescript
export class MonObjet extends StructuredObject {
    protected definePoints(): void {
        // 🎮 Godot: Ces points deviennent des Node3D enfants
        this.setPoint('center', [0, 0, 0]);
    }
    
    protected buildStructure(): void {
        // Structure rigide de l'objet
    }
    
    protected buildSurfaces(): void {
        // Détails visuels
    }
}
```

### 🎨 ThreeRenderer Modulaire
Le rendu est maintenant isolé dans une classe séparée :

```typescript
const renderer = new ThreeRenderer({
    canvasContainer: document.getElementById('app')!,
    backgroundColor: '#1a1a2e',
    cameraPosition: [3, 2, 3]
});

renderer.setRootNode(monObjet);
renderer.focusOn(monObjet);
```

### 🎮 Export Godot Engine
Export direct vers format `.tscn` de Godot :

```typescript
import { GodotExporter } from './export';

// Export automatique
GodotExporter.downloadTSCN(monObjet, 'mon_objet.tscn');

// Export programmé
const tscnContent = GodotExporter.exportToTSCN(monObjet);
```

### ⚡ Points Anatomiques pour Godot
```typescript
// Dans definePoints()
this.setPoint('seat_center', [0, 0.45, 0]);
this.setPoint('back_top', [0, 0.85, -0.175]);

// Export en commentaires Godot
# Points anatomiques:
# seat_center: (0.000, 0.450, 0.000)
# back_top: (0.000, 0.850, -0.175)
```

## 🎯 Contrôles Utilisateur

### Interface
- **🔄 Reset** - Remet la caméra en position initiale
- **💥 Explode** - Affiche les points anatomiques pour debug  
- **▶️ Animate** - Active/désactive la rotation automatique
- **🎮 Export Godot** - Télécharge le fichier .tscn

### Navigation 3D
- **Glisser souris** - Rotation de la caméra
- **Molette** - Zoom avant/arrière
- **Clic droit + glisser** - Déplacement latéral

## 📦 Objets Disponibles

### 🏠 Mobilier
- **Chair** : Chaise paramétrique configurable
- **ModularChair** : Chaise modulaire avancée
- **Table** : Table avec dimensions variables

### 📦 Formes de Base
- **Box** : Boîte avec couvercle (ouverte/fermée)
- **Pyramid** : Pyramide paramétrique

### ⚙️ Mécaniques  
- **Gear** : Engrenage avec nombre de dents paramétrable

### 🌳 Génératifs
- **FractalTree** : Arbre fractal avec profondeur configurable

### 🪁 Spécialisés
- **Kite** : Cerf-volant avec structure anatomique

## 🎯 Migration vers Godot

### Mapping Automatique
```
StructuredObject → Node3D (Godot)
├── Points anatomiques → Node3D enfants  
├── Primitives Three.js → MeshInstance3D
├── Materials → StandardMaterial3D
└── Transform → Transform3D
```

### Export `.tscn` 
```gdscript
[gd_scene load_steps=1 format=3]

[node name="Chair" type="Node3D"]

[node name="Seat" type="MeshInstance3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0.45, 0)
mesh = SubResource("BoxMesh_1")

[sub_resource type="BoxMesh" id="BoxMesh_1"]
size = Vector3(0.4, 0.03, 0.4)
```

## 📝 Créer un Nouvel Objet

```typescript
// src/objects/MonObjet.ts
import { StructuredObject } from '../core/StructuredObject';
import { ICreatable } from '../types';
import { Primitive } from '../core/Primitive';

export class MonObjet extends StructuredObject implements ICreatable {
    private params = {
        width: 1,
        height: 2,
        color: '#808080'
    };
    
    constructor(customParams = {}) {
        super("Mon Objet");
        this.params = { ...this.params, ...customParams };
    }
    
    protected definePoints(): void {
        // 🎮 Points anatomiques (compatibles Godot)
        this.setPoint('center', [0, 0, 0]);
        this.setPoint('top', [0, this.params.height, 0]);
    }
    
    protected buildStructure(): void {
        // Structure rigide avec primitives
        const box = Primitive.box(
            this.params.width, 
            this.params.height, 
            0.1, 
            this.params.color
        );
        this.addPrimitiveAtPoint(box, 'center');
    }
    
    protected buildSurfaces(): void {
        // Détails et surfaces
    }
    
    // Interface ICreatable
    create(): this { return this; }
    getName(): string { return "Mon Objet"; }
    getDescription(): string { return "Description de mon objet"; }
    getPrimitiveCount(): number { return 1; }
}
```

Puis l'enregistrer dans `src/objects/index.ts`:
```typescript
registry.register('monobjet', new MonObjet());
```

## 🎮 Workflow Godot

1. **Développement Web** : Créer et tester les objets dans le navigateur
2. **Export .tscn** : Utiliser le bouton "🎮 Export Godot"  
3. **Import Godot** : Ouvrir le fichier .tscn dans Godot Engine
4. **Finalisation** : Ajouter scripts, physique, etc. dans Godot

## � Avantages de l'Architecture v3.0

### ✅ KISS (Keep It Simple, Stupid)
- API claire et intuitive
- Séparation des responsabilités  
- Code modulaire et réutilisable

### ✅ Compatible Godot
- Export automatique vers .tscn
- Mapping direct des concepts
- Structure compatible Node3D

### ✅ Hot Reload Performant
- Modifications instantanées
- Vite.js ultra-rapide
- Development experience optimale

### ✅ Production Ready
- TypeScript strict
- Architecture modulaire
- Extensible facilement

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/MonObjet`)
3. Commit (`git commit -m 'Ajout MonObjet paramétrique'`)
4. Push (`git push origin feature/MonObjet`)
5. Créer une Pull Request

## 📝 License

MIT License - Libre d'utilisation et de modification

---

**🎯 Philosophie v3.0**: La meilleure architecture n'est pas la plus complexe, mais celle qui permet la transition fluide entre les écosystèmes tout en restant **simple et productive** ! 🚀

// Créer des formes de base
const box = CAD.cube({ size: [1, 2, 3] });
const ball = CAD.sphere({ radius: 0.5 });
const tube = CAD.cylinder({ radius: 0.3, height: 2 });
const donut = CAD.torus({ radius: 1, tube: 0.2 });
```

### Transformations
```typescript
// Déplacer, tourner, redimensionner
CAD.translate([1, 0, 0], box);
CAD.rotate([0, Math.PI/4, 0], box);
CAD.scale(2, box);
CAD.color('#FF0000', box);
```

### Opérations
```typescript
// Combiner des objets
const group = CAD.union(box, ball);
const pattern = CAD.repeat(3, 2, box);
```

## 📝 Créer un Nouvel Objet

```typescript
// src/objects/MonObjet.ts
import { ICreatable } from '../types';
import { Assembly } from '../core/Assembly';
import * as CAD from '../core/CAD';
import * as THREE from 'three';

export class MonObjet implements ICreatable {
    private params = {
        width: 1,
        height: 2,
        color: '#808080'
    };
    
    constructor(customParams = {}) {
        this.params = { ...this.params, ...customParams };
    }
    
    create(): Assembly {
        const assembly = new Assembly("Mon Objet");
        
        // Créer l'objet avec l'API CAD
        const box = CAD.cube({ 
            size: [this.params.width, this.params.height, 0.1] 
        });
        CAD.color(this.params.color, box);
        
        assembly.add(box as THREE.Mesh);
        return assembly;
    }
    
    getName(): string { return "Mon Objet"; }
    getDescription(): string { return "Description"; }
    getPrimitiveCount(): number { return 1; }
}
```

Puis l'enregistrer dans `src/objects/index.ts`:
```typescript
registry.register('monobjet', new MonObjet());
```

## 🎮 Contrôles

### Interface
- **💥 Éclater** - Sépare les primitives pour voir l'assemblage
- **🔄 Reset** - Restaure l'objet à son état original
- **▶️ Animer** - Active/désactive la rotation
- **🏷️ Labels** - Affiche/cache les étiquettes

### Navigation 3D
- **Glisser souris** - Rotation de la caméra
- **Molette** - Zoom avant/arrière
- **Clic droit + glisser** - Déplacement latéral

## 📦 Objets Disponibles

### Objets de Base
- **SimpleChair** : Chaise paramétrique configurable
- **Box** : Boîte avec couvercle (ouverte/fermée)
- **ParametricTable** : Table avec dimensions variables

### Objets Mécaniques
- **Gear** : Engrenage avec nombre de dents paramétrable

### Objets Génératifs
- **FractalTree** : Arbre fractal avec profondeur configurable

## 🎯 Philosophie KISS

- **Simple** : API claire et intuitive inspirée d'OpenSCAD
- **Modulaire** : Chaque objet dans son fichier
- **Paramétrique** : Tout est configurable via des paramètres
- **TypeScript** : Typage fort et IntelliSense
- **Three.js** : Rendu 3D performant dans le navigateur

## 📐 Bonnes Pratiques

1. **Commencer Simple** : Bloquer la forme avec des primitives de base
2. **Composer** : Construire à partir de parties réutilisables
3. **Hiérarchie** : Structure → Parties → Détails
4. **Tester** : Utiliser la fonction "Éclater" pour vérifier l'assemblage
5. **Limiter** : Maximum 10-15 primitives par objet

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/MonObjet`)
3. Commit (`git commit -m 'Ajout MonObjet paramétrique'`)
4. Push (`git push origin feature/MonObjet`)
5. Créer une Pull Request

## 📝 License

MIT License - Libre d'utilisation et de modification

---

**Remember**: La meilleure modélisation 3D n'est pas la plus détaillée, mais celle qui communique clairement sa forme avec le moins de complexité. **Keep It Simple!** 🎯