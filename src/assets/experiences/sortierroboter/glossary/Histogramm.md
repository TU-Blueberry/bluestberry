# Histogramm

Ein Histogramm stellt die Häufigkeitsverteilung von Daten dar, die in Bereiche (bins im Englischen) eingeteilt werden. Dies erlaubt die Identifikation von sehr häufig vorkommenden ähnlichen Werten.

Histogramme können sowohl für normale Merkmale, wie z.B. Gehaltsspannen, aber auch für Bilder und die darin vorkommenden Pixelwerte der jeweiligen RGB-Kanäle genutzt werden. Optional könnte davor auch eine Umwandlung in ein Schwarz-Weiß-Bild passieren. Dann lässt sich mit einem Histogramm die Helligkeit eines Bildes analysieren.

## Beispiel

## Nutzung von Histogrammen in Python

```python
import numpy as np
hist, bin_edges = np.histogram(input, bins=5, range=(0,255))
```

Numpy hat die Funktion `histogram`, mit der das Histogramm von der Eingabe `input` berechnet werden kann. `bins` bestimmt, in wie viele gleich breiten Klassen die Werte eingeteilt werden sollen. Falls individuelle Klassengrenzen gebraucht werden, können diese mit einer Liste angegeben werden, z.B. `bins=[5,10,15,25,40,90]`.

Der Parameter `range` bestimmt, welche untere und obere Grenze für die Klassen genommen wird. Der Parameter wird, wenn das Argument weggelassen wird, auf das Minimum und Maximum der Eingabedaten gesetzt.

Die Funktion gibt zwei Werte zurück, das Histogramm und die Grenzen der Klassen (bin_edges). Falls du nicht an den bin_edges interessiert bist, kannst du sie mit `hist, _ = np.histogram(...)` ignorieren.

Beachte dabei, dass `input` für die Berechnung von einem höherdimensionalen Vektor in einen eindimensionalen transformiert wird. Falls du also mehrere Histogramme erstellen möchtest, musst du dies z.B. über eine Schleife machen.

Unter folgendem Link kannst du weitere Informationen zu dem Thema finden:
<https://numpy.org/doc/stable/reference/generated/numpy.histogram.html>

## Nutzung von Histogrammen für Bilder

Histogramme bieten sich gut für Bilder an. Mit ihnen können die Farbwerte in jeweils gleich große Klassen aufgeteilt werden und erlauben eine grobere Analyse. Für Bilder, bei denen alle Farbkanäle (rot, grün, blau) relevant sind, lohnt sich ein Histogramm für jeden Farbkanal.
