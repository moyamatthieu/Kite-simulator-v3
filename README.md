# 🪁 Kite Simulator Project - Simulation Physique Avancée

**Projet de simulation de cerf-volant avec physique émergente et architecture modulaire**

## 🎯 **Focus Principal : Simulation Réaliste**

Ce projet est maintenant **centré sur la simulation physique** avec une architecture propre et indépendante.

### 🚀 **Projet Principal : kite-sim-v1**

**Simulateur de cerf-volant V1** - Architecture propre et moderne
- **Location** : `kite-sim-v1/`
- **Tech Stack** : TypeScript + Three.js + Vite  
- **Physique** : Émergente 100% - Position-Based Dynamics
- **Interface** : Debug avancé avec visualisation forces

```bash
cd kite-sim-v1
npm install
npm run dev    # http://localhost:3001
```

## ⚡ **Démarrage Simulation**

```bash
# 1. Aller dans le projet simulation  
cd kite-sim-v1

# 2. Installer et lancer
npm install
npm run dev

# 3. Ouvrir http://localhost:3001
```

### 🎮 **Contrôles Simulation**
- **← → ou Q/D** : Piloter la barre de contrôle
- **Espace** : Toggle mode debug  
- **Interface** : Configuration vent, longueur lignes, etc.

## 📁 **Architecture Repository**

### 🎮 **kite-sim-v1/** - Simulation Indépendante
- ✅ **Projet principal** - Simulation pure
- ✅ **Architecture modulaire** avec alias `@core`, `@physics`, etc.
- ✅ **Physique V8** intégrée avec corrections oscillations
- ✅ **Documentation complète** - README dédié
- ✅ **Configuration optimisée** - Vite + TypeScript

### 📦 **src/simulation/** - Source Original  
- 📚 Code source de référence
- 🔄 Base pour développement kite-sim-v1
- 🗃️ Maintenu pour historique

### 📋 **archive-legacy/** - Fichiers CAO Archivés
- 🗂️ Interfaces HTML CAD (cao.html, debug-scene.html)  
- 📖 Documentation legacy (CAO_DESIGN_V2.md, AGENTS.md)
- 🖼️ Assets anciens (screenshots, configs)

## 🌿 **Gestion des Versions avec Git**

### Branches Actuelles
- `simV1` : **Branche active** - Projet simulation indépendant
- `v13` : Développement précédent avec corrections
- `main` : Version stable de référence  

### Workflow Focus Simulation
```bash
# Développement simulation
git checkout simV1
cd kite-sim-v1
npm run dev

# Features nouvelles
git checkout -b simV1-feature-terrain
# ... développement dans kite-sim-v1/
git commit -m "feat: terrain 3D avec obstacles"
```

## 🔬 **Fonctionnalités Simulation**

### ⚡ **Physique Émergente**
- **Zéro coefficient artificiel** - Physique pure 100%
- **4 surfaces triangulaires** avec forces par face
- **Position-Based Dynamics** pour contraintes lignes
- **Corrections oscillations** appliquées

### 🌪️ **Environnement Réaliste**  
- **Vent configurable** : 1-300 km/h
- **Turbulence** : Conditions météo variables
- **Aérodynamique** : Calculs par triangle de tissu

### 🔍 **Debug Avancé**
- **Vecteurs forces** : Visualisation temps réel
- **Métriques V8** : Position, vitesses, tensions
- **Console détaillée** : Logs physiques complets

## 📖 **Documentation**

- **kite-sim-v1/README.md** - Guide complet simulation
- **CLAUDE.md** - Instructions développement général  
- **archive-legacy/** - Documentation CAO archivée

---

**🪁 Kite Simulator Project** - *Simulation Physique de Nouvelle Génération*

**Focus actuel** : `kite-sim-v1/` - Projet simulation indépendant et moderne