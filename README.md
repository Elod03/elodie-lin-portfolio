# Elodie Lin — portfolio

Mon portfolio de développeuse web : une piscine vue de dessus, dessinée en WebGL, où mes projets flottent comme des objets. On les touche pour les ouvrir.

**Pages :**
- **Accueil :** la piscine et ses objets.
- **Projets :** les fiches de StreamFlix, YORU, Kanpai et Carnival 17.
- **À propos :** une bande qui défile de côté sur ordinateur.
- **Playground :** six petits jeux faits main.
- **Livre d'or :** les messages des visiteurs flottent sur l'eau.

Le site existe en français, en anglais et en chinois.

## Technique

- **React 19 + TypeScript strict**, compilé avec **Vite**.
- **three.js** piloté à la main : simulation de l'eau, caustiques, objets 3D, mode nuit selon l'heure de Paris et pluie réelle.
- **Pré-rendu de chaque page** (24 routes) pour le référencement et les visiteurs sans JavaScript, avec balises Open Graph, JSON-LD, sitemap et hreflang.
- **CV PDF généré au build** à partir du contenu du site (pdfkit), lisible par les logiciels de tri (ATS).
- **Tests :** Vitest pour la logique, le contenu et le CV ; Playwright pour les parcours, le mobile et le rendu GPU.

## Lancer le projet

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ : site pré-rendu + CV
npm test             # tests unitaires (Vitest)
npx playwright test  # parcours navigateur (après npm run build)
```

Avant un build de production, définir `SITE_ORIGIN` avec l'adresse finale du site, par exemple `SITE_ORIGIN=https://exemple.vercel.app npm run build`.

## Contact

[LinkedIn](https://www.linkedin.com/in/elodie-lin-b36918253) · [GitHub](https://github.com/Elod03)
