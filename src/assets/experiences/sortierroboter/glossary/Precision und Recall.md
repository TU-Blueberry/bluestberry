# Precision und Recall
Die Precision und der Recall sind zwei wichtige Metriken, welche zur Beurteilung von Klassifikatoren eingesetzt werden.
Welche Metrik zur Beurteilung eines Klassifikators genutzt wird hängt zwar häufig vom gewünschten Anwendungsfall ab, jedoch werden im Allgemeinen Precision und Recall im Verbund betrachtet um eine geeignete Aussage über die Qualität des Klassifikators treffen zu können.
Beide Metriken können leicht aus den Ergebnissen der Konfusionsmatrix berechnet werden. 
Mehr zur Konfusionsmatrix gibt es hier.

Das gezielte Verbessern des einen Wertes hat oft einen negativen Einfluss auf den jeweils anderen Wert, daher kann der sogenannte F1-Score genutzt werden.
Als gewichtetes harmonisches Mittel der beiden Werte eignet er sich hervorragend, um eine gute Balance der beiden Werte zu bestimmen.
Hier kannst du mehr zum F1-Score erfahren.
## Precision
Die Precision wird folgendermaßen aus den Werten der Konfusionsmatrix berechnet:

$Precision = \frac{True Positive}{True Positive+False Positive}$

Wenn der Nenner zusammengefasst wird, dann lässt sich leicht erkennen welche Aussage die Precision trifft:

$Precision = \frac{True Positive}{Predicted Positive}$

Werden die True Positives und die False Positives addiert, so ergibt sich die Anzahl der Objekte, die der Klassifikator insgesamt als positiv klassifiziert hat. 
Die Precision berechnet also den Anteil der positiv klassifizierten Objekte, die tatsächlich positiv sind.
Dies eignet sich gut zur Feststellung der Rate der False Positives des Klassifikators.
## Recall
Die Precision wird folgendermaßen aus den Werten der Konfusionsmatrix berechnet:

$Recall = \frac{True Positive}{True Positive+False Negative}$

Erneut lässt sich der Nenner zusammenfassen, um die Aussage des Recalls leichter zu erkennen:

$Recall = \frac{True Positive}{Positive}$

True Positive und False Negative ergeben die Menge der Objekte, die tatsächlich positiv sind. 
Der Recall berechnet also wie viele der tatsächlich positiven Objekte der Klassifikator als solche erkannt hat.
Damit läge der Fokus also auf dem Recall, wenn eine Priorität der Klassifikation es wäre False Negatives so gut wie möglich zu vermeiden.

## Berechnung in Python
Obwohl die Werte die Werte leicht mit den Werten der Konfusionsmatrix berechnet werden können, stellt das metrics-Paket trotzdem entsprechende Funktionen zur Berechnung beider Werte bereit. 
So berechnet die Funktion `precision_score()` die Precision und die Funktion `recall_score()` den Recall.
Beiden Funktionen können die gleichen Parameter übergeben werden.

In der Dokumentation des Pakets wird eine Vielzahl an möglichen Parametern vorgestellt. Zum Einstieg und zum Bewerten unserer Klassifikation reicht aber zunächst eine Betrachtung von zwei Parametern. \
Übergebe für den Parameter `y_true` ein Array, welches die korrekten Label für die Objekte, die klassifiziert wurden, enthält. Hierbei handelt es sich um die sogenannte Ground Truth. \
Übergebe für den Parameter `y_pred` ein Array, welches die vorhergesagten Label für die Objekte, die klassifiziert wurden, enthält. Diese erhältst du aus der `predict()` Methode. \

Mit den weiteren optionalen Parametern können bspw. Anpassungen für nicht-binäre Klassifikationen vorgenommen werden. Für weitere Informationen zu den weiteren Parametern lohnt sich ein Blick in die Dokumentation:\
Precision: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.precision_score.html \
Recall: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.recall_score.html

Im Folgenden Code-Abschnitt wird gezeigt, wie die beiden Funktionen aufgerufen werden können.

```python
from sklearn.metrics import precision_score, recall_score
ground_truth = [1,0,1,1,0,1]
predicted_labels = someClassificator.predict(objects_to_predict)
precision = precision_score(y_true = ground_truth, y_pred = predicted_labels)
recall = recall_score(y_true = ground_truth, y_pred = predicted_labels)
``` 