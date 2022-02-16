# F-Score
Der $F_{1}$-Score ist eine beliebte Metrik zur Beurteilung von Klassifikatoren.
Der $F_{1}$-Score wird als harmonisches Mittel der Precision und des Recalls berechnet:\\

 $F_1 = 2*\frac{precision*recall}{precision+recall}$

Zusätzlich gibt es mit dem $F_{\beta}$-Score die Möglichkeit die Precision und den Recall individuell zu gewichten, sodass der Recall Beta mal schwerer gewichtet wird als die Precision:

$F_\beta = (1+\beta^2)*\frac{precision*recall}{(\beta^2*precision)+recall}$

Sowohl der $F_{1}$-Score als auch der $F_{\beta}$-Score können leicht mit ihren entprechenden Funktionen aus dem metrics-Paket berechnet werden. Der $F_1$-Score wird mit der Funktion `f1_score()` berechnet und der $F_{\beta}$-Score wird mit der Funktion `fbeta_score()` berechnet.
In der Dokumentation des Pakets wird eine Vielzahl an möglichen Parametern vorgestellt. Zum Einstieg und zum Bewerten unserer Klassifikation reicht aber zunächst eine Betrachtung von zwei Parametern. \
Übergebe für den Parameter `y_true` ein Array, welches die korrekten Label für die Objekte, die klassifiziert wurden, enthält. Hierbei handelt es sich um die sogenannte Ground Truth. \
Übergebe für den Parameter `y_pred` ein Array, welches die vorhergesagten Label für die Objekte, die klassifiziert wurden, enthält. Diese erhältst du aus der `predict()` Methode. \
Für den $F_\beta$-Score muss zusätzlich ein `float`-Wert für $\beta$ übergeben werden, welcher die $precision$ gewichtet, wie in der Formel oben beschrieben wird.

Mit den weiteren optionalen Parametern können bspw. Anpassungen für nicht-binäre Klassifikationen vorgenommen werden. Für weitere Informationen zu den weiteren Parametern lohnt sich ein Blick in die Dokumentation:\
$F_1$-Score: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.f1_score.html \
$F_\beta$-Score: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.fbeta_score.html\

Im Folgenden Code-Abschnitt wird gezeigt, wie die beiden Funktionen aufgerufen werden können.

```python
from sklearn.metrics import f1_score, fbeta_score
ground_truth = [1,0,1,1,0,1]
predicted_labels = someClassificator.predict(objects_to_predict)
f1 = f1_score(y_true = ground_truth, y_pred = predicted_labels)
fbeta = fbeta_score(y_true = ground_truth, y_pred = predicted_labels, beta = 0.5)
```
## Wie ist der F1-Score zu interpretieren?
Ab einem bestimmten Punkt führt ein gezieltes Verbessern der Precision zur einer Verschlechterung des Recalls und umgekehrt. 
Um die Wirkung dieses Trade-Offs zu beurteilen können einfach die jeweiligen $F_{1}$-Scores verglichen werden.
Der $F_{1}$-Score liegt zwischen 0 und 1. Er beträgt 1, wenn sowohl Precision als auch Recall 1 sind. Er beträgt 0, sobald einer der beiden Werte 0 ist.
## Warum reicht nicht nur die Betrachtung von Accuracy, Precision oder Recall?
Je nach gewünschtem Anwendungsfall ergibt eine jeweils einzelne Betrachtung der Metriken Sinn.
Dabei können allerdings falsche Schlüsse auf die Qualität des Klassifikators gezogen werden.
Betrachtet man bespw. einen Klassifikator der eine seltene Krankheit erkennen soll.
In unserem Beispiel hat eine Person von 100 Personen diese Krankheit.
So könnte eine sehr hohe Accuracy erreicht werden, wenn jeder Test als Negativ markiert wird.
Denn 99% der Tests würden somit korrekt klassifizieren. 
Da jedoch keiner der positiven Patienten gefunden wurde beträgt der Recall Wert 0 und damit erfüllt der Klassifikator nicht seinen Zweck.