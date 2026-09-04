# Pattern de jonction entre cartes de villes — points validés

1. Toute image `<img>` avec `width: calc(100% + Xpx)` doit avoir
   `max-width: none` explicite, sinon le preflight Tailwind
   (`img{max-width:100%}`) l'écrase silencieusement.
2. `.travelMap` doit garder sa scrollbar masquée (`scrollbar-width:none`
   etc.) pour éviter une asymétrie gauche/droite de quelques pixels sur
   tous les éléments pleine largeur.
3. Toujours mesurer via `getBoundingClientRect()`/`getComputedStyle()` en
   vrai navigateur avant de conclure qu'un ajustement de largeur/marge
   est résolu.
4. Distance minimale entre nœuds de niveau calculée à l'échelle
   d'affichage réelle (~390px de large), pas la résolution source
   (~941px) — sinon chevauchement visuel garanti malgré un ordre
   techniquement correct.
5. `object-fit:cover` ne peut jamais recadrer plus serré que ce
   qu'imposent les proportions bloc/image — pour zoomer sur une bande
   précise, utiliser un wrapper `overflow:hidden` + image en
   `position:absolute` à taille fixe.
6. Jonction entre deux villes : le nuage (`nuage-voile.png`, vraie
   transparence alpha native — ne jamais appeler `.convert('RGB')`
   dessus sous peine de détruire l'alpha) flotte en chevauchement direct
   (`position:absolute`) par-dessus les deux images de route adjacentes,
   PAS dans une boîte/espace séparé, PAS en petits morceaux flottants
   (approche testée puis explicitement abandonnée). `width:100%`
   explicite obligatoire sur l'`<img>` absolue.
7. Configuration de référence validée visuellement sur toutes les
   jonctions à ce jour (Accra→Lagos, Lagos→Dakar, Dakar→Ouagadougou,
   Douala→Addis Abeba — identique à chaque fois, aucun ajustement
   nécessaire) :
   - `imgPrécédente.bottom` = 674.31
   - `.mapCloudVeil` : top = 640.31, bottom = 732.31
   - `imgSuivante.top` = 698.31
   - `getComputedStyle(.mapCloudVeil)` : height=92px, margin-top=-58px,
     width=366px, position=absolute
   Réutiliser ces valeurs telles quelles pour toute nouvelle jonction ;
   ne recalculer que si la composition d'une image diffère nettement.
