#### Kreuzvalidierung

Wie in dem Namen Kreuzvalidierung bereits enthalten, ist dies eine
Methode zur Validierung eines erstellten Modells. Ähnlich wie bei dem
Bootstrapping, wird auch hier der Datensatz in Trainings- und Testdaten
unterteilt, um das Modell auf den Testdaten validieren zu können. Für
die Kreuzvalidierung muss ein Parameter $k$ festgelegt werden, der
beschreibt in wie viele gleich große, disjunkte Teilmengen der
ursprüngliche Datensatz aufgeteilt wird. Häufig wird der Wert $k = 10$
verwendet. Nach der Aufteilung in die Teilmengen wird iteriert. In der
ersten Iteration wird die erste Teilmenge als Testmenge verwendet und
alle anderen Mengen als Trainingsmenge und in der zweiten Iteration wird
die zweite Teilmenge als Testmenge verwendet. Das bedeutet bei $k$
Iterationen ist in der $i$-ten Iteration für $i = 1,..., k$ die $i$-te
Teilmenge die Testmenge, während alle übrigen Teilmengen die
Trainingsdaten bilden.

![Kreuzvalidierung](kreuzvalidierung.jpg){width="70%"}

In der obigen Abbildung ist das Verfahren der Kreuzvalidierung mit vier
Iterationen, auch Faltungen genannt, illustriert.
