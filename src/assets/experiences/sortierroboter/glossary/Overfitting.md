#### Overfitting

Overfitting bedeutet auf deutsch Überanpassung und beschreibt die
Überanpassung eines Algorithmus an die betrachteten Daten. Das bedeutet,
dass der überangepasste Algorithmus die Daten auswendig lernt, ohne ein
Muster zu erkennen. Wird der Algorithmus also später auf anderen Daten
angewendet, liefert er oftmals schlechte Ergebnisse.

Eine Möglichkeit, um Overfitting zu vermeiden ist zum Beispiel das
Unterteilen der Daten in einen Trainings- und Testdatensatz, sodass im
Falle von Overfitting des Algorithmus an die Trainingsdaten beim
Anwenden des Algorithmus auf die Testdaten erkannt werden kann, dass der
Algorithmus überangepasst ist, da die Gütemaße dann geringer sind.

Eine weitere Möglichkeit zur Vermeidung von Overfitting ist, die
Parameter des Algorithmus nicht so weit auf den Trainigsdaten zu
optimieren, dass annähernd optimale Gütemaße herauskommen, sondern die
Parameter mit Blick auf die zugrundeliegenden Daten geschickt zu wählen.
Denn wenn man zum Beispiel einen Random Forest zur Klassifizierung
seiner Daten verwendet und ebenso viele Entscheidungsbäume wie
Beobachtungen im Datensatz verwendet, ist die Gefahr der Überanpassung
sehr hoch[^1].

![Overfitting](overfitting.png){width="70%"}

Wie in der Abbildung zu erkennen ist, findet rechts ein Overfitting
statt. Es sollen hier die rote und die blaue Klasse voneinander getrennt
werden, ein Overfitting ist häufig daran zu erkennen, dass Datenpunkte,
die innerhalb der Datenpunkte einer anderen Klasse liegen richtig
klassifiziert werden und die Trennlinie unerwartete Formen aufweist, um
einzelne Datenpunkte richtig zu klassifizieren.

[^1]: vgl.
    https://databraineo.com/ask-the-doc/overfitting-in-machine-learning/
