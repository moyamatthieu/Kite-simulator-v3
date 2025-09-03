# Repository Guidelines

## Structure du Projet & Organisation
- Code source dans `src/` avec zones clés :
  - `src/core/`, `src/renderer/`, `src/export/`, `src/objects/`, `src/simulation/`, `src/ui/`.
- Pages publiques : `index.html`, `simulation.html` (multi‑page via Vite).
- Sortie de build dans `dist/`. Documentation dans `docs/`.
- Alias de chemins dans `vite.config.ts` et `tsconfig.json` (ex. `@core/*`, `@objects/*`). Si vous ajoutez des dossiers, mettez à jour les deux fichiers.

## Compilation, Tests et Développement
- `npm install` : installe les dépendances.
- `npm run dev` : lance le serveur Vite (port 3000, ouverture auto).
- `npm run build` : build de production vers `dist/` (entrées multiples).
- `npm run preview` : sert localement le build.
- Vérification de types : `npx tsc --noEmit`.

## Style de Code & Conventions de Nommage
- Langage : TypeScript en mode strict, modules ESM.
- Indentation : 2 espaces; code typé, clair et concis.
- Noms : `PascalCase` pour classes/fichiers (ex. `ParametricTable.ts`), `camelCase` pour variables/fonctions, `UPPER_SNAKE_CASE` pour constantes.
- Imports : privilégier les alias (ex. `@core/Primitive`) et éviter les chemins relatifs profonds.
- Garder les objets autonomes dans `src/objects/` et les référencer via `src/objects/index.ts` ou le registre approprié.

## Lignes Directrices de Test
- Pas de test runner formel pour l’instant. Valider de manière interactive :
  - `npm run dev`, ouvrir la page et utiliser l’UI pour inspecter la géométrie.
  - Utiliser `diagnostic-cad.js` dans la console (`diagnosticCAD()`) pour lister les objets, tailles et état de la caméra.
- Scripts d’appoint possibles (ex. `validate-cube.js`). Les garder ESM et compatibles navigateur.

## Commits & Pull Requests
- Suivre Conventional Commits (vus dans l’historique) : `feat: …`, `fix: …`, `docs: …`, portée optionnelle (ex. `feat(simulation): …`). Messages impératifs et concis.
- Les PRs doivent inclure :
  - Description claire, motivation, captures/anim GIF si visuel.
  - Issues liées, docs mises à jour (`README.md`, `src/factories/FACTORIES.md`) et enregistrements nécessaires dans les registres.
  - Mise à jour de `vite.config.ts` (rollupOptions.input) si vous ajoutez une nouvelle page HTML d’entrée.

## Sécurité & Configuration
- Aucun secret requis; éviter les gros assets dans le dépôt.
- Respecter les frontières d’alias pour découpler `renderer`, `core` et `export`.
- Pour de nouveaux modules, considérer la compatibilité export Godot (`src/export/`).
