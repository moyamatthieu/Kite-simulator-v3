# Système CAO Web Modulaire - Architecture KISS avec Primitives Anatomiques

## Vision KISS (Keep It Simple, Stupid)
Système de modélisation 3D basé sur l'assemblage de **primitives géométriques simples** comme des LEGO, avec hot-reload instantané et architecture compatible Godot.

## Recherche et Fondements Théoriques

### Approche "Primitive-Based Modeling"
D'après les recherches sur le modeling procédural:
- **Les primitives sont les building blocks fondamentaux** - cubes, sphères, cylindres, cônes
- **Assembly par composition** plutôt que par opérations booléennes complexes
- **Paramétrique mais simple** - exposer seulement les paramètres essentiels
- **Non-destructif** - chaque primitive reste éditable individuellement

### Principe Anatomique
Chaque objet complexe est décomposé en parties anatomiques simples:
- **Voiture** = chassis + 4 roues + pare-brise (6 primitives max)
- **Personnage** = tête + torse + 4 membres (6-10 primitives)
- **Maison** = murs + toit + porte + fenêtres (4-8 primitives)

## Principes Fondamentaux

### 1. **Architecture Godot-Compatible**
```
Scene (Root)
├── Node3D (Spatial)
│   ├── MeshInstance
│   ├── CollisionShape
│   └── Components
├── Camera3D
├── DirectionalLight
└── Environment
```

### 2. **Workflow Développeur-First**
- **Hot Module Replacement (HMR)** - Modifications instantanées sans refresh
- **File Watcher** - Détection automatique des changements
- **Live Scene Update** - Objets apparaissent/disparaissent en temps réel
- **VSCode + Claude Code** - Développement assisté par IA

### 3. **Primitives Paramétriques de Base**
```typescript
enum PrimitiveType {
  BOX = 'box',           // width, height, depth
  SPHERE = 'sphere',     // radius, segments
  CYLINDER = 'cylinder', // radius, height
  CONE = 'cone',        // radius, height
  TORUS = 'torus',      // radius, tube
  WEDGE = 'wedge',      // width, height, depth, angle
  CAPSULE = 'capsule'   // radius, height
}

interface PrimitiveParams {
  // Paramètres universels
  color?: string;
  material?: 'matte' | 'shiny' | 'glass' | 'metal';
  
  // Paramètres spécifiques par type
  [key: string]: number | string | undefined;
}
```

### 4. **Système de Nœuds avec ID Unique**
```typescript
interface Node3D {
  readonly id: string;     // ID unique auto-généré (ex: node_ln3k4d2_0_x7b9a)
  name: string;            // Nom descriptif modifiable
  transform: Transform3D;
  children: Node3D[];
  parent?: Node3D;
  
  // Méthodes Godot-like
  _ready(): void;
  _process(delta: number): void;
  _physics_process(delta: number): void;
  
  // Signaux
  signals: Map<string, Signal>;
  emit_signal(name: string, ...args: any[]): void;
  connect(signal: string, target: Node3D, method: string): void;
}
```

## Architecture Technique

### Stack Technologique
```yaml
Frontend:
  - Three.js/Babylon.js (rendu 3D)
  - TypeScript (type safety)
  - Vite (HMR ultra-rapide)
  - WebSockets (sync temps réel)

Backend Dev:
  - Vite Dev Server
  - Chokidar (file watching)
  - Express (API endpoints)
  - WebSocket Server

Outils:
  - ESBuild (compilation rapide)
  - Draco (compression mesh)
  - KTX2 (textures optimisées)
```

### Structure de Projet
```
project/
├── src/
│   ├── nodes/          # Classes de nœuds (Node3D, MeshInstance, etc.)
│   ├── resources/      # Ressources (Materials, Meshes, Textures)
│   ├── scenes/         # Scènes sauvegardées (.tscn format custom)
│   ├── scripts/        # Scripts attachés aux nœuds
│   ├── editor/         # Outils d'édition in-browser
│   └── runtime/        # Moteur de rendu et système
├── assets/
│   ├── models/         # GLTF, OBJ, FBX
│   ├── textures/       # Images, KTX2
│   └── materials/      # Définitions de matériaux
├── public/
│   └── index.html      # Point d'entrée
└── server/
    ├── watch.ts        # File watcher
    ├── sync.ts         # WebSocket sync
    └── builder.ts      # Asset pipeline
```

## Système de Modélisation KISS

### 1. **Primitive Factory (Simple et Direct)**
```typescript
class Primitive {
  static box(w: number = 1, h: number = 1, d: number = 1): Node3D {
    const node = new Node3D("Box");
    node.mesh = { type: 'box', params: { width: w, height: h, depth: d } };
    return node;
  }
  
  static sphere(r: number = 0.5): Node3D {
    const node = new Node3D("Sphere");
    node.mesh = { type: 'sphere', params: { radius: r } };
    return node;
  }
  
  static cylinder(r: number = 0.5, h: number = 1): Node3D {
    const node = new Node3D("Cylinder");
    node.mesh = { type: 'cylinder', params: { radius: r, height: h } };
    return node;
  }
  
  static cone(r: number = 0.5, h: number = 1): Node3D {
    const node = new Node3D("Cone");
    node.mesh = { type: 'cone', params: { radius: r, height: h } };
    return node;
  }
}
```

### 2. **Assembly Pattern (Composition Simple)**
```typescript
class Assembly extends Node3D {
  addPart(primitive: Node3D, position?: Vector3, rotation?: Vector3): this {
    if (position) primitive.transform.position = position;
    if (rotation) primitive.transform.rotation = Quaternion.from_euler(rotation);
    this.add_child(primitive);
    return this;
  }
  
  clone(): Assembly {
    // Clone profond avec toutes les primitives
    return super.duplicate() as Assembly;
  }
}
```

### 3. **Templates/Recipes (Réutilisables)**
```typescript
class Templates {
  static wheel(radius: number = 0.3): Assembly {
    return new Assembly("Wheel")
      .addPart(Primitive.cylinder(radius, 0.1), Vector3.ZERO)
      .addPart(Primitive.cylinder(0.05, 0.15), Vector3.ZERO); // Axe
  }
  
  static chair(height: number = 1): Assembly {
    const seat_h = height * 0.4;
    return new Assembly("Chair")
      .addPart(Primitive.box(0.4, 0.05, 0.4), new Vector3(0, seat_h, 0)) // Assise
      .addPart(Primitive.box(0.4, 0.4, 0.05), new Vector3(0, seat_h + 0.2, -0.175)) // Dossier
      .addPart(Primitive.cylinder(0.02, seat_h), new Vector3(-0.15, 0, -0.15)) // Pieds
      .addPart(Primitive.cylinder(0.02, seat_h), new Vector3(0.15, 0, -0.15))
      .addPart(Primitive.cylinder(0.02, seat_h), new Vector3(-0.15, 0, 0.15))
      .addPart(Primitive.cylinder(0.02, seat_h), new Vector3(0.15, 0, 0.15));
  }
  
  static car(): Assembly {
    return new Assembly("Car")
      .addPart(Primitive.box(2, 0.6, 1), new Vector3(0, 0.3, 0)) // Chassis
      .addPart(Primitive.box(1, 0.4, 0.8), new Vector3(0, 0.7, 0)) // Cabine
      .addPart(Templates.wheel(), new Vector3(-0.7, 0, -0.5))
      .addPart(Templates.wheel(), new Vector3(0.7, 0, -0.5))
      .addPart(Templates.wheel(), new Vector3(-0.7, 0, 0.5))
      .addPart(Templates.wheel(), new Vector3(0.7, 0, 0.5));
  }
}
```

### 4. **Système CSG Hybride - Simplicité et Puissance**

#### Approche Progressive
1. **Niveau 1 - Assemblage Simple** (KISS par défaut)
   - Composition par primitives
   - Placement et superposition
   - Hot reload instantané
   - Performance maximale

2. **Niveau 2 - CSG Optionnel** (Quand nécessaire)
   - Union, Différence, Intersection
   - Utilisation de `three-csg-ts` ou `three-bvh-csg`
   - Cache des résultats CSG
   - Mode "preview" vs "final"

#### Implémentation CSG
```typescript
import { CSG } from 'three-csg-ts';

class CSGOperations {
  // Cache pour éviter recalculs
  private cache = new Map<string, THREE.Geometry>();
  
  union(a: THREE.Mesh, b: THREE.Mesh): THREE.Mesh {
    const key = `union_${a.uuid}_${b.uuid}`;
    if (!this.cache.has(key)) {
      const result = CSG.union(a, b);
      this.cache.set(key, result.geometry);
    }
    return new THREE.Mesh(this.cache.get(key));
  }
  
  difference(a: THREE.Mesh, b: THREE.Mesh): THREE.Mesh {
    const key = `diff_${a.uuid}_${b.uuid}`;
    if (!this.cache.has(key)) {
      const result = CSG.subtract(a, b);
      this.cache.set(key, result.geometry);
    }
    return new THREE.Mesh(this.cache.get(key));
  }
  
  intersection(a: THREE.Mesh, b: THREE.Mesh): THREE.Mesh {
    const key = `inter_${a.uuid}_${b.uuid}`;
    if (!this.cache.has(key)) {
      const result = CSG.intersect(a, b);
      this.cache.set(key, result.geometry);
    }
    return new THREE.Mesh(this.cache.get(key));
  }
}
```

#### Stratégie d'Utilisation
- **Par défaut** : Assemblage simple (90% des cas)
- **CSG activé** : Pour trous, découpes, formes complexes
- **Mode preview** : Affiche boîtes englobantes pendant édition
- **Mode final** : Calcul CSG pour export/rendu final

## Workflow de Développement KISS

### 1. **Création d'Objet = Assemblage de Primitives**
```typescript
// Dans VSCode: src/objects/maison.ts
export function createMaison(): Assembly {
  return new Assembly("Maison")
    // Base
    .addPart(
      Primitive.box(5, 3, 5).setColor('#F5DEB3'),
      new Vector3(0, 1.5, 0)
    )
    // Toit (pyramide = cone avec 4 faces)
    .addPart(
      Primitive.cone(3.5, 2).setColor('#8B4513'),
      new Vector3(0, 4, 0)
    )
    // Porte
    .addPart(
      Primitive.box(0.8, 1.8, 0.1).setColor('#654321'),
      new Vector3(0, 0.9, 2.5)
    )
    // Fenêtres
    .addPart(
      Primitive.box(0.6, 0.6, 0.1).setColor('#87CEEB'),
      new Vector3(1.5, 2, 2.5)
    )
    .addPart(
      Primitive.box(0.6, 0.6, 0.1).setColor('#87CEEB'),
      new Vector3(-1.5, 2, 2.5)
    );
}

// Auto-détecté et ajouté à la scène via HMR
```

### 2. **Modification en Temps Réel**
```typescript
// Changement de couleur → Update instantané dans le navigateur
toit.material = new SpatialMaterial({ color: 0x00ff00 }); // Vert maintenant!
```

### 3. **Composition Hiérarchique**
```typescript
// src/objects/ville.ts
export function createVille(): Assembly {
  const ville = new Assembly("Ville");
  
  // Grille de maisons
  for (let x = 0; x < 5; x++) {
    for (let z = 0; z < 5; z++) {
      const maison = createMaison();
      maison.transform.position = new Vector3(x * 8, 0, z * 8);
      maison.transform.rotate_y(Math.random() * Math.PI);
      ville.add_child(maison);
    }
  }
  
  // Arbres entre les maisons
  for (let i = 0; i < 10; i++) {
    const arbre = new Assembly("Arbre")
      .addPart(Primitive.cylinder(0.2, 2).setColor('#8B4513'), Vector3.ZERO)
      .addPart(Primitive.sphere(1).setColor('#228B22'), new Vector3(0, 2, 0));
    
    arbre.transform.position = new Vector3(
      Math.random() * 40 - 20,
      0,
      Math.random() * 40 - 20
    );
    ville.add_child(arbre);
  }
  
  return ville;
}
```

## Système de Hot-Reload

### Architecture WebSocket
```typescript
// Server (Vite plugin)
class CAOHotReloadPlugin {
  constructor() {
    this.watcher = chokidar.watch('src/objects/**/*.ts');
    this.ws = new WebSocketServer({ port: 3001 });
  }
  
  handleFileChange(path: string) {
    const module = this.buildModule(path);
    this.ws.broadcast({
      type: 'module-update',
      path: path,
      code: module
    });
  }
}

// Client
class SceneUpdater {
  constructor(scene: Scene) {
    this.ws = new WebSocket('ws://localhost:3001');
    this.ws.onmessage = (e) => {
      const { type, path, code } = JSON.parse(e.data);
      if (type === 'module-update') {
        this.updateSceneObject(path, code);
      }
    };
  }
  
  updateSceneObject(path: string, code: string) {
    // Supprime l'ancien
    const old = this.scene.find_node(path);
    if (old) old.queue_free();
    
    // Crée le nouveau
    const module = new Function(code)();
    const node = module.default();
    this.scene.add_child(node);
  }
}
```

## Formats de Sauvegarde

### Format .tscn (Text Scene - Godot Compatible)
```ini
[gd_scene format=3]

[node name="Maison" type="Node3D"]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0)

[node name="Murs" type="MeshInstance3D" parent="."]
mesh = SubResource("BoxMesh_1")
material = SubResource("StandardMaterial_1")

[node name="Toit" type="MeshInstance3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 0)
mesh = SubResource("PyramidMesh_1")
material = SubResource("StandardMaterial_2")
```

### Format JSON (Pour échange web)
```json
{
  "type": "Node3D",
  "name": "Maison",
  "transform": {
    "position": [0, 0, 0],
    "rotation": [0, 0, 0],
    "scale": [1, 1, 1]
  },
  "children": [
    {
      "type": "MeshInstance",
      "name": "Murs",
      "mesh": { "type": "BoxMesh", "size": [10, 5, 10] },
      "material": { "type": "StandardMaterial", "color": "#ffffff" }
    }
  ]
}
```

## Interface Utilisateur Minimale

### Panneau de Contrôle
```typescript
interface EditorPanel {
  // Arbre de scène
  sceneTree: {
    nodes: Node3D[];
    selected: Node3D | null;
  };
  
  // Inspecteur
  inspector: {
    properties: Map<string, any>;
    signals: Signal[];
  };
  
  // Console
  console: {
    logs: LogEntry[];
    errors: Error[];
  };
  
  // Metrics
  stats: {
    fps: number;
    drawCalls: number;
    triangles: number;
    memory: number;
  };
}
```

## API de Script

### Attachement de Scripts
```typescript
// src/scripts/rotating_cube.ts
export class RotatingCube extends Node3D {
  speed: number = 1.0;
  
  _ready() {
    console.log("Cube ready!");
  }
  
  _process(delta: number) {
    this.rotate_y(this.speed * delta);
  }
}

// Usage
const cube = PrimitiveBuilder.cube(Vector3.ONE);
cube.set_script(RotatingCube);
scene.add_child(cube);
```

## Intégration avec Outils Existants

### 1. **Import de Modèles**
- GLTF/GLB (recommandé)
- OBJ + MTL
- FBX via convertisseur
- STL pour impression 3D

### 2. **Export**
- GLTF 2.0 (standard universel)
- **Godot .tscn/.tres natif** (avec CSG préservé)
- Three.js JSON
- Babylon.js .babylon
- STL (pour impression 3D avec CSG appliqué)

### 3. **Plugins VSCode**
```json
// .vscode/settings.json
{
  "cao.autoReload": true,
  "cao.serverPort": 3000,
  "cao.websocketPort": 3001,
  "cao.watchPaths": ["src/objects/**", "src/scenes/**"]
}
```

## Performance et Optimisation

### 1. **Instancing**
```typescript
class InstancedMesh extends MeshInstance {
  instances: Transform3D[];
  
  render() {
    // Utilise GPU instancing pour performances
  }
}
```

### 2. **LOD (Level of Detail)**
```typescript
class LODMesh extends MeshInstance {
  levels: { distance: number; mesh: Mesh }[];
  
  update(cameraDistance: number) {
    // Change mesh selon distance
  }
}
```

### 3. **Occlusion Culling**
```typescript
class OcclusionCuller {
  static cull(scene: Scene, camera: Camera): Node3D[] {
    // Retourne seulement les nœuds visibles
  }
}
```

## Commandes NPM

```json
{
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview",
    "watch": "tsx server/watch.ts",
    "sync": "tsx server/sync.ts",
    "test": "vitest",
    "format": "prettier --write ."
  }
}
```

## Exemples d'Objets Décomposés Anatomiquement

### Personnage Simple (6-8 primitives)
```typescript
class Character extends Assembly {
  constructor() {
    super("Character");
    
    // Anatomie basique
    this.addPart(Primitive.sphere(0.3), new Vector3(0, 1.7, 0))        // Tête
        .addPart(Primitive.box(0.6, 0.8, 0.3), new Vector3(0, 1, 0))  // Torse
        .addPart(Primitive.capsule(0.1, 0.6), new Vector3(-0.3, 1, 0)) // Bras G
        .addPart(Primitive.capsule(0.1, 0.6), new Vector3(0.3, 1, 0))  // Bras D
        .addPart(Primitive.capsule(0.1, 0.7), new Vector3(-0.15, 0.3, 0)) // Jambe G
        .addPart(Primitive.capsule(0.1, 0.7), new Vector3(0.15, 0.3, 0)); // Jambe D
  }
}
```

### Drone (5-9 primitives)
```typescript
class Drone extends Assembly {
  constructor() {
    super("Drone");
    
    // Corps central
    this.addPart(Primitive.sphere(0.3).setColor('#333'));
    
    // 4 bras + hélices
    const directions = [[1,0,1], [-1,0,1], [1,0,-1], [-1,0,-1]];
    for (const [x, y, z] of directions) {
      // Bras
      this.addPart(
        Primitive.cylinder(0.05, 0.5).setColor('#666'),
        new Vector3(x * 0.2, 0, z * 0.2),
        new Vector3(0, 0, Math.atan2(z, x))
      );
      // Hélice
      this.addPart(
        Primitive.cylinder(0.3, 0.02).setColor('#000'),
        new Vector3(x * 0.5, 0.1, z * 0.5)
      );
    }
  }
}
```

### Véhicule (6-10 primitives max)
```typescript
class Vehicle extends Assembly {
  constructor(type: 'car' | 'truck' | 'bus' = 'car') {
    super(`Vehicle_${type}`);
    
    // Règle: Maximum 10 primitives pour rester KISS
    const chassis = type === 'truck' ? 
      Primitive.box(3, 0.8, 1.2) : 
      Primitive.box(2, 0.6, 1);
    
    this.addPart(chassis, new Vector3(0, 0.4, 0));
    
    // 4 roues (réutilisation du template)
    const wheelPositions = [
      [-0.8, 0, -0.5], [0.8, 0, -0.5],
      [-0.8, 0, 0.5], [0.8, 0, 0.5]
    ];
    
    for (const [x, y, z] of wheelPositions) {
      this.addPart(Templates.wheel(), new Vector3(x, y, z));
    }
  }
}
```

## Règles d'Assemblage Anatomique

### 1. **Limite de Complexité**
- **Maximum 10-15 primitives par objet**
- Si plus complexe → décomposer en sous-assemblages
- Chaque sous-assemblage = un "organe" fonctionnel

### 2. **Hiérarchie Logique**
```
Objet Principal
├── Partie Structurelle (corps, chassis)
├── Parties Fonctionnelles (roues, membres)
└── Détails Optionnels (antennes, décorations)
```

### 3. **Réutilisabilité**
- Templates pour parties communes (roues, fenêtres)
- Inheritance pour variations (Car → Truck)
- Paramètres pour personnalisation

### 4. **Performance**
- Instancing automatique pour primitives identiques
- LOD par suppression de détails (pas de morphing)
- Culling par assemblage entier

## Exemple Complet de Workflow

1. **Démarrage du projet**
```bash
npm run dev
# Browser: http://localhost:3000
# WebSocket: ws://localhost:3001
```

2. **Création d'objet dans VSCode**
```typescript
// src/objects/car.ts
export default function createCar() {
  const car = new Node3D("Car");
  
  const body = PrimitiveBuilder.cube(new Vector3(4, 1.5, 2));
  body.material = new StandardMaterial({ color: 0xff0000 });
  
  for (let i = 0; i < 4; i++) {
    const wheel = PrimitiveBuilder.cylinder(0.5, 0.3);
    wheel.transform.rotation.z = Math.PI / 2;
    wheel.transform.position = new Vector3(
      i < 2 ? -1.5 : 1.5,
      -0.5,
      i % 2 === 0 ? -1 : 1
    );
    car.add_child(wheel);
  }
  
  car.add_child(body);
  return car;
}
```

3. **Sauvegarde → Apparition instantanée dans le navigateur**

4. **Modification → Update en temps réel**

5. **Export pour production**
```bash
npm run build
# Génère dist/ avec assets optimisés
```

## Roadmap

### Phase 1: MVP (2 semaines)
- [x] Architecture Node3D de base
- [ ] PrimitiveBuilder fonctionnel
- [ ] Hot-reload basique
- [ ] Rendu Three.js

### Phase 2: Outils (1 mois)
- [ ] Interface d'édition in-browser
- [ ] Système de matériaux
- [ ] Import/Export GLTF
- [ ] Gizmos de transformation

### Phase 3: Avancé (2 mois)
- [ ] CSG operations (avec cache et optimisations)
- [ ] Parametric modeling
- [ ] Animation system
- [ ] Physics integration
- [ ] Export Godot .tscn natif

### Phase 4: Production (3 mois)
- [ ] Optimisations performances
- [ ] Plugin system
- [ ] Collaboration temps réel
- [ ] Cloud save/load

## Avantages de l'Architecture KISS

### Par rapport à CSG/Boolean Operations
1. **Simplicité** - Pas de calculs BSP complexes
2. **Performance** - Rendu direct des primitives
3. **Éditable** - Chaque partie reste modifiable
4. **Prévisible** - WYSIWYG, pas de surprises
5. **Debuggable** - Voir chaque primitive séparément

### Pour le Développeur
1. **Apprentissage Rapide** - Concepts simples (box, sphere, position)
2. **Mental Model Clair** - Comme assembler des LEGO
3. **Hot-Reload** - Modifications instantanées
4. **Code Lisible** - Assembly descriptif

### Pour l'Utilisateur Final
1. **Intuitif** - Manipulation directe des parties
2. **Animable** - Faire tourner une roue facilement
3. **Optimisé** - Seulement les primitives nécessaires
4. **Modulaire** - Swap de parties (changer couleur d'une roue)

## Philosophie KISS - Résumé

### Ce qu'on GARDE ✅
- **Node3D & Transform3D** - Hiérarchie et positions
- **Primitives Simples** - Box, Sphere, Cylinder, Cone
- **Assembly Pattern** - Composition par ajout
- **Hot-Reload** - Feedback instantané
- **Templates** - Réutilisation intelligente

### Ce qu'on ÉVITE ❌
- **CSG/Boolean Ops** - Trop complexe
- **Meshes Custom** - Rester sur primitives
- **Trop de Paramètres** - Maximum 3-4 par primitive
- **Sur-ingénierie** - Si c'est compliqué, c'est faux
- **Abstractions Inutiles** - Direct et simple

### Principe Central
> "Un objet 3D est une collection de formes simples bien placées"
> - Pas de magie, pas de complexité cachée
> - Si un enfant peut le comprendre, c'est bon

## Architecture Godot-Compatible

### Couche d'Abstraction
```typescript
// Interface agnostique du moteur
interface INode3D {
  transform: ITransform3D;
  children: INode3D[];
  mesh?: IMesh;
  material?: IMaterial;
  
  // Méthodes communes Three.js/Godot
  toThreeJS(): THREE.Object3D;
  toGodot(): GodotNode;
  toGLTF(): GLTFNode;
}

// Implémentation duale
class UniversalNode implements INode3D {
  toThreeJS(): THREE.Object3D {
    // Conversion vers Three.js pour rendu web
    const obj = this.mesh ? 
      new THREE.Mesh(this.mesh.toThreeGeometry()) : 
      new THREE.Group();
    obj.position.copy(this.transform.position);
    obj.quaternion.copy(this.transform.rotation);
    obj.scale.copy(this.transform.scale);
    return obj;
  }
  
  toGodot(): string {
    // Export format .tscn texte
    return `[node name="${this.name}" type="Node3D"]
` +
           `transform = Transform3D(${this.transform.toGodotString()})
` +
           this.mesh ? `mesh = SubResource("${this.mesh.id}")\n` : '';
  }
}
```

### Export Godot avec CSG Préservé
```typescript
class GodotExporter {
  exportScene(root: Assembly): string {
    let tscn = '[gd_scene format=3]\n\n';
    let resources = '';
    let nodes = '';
    
    // Détecter les opérations CSG
    root.traverse((node) => {
      if (node.hasCSG) {
        // Exporter comme CSGShape3D Godot
        nodes += this.exportCSGNode(node);
      } else {
        // Exporter comme MeshInstance3D standard
        nodes += this.exportMeshNode(node);
      }
    });
    
    return tscn + resources + nodes;
  }
  
  exportCSGNode(node: CSGNode): string {
    // Godot supporte CSG nativement!
    return `[node name="${node.name}" type="CSG${node.operation}3D"]\n` +
           `operation = ${node.operation}\n` +
           `use_collision = true\n`;
  }
}
```

### Hot Reload avec État CSG
```typescript
class HotReloadManager {
  private csgCache = new Map<string, THREE.BufferGeometry>();
  
  async reloadModule(path: string) {
    const oldModule = this.modules.get(path);
    
    // Sauvegarder l'état CSG
    if (oldModule?.hasCSG) {
      this.csgCache.set(path, oldModule.geometry);
    }
    
    // Charger le nouveau module
    const newModule = await import(path + '?t=' + Date.now());
    
    // Réutiliser le cache CSG si pas de changement structurel
    if (this.csgCache.has(path) && !this.hasStructuralChange(oldModule, newModule)) {
      newModule.geometry = this.csgCache.get(path);
    }
    
    // Mettre à jour la scène
    this.updateScene(newModule);
  }
}
```

### Optimisations CSG

#### 1. **CSG Lazy Evaluation**
```typescript
class LazyCSG {
  private operations: Array<() => THREE.Mesh> = [];
  private result: THREE.Mesh | null = null;
  
  add(op: () => THREE.Mesh) {
    this.operations.push(op);
    this.result = null; // Invalider le cache
  }
  
  evaluate(): THREE.Mesh {
    if (!this.result) {
      // Calculer seulement quand nécessaire
      this.result = this.computeCSG();
    }
    return this.result;
  }
  
  preview(): THREE.Mesh {
    // Mode preview : boîtes englobantes
    return this.getBoundingBoxMesh();
  }
}
```

#### 2. **CSG Level of Detail**
```typescript
class CSGLod {
  levels: {
    distance: number;
    quality: 'bbox' | 'simple' | 'full';
  }[] = [
    { distance: 100, quality: 'bbox' },
    { distance: 50, quality: 'simple' },
    { distance: 20, quality: 'full' }
  ];
  
  getMesh(distance: number): THREE.Mesh {
    const level = this.levels.find(l => distance > l.distance);
    switch (level?.quality) {
      case 'bbox': return this.boundingBox;
      case 'simple': return this.simplifiedCSG;
      case 'full': return this.fullCSG;
      default: return this.fullCSG;
    }
  }
}
```

## Migration Godot - Plan d'Action

### Phase 1: Préparation (actuel)
- [x] Architecture Node3D compatible
- [x] Système de transforms universel
- [ ] API d'abstraction moteur-agnostique

### Phase 2: Dual Runtime
- [ ] Rendu Three.js (web)
- [ ] Export Godot .tscn
- [ ] Préservation CSG dans export
- [ ] Tests de parité visuelle

### Phase 3: Godot Web Assembly
- [ ] Godot 4 compilé en WASM
- [ ] Rendu Godot natif dans navigateur
- [ ] API unifiée JavaScript
- [ ] Migration progressive des features

### Phase 4: Full Godot (optionnel)
- [ ] Application Godot native
- [ ] GDScript pour logique métier
- [ ] Plugins Godot pour features avancées
- [ ] Multiplayer via Godot networking

## Conclusion

Ce système hybride offre:

### Simplicité (KISS)
1. **Assemblage par défaut** - Primitives comme LEGO
2. **CSG optionnel** - Seulement quand nécessaire
3. **Hot reload** - Feedback instantané
4. **Code lisible** - Déclaratif et clair

### Puissance (Quand Nécessaire)
1. **Opérations booléennes** - Trous, découpes, unions
2. **Export préservé** - CSG natif dans Godot
3. **Optimisations** - Cache, LOD, lazy evaluation
4. **Migration future** - Vers Godot sans refactoring

### Compatibilité
1. **Three.js** - Rendu web performant
2. **Godot** - Export natif avec CSG
3. **GLTF** - Standard universel
4. **Architecture agnostique** - Facile à porter

Le développeur commence simple avec des primitives, peut progressivement utiliser CSG pour des besoins complexes, tout en gardant la compatibilité avec Godot pour une migration future. **Simple par défaut, Puissant si nécessaire, Toujours Compatible.**