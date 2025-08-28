# 🪁 Physique de Vol du Cerf-volant - Documentation Technique

## Vue d'Ensemble

Ce document détaille la physique émergente pure implémentée dans la simulation de cerf-volant. La simulation transforme le vent horizontal en mouvement omnidirectionnel sur une sphère invisible définie par la longueur des lignes.

## 🎯 Principe Fondamental : Le Cerf-volant comme Convertisseur d'Énergie

### Transformation de Base

```
Vent horizontal → Pression sur surfaces → Forces 3D → Mouvement sphérique
      →                    ↓                   ↓              ↗ ↑ ↘
                     (4 triangles)        (émergentes)    (omnidirectionnel)
```

Le cerf-volant ne "vole" pas comme un avion. Il **convertit** l'énergie cinétique du vent horizontal en mouvement complexe sur une sphère dont le rayon est défini par la longueur des lignes.

### Cascade de Conversion d'Énergie

```
1. Énergie cinétique du vent (majoritairement horizontale)
                    ↓
2. Pression dynamique sur 4 surfaces triangulaires inclinées
                    ↓
3. Forces perpendiculaires aux surfaces (directions variées)
                    ↓
4. Accélération 3D du cerf-volant
                    ↓
5. Mouvement contraint sur la sphère (glissement tangentiel)
                    ↓
6. Patterns de vol complexes (boucles, huit, spirales)
```

## 📐 Architecture Physique Détaillée

### 1. Géométrie du Cerf-volant

#### Points Anatomiques (coordonnées locales en mètres)
```typescript
NEZ           = [0,     0.65,  0]      // Point avant haut
SPINE_BAS     = [0,     0,     0]      // Base centrale
BORD_GAUCHE   = [-0.825, 0,    0]      // Extrémité gauche
BORD_DROIT    = [0.825,  0,    0]      // Extrémité droite
WHISKER_GAUCHE = [-0.4125, 0.1, -0.15] // Stabilisateur gauche
WHISKER_DROIT  = [0.4125,  0.1, -0.15] // Stabilisateur droit
CTRL_GAUCHE   = [-0.15,  0.3,  0.4]    // Point d'attache ligne gauche
CTRL_DROIT    = [0.15,   0.3,  0.4]    // Point d'attache ligne droite
```

#### Les 4 Surfaces Triangulaires
```
Surface 1 (gauche haute) : NEZ - BORD_GAUCHE - WHISKER_GAUCHE    (0.23 m²)
Surface 2 (gauche basse) : NEZ - WHISKER_GAUCHE - SPINE_BAS      (0.11 m²)
Surface 3 (droite haute) : NEZ - BORD_DROIT - WHISKER_DROIT      (0.23 m²)
Surface 4 (droite basse) : NEZ - WHISKER_DROIT - SPINE_BAS       (0.11 m²)
                                                    Total : 0.68 m²
```

### 2. Calcul des Forces Aérodynamiques

#### Formule de Base pour Chaque Surface
```typescript
// Pour chaque surface triangulaire :
1. Calculer la normale locale (produit vectoriel)
   normale_locale = (v2 - v1) × (v3 - v1)
   
2. Transformer en coordonnées monde
   normale_monde = normale_locale * rotation_kite
   
3. Calculer l'angle d'incidence
   cos_angle = max(0, vent_direction · normale_monde)
   
4. Calculer la pression dynamique
   pression = 0.5 * ρ_air * vitesse_vent²
   
5. Force sur la surface
   force = normale_monde * (pression * aire * cos_angle)
```

#### Propriétés Importantes
- **Forces non-alignées** : Les forces ne sont PAS parallèles au vent
- **Direction émergente** : La force suit la normale de chaque surface
- **Pas de coefficients** : Pas de Cl/Cd artificiels, physique pure
- **Angle dièdre naturel** : Les whiskers à Z=-0.15 créent l'angle d'attaque

### 3. Contrainte de Distance (Lignes comme Cordes)

#### Implémentation de la Contrainte Stricte
```typescript
distance = kite_position - pilot_position

if (distance > line_length) {
    // 1. Projeter sur la sphère limite
    direction = (kite_position - pilot_position).normalize()
    kite_position = pilot_position + direction * line_length * 0.99
    
    // 2. CRUCIAL : Annuler la composante radiale de vitesse
    radial_velocity = velocity · direction
    if (radial_velocity > 0) {  // S'éloigne du pilote
        velocity = velocity - direction * radial_velocity
    }
}
```

#### Décomposition de la Vitesse
```
Vitesse totale = Vitesse radiale + Vitesse tangentielle
                      ↓                    ↓
                (supprimée si > 0)    (conservée)
```

Cette contrainte transforme le cerf-volant en un objet qui **glisse** sur une sphère invisible.

### 4. Système de Contrôle par Rotation de Barre

#### Mécanisme de Contrôle
```typescript
// Rotation de la barre → Couple sur le cerf-volant
if (abs(bar_rotation) > 0.01) {
    kite_up = [0, 1, 0] * kite.quaternion
    torque = kite_up * (bar_rotation * control_factor)
}
```

#### Effets en Cascade
1. **Rotation barre** → Couple appliqué au kite
2. **Couple** → Changement d'orientation
3. **Nouvelle orientation** → Surfaces différemment exposées au vent
4. **Forces modifiées** → Nouvelle trajectoire

## 🌬️ Dynamique du Vent

### Vent Apparent
```typescript
vent_apparent = vent_réel - vitesse_kite
```

Le vent "ressenti" par le cerf-volant dépend de son propre mouvement, créant une boucle de rétroaction complexe.

### Turbulences
```typescript
// Turbulence cohérente (pseudo-Perlin noise via sinusoïdes)
turbulence_x = sin(time * freq) * intensity
turbulence_y = sin(time * freq * 1.3) * intensity * 0.2
turbulence_z = cos(time * freq * 0.7) * intensity
```

## 🎮 Régimes de Vol

### 1. Vol Stationnaire (Équilibre)
- **Condition** : Portance = Poids + Composante verticale tension
- **Position** : Généralement au centre de la fenêtre
- **Vitesse** : Minimale, juste assez pour maintenir la portance

### 2. Montée (Edge of Window)
- **Mécanisme** : Surfaces "mordent" le vent avec angle optimal
- **Forces** : Composante verticale > poids
- **Trajectoire** : Arc montant le long du bord de la fenêtre

### 3. Plongée (Power Dive)
- **Déclencheur** : Rotation rapide de la barre
- **Dynamique** : Gravité + traînée → accélération vers le bas
- **Vitesse** : Maximale en bas de la fenêtre

### 4. Boucles (Loops)
- **Initiation** : Rotation continue de la barre
- **Conservation** : Moment angulaire maintient la rotation
- **Rayon** : Dépend de la vitesse et du couple appliqué

## 📊 Paramètres Physiques Critiques

### Constantes Physiques
```typescript
CONFIG = {
    physics: {
        gravity: 9.81,           // m/s²
        airDensity: 1.225,       // kg/m³ au niveau mer
        deltaTimeMax: 0.016,     // 60 FPS max
        angularDamping: 0.95,    // Amortissement rotation
        linearDamping: 0.98      // Friction air
    },
    kite: {
        mass: 0.28,              // kg - Masse totale
        area: 0.68,              // m² - Surface totale
        inertia: 0.015,          // kg·m² - Moment d'inertie
        minHeight: 1.0           // m - Hauteur min (sol)
    },
    lines: {
        defaultLength: 15,       // m - Longueur standard
        controlFactor: 300       // N·m/rad - Sensibilité contrôle
    }
}
```

### Garde-fous (Limites de Sécurité)
```typescript
MAX_FORCE = 1000         // N - Force maximale
MAX_VELOCITY = 30        // m/s - Vitesse maximale
MAX_ANGULAR_VEL = 5      // rad/s - Vitesse angulaire max
MAX_ACCELERATION = 50    // m/s² - Accélération max
MAX_ANGULAR_ACC = 20     // rad/s² - Accélération angulaire max
```

## 🔄 Boucle de Simulation

### Séquence d'Exécution par Frame
```
1. INPUT
   ├── Lecture rotation barre cible
   └── Interpolation rotation actuelle

2. VENT
   ├── Calcul vent de base
   ├── Ajout turbulences
   └── Calcul vent apparent (vent - vitesse_kite)

3. FORCES AÉRODYNAMIQUES
   ├── Pour chaque surface triangulaire :
   │   ├── Calcul normale en coordonnées monde
   │   ├── Calcul angle incidence avec vent
   │   ├── Calcul force = normale * pression * aire * cos(angle)
   │   └── Accumulation force et couple
   └── Ajout couple de stabilisation

4. FORCES MÉCANIQUES
   ├── Gravité = [0, -m*g, 0]
   ├── Couple contrôle = rotation_barre * facteur
   └── Somme forces et couples

5. INTÉGRATION PHYSIQUE
   ├── Accélération = Force / masse
   ├── Vitesse += Accélération * dt
   ├── Position += Vitesse * dt
   └── Application contrainte distance

6. CONTRAINTE SPHÉRIQUE
   ├── Si distance > longueur_ligne :
   │   ├── Projeter position sur sphère
   │   └── Annuler composante radiale vitesse
   └── Hauteur minimale (sol)

7. ROTATION
   ├── Accélération angulaire = Couple / inertie
   ├── Vitesse angulaire += Acc. angulaire * dt
   └── Quaternion *= rotation_delta

8. RENDU
   ├── Mise à jour position 3D
   ├── Mise à jour lignes (caténaire)
   └── Debug vectors si activé
```

## 💡 Insights Physiques Clés

### Pourquoi le Cerf-volant Vole

1. **Angle d'attaque naturel** : Les whiskers créent un angle dièdre qui force une incidence avec le vent
2. **Brides avant** : Les points d'attache à Z=0.4 créent un moment qui redresse le kite face au vent
3. **Surfaces asymétriques** : La répartition 2/3 avant, 1/3 arrière stabilise l'orientation
4. **Contrainte sphérique** : Force la conversion du vent horizontal en mouvement 3D

### Différences avec un Avion

| Avion | Cerf-volant |
|-------|-------------|
| Avance dans sa direction | Peut reculer, glisser latéralement |
| Portance perpendiculaire aux ailes | Forces perpendiculaires aux surfaces |
| Vitesse propre génère portance | Vent relatif génère les forces |
| Trajectoire libre | Contraint sur une sphère |
| Contrôle par surfaces mobiles | Contrôle par rotation globale |

### La "Fenêtre de Vent"

```
        Vue de face (pilote)
              ZÉNITH
                ↑
                │
     ┌─────────────────────┐
     │          │          │
     │   Bord   │   Bord   │
     │  gauche  │  droit   │
     │          │          │
     │    CENTRE POWER     │
     │    (max forces)     │
     │          │          │
     └─────────────────────┘
                ↓
              CRASH ZONE
```

- **Centre** : Vent direct, forces maximales, vol rapide
- **Bords** : Vent tangentiel, le kite "grimpe" lentement
- **Zénith** : Position instable, équilibre précaire
- **Base** : Zone dangereuse, risque de crash

## 🐛 Debug et Diagnostic

### Indicateurs Clés à Surveiller

1. **Distance** : Doit rester ≤ longueur_ligne
2. **Vitesse radiale** : Doit être ≤ 0 quand distance = max
3. **Forces totales** : Ne doivent pas exploser (< 1000N)
4. **Position** : Pas de NaN, dans les limites raisonnables
5. **Tension lignes** : "TENDUE" ou "MOLLE" selon distance

### Logs Périodiques (toutes les 60 frames)
```
📊 [Frame X] Distance: X.Xm/15m | Pos: [X, Y, Z] | Vel: X.Xm/s | AngVel: X.Xrad/s
```

## 🚀 Optimisations Futures Possibles

1. **Déformation dynamique** : Surfaces qui se déforment sous la pression
2. **Élasticité des lignes** : Légère élasticité pour plus de réalisme
3. **Effets de sol** : Modification du vent près du sol
4. **Multi-kites** : Interaction entre plusieurs cerfs-volants
5. **Conditions météo** : Gradient de vent, cisaillement

## 📚 Références

- Physique des fluides : Équation de Bernoulli, pression dynamique
- Mécanique du vol : Forces aérodynamiques, stabilité
- Dynamique des corps rigides : Quaternions, moment d'inertie
- Théorie des contraintes : Contraintes holonomes, multiplicateurs de Lagrange

---

*Ce document est la référence technique pour comprendre et maintenir la simulation physique du cerf-volant. La physique est 100% émergente, sans coefficients artificiels ni "trucs magiques".*