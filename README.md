# Zen Cleaner

Extension pour [Zen Browser](https://zen-browser.app) qui reproduit l'auto-archivage d'Arc :
les onglets **non épinglés** inactifs depuis **X heures** (réglable) sont fermés automatiquement.

## Fonctionnement

Toutes les 15 minutes, l'extension vérifie chaque onglet et ferme ceux qui remplissent
**toutes** ces conditions :

- non épinglé (les onglets épinglés et les **Essentials** de Zen ne sont jamais touchés) ;
- pas l'onglet actif d'une fenêtre ;
- ne joue pas de son (musique, visio…) ;
- pas sur un domaine de la liste d'exclusion ;
- inactif depuis plus que le seuil configuré (12 h par défaut).

Les onglets des **autres workspaces Zen** sont aussi nettoyés (comme les spaces d'Arc).

Après chaque nettoyage, une notification indique le nombre d'onglets fermés —
**cliquer dessus les restaure**. La restauration est aussi disponible dans le popup.

> Limitation : les onglets restaurés se rouvrent dans le workspace courant,
> l'API WebExtensions ne permettant pas de cibler un workspace Zen.

## Utilisation

- **Popup** (icône dans la barre d'outils) : pause/reprise du nettoyage automatique,
  bouton « Nettoyer maintenant » (ferme tous les onglets non épinglés/actifs/audibles,
  sans attendre le seuil), restauration du dernier nettoyage, accès aux réglages.
- **Réglages** : seuil d'inactivité en heures (préréglages 1 h / 6 h / 12 h / 24 h,
  décimales acceptées — `0.05` ≈ 3 min, pratique pour tester) et liste de domaines exclus
  (un par ligne, sous-domaines inclus).

## Installation dans Zen

### Pour le développement (temporaire, perdu au redémarrage)

1. Ouvrir `about:debugging#/runtime/this-firefox`
2. « Charger un module complémentaire temporaire… »
3. Sélectionner `manifest.json`

### Installation permanente

Deux options :

1. **Désactiver l'exigence de signature** (possible dans Zen, contrairement à Firefox
   release) : dans `about:config`, passer `xpinstall.signatures.required` à `false`,
   puis zipper le dossier (`zip -r zen-cleaner.xpi . -x ".*"`) et l'ouvrir dans Zen.
2. **Signer via AMO** : `npx web-ext sign --channel=unlisted` avec des
   [clés API addons.mozilla.org](https://addons.mozilla.org/developers/addon/api/key/),
   puis installer le `.xpi` signé.

## Développement

Aucun build : le code est du JavaScript vanilla (Manifest V3, event page Firefox).

```sh
npx web-ext lint    # valider le manifest et les APIs
npx web-ext run     # lancer dans un Firefox de test
```
