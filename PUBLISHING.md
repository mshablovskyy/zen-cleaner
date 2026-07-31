# Publier sur addons.mozilla.org (AMO)

## Étapes

1. Se connecter / créer un compte : https://addons.mozilla.org/developers/
2. « Submit a New Add-on » → canal **On this site** (listed)
3. Uploader `web-ext-artifacts/zen_cleaner-<version>.zip` (générer avec `npx web-ext build`)
4. À la question du code source : répondre **No** (aucun build/minification, le zip est le source)
5. Remplir la fiche avec les textes ci-dessous
6. Soumettre — signature automatique immédiate, revue humaine a posteriori

## Mises à jour

⚠️ « Submit a New Add-on » ne sert qu'à la toute première soumission — le
réutiliser provoque une erreur « Duplicate add-on ID found », car l'ID
`zen-cleaner@qskkk` est déjà enregistré.

Pour toute nouvelle version : bump `version` dans `manifest.json` →
`npx web-ext build` → https://addons.mozilla.org/developers/addons →
ouvrir l'add-on → **« Upload New Version »** → uploader le zip.

Alternative en ligne de commande (clés API sur
https://addons.mozilla.org/developers/addon/api/key/) :

```sh
npx web-ext sign --channel=listed \
  --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET"
```

## Textes prêts à coller

### Name
Zen Cleaner

### Summary (EN, max 250 caractères)
Automatically closes unpinned tabs that have been inactive for a set number
of hours, like Arc's auto-archive. Pinned tabs, Essentials, audible tabs and
excluded domains are never touched. One-click restore after each cleanup.

### Summary (FR)
Ferme automatiquement les onglets non épinglés inactifs depuis X heures,
comme l'auto-archivage d'Arc. Onglets épinglés, Essentials, onglets audio et
domaines exclus ne sont jamais touchés. Restauration en un clic.

### Description (EN)
Zen Cleaner brings Arc's auto-archive to Zen Browser and Firefox.

Every 15 minutes, it closes tabs that meet ALL of these conditions:
• not pinned (pinned tabs and Zen Essentials are never touched)
• not the active tab of a window
• not playing audio (music, video calls…)
• not on a domain from your exclusion list
• inactive for longer than your threshold (12 hours by default)

Tabs hidden in other Zen workspaces are cleaned too, just like Arc's spaces.

After each cleanup, a notification tells you how many tabs were closed —
click it to restore them all. You can also restore from the popup.

Extras:
• "Clean now" button in the popup (with confirmation)
• Pause toggle to suspend cleaning temporarily
• Configurable threshold with 1h / 6h / 12h / 24h presets
• Domain exclusion list (subdomains included)

No data collection, no external requests. Open source (MIT):
https://github.com/qskkk/zen-cleaner

### Description (FR)
Zen Cleaner apporte l'auto-archivage d'Arc à Zen Browser et Firefox.

Toutes les 15 minutes, il ferme les onglets qui remplissent TOUTES ces
conditions :
• non épinglé (les onglets épinglés et les Essentials de Zen ne sont jamais
  touchés)
• pas l'onglet actif d'une fenêtre
• ne joue pas de son (musique, visio…)
• pas sur un domaine de votre liste d'exclusion
• inactif depuis plus que le seuil configuré (12 h par défaut)

Les onglets cachés dans les autres workspaces Zen sont aussi nettoyés, comme
les spaces d'Arc.

Après chaque nettoyage, une notification indique le nombre d'onglets fermés —
cliquez dessus pour tout restaurer. La restauration est aussi disponible dans
le popup.

En bonus :
• Bouton « Nettoyer maintenant » dans le popup (avec confirmation)
• Pause temporaire du nettoyage
• Seuil configurable avec préréglages 1 h / 6 h / 12 h / 24 h
• Liste d'exclusion de domaines (sous-domaines inclus)

Aucune collecte de données, aucune requête externe. Open source (MIT) :
https://github.com/qskkk/zen-cleaner

### Champs de la fiche

- **Categories** : Tabs
- **License** : MIT
- **Homepage / Support site** : https://github.com/qskkk/zen-cleaner
- **Privacy policy** : This extension does not collect, store or transmit any
  data. All settings stay in your browser's local storage.
- **Notes to reviewer** (optionnel) : Plain vanilla JavaScript, no build step —
  the uploaded zip is the complete source code.

### Captures d'écran (recommandé)

Faire 2-3 captures : le popup, la page de réglages, une notification de
nettoyage. AMO accepte PNG/JPG, idéalement 1280×800 ou proportion similaire.
