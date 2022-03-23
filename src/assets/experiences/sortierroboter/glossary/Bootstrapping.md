#### Bootstrapping

Das Bootstrapping ist eine Methode zur Aufteilung eines Datensatzes in
Trainings- und Testdaten. Dabei wird häufig der sogenannte $.632$
bootstrap verwendet. Die Besonderheit des Bootstrappings ist, dass N-mal
aus dem gesamten Datensatz mit Zurücklegen gezogen wird. Die Testdaten
enthalten dann nur die Beobachtungen, die in keinem Durchlauf gezogen
wurden. Der Name .632 bootsrap ist darauf zurückzuführen, dass im Mittel
$63.2\%$ aller Daten in der Trainigsmenge und $36.8\%$ in der Testmenge
enthalten sind.

![big-image][Bootstrapping]

In der obigen Abbildung ist das Aufteilen eines Datensatzes in
Trainings- und Testdaten mit der Bootstrap-Methode zu sehen. Das Ziehen
mit Zurücklegen ist gegeben, da in den Trainingsmengen einige
Beobachtungen mehrfach auftauchen. Alle nicht gezogenen Beobachtungen
bilden jeweils die Testmenge.


[Bootstrapping]: assets/experiences/sortierroboter/hint_files/img/bootstrapconcept.png