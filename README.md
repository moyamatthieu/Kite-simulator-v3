# 🎨🪁 CAO Paramétrique + Simulation Cerf-volant

Projet DIY simple : Modélisation 3D paramétrique + Simulation physique de cerf-volant.

## 🚀 Utilisation Ultra-Simple

```bash
# Installation
npm install

# Développement
npm run dev

# Build
npm run build
```

## 📱 2 Pages, Point Final

### 🎨 [index.html](http://localhost:3000) - CAO Paramétrique
- Modélisation 3D avec objets paramétriques
- Export vers Godot (.tscn) et OBJ
- Hot reload des objets
- Interface épurée

### 🪁 [simulation.html](http://localhost:3000/simulation.html) - Simulation V10
- Physique émergente pure du cerf-volant
- Interface KISS avec contrôles essentiels
- Vent réaliste avec turbulences
- Debug visuel des forces

## 🌿 Gestion des Versions avec Git

### Branches
- `main` : Version stable CAO + Simulation V10
- `v8-stable` : Backup simulation V8
- `cao-only` : CAO pur sans simulation
- `experimental` : Nouvelles features

### Workflow
```bash
# Travailler sur une nouvelle version
git checkout -b v11-experimental
# ... développement
git commit -m "feat: nouvelle physique V11"

# Version stable
git checkout main
git merge v11-experimental  # si stable
```

## 📁 Architecture KISS

```
/
├── index.html           # 🎨 CAO
├── simulation.html      # 🪁 Simulation
├── src/
│   ├── main.ts         # App CAO
│   ├── core/           # Système 3D de base
│   ├── objects/        # Objets 3D (auto-découverts)
│   ├── simulation/
│   │   └── simulationV10.ts  # Simulation actuelle
│   └── ...
```

## 🎯 Créer un Nouvel Objet

```typescript
// src/objects/MonObjet.ts
import { StructuredObject } from '@core/StructuredObject';

export class MonObjet extends StructuredObject {
    constructor(params = {}) {
        super("Mon Objet");
        this.init(); // IMPORTANT !
    }
    
    protected definePoints(): void {
        this.setPoint('center', [0, 0, 0]);
    }
    
    protected buildStructure(): void {
        // Votre logique ici
    }
}
```

Pas besoin d'enregistrement - l'AutoLoader découvre tout automatiquement ! 🎉

## 🎮 Compatible Godot

- Export direct .tscn
- Points anatomiques → Node3D
- Architecture compatible
- Migration facile

## 📝 Conventions

- **Français** : Communication en français
- **KISS** : Keep It Simple, Stupid
- **Git Branches** : Versions via branches
- **Hot Reload** : Modifications instantanées
- **No Loader** : Chargement direct des pages

---

**Philosophie** : Simple, efficace, sans sur-ingénierie ! 🎯