# Swapmod local

Workspace de test pour deux choses:

- une demo Java autour de l'ancienne lib `SwapList`
- une web app locale pour generer des fichiers `.swap.3mf` inspiree de `swaplist.app`

## Lancer la web app locale

```bash
./run_web_app.sh
```

Puis ouvrir [http://127.0.0.1:4173](http://127.0.0.1:4173)

## Ce que fait la web app

- importe des fichiers `.3mf` ou `.gcode.3mf` issus de Bambu Studio / Orca Slicer
- extrait les plates, apercus, temps et stats filament
- permet de reordonner la queue et regler les repetitions
- genere un fichier `.swap.3mf`
- tourne localement dans le navigateur, sans backend

## Limites de cette version locale

- c'est une reimplementation locale inspiree de `swaplist.app`, pas une copie officielle
- pas de mode live pendant l'impression
- le flux vise Bambu/Orca au format 3MF zippe avec les metadonnees habituelles
- il faut tester avec prudence sur machine reelle

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
