# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Directives

**ALWAYS communicate in French** when working on this project. All responses, explanations, and comments must be in French.

**NEVER run npm run dev**: The user launches the development server in an external terminal. Claude should never execute this command. Development is done with hot reload.

## Project Overview

This is a dual-purpose 3D modeling and kite simulation project called "CAO Paramétrique" (Parametric CAD). It combines:

1. **3D Object Modeling System**: A parametric CAD system using TypeScript and Three.js
2. **Advanced Kite Physics Simulation**: Sophisticated physics simulation with SimulationV8 integration featuring:
   - **100% Emergent Physics**: No scripted behaviors, pure geometric constraints
   - **Position-Based Dynamics (PBD)**: Advanced constraint solving
   - **Force Visualization**: Real-time debug arrows showing all forces
   - **Temporal Force Smoothing**: Anti-oscillation system
   - **Advanced Safety Validation**: Prevents numerical explosions

## Architecture v3.0 - KISS + Godot Compatible

### Core System (Functional)

The project implements a **StructuredObject + Node3D Pattern** compatible with Godot:

- **Node3D**: Godot-compatible abstraction layer (signals, _ready(), _process(), transform)
- **StructuredObject**: Unified pattern with anatomical points (definePoints → buildStructure → buildSurfaces)
- **ThreeRenderer**: Isolated and modular Three.js renderer
- **GodotExporter**: Automatic export to Godot .tscn files
- **Registry**: Centralized manager for creatable objects
- **AutoLoader**: 🔥 Automatic loading via import.meta.glob

### Architecture Flow

```typescript
// 1. Node3D (Godot-compatible base)
class Node3D extends THREE.Group {
    transform: Transform3D;
    _ready(), _process(), emit_signal(), connect()
}

// 2. StructuredObject (Unified pattern)
class StructuredObject extends Node3D {
    definePoints() → buildStructure() → buildSurfaces()
}

// 3. Concrete objects
class Chair extends StructuredObject implements ICreatable {
    create(): this { return this; }
}

// 4. AutoLoader automatically discovers
// No more manual registration needed!

// 5. Rendering
renderer.setRootNode(await autoLoader.create('chair'));
```

## Development Commands

### Development
```bash
npm install     # Install dependencies
npm run build   # Build for production
npm run preview # Preview production build

# TypeScript checking
npx tsc --noEmit   # Type checking without file emission
```

### Tests and Quality
```bash
npx tsc --noEmit   # Type checking without file emission
npx tsc           # Check TypeScript compilation
```

No test or linting frameworks are currently configured. The project relies on TypeScript's strict mode for quality assurance.

## File Structure

```text
/src/
├── main.ts                 # Main app with ThreeRenderer and AutoLoader
├── simulation.ts          # Stable physics simulation version
├── simulationV2.ts        # Development version for new features
├── core/                  # System core
│   ├── Node3D.ts          # Godot abstraction layer 🎮
│   ├── StructuredObject.ts # Unified object pattern
│   ├── Primitive.ts       # Geometric generators
│   ├── Registry.ts        # Singleton registry (legacy)
│   └── AutoLoader.ts      # 🔥 Automatic loading via import.meta.glob
├── export/                # Exporters
│   ├── GodotExporter.ts   # Godot .tscn export 🎮
│   ├── OBJExporter.ts     # OBJ export for 3D printing
│   └── index.ts          
├── factories/             # Factory patterns
├── objects/               # 📦 All 3D objects (auto-discovered)
│   ├── furniture/         # Furniture
│   ├── mechanical/        # Mechanical objects
│   ├── organic/           # Organic objects (including Kites)
│   ├── shapes/            # Geometric shapes
│   └── index.ts           # No longer used - AutoLoader handles everything
├── renderer/              # Rendering system
│   ├── ThreeRenderer.ts   # Isolated modular renderer 🎨
│   └── index.ts          
├── simulation/            # Kite simulation system
│   ├── simu_V10/         # Latest modular simulation architecture
│   ├── core/             # Core simulation abstractions
│   └── [various versions] # Evolution of simulation physics
└── types/                 # TypeScript definitions
    ├── index.ts           # Main types
    └── vite-env.d.ts      # Vite HMR types
```

## Naming Conventions and Imports

### Naming Conventions
- **Classes**: PascalCase (`Node3D`, `StructuredObject`, `ThreeRenderer`)
- **Interfaces**: PascalCase with `I` prefix (`ICreatable`) or without (`Transform3D`, `Signal`)
- **Methods**:
  - snake_case for Godot compatibility: `_ready()`, `_process()`, `emit_signal()`, `add_child()`
  - camelCase for standard JS methods: `definePoints()`, `buildStructure()`, `setPoint()`
- **Properties**: camelCase (`nodeId`, `nodeType`, `showDebugPoints`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CONFIG`, `VARIANTS`)
- **Types**: PascalCase (`Position3D`, `NamedPoint`, `MaterialConfig`)
- **Files**: PascalCase for classes (`Node3D.ts`, `StructuredObject.ts`)

### Import Aliases

**ALWAYS use aliases** defined in `tsconfig.json` for imports:

```typescript
// ✅ CORRECT - Use aliases
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import { Primitive } from '@core/Primitive';
import { ThreeRenderer } from '@renderer';

// ❌ INCORRECT - Don't use relative paths
import { StructuredObject } from '../core/StructuredObject';
```

**Available aliases**:
- `@core/*`: Core classes (Node3D, StructuredObject, Registry, AppState, Logger, etc.)
- `@types`: TypeScript types and interfaces
- `@renderer`: Rendering system
- `@export`: Exporters (Godot, OBJ, etc.)
- `@ui/*`: User interface (UIManager)
- `@utils/*`: Utilities (RendererUtils, ThreeJSUtils, etc.)
- `@objects/*`: 3D objects by category
- `@factories/*`: Factory patterns
- `@simulation/*`: Kite simulation system

## Creating New Objects v3.0

### Standard Structure

```typescript
// src/objects/[category]/MyObject.ts (or src/objects/MyObject.ts)
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import { Primitive } from '@core/Primitive';

export class MyObject extends StructuredObject implements ICreatable {
    private params = {
        width: 1,
        height: 2,
        color: '#808080'
    };
    
    constructor(customParams = {}) {
        super("My Object");  // Node3D name
        this.params = { ...this.params, ...customParams };
        this.init(); // IMPORTANT: Call init() to build the object
    }
    
    // 🎮 Anatomical points (Godot compatible)
    protected definePoints(): void {
        this.setPoint('center', [0, 0, 0]);
        this.setPoint('top', [0, this.params.height, 0]);
    }
    
    // Rigid structure
    protected buildStructure(): void {
        const box = Primitive.box(this.params.width, this.params.height, 0.1, this.params.color);
        this.addPrimitiveAtPoint(box, 'center');
    }
    
    // Visual details
    protected buildSurfaces(): void {
        // Optional: additional surfaces
    }
    
    // ICreatable interface
    create(): this { return this; }
    getName(): string { return "My Object"; }
    getDescription(): string { return "Description of my object"; }
    getPrimitiveCount(): number { return 1; }
}

// ✨ NO MANUAL REGISTRATION NEEDED!
// AutoLoader automatically detects the file and loads the class
// Class name must match file name (e.g., MyObject.ts → export class MyObject)
```

### Key Points v3.0

1. **Inheritance**: StructuredObject → Node3D → THREE.Group
2. **Pattern**: definePoints() → buildStructure() → buildSurfaces()
3. **Godot**: Anatomical points become child Node3D nodes
4. **Export**: Automatic to .tscn via GodotExporter
5. **Debug**: showDebugPoints to visualize points
6. **Auto-discovery**: No manual registration needed - AutoLoader finds classes automatically
7. **Convention**: Class name must match file name (e.g., `Chair.ts` → `export class Chair`)

## Advanced Kite Simulation System

The project features a sophisticated physics simulation system with **SimulationV8 integration**:

### Main Simulation Files
- **`index.html`**: Default simulation interface (launches SimulationApp.ts)
- **`simulation.html`**: Alternative simulation interface 
- **`test-simulation.html`**: Debug simulation interface
- **`cao.html`**: CAD modeling interface (launches main.ts)
- **`/src/simulation/SimulationApp.ts`**: Main simulation application with V8 enhancements
- **`/src/simulation/simulation.ts`**: Legacy stable physics simulation
- **`/src/main.ts`**: CAD application entry point

### SimulationV8 Integration - Production Ready

The current simulation integrates all advanced features from SimulationV8:

#### V8 Enhanced Architecture

```text
/src/simulation/
├── SimulationApp.ts           # Main app with V8 integration
├── core/
│   ├── constants.ts          # V8 physics constants and geometry
│   └── engine.ts            # Core physics engine
├── physics/
│   ├── AerodynamicsCalculator.ts  # V8-style force calculations
│   ├── PhysicsEngine.ts          # Unified physics orchestration
│   ├── WindSimulator.ts          # Advanced wind with turbulence
│   ├── lines.ts                  # PBD constraint solver
│   └── constraints.ts            # Position-Based Dynamics
├── ui/
│   ├── CompactUI.ts             # Simulation controls
│   ├── control.ts              # Input management
│   └── index.ts                # UI orchestration
└── utils/
    ├── debug.ts                # Force visualization system
    ├── history.ts              # Flight path recording
    └── pilot.ts                # 3D pilot representation
```

#### Advanced Features Integrated

1. **ControlBarManager V8**: Quaternion-based precise control bar rotation
2. **PBD Constraint Solver**: Position-Based Dynamics for line constraints
3. **Temporal Force Smoothing**: Anti-oscillation filter (FORCE_SMOOTHING = 0.15)
4. **Advanced Safety Validation**: MAX_FORCE, MAX_VELOCITY, MAX_ACCELERATION limits
5. **Real-time Debug Visualization**: Color-coded force arrows with legend
6. **Sophisticated Metrics**: V8-style telemetry and warnings system

#### Core Physics Principles

The simulation implements **100% emergent physics** without artificial coefficients:

1. **4 Triangular Surface Force Calculation**
   - Each surface has its own normal (can point in any direction)
   - Force = 0.5 × ρ × V² × Area × cos(angle) in normal direction
   - Forces are NOT necessarily aligned with wind
   - Whiskers at Z=-0.15 create natural dihedral angle

2. **Strict Distance Constraint (Real Rope)**
   - Lines are ropes: hard limit, not springs
   - Only tangential movement is permitted
   - Kite "slides" on invisible sphere

3. **Natural Orientation via Bridles**
   - CTRL_LEFT and CTRL_RIGHT points at Z=0.4 (40cm forward)
   - Create natural straightening moment
   - NO artificial forced inclination

### Debug Force Visualization

The simulation includes a comprehensive force visualization system:

#### Force Vector Legend (Bottom Right)
- **🟢 Vert**: Vitesse du kite (velocity)
- **🟢 Vert clair**: Vent apparent (apparent wind)
- **🔵 Bleu**: Portance aérodynamique (aerodynamic lift)
- **🔴 Rouge**: Traînée aérodynamique (drag)
- **🟠 Orange**: Gravité (gravity)
- **🩷 Rose**: Tension ligne gauche (left line tension)
- **🩷 Rose clair**: Tension ligne droite (right line tension)
- **🟣 Violet**: Couple/rotation (torque/angular velocity)

#### Simulation Controls
- **Left Arrow/Q/A**: Bar rotation left (pull left side)
- **Right Arrow/D**: Bar rotation right (pull right side)
- **Debug Toggle**: Show/hide force vectors and legend
- **UI Controls**: Wind speed, direction, turbulence, line length

#### Advanced Telemetry
The simulation provides real-time metrics including:
- **Window Position**: X°/Y° angles in pilot's reference frame
- **Stall Detection**: Distance ratio warnings (98% = near stall, 101% = stalled)
- **Force Asymmetry**: Left/right line tension imbalance percentage
- **Safety Warnings**: Excessive acceleration, velocity, or angular motion

## Factory System

The project uses a comprehensive factory system for creating 3D objects:

### Available Factories
- **PointFactory**: Management of anatomical points
- **CircularPatternFactory**: Circular patterns (gears, spokes)
- **FrameFactory**: Wire structures (tubes, bars)
- **SurfaceFactory**: Stretched surfaces (canvases, membranes)
- **PyramidFactory**: Geometric pyramids
- **Various furniture factories**: Chairs, tables
- **Mechanical factories**: Gears
- **Shape factories**: Boxes, cubes, spheres
- **KiteFactory**: Parametric kites

### Factory Usage Pattern

```typescript
import { ChairFactory } from '@factories/ChairFactory';

const chairFactory = new ChairFactory();
const chair = chairFactory.createObject({
    seatHeight: 0.45,
    seatColor: '#8B4513',
    legColor: '#654321'
});
```

## Advanced Physics Architecture

### Core Principles

1. **Pure Emergent Physics**: All kite behavior emerges from geometric constraints and physical forces
2. **SimulationV8 Integration**: Production-ready physics with advanced features
3. **Position-Based Dynamics**: Sophisticated constraint solving for realistic line behavior
4. **Temporal Smoothing**: Anti-oscillation systems for stable simulation
5. **Real-time Validation**: Safety systems preventing numerical explosions

### Physics Chain

```typescript
// 1. Input → Control Bar Rotation (geometric)
controlRotation → handlePositions (world space)

// 2. Distance Calculations → Forces (emergent)
distances → lineTensions → asymmetricForces

// 3. Aerodynamics → Wind Forces (physics-based)
apparentWind → liftDrag → aerodynamicTorque

// 4. Force Integration → Motion (Newton's laws)
smoothedForces → acceleration → velocity → position

// 5. Constraint Solving → Position Correction (PBD)
lineConstraints → positionCorrection → orientationCorrection
```

### Key Components Integration

- **ControlBarManager**: Centralized quaternion-based control calculations
- **LineSystem**: PBD solver with geometric constraint enforcement  
- **AerodynamicsCalculator**: V8-style force computation per triangle surface
- **WindSimulator**: Advanced wind with realistic turbulence
- **Debug Visualizer**: Real-time force vector display with color legend

## Development Workflow

### CAD Development
1. User launches `npm run dev` in external terminal
2. Navigate to `http://localhost:3000/cao.html` (or use build's multi-page setup)
3. Edit objects in `/src/objects/[category]/`
4. HMR automatically recompiles via Vite
5. Test with Explode to see anatomical points
6. Export to Godot with dedicated button

### Simulation Development
1. Default simulation: `http://localhost:3000` (index.html → SimulationApp.ts)
2. Alternative simulation: `http://localhost:3000/simulation.html`
3. Debug mode: `http://localhost:3000/test-simulation.html`
4. Force vectors visible when debug enabled
5. Real-time telemetry in console with V8 metrics
6. Interactive controls for wind, line length, etc.

## Migration Paths

### Godot Migration (CAD System)
1. **Node3D API**: Direct mapping to Godot spatial nodes
2. **Transform3D**: Compatible coordinate system  
3. **Signal system**: Godot-like event handling
4. **Export .tscn**: Automatic scene export
5. **Anatomical points**: Map to child Node3D nodes

### Physics Engine Migration
The physics system is designed for potential migration to:
- **Godot Physics**: Node3D structure ready for Godot RigidBody3D
- **External Physics**: Modular design allows engine swapping
- **Web Deployment**: Full Three.js browser compatibility

## Technical Constraints

### Assembly Limits v3.0
- **Named anatomical points** for clear structure
- **No CSG operations** - pure composition
- **Godot compatible** - direct mapping to Node3D
- **Maximum 10-15 primitives** per object for maintainability

### Design Philosophy
- **Simple by default**: Primitives like LEGO blocks
- **Powerful when needed**: CSG operations for complex needs
- **Always compatible**: Easy transition to Godot
- **Developer-first**: Maximum productivity with hot reload

## Performance Considerations

### CAD System Optimization
1. **Object pooling**: For frequently created/destroyed objects
2. **LOD systems**: Level of detail for complex objects
3. **Instancing**: For repeated geometries
4. **Memory management**: Proper disposal with EventBus cleanup

### Physics Simulation Optimization
1. **Temporal Force Smoothing**: Reduces oscillations and improves stability
2. **PBD Dual-Pass Constraints**: Two iterations for better constraint satisfaction
3. **Safety Validation**: Prevents numerical explosions with limits checking
4. **Efficient Debug Rendering**: Arrow cleanup and conditional visualization
5. **Metrics Throttling**: Console logs limited to prevent spam

## Simulation Testing and Validation

### Physics Validation Tests
- **Test Emergent Behavior**: Use arrow keys to test asymmetric forces
- **Stall Detection**: Monitor distance ratios and warnings
- **Force Visualization**: Enable debug mode to see all force vectors
- **Wind Response**: Test different wind speeds and directions
- **Line Tension**: Verify geometric constraints with visual feedback

### Key Metrics to Monitor
- **Frame Performance**: Should maintain 60fps with debug enabled
- **Force Magnitudes**: Check for excessive values triggering warnings
- **Distance Ratios**: Monitor line constraint satisfaction (should stay ≤101%)
- **Control Response**: Verify emergent rotation from bar input

This architecture provides a **sophisticated, production-ready system** combining advanced 3D CAD capabilities with realistic physics simulation, featuring complete SimulationV8 integration and comprehensive debugging tools.