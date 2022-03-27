# Konfusionsmatrix
Die Konfusionsmatrix bildet die Grundlage für die Beurteilung eines Klassifikators. Um die Konfusionsmatrix aufzustellen werden zunächst die Label/Klassen für die Trainings- oder die Testdatenmenge mit dem Klassifikator vorhergesagt. Danach werden die vorhergesagten Label mit der Ground Truth, also den erwarteten korrekten Labeln verglichen. Dieser Vergleich resultiert bei einer binären Klassifikation in einer Einteilung in vier Klassen: **True Positive, False Positive, True Negative, False Negative**.

### True Positive
Stimmen das vorhergesagte Label und das tatsächliche Label überein und das Label ist positiv, dann handelt es sich um ein True Positive.

### False Positive
Bei einem False Positive wird ein positives Ergebnis vorhergesagt, obwohl das tatsächliche Ergebnis negativ ist. Die Label stimmen also nicht überein.

### True Negative
Stimmen das vorhergesagte Label und das tatsächliche Label überein und das Label ist negativ, dann handelt es sich um ein True Negative.

### False Negative
Bei einem False Negative wird ein negatives Ergebnis vorhergesagt, obwohl das tatsächliche Ergebnis positiv ist. Die Label stimmen also nicht überein.

![big-image][confusion_matrix]
## Berechnung in Python
Die Werte der Konfusionsmatrix können in Python entweder berechnet werden, indem über jedes klassifizierte Objekt iteriert wird und das vorhergesagte Label mit der Ground Truth verglichen wird, oder mit der Funktion `confusion_matrix()` aus dem metrics-Paket von sklearn. Sie gibt bei $n$ Klassen ein $n$-dimensionales Array zurück. Im binären Fall also die Konfusionsmatrix wie sie oben beschrieben ist. Um die Werte auf vier Variablen zu verteilen kann der Funktionsaufruf mit der `ravel` Funktion kombiniert werden.

Übergebe für den Parameter `y_true` ein Array, welches die korrekten Label für die Objekte, die klassifiziert wurden, enthält. Hierbei handelt es sich um die sogenannte Ground Truth. \
Übergebe für den Parameter `y_pred` ein Array, welches die vorhergesagten Label für die Objekte, die klassifiziert wurden, enthält. Diese erhältst du aus der `predict()` Methode. \
Es gibt weitere Parameter mit welchen die Werte der Matrix bspw. normalisiert, oder die zu klassifizierenden Objekte gewichtet werden können. Mehr dazu erfährst du in der Dokumentation des Pakets:\
 https://scikit-learn.org/stable/modules/generated/sklearn.metrics.confusion_matrix.html

Im Folgenden wird gezeigt, wie ein einfacher Aufruf der Funktion `confusion_matrix()` aussehen kann.

```python
from sklearn.metrics import confusion_matrix
ground_truth = [1,1,0,1,0,0,0]
predicted_labels = some_classificator.predict(objects_to_predict)
tn, fp, fn, tp = confusion_matrix(y_true = ground_truth, y_pred = predicted_labels).ravel()
```


[confusion_matrix]: /89805231-9bd6-4171-ae4b-01e997d5dcfa/hint_files/img/konfusionsmatrix.png