# Cryptoberry
Tool, um Dateien zu ver- und entschlüsseln, Keys zu generieren sowie Konfigurationsdateien für Experiences zu erzeugen. Kann je nach Einsatzzweck via Kommandozeile oder als Bibliothek verwendet werden.


## Voraussetzungen
- NodeJS Version 16 (siehe auch Dockerfile).
Version 17 wird **nicht** unterstützt, da diese breaking changes an der Web Crypto API eingeführt hat.
- NPM
 
 ## Installation
 
- In `crypt` Ordner navigieren
- `npm install`
 
## Allgemeines
Dateien werden mit [AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams) verschlüsselt. Hierfür wird die [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) verwendet, welche sowohl im Browser als auch in neueren [NodeJS](https://nodejs.org/api/webcrypto.html)-Versionen zur Verfügung steht.  

Zur Verschlüsselung wird in der Standardeinstellung die Datei `key` aus dem `crypt`-Ordner verwendet, andere Schlüsseldateien sind jedoch ebenfalls möglich. Da AES symmetrisch ist muss der Inhalt der Schlüsseldatei auch in den Angular-Umgebungsvariablen (`environment.ts` und `environment.prod.ts`) vorhanden sein, damit eine Entschlüsselung im Browser möglich ist. 
Ruft ein Nutzer der Blueberry-Plattform eine Lerneinheit zum ersten Mal auf, so wird die entsprechende ZIP-Datei vom Server heruntergeladen und der Inhalt im Dateisystem persistiert. Die Konfigurationsdatei wird dabei ohne Veränderung aus dem ZIP-Archiv übernommen und folglich im verschlüsseltem Zustand abgelegt. Eine Entschlüsselung erfolgt bei Bedarf zur Laufzeit. Auf diese Weise werden Modifikationen des Inhalts durch den Nutzer (z.B. Vertauschen von Test- und Trainingsdaten) verhindert. 
Die Blueberry-Plattform greift bei allen folgenden Aufrufen **nur** auf die Inhalte des Dateisystem der Plattform zu und verwendet die dort hinterlegten Dateien; es existiert kein Mechanismus um aktualisierte Dateien vom Server herunterzuladen!
#### Achtung:
Im Gegensatz dazu sind Angular-Umgebungsvariablen Teil der Angular-Anwendung und werden somit bei *jedem Aufruf der Webseite neu heruntergeladen*. Wenn sich also der `key` in den Umgebungsvariablen ändert können Nutzer beim nächsten Aufruf der Webseite ihre Projekte nicht mehr nutzen, da die Konfigurationsdatei aufgrund des geänderten Schlüssels nicht mehr entschlüsselt werden kann. 
Da es sich bei der Verschlüsselung nur um eine Hürde für neugierige Nutzer handelt (der Schlüssel kann mit etwas Geschick im Browser aus den Angular-Umgebungsvariablen ausgelesen werden) wird dringend davon abgeraten die Schlüssel zu ändern!


## Nutzung per Kommandozeile
Das Tool kann per Kommandozeile genutzt werden, um Dateien zu ver- und entschlüsseln, eine neue Konfigurationsdatei sowie eine neue Schlüsseldatei anzulegen. Eine Übersicht aller Befehle kann mit `node crypt.js --help` aufgerufen werden. Für jeden Befehl gibt es weiterhin verschiedene Parameter, welche mit `node crypt.js <encrypt|decrypt|key|config> --help` angezeigt werden können.

**Achtung: Dateien mit gleichem Namen werden immer überschrieben!**
- Erstellen einer neuen Schlüsseldatei
`node crypt.js key --path <path>`
- Verschlüsseln einer Datei 
`node crypt.js encrypt --key <key_location> --file <cleartext_location> --output <ciphertext_location>`
- Entschlüsseln einer Datei
`node crypt.js decrypt --key <key_location> --file <ciphertext_location> --output <cleartext_location>`
- Generieren einer neuen Konfigurationsdatei (beeinhaltet UUID sowie einige Standardvorgaben für z.B. Größe der einzelnen Bereiche in der Oberfläche)
`node crypt.js config --path <path> --type <LESSON|SANDBOX> --name <name>`



	
## Nutzung als Bibliothek
Cryptoberry wird in der `custom-webpack.config.ts` genutzt um die Konfigurationsdatei jeder Experience im Rahmen des Build-Prozesses ( `ng serve` oder `ng build`) zu verschlüsseln, bevor diese mit den restlichen Dateien in ZIP-Archiven zusammengeführt werden. Dieses Vorgehen ist gegenüber einem manuellen Verschlüsseln von Konfigurationsdateien zu bevorzugen.
Hierbei wird die mitgelieferte `key`-Datei verwendet, deren Inhalt wie bereits beschrieben mit dem der Angular-Umgebungsvariablen übereinstimmen muss.


## Bekannte Fehler
- Im Browser taucht beim Starten der Blueberry-Plattform in der Konsole eine Meldung `DOMException` auf. 
	- Lösung 1: Sicherstellen, dass Angular-Umgebungsvariablen nicht verändert wurden
	- Lösung 2: Prüfen, ob verwendeter Browser aktuell genug für Web Crypto API ist
	- Lösung 3: Prüfen, ob `config.json` in der ZIP-Datei wirklich verschlüsselt ist (in der Vergangenheit gab es in der `custom-webpack.config.ts` Probleme mit Pfaden, wodurch die Datei vor dem Einfügen in das ZIP-Archiv nicht verschlüsselt wurde) 
