# Vorhersage von Immobilienpreisen :house_with_garden: #

Im Folgenden werden die wesentlichen Elemente der Lernplattform praxisnah vorgestellt:  

Wir wollen den Preis von Immobilien vorhersagen. 

## Aufgabe 1: Überblick verschaffen :eyes: ##

Momentan wird der Preis anhand vom Alters des Hauses geschätzt, was leider eher schlecht funktioniert.  

Für einen ersten Eindruck betrachten wir zunächst einmal:
- Eine Grafik zum aktuellen Modell ("model_age.png")
- Die Immobilien-Daten ("data.csv")


## Aufgabe 2: Vorhersagemodell erstellen :chart_with_upwards_trend: ##

Der bisherige Ansatz ist das Minimieren der Quadratsumme der Residuen: $\sum_{i=1}^{n}(y_i- \hat{y_i})^2$.  

Residuen sind die dabei die Unterschiede zwischen den vorhergesagten $\hat{y}$ und den echten Immobilienpreisen ${y}$.\
Die Umsetzung erfolgt mithilfe von linearer Regression.

Nun wollen wir testen, ob eine andere Eigenschaft der Immobilien bessere Vorhersagen erlaubt.\
Erstelle hierzu zunächst in diesem Verzeichnis eine Python-Datei mit folgendem Inhalt:

```python
from sklearn import linear_model  

# Erstellt eine Instanz von einem LinearRegression-Objekt.
model = linear_model.LinearRegression()
```


## Aufgabe 3: Integration des Modells :gear: ##

Importiere nun die von dir angelegte Datei in "code_template.py".\
Benutze dann statt "Alter" zum Beispiel "Wohnfläche" für die Vorhersage.  

Anschließend ist der Code bereit zur Ausführung.  

### :bulb: Tipp: Lies am besten einfach die Kommentare in "code_template.py" ###  

## Aufgabe 4: Evaluation :mag: ##

Vergleichen wir nun die Modelle
- Grafisch mittels des Plotly-Diagramms
- Anhand der Ausgabe im Terminal

Bei weiterem Interesse an Datenvisualisierung ist vielleicht das Thema Plotly interessant.\
Informationen hierzu sind z.B über die Suchfunktion auffindbar.

## Bonus :partying_face: ##

Weitere interessante Features:
- Die Info-Tour
- Das Hinweissystem
- Der Import / Export von Dateien / Projekten
- Das Erstellen eigener Workspaces

### Und natürlich unsere Blaubeersortiermaschine! :space_invader: ###
