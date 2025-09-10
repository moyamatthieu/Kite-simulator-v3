# 🪁 Kite Simulator V1

**Simulateur de cerf-volant avec physique réaliste et émergente**

Un projet de simulation physique avancé développé en TypeScript et Three.js, offrant une expérience de vol de cerf-volant ultra-réaliste basée sur de véritables principes aérodynamiques.

## ✨ Fonctionnalités

### 🔬 Physique Émergente Pure
- **Zéro coefficient artificiel** - Physique 100% authentique
- **4 surfaces triangulaires** avec calculs aérodynamiques par face
- **Position-Based Dynamics (PBD)** pour les contraintes de lignes
- **Lissage temporel** anti-oscillations
- **Effet d'extrados** (Venturi) pour réalisme avancé

### 🎮 Contrôles Intuitifs
- **Flèches directionnelles** ou **Q/D** : piloter la barre de contrôle
- **Physique géométrique** : rotation barre → nouvelles distances → nouvelles forces
- **Réponse émergente** : le kite réagit naturellement aux inputs

### 🔍 Debug Avancé
- **Visualisation forces** : vecteurs colorés en temps réel
- **Métriques V8** : position fenêtre, vitesses, tensions, etc.
- **Légende interactive** : compréhension des forces physiques
- **Console détaillée** : logs toutes les 60 frames

### 🌪️ Simulation Météo
- **Vent configurable** : vitesse, direction, turbulence
- **Vent apparent** calculé dynamiquement
- **Conditions réalistes** jusqu'à 300 km/h

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation
```bash
# Cloner le projet
cd kite-sim-v1

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Le simulateur sera disponible sur `http://localhost:3000`

### Scripts Disponibles
```bash
npm run dev        # Serveur de développement avec HMR
npm run build      # Build de production
npm run preview    # Prévisualiser le build
npm run typecheck  # Vérification TypeScript
npm run clean      # Nettoyer les caches
```

## 🏗️ Architecture

### Structure du Projet
```
src/
├── core/           # Configuration et constantes physiques
├── objects/        # Kite avec géométrie et KiteGeometry
├── physics/        # Moteur physique, aérodynamique, PBD
├── ui/             # Interface utilisateur compacte
├── utils/          # Utilitaires debug et historique
├── main.ts         # Point d'entrée principal
├── SimulationApp.ts # Application principale
└── style.css       # Styles globaux
```

### Technologies
- **TypeScript 5.3+** : Typage strict et moderne
- **Three.js 0.160** : Rendu 3D performant
- **Vite 5.4** : Build ultra-rapide avec HMR
- **ES Modules** : Imports modernes

### Alias d'Imports
```typescript
import { Kite } from '@objects/Kite';           // src/objects/
import { CONFIG } from '@core/constants';       // src/core/
import { WindSimulator } from '@physics/WindSimulator'; // src/physics/
import { CompactUI } from '@ui/CompactUI';       // src/ui/
import { debug } from '@utils/debug';            // src/utils/
```

## 🔧 Configuration

### Paramètres Physiques (src/core/constants.ts)
```typescript
// Limites de sécurité ajustées pour stabilité
MAX_ACCELERATION: 500      // m/s² - évite coupures abruptes
MAX_ANGULAR_VELOCITY: 15   // rad/s - moins d'oscillations
FORCE_SMOOTHING: 0.25      // 75% nouvelle force appliquée

// Contraintes PBD assouplies
LINE_CONSTRAINT_TOLERANCE: 0.02  // 2cm tolérance
dampingFactor: 0.7               // 30% correction PBD
```

### Géométrie Kite (src/objects/Kite.ts)
```typescript
// Points anatomiques exacts en mètres
NEZ: [0, 0.65, 0]                    // Pointe haute
BORD_GAUCHE: [-0.825, 0, 0]          // Extrémité aile gauche
WHISKER_GAUCHE: [-0.4125, 0.1, -0.15] // Stabilisateur Z=-0.15
CTRL_GAUCHE: [-0.15, 0.3, 0.4]       // Attache ligne (devant)
```

## 🎯 Contrôles Avancés

### Interface Debug
- **Mode Debug** : Affiche tous les vecteurs de force
- **Légende temps réel** : Identification des forces par couleur
- **Métriques V8** : Console avec données physiques complètes

### Paramètres Configurables
- **Vitesse vent** : 1-300 km/h
- **Direction vent** : 0-360°
- **Turbulence** : 0-100%
- **Longueur lignes** : 5-50m
- **Coefficient portance** : 0-20x

## 🐛 Résolution des Oscillations

Version V1 inclut les corrections d'oscillations :

### Problèmes Corrigés
✅ **Accélérations excessives** (6000+ m/s²)  
✅ **Violations requestAnimationFrame** (60-84ms)  
✅ **Oscillations position** (Y:23° ↔ Y:59°)  
✅ **Forces asymétriques** faces 0&2 vs 1&3  
✅ **Géométrie désynchronisée** visuel ≠ physique  

### Solutions Appliquées
- Limites physiques ajustées (MAX_ACCELERATION: 150→500 m/s²)
- Lissage temporel renforcé (FORCE_SMOOTHING: 0.15→0.25)
- Amortissement augmenté (linearDamping: 0.96→0.98)  
- Contraintes PBD assouplies (tolérance: 0.5mm→2cm)
- Géométrie KiteGeometry synchronisée parfaitement

## 🧪 Tests et Validation

### Tests Physiques
- **Émergence** : Utiliser ← → pour tester forces asymétriques
- **Détection stall** : Observer ratios distance et warnings
- **Visualisation force** : Mode debug pour voir tous vecteurs
- **Réponse vent** : Tester différentes vitesses/directions
- **Tensions lignes** : Vérifier contraintes géométriques

### Métriques Clés
- **Performance** : 60fps avec debug activé
- **Forces** : Vérifier valeurs n'excédant pas limites
- **Distance ratios** : Maintenir ≤101% satisfaction contraintes
- **Réponse contrôle** : Rotation émergente depuis input barre

## 📈 Roadmap

### Version 1.1 Prévue
- [ ] Export replay de vol
- [ ] Multiples modèles de kites
- [ ] Terrain 3D avec obstacles
- [ ] Mode multijoueur

### Version 2.0 Vision
- [ ] Migration Godot Engine
- [ ] VR/AR support
- [ ] IA pilotage automatique
- [ ] Compétitions en ligne

## 🤝 Contribution

Ce projet est développé avec [Claude Code](https://claude.ai/code) dans une approche de collaboration humain-IA.

### Standards Code
- **TypeScript strict** : Typage obligatoire
- **Imports alias** : Utiliser @core, @objects, etc.
- **Commentaires français** : Code anglais, commentaires français
- **Physics-first** : Physique émergente uniquement

## 📄 Licence

MIT License - Libre d'utilisation pour projets personnels et commerciaux.

---

**🪁 Kite Simulator V1** - *Là où la physique rencontre l'art du vol*

Développé avec passion pour la simulation réaliste et l'émergence naturelle.