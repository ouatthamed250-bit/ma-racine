@AGENTS.md

---
## Règles de travail Ma Racine

- Après chaque tâche confirmée : commit + push automatique, puis fournir
  un bloc récapitulatif encadré en ``` contenant : statut du build,
  `git log --oneline`, `git status --short`, liste des fichiers modifiés.
- Ne jamais considérer un ajustement visuel comme résolu sur la seule foi
  d'un "le build passe" — toujours une vraie vérification : capture
  d'écran réelle, ou mesure `getBoundingClientRect()`/`getComputedStyle()`
  dans un vrai navigateur.
- Toujours vérifier quelle image de fond est réellement chargée
  (`CITY_BACKGROUNDS[n]`) avant d'appliquer des coordonnées dessus —
  erreur déjà commise une fois (confusion Abidjan/Accra).
- Voir docs/map-city-junction-pattern.md pour les points techniques déjà
  validés sur les jonctions entre cartes de villes — ne pas les
  redécouvrir.
---

