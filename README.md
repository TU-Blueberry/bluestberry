# Projekt Blueberry

Entwickelt im Rahmen der Projektgruppe 643: 
"Entwicklung einer browserbasierten Lernplattform für Data Science" an der Fakultät für Informatik der TU Dortmund. Für weitere Details zur Motivation, dem didaktischen Konzept sowie weiteren technischen Details empfiehlt sich ein Blick in den Abschlussbericht.

## Features:
- Client-seitige Ausführung von Python
- Python-Ausführung ist asynchron und nicht-blockierend
- Persistentes Dateisystem im Browser
- Dynamische Oberfläche inkl. Fenstermanager
- Code-Editor (+ optionaler Language Server)
- Unity Integration
- Hinweissystem
- Sandboxes
- Kontextwechsel zwischen Lerneinheiten und/oder eigenen Sandboxes möglich
- Import und Export von Lerneinheiten/Sandboxes
- Vielzahl an Viewern für verschiedene Dateien(Code, Plotly, Unity, Tabellen, Markdown, Bilder etc.)
- Info-Tour für neue Nutzer
- Suche im Dateisystem
- Glossar (global + zusätzlich spezielle Einträge pro Lerneinheit)

## Mitgelieferte Inhalte
- Sortierroboter (vollständig umgesetzte Lerneinheit)
	- Vorgegebener Code-Rahmen für Implementierung eines eigenen Klassifikators 
	- Datensatz zum Trainieren des Klassifikators
	- Separater Datensatz zum Testen der eigenen Implementierung
	- Visualisierung des Testergebnisses in Form einer Unity-Simulation
	- Eigene Python-Bibliotheken, um Unity-Simulation aus Python zu beeinflussen
	- Ausgearbeitete Glossareinträge mit Bildern, Verweisen etc.
	- Hinweissystem mit passenden Inhalten
	- Code-Beispiel für Plotly
- Frequent Itemset Mining (technische Machbarkeitsstudie für eine zweite Lerneinheit)
	- Minimalbeispiel für Ausführung von SQLite im Rahmen der Plattform



# Installation:
#### Voraussetzungen
- Node.js Version 16 
(Version 17 wird aufgrund von breaking changes in der Web Crypto API aktuell nicht unterstützt)
- NPM
- *Optional*: Unity 2019.4.29
- *Optional*: Python (für Hinweistool)
- *Optional*: Docker, Docker compose

#### Installation
1. Repository klonen
2. Zu Repository navigieren
3. `npm install`

# Ausführung
#### Lokale Ausführung mit eingebautem Testserver
1. `npm start`

#### Lokale Ausführung mit eigenem Server
1. Projekt bauen (`npm build`)
2. Inhalte aus  `dist`  Ordner in eigenen Webserver kopieren
3. Der Web-Server muss für folgende Header setzen damit SharedArrayBuffers genutzt werden können: `headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }`
4. *Optional*: Kompression aktivieren um Ladezeiten zu verkürzen

#### Lokale Ausführung mit Docker
1. `docker-compose up`


# Hinzufügen und Anpassen von Inhalten
#### Anlegen einer neuen Lerneinheit (Lesson)
1. Neuen Ordner `src/assets/experiences/<name>` anlegen
2. Neuen Ordner `src/assets/experiences/<name>/__tabinfo` anlegen
3. Datei `src/assets/util/_.txt` nach `src/assets/experiences/<name>/__tabinfo` kopieren
4. Ordner aus Schritt 1 mit gewünschten Inhalten befüllen
5. Konfigurationsdatei einfügen
	- Möglichkeit 1: Neue `config.json` generieren lassen
		- Zum Ordner  `crypt` navigieren
		- `node crypt.js config --p ../src/assets/experiences/<name>/config.json --type LESSON --name <full_name>` ausführen
	- Möglichkeit 2: Bestehende `config.json`  von anderer Lerneinheit in den neuen Ordner kopieren
		- Wichtig: `uuid` in der Kopie anpassen (UUIDv4)
6. *Optional*: Konfigurationsdatei anpassen (welche Elemente versteckt sind etc.) 
7. `src/assets/lessons.json` mit Namen und UUID der neuen Lerneinheit erweitern
8. In `custom-webpack.config.ts` den Namen aus Schritt in das `experiences`-Array (Zeile 7) einfügen
9. Projekt neu bauen und ausliefern  


## Hinzufügen oder Anpassen eines lokalen Glossareintrags
*Hinweis*: Da die Plattform über keinen Mechanismus zum Aktualisieren von Dateien verfügt hat das Hinzufügen oder Ändern von lokalen Glossareinträgen (d.h. solchen, die mit der Lerneinheit ausgeliefert und im Dateisystem persistiert werden) keinen Einfluss auf Nutzer, die die Lerneinheit bereits heruntergeladen haben! 
*Hinweis*: Bilder in lokalen Glossareinträge können entweder aus dem Internet oder aus dem Lerneinheit selbst stammen. In letzterem Fall muss als URL für das Bild der *absolute* Pfad, welcher später auf der Plattform verwendet wird, angegeben werden (Beispiel: `/<uuid>/<glossaryEntryPoint>/imgs/bild1.png`). Als Referenz können die mitgelieferten Glossareinträge des Sortierroboters verwendet werden.  
#### Hinzufügen
1. Glossareintrag als Markdown-Datei anlegen und speichern
2. Datei in  `glossaryEntryPoint` (in `config.json` definiert) der Lerneinheit kopieren (Pfad beginnt mit  `src/assets/experiences/<name>/`) 
3. Projekt neu bauen und ausliefern


#### Anpassen
1. Glossareintrag im `glossaryEntryPoint` der Lerneinheit suchen, bearbeiten und speichern
2. Projekt neu bauen und ausliefern

## Hinzufügen oder Anpassen eines globalen Glossareintrags
*Hinweis*: Globale Glossareinträge (d.h. solche, die unabhängig von der gewählten Lerneinheit/Sandbox verfügbar sind) unterstützten aktuell nur Bilder aus dem Internet!
*Hinweis*: Anders als lokale Glossareinträge werden globale Glossareinträge aktualisiert falls sich die Quelldatei auf dem Server seit dem letzten Aufruf verändert hat. 

#### Hinzufügen
1. Glossareintrag als Markdown-Datei anlegen und speichern
2. Datei nach `src/assets/glossary` kopieren
3. Name der Datei (inklusive Dateiendung) in `src/assets/glossary.json` hinterlegen
4. Projekt neu bauen und ausliefern

## Anpassen des Hinweissystems
Zum Anpassen der Inhalte des Hinweissystems existiert ein eigenes Tool mitsamt einer README im Didaktik-Repository. 

## Anpassen der Unity-Simulation
Informationen zum Anpassen und Einbinden einer Unity-Simuatlion finden sich in der README des UnityBerry-Repository.


# Technische Limitationen
Aktuell werden nur Chromium-basierte Browser (Chromium, Chrome, Opera, Edge) und Safari unterstützt. Firefox bietet aktuell [keine Unterstützung für IDBFactory.databases](https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/databases#browser_compatibility). 
Der verwendete Browser muss darüber hinaus die Web Crypto API sowie SharedArrayBuffer unterstützen.

Das (Pre-)Loaden von Python-Bibliotheken wie Sklearn, Skimage etc. kann beim ersten Aufruf der Plattform 30 Sekunden oder mehr in Anspruch nehmen. Zum einen müssen die Bibliotheken erst vom Web-Server heruntergeladen werden (trotz Kompression teilweise >25MB pro Bibliothek), zum anderen müssen die Bibliotheken in der Folge noch von Pyodide entpackt und verarbeitet werden.

Letztlich sei erwähnt dass die WASM-Umgebung im Browser nur auf eine begrenzte Menge an Arbeitsspeicher (aktuell 4GB) zurückgreifen kann, von denen wiederrum nur 2GB für Pyodide nutzbar sind. 

# Bekannte Fehler
- ` ERROR TypeError: Cannot read properties of undefined (reading 'getModels')` 
Tritt auf wenn der Language Server nicht aktiv ist. Kann ignoriert werden

- `
Python exception:
Traceback (most recent call last):
  File "<exec>", line 31, in load_libs
ModuleNotFoundError: No module named 'plotly
package errors`
Tritt beim Preloaden von Plotly auf. Kann ignoriert werden, da Plotly trotzdem geladen wird.
- Datei wird nach Änderung der Dateiendung (z.B. von .py zu .png) nicht im richtigen Tab angezeigt sondern bleibt im bisherigen Tab
- Unter Umständen kann der Dateibaum für das Glossar außerhalb des sichtbaren Bereiches verschoben werden, da das `minSize` Attribut von [angular-split einen Fehler hat](https://github.com/angular-split/angular-split/issues/255). 
- Pyodide/Emscripten unterstützt Berechtigungen für Dateien und Ordner (`chmod`). Nach unserem Kenntnisstand schlägt jedoch die Synchronisierung mit der IndexedDB fehl wenn es Dateien/Ordner ohne Schreibberechtigung (`0o555`) gibt. Aus diesem Grund werden im Rahmen der Plattform alle Berechtigungen vor dem Synchronisieren entfernt und anschließend wieder hinzugefügt. Sie sind also bei den in der IndexedDB persistierten Dateien nicht vorhanden. 


# Tipps beim Entwickeln
Im Laufe der Projektgruppe haben sich einige Tipps und Praktiken herauskristallisiert, die die Entwicklung vereinfachen können.
- Die Plattform hat *keinen* Mechanismus, um die Dateien im Dateisystem mit denen auf dem Server zu vergleichen und ggf. zu aktualisieren. Um neue Inhalte zu testen wird daher empfohlen, die Anwendung in einem privaten Browser-Fenster zu öffnen und dieses nach vor der nächsten Änderung wieder zu schließen. Dadurch wird der gesamte Kontext (Cache, IndexedDB etc.) des Browsers gelöscht und beim nächsten Aufruf die aktuellsten ZIP-Ardhiove vom Server geladen und im Dateisystem persistiert.
- Beim Arbeiten mit dem Dateisystem tauchen oftmals Fehlercodes ohne weitere Erklärung auf. Aus unserer Erfahrung deutet Fehlercode 10 auf einen nicht existierenden Pfad hin, Fehlercode 4 auf fehlende Berechtigungen für die Operation. Leider bietet Emscripten hierfür keine vernünftige Dokumentation an, lediglich die beiden Dateien [errno.h](https://github.com/emscripten-core/emscripten/blob/main/system/lib/libc/musl/arch/emscripten/bits/errno.h) und [api.h](https://github.com/emscripten-core/emscripten/blob/main/system/include/wasi/api.h) im Emscripten Repository könnten als Hilfe dienen.
- Innerhalb der Plattform werden Pfade nicht ausreichend normalisiert. In manchen Fällen fügt z.B. die aufrufende Methode ein `/` vorne an, in manchen Fällen die aufgerufene Methode. Bei unerklärlichen Fehlern bietet sich also ein genauer Blick auf den erzeugten Pfad an. Darüber hinaus wäre eine zentrale Funktion zum Normalisieren von Pfaden für die Zukunft sinnvoll.
- Im `PyodideService` kann die `FILESYSTEM_DEBUG` Flag gesetzt werden um sämtliche Methodenaufrufe im Dateisystem in der Konsole auszugeben.
- An einigen Stellen sind auskommentierte `console.log` Statements zu finden die beim Debuggen ggf. hilfreich sein könnten.  
- Zum Debuggen von Probleme beim State-Management bietet sich die Browser-Erweiterung *Redux DevTools* an.
- Die Developer Tools des Browsers können genutzt werden um die Anwendung während der Ausführung zu debuggen. Im `Sources` Tab kann unter `top > webpack:// > src` die entsprechende TypeScript-Klasse ausgewählt werden. Unter `top > src_app_pyodide_pyodide_worker_ts.js > webpack:// > src`  können zudem Breakpoints im Code des WebWorkers gesetzt werden.



# Aufbau einer Konfigurationsdatei
Jede Experience (Lesson oder Sandbox) besitzt auf oberster Ebene eine Konfigurationsdatei `config.json`. Diese wird beim Bauen des Projekts zum Schutz vor Manipulationen verschlüsselt (nähere Informationen siehe README im Ordner `src/crypt`) und zusammen mit den anderen Dateien in ein ZIP-Archiv überführt.
Beim Aufruf der Plattform wird die Datei im Dateiexplorer verborgen und die Schreibberechtigung entfernt.

#### Hinweis: Sämtliche Pfade innerhalb der Konfigurationsdatei sind relativ und beziehen sich auf den Speicherort der Konfigurationsdatei!

- `uuid: string` Eindeutige Identifkationsnummer (UUIDv4) der Experience, wird beispielsweise als Pfad für den Mountpoint im Dateisystem sowie für Export/Import genutzt
- `name: string` Nutzersichtbarer Name der Experience
- `type: "LESSON" | "SANDBOX"` Typ der Experience. Sandboxes haben kein Hinweissystem, keine Unity-Komponente und keine Info-Tour.
- `open: { path: string, on: string, active: boolean }[]` Für jeden offenen Tab wird der relativer Pfad, die zugehörige Tab-Gruppe (links/rechts) und eine Info, ob der Tab aktiv ist oder nicht gespeichert. Über dieses Feld kann gesteuert werden, welche Tabs beim ersten Aufruf der Plattform geöffnet sind.
	- Änderungen durch den Nutzer führen zu einer Anpassung dieses Feldes
	- Für Unity und das Hinweissystem existieren spezielle Pfade (`unity` und  `hint`). Ein Beispiel findet sich in der Konfigurationsdatei der Sortierroboter-Lerneinheit.
	- Offene Plotly Tabs werden separat gespeichert (siehe `__tabinfo`)
- `unityEntryPoint?: string` Relativer Pfad zur JSON-Datei des Unity-Projekts
- `splitSettings: ViewSettings` Objekt, welches Informationen über den aktuellen Aufbau der UI festhält. Für jede Split-Area (Dateibaum, linke Tab-Gruppe und rechte Tab-Gruppe, Terminal, Code-Editor und Empty-Message) werden Infos über Sichtbarkeit, aktuelle, minimale und maximale Größe sowie Reihenfolge der Anordnung gespeichert. Da die linke Tab-Gruppe noch horizontal in Code-Editor und Terminal geteilt werden kann sind beide Elemente einer eigenen `group` zugewiesen.
-   `hidden: string[]`  Relative Pfade von Dateien oder Ordnern, die im Dateiexplorer und in der Suche nicht angezeigt werden sollen. Arbeitet rekursiv, d.h. für jeden Pfad sind alle Sub-Pfade ebenfalls versteckt.
-   `readonly: string[]` Relative Pfade aller Dateien oder Ordner, die keine Schreibberechtigung haben sollen. Arbeitet rekursiv.
-   `modules: string[]` Relative Pfade zu Ordnern mit eigenen, mitgelieferten Python-Modulen. Werden vor der Ausführung von Code im  `sys.path` von Pyodide hinterlegt und somit zur Laufzeit aufgelöst. Werden im Dateiexplorer und in der Suche ausgeblendet.
-   `glossaryEntryPoint: string` Relativer Pfad zum Ordner mit Glossareinträgen, die nur für diese Lerneinheit relevant sind. Einträge sind im normalen Dateiexplorer versteckt und ohne Schreibberechtigung, werden aber zusammen mit den globalen Glossareinträgen im separaten Glossarexplorer angezeigt.
-   `hintRoot: string` Relativer Pfad zur `root.yml` Datei mit allen Fragen und Antworten für das Hinweissystem. Wird im Dateiexplorer und in der Suche ausgeblendet.
-   `preloadPythonLibs: string[]` Namen von Python-Modulen, die noch vor der ersten Code-Ausführung durch den Nutzer geladen werden (z.B. plotly, sklearn). Code-Ausführung durch den Nutzer ist erst möglich sobald der Preload abgeschlossen ist.
-   `tabinfo: string` Relativer Pfad für Ordner, in dem Inhalte von Spezial-Tabs (z.B. Plotly) gespeichert werden, damit diese beim nächsten Aufruf der Plattform angezeigt werden können. Wird im Dateiexplorer und in der Suche ausgeblendet.
	
Darüber hinaus existieren in der Konfigurationsdatei noch zwei weitere Felder ohne Funktion. Die Umsetzung war zeitlich nicht mehr realisierbar:
- `encrypted: string[]` Relative Pfade von Ordnern oder Dateien, die vor dem Export verschlüsselt werden sollen
- `external: string[]` Dateien, die statt im normalen Mountpoint der Experience (`/<uuid>`) in einem eigenen Mountpoint (Schema: `/<uuid>_external)`) abgelegt werden sollen. Mountpoint könnte darüber hinaus erst vor der Ausführung von Python-Code eingebunden und mit der IndexedDB synchronisiert sowie nach der Ausführung direkt wieder gelöscht werden. Würde im Dateiexplorer und in der Suche ausgeblendet.
 
 
 # Weitere mögliche Features
Im Laufe der Projektgruppe sind zahlreiche Ideen und Vorschläge entstanden deren Umsetzung jedoch nicht mehr realisiert werden konnte. Diese sind im Folgenden aufgelistet und könnten zukünftigen Projektgruppen oder interessierten Person als Anhaltspunkt dienen.

- UI: Verbessertes Erkennen, Abfangen und Anzeigen von Fehlern
- UI: Tastaturnavigation
- UI: Ladeanimationen, um Nutzer insbesondere bei Code mit langer Ausführungsdauer über Fortschritt zu informieren
	- Insbesondere bei Plotly könnte nach dem Betätigen des Ausführen-Buttons bereits direkt ein Tab mit einer Ladeanimation geöffnet werden
- UI: Responsive Design für verbesserte Nutzbarkeit auf mobilen Endgeräten
- Feature: Kontextmenü um einen "Öffnen mit..."-Dialog erweitern
- Feature: Dateien zwischen Ordnern und Lerneinheiten/Sandboxes kopieren können
- Feature: Tabs zwischen Tab-Gruppen verschieben können
- Feature: Vollständig dynamischer Fenstermanager
- Pyodide: Eingaben im Terminal erlauben
- Pyodide: Zugriff auf Webcams und externe Geräte via STDIN ermögichen
- Pyodide: Sensible Python-Funktionen per monkey patching entschärfen
	- Aktuell können sich Nutzer per os.chmod() Schreibberechtigungen für sämtliche Dateien und Ordner verschaffen 
- Allgemein: Prüfsummen für sensible Bereiche des Dateisystems (z.B. Dateien, die für das Testen des Sortierroboters verwendet werden), um Manipulationen zu erkennen
- Allgemein: Emscripten WASMFS-Dateisystem nutzen sobald verfügbar
- Allgemein: Mechanismus, um Lerneinheiten zurückzusetzen (alle Dateien löschen, ZIP vom Server laden und neu entpacken)
- Allgemein: Integration von Decker
- Allgemein: Mechanismus, um Dateien im Dateisystem der Plattform aktualisieren zu können
- 	Möglicherweise durch Integration von GitLab/GitHub 

 
 
# Teilnehmerinnen und Teilnehmer
Projektleitung: 
  - Jun.-Prof. Dr. Thomas Liebig
  - Lukas Pfahler  

Organisation:
  - Michael Schwarzkopf

Didaktik: 
  - Daniel Enders
  - Jan Feider
  - Leah Niechcial
  - Isabell Strotkamp

Frontend-Entwicklung: 
  - Jana Gödeke
  - Tim Hallyburton
  - Tim Katzke
  - Maximilian König
  - Henri Schmidt
  
Unity-Entwicklung:
  - Jonas Grobe
  - Christofer Heyer 

