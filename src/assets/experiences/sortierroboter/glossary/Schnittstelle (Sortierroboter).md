# Schnittstelle von Nutzercode und Simulation: #

## 1. berrysort ##

Das Modul "berrysort" enthält eine Klasse "TestDataLoader", mit der die Testdaten genutzt werden können.
Es definiert folgende Methoden:

### evaluate_metric(predict_func, metric=metrics.accuracy_score, **kwargs) ###

"predict_func" stellt die Funktion dar, die auf die Bilddaten angewendet werden soll.
Falls die Daten also noch vorverarbeitet werden sollen, z.B zum Extrahieren von Merkmalen, müssen
diese Schritte auch in der "predict_func" übergeben werden.
"metric" steuert die Metrik, die auf die vorhergesagten Klassen und tatsächlichen Klassen angewandt werden soll.
Mittels "kwargs" können weitere Parameter an die Funktion übergeben werden.

Die Funktion predict_func muss eine Liste oder ein Numpy-Array mit
der Größe der Eingabedaten zurückgeben. Die erlaubten Werte sind
1 und 0 für gute bzw. schlechte Beeren. Der Datentyp wird
automatisch in einen int umgewandelt.

Die Rückgabe ist das Ergebnis der Metrik.


### send_to_unity(predict_func) ###

"predict_func" stellt die Funktion dar, die auf die Bilddaten angewendet werden soll.
Falls die Daten also noch vorverarbeitet werden sollen,  z.B zum Extrahieren von Merkmalen, müssen
diese Schritte auch in der "predict_func" übergeben werden.

Die Funktion predict_func muss eine Liste oder ein Numpy-Array mit
der Größe der Eingabedaten zurückgeben. Die erlaubten Werte sind
1 und 0 für gute bzw. schlechte Beeren. Der Datentyp wird
automatisch in einen int umgewandelt.


## 2. berrytemplates ##

Das Modul "berrytemplates" stellt Methoden bereit, die zusammen eine gute Klassifikation der Blaubeeren erlauben.
Folgende Methoden werden angeboten:

### load_images() ###

Lädt die Trainingsdaten.

Die Rückgabe ist ein Tupel von Bilddaten und deren Klassen.


### extract_features(images, img_size=28) ###

Bietet eine mögliche Merkmalsextraktion an.
"images" ist die Eingabe der Bilddaten.
"img_size" beschränkt die Größe der Bilddaten, die genutzt wird.

Die Eingabe sollte, wenn möglich, im gleichen Format wie
die Rückgabe von load_images() sein.
Die Rückgabe ist ein Pandas DataFrame mit den Merkmalen.


### classifier() ###

Gibt einen Klassifizierer zurück, der gut auf den Daten von
extract_features funktioniert.
Dieser muss noch auf den Trainingsdaten trainiert werden!


### print_prediction_metrics(predict_funct, test_data_loader) ###

Gibt die Auswertung des Klassifizierers mit den Testdaten in der Konsole aus.
"predict_func" stellt die Funktion dar, die auf die Bilddaten angewendet werden soll.
Falls die Daten also noch vorverarbeitet werden sollen, Merkmale extrahiert werden, müssen
diese Schritte auch in der "predict_func" übergeben werden.
"test_data_loader" ist der TestDataLoader aus dem Modul berrysort.
