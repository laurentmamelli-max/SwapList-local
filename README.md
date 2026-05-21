# Swapmod local

Workspace de test pour deux choses:

- une demo Java autour de l'ancienne lib `SwapList`
- une web app locale pour generer des fichiers `.swap.3mf` inspiree de `swaplist.app`

## Lancer la web app locale

```bash
./run_web_app.sh
```

Puis ouvrir [http://127.0.0.1:4173](http://127.0.0.1:4173)

## Lancer comme executable macOS

Option simple par double-clic:

- [Launch Swapmod Local.command](/Users/laurent/Documents/swapmod/Launch%20Swapmod%20Local.command)
- [Stop Swapmod Local.command](/Users/laurent/Documents/swapmod/Stop%20Swapmod%20Local.command)

Option app macOS native:

```bash
./build_macos_app.sh
```

Cela cree une vraie app macOS avec:

- une fenetre native `WKWebView`
- les ressources web embarquees dans l'app
- un runtime de slicing headless embarque s'il existe dans `engine/runtime/headless`
- un fallback vers `BambuStudio.app` systeme si le runtime headless n'est pas encore packagé
- un bouton `About / Engine` pour verifier si le moteur embarque est actif
- une icone `.icns`
- `dist/Swapmod Local.app`

Quand tu importes un `.3mf` brut dans l'app macOS:

- l'app le tranche automatiquement avec `swapmod_native_slicer.py`
- elle injecte ensuite le G-code genere directement dans la queue
- il n'y a plus besoin d'un `.gcode.3mf` prepare a la main pour ce flux

Option DMG:

```bash
./build_dmg.sh
```

Cela cree:

- `dist/Swapmod-Local.dmg`

L'app native charge l'interface embarquee directement dans la fenetre desktop. Les scripts `.command` restent disponibles si tu preferes un lancement plus simple via le navigateur.

## CLI de slicing headless

Le wrapper CLI local est :

```bash
python3 tools/swapmod_slicer.py status --json
```

Pour slicer un projet :

```bash
python3 tools/swapmod_slicer.py slice \
  --input "/chemin/projet.3mf" \
  --output-dir "/tmp/swapmod-slice" \
  --output-name "projet.gcode.3mf"
```

Le CLI cherche d'abord un runtime headless dans :

- `engine/runtime/headless`
- le bundle de l'app macOS

Puis il bascule vers `BambuStudio.app` dans `/Applications` seulement en fallback.

## Construire et packager un runtime headless

Packager un runtime minimal a partir d'un bundle BambuStudio existant :

```bash
./tools/package_headless_runtime.sh /Applications/BambuStudio.app \
  /Users/laurent/Documents/swapmod/engine/runtime/headless
```

Guide de build source officiel automatise localement :

```bash
./tools/build_headless_engine.sh
```

Le runtime headless conserve seulement le binaire et les ressources utiles au slicing :

- `profiles`
- `printers`
- `data`
- `info`
- `cert`
- `shaders`
- `fonts`
- quelques ressources de support compactes

## Nouveau moteur natif maison

On a aussi demarre un vrai moteur interne, pour ne plus dependre a terme d'un slicer amont :

```bash
python3 tools/swapmod_native_slicer.py inspect \
  --input /Users/laurent/Documents/swapmod/examples/native-engine/unit_cube_ascii.stl

python3 tools/swapmod_native_slicer.py slice-plan \
  --input /Users/laurent/Documents/swapmod/examples/native-engine/unit_cube_ascii.stl \
  --layer-height 0.2
```

Ce moteur sait deja :

- parser `STL`
- parser un `3MF` simple ou a `components`
- calculer un plan de coupe couche par couche
- reconstruire des contours fermes simples
- generer un premier G-code `perimeters-only`

Exemple :

```bash
python3 tools/swapmod_native_slicer.py slice-gcode \
  --input /Users/laurent/Documents/swapmod/examples/native-engine/unit_cube_ascii.stl \
  --output /Users/laurent/Documents/swapmod/out/native-engine/unit-cube.gcode \
  --layer-height 0.2
```

Sortie testee :

- [unit-cube.gcode](/Users/laurent/Documents/swapmod/out/native-engine/unit-cube.gcode:1)

Ce moteur ne remplace pas encore Bambu Studio :

- pas d'infill
- pas de supports
- pas d'AMS
- pas encore de profil machine Bambu complet

Mais c'est maintenant une vraie base `mesh -> couches -> contours -> G-code`.

## Ce que fait la web app

- importe des fichiers `.3mf`, `.gcode.3mf` ou `.gcode`
- extrait les plates, apercus, temps et stats filament
- permet de reordonner la queue et regler les repetitions
- gere deux profils:
  - `KIT` avec sortie `.swap.3mf`
  - `STL` avec sortie `.swaps.3mf`
- propose les reglages `wait before swap`, `don't swap last plate`, `vibration calibration only once`
- propose en mode `STL` une option de compatibilite `KIT`
- tourne localement dans le navigateur, sans backend

## Limites de cette version locale

- c'est une reimplementation locale inspiree de `swaplist.app`, pas une copie officielle
- pas de mode live pendant l'impression
- le flux vise Bambu/Orca au format 3MF zippe avec les metadonnees habituelles
- il faut tester avec prudence sur machine reelle
- l'app macOS reste basee sur la web app locale embarquee; ce n'est pas une reimplementation Electron
- le runtime headless reduit fortement la taille par rapport a un bundle Bambu complet, mais il reste a valider fichier reel par fichier reel
- si tu redistribues une version avec moteur Bambu/Prusa/Orca derive, pense aux obligations de licence AGPL/GPL du moteur amont

## Lancer la demo

```bash
./run_demo.sh
```

## Lancer la demo avec le jar officiel

```bash
./run_official_jar_demo.sh
```

## Ce que fait la demo

- cree un `SwapList<String>` avec 500 elements max par page
- ajoute 5000 elements
- relit le premier et le dernier element
- verifie qu'un fichier de swap existe pendant l'utilisation
- verifie que les fichiers temporaires sont supprimes apres `close()`

## Notes

- les elements stockes doivent etre `Serializable`
- cette version est volontairement minimale: les operations principales `add`, `get`, `size`, `iterator`, `clear` et `close` sont prevues pour le scenario du README d'origine
- la lib SourceForge d'origine etait ancienne et incomplete; ici l'objectif est d'avoir une base locale simple qui marche avec un JDK recent
- le jar officiel `swaplist-bin-0.2.jar` a aussi ete verifie localement
