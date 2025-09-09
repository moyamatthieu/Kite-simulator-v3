# V10 - Modules de Simulation

Ce dossier contient les modules originaux de la SimulationV10, séparés pour une architecture modulaire.

## Fichiers

- `aerodynamics.ts` - Calcul des forces aérodynamiques
- `constraints.ts` - Contraintes physiques
- `control.ts` - Contrôle simple de la barre
- `control_bar.ts` - Barre de contrôle 3D
- `debug.ts` - Vecteurs de debug colorés
- `engine.ts` - Moteur physique principal
- `environment.ts` - Sol, ciel et ambiance
- `history.ts` - Historique de vol
- `input.ts` - Gestion des entrées utilisateur
- `lines.ts` - Système de lignes
- `pilot.ts` - Représentation 3D du pilote
- `render.ts` - Gestion du rendu Three.js
- `wind.ts` - Génération du vent réaliste

## Architecture Simple

La simulation principale (`../simulation.ts`) contient tout en un seul fichier pour simplicité.
Ces modules sont disponibles pour référence ou futures versions modulaires.