# Test de la Physique Émergente Pure 🎯

## Principe Testé

**AUCUN script de comportement** - Le kite réagit UNIQUEMENT par physique émergente :

1. **Vent** → pousse sur les surfaces selon géométrie
2. **Lignes** → contraignent la position + génèrent forces si tendues  
3. **Barre** → modifie angle → change positions poignets → asymétrie lignes
4. **Résultat** → rotation émergente naturelle

## Tests à Effectuer

### Test 1: Contrôle Émergent
```
1. Lancer la simulation (simulation.html)
2. Appuyer sur FLÈCHE GAUCHE
3. Observer: Le kite doit pivoter vers la GAUCHE automatiquement
4. Relâcher: Le kite doit revenir au centre

PHYSIQUE GÉOMÉTRIQUE ÉMERGENTE:
- Flèche gauche → barre tourne → poignées se déplacent dans l'espace world
- Nouvelles distances géométriques : kite ↔ poignée gauche, kite ↔ poignée droite
- Si distance > 15m → ligne tendue → force proportionnelle vers poignée
- Asymétrie des distances → asymétrie des forces → couple émergent → rotation naturelle
```

### Test 2: Réponse au Vent
```
1. Dans l'interface: Changer direction du vent (0° à 90°)
2. Observer: Le kite doit se réorienter naturellement
3. Augmenter vitesse du vent (18 à 35 km/h)
4. Observer: Le kite doit voler plus activement

PHYSIQUE ÉMERGENTE:  
- Vent change → nouvelles forces sur surfaces
- Asymétrie naturelle → couple émergent
- Kite se stabilise dans nouvelle orientation
```

### Test 3: Longueur de Lignes
```
1. Réduire longueur lignes (15m → 10m) avec le slider
2. Observer: Le kite doit être "tiré" plus près
3. Augmenter longueur (10m → 20m)  
4. Observer: Le kite peut s'éloigner davantage

PHYSIQUE ÉMERGENTE:
- Longueur change → nouvelles contraintes géométriques
- Position émergente à l'intersection des sphères
- Pas de téléportation - mouvement naturel
```

### Test 4: Lignes Tendues/Molles
```
1. Observer les infos debug (tensions des lignes)
2. Bouger la barre: une ligne se tend, l'autre se détend
3. Vérifier que seules les lignes TENDUES génèrent des forces

PHYSIQUE ÉMERGENTE:
- Ligne molle → aucune force (pivot libre)
- Ligne tendue → force proportionnelle à l'extension
- Couple émerge de l'asymétrie gauche/droite
```

## Indicateurs de Succès ✅

**Rotation Émergente:**
- Flèche gauche → kite tourne à gauche (sans script)
- Flèche droite → kite tourne à droite (sans script)
- Réponse proportionnelle à l'amplitude du contrôle

**Stabilité Naturelle:**
- Kite trouve une position d'équilibre dans le vent
- Oscille naturellement autour de l'équilibre
- Répond aux changements de vent

**Forces Réalistes:**
- Tension lignes visible dans debug
- Asymétrie gauche/droite détectable
- Forces cohérentes avec les positions

## Commandes de Test

```bash
# Ouvrir la simulation
start simulation.html

# Dans la console browser (F12):
testLineConstraints()      # Test unique des contraintes
continuousTest()          # Test continu 5 secondes  
```

## Résultat Attendu 🎯

Le kite doit se comporter comme un **vrai cerf-volant** :
- Réagit naturellement au contrôle de la barre
- Se positionne dans le vent selon sa géométrie  
- Mouvements fluides et réalistes
- **AUCUN comportement scripté détectable**

Si le kite répond aux commandes par pure physique émergente, le test est **RÉUSSI** ! 🚀