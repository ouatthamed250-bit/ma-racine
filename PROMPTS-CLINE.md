# Prompts pour Cline — Ma Racine

À copier-coller dans Cline, un par un, dans cet ordre. Comme pour BÂTIZEN CI :
un changement à la fois, fichier complet vérifié avant modification, build
confirmé avant chaque commit, `git log` confirmé après chaque push.

---

## 1. Git

```
Initialise un dépôt git dans ce projet si ce n'est pas déjà fait. Crée un
.gitignore adapté à Next.js s'il n'existe pas (node_modules, .next,
.env.local). Fais un premier commit avec l'état actuel du projet. Affiche le
résultat de `git log --oneline` à la fin.
```

---

## 2. PWA installable

```
Configure ce projet Next.js en PWA installable : ajoute un manifest.json
(nom "Ma Racine", icônes placeholder pour l'instant, couleur thème #FFB627
avec fond #2E1F14), et un service worker en stratégie network-first — PAS
cache-first. Sur un précédent projet, un cache-first trop agressif a bloqué
les mises à jour et causé une vraie crise à corriger après coup. Vérifie que
le build passe avant de me montrer le résultat.
```

---

## 3. Firebase (comptes + sauvegarde de progression)

```
Ajoute Firebase à ce projet : Auth pour les comptes joueurs, Firestore pour
sauvegarder score, pièces, et progression sur la carte. Crée
src/lib/firebase.ts qui lit les clés depuis des variables d'environnement
(.env.local, jamais commité). Ajoute une fonction pour sauvegarder l'état du
joueur après chaque niveau terminé et une pour le recharger au démarrage.
Un seul changement à la fois, montre-moi le fichier complet avant de le
modifier.
```

---

## 4. Publicités récompensées — H5 Games Ads (pas AdMob)

```
Intègre Google H5 Games Ads (AdSense, Ad Placement API) pour les publicités
récompensées sur le bouton "Regarder une pub" de la modale de continuation
dans MaRacinePuzzle.tsx. Important : PAS AdMob — AdMob est réservé aux vraies
apps natives et ne fonctionne pas directement dans une PWA/site web. H5 Games
Ads est le produit Google équivalent pour le web. Ça nécessite une validation
de compte AdSense côté Google avant de marcher en prod — en attendant, garde
un mode simulation (comme actuellement, +5 coups direct) derrière une
variable d'environnement.
```

---

## 5. Ajouter des villes

```
Ajoute Dakar (Sénégal) et Ouagadougou (Burkina Faso) au tableau PALETTES
dans MaRacinePuzzle.tsx, en suivant exactement la structure des 3 palettes
existantes (6 ingrédients chacune). Propose-moi d'abord les 6 ingrédients de
chaque ville, liés à leur vraie économie/culture, avant d'écrire le code.
```

---

## 6. Vraies icônes (à faire une fois les icônes prêtes)

```
Remplace les emoji des tuiles dans MaRacinePuzzle.tsx par de vraies icônes
SVG (fichiers dans /public/icons/). Ne change que le rendu visuel — la
logique du jeu (grille, correspondance, cascade) ne doit pas bouger.
```
