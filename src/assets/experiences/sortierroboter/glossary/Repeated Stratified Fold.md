#### RepeatedStratifiedKFold

Die Funktion RepeatedStratifiedKFold in Sklearn wendet stratifizierte
k-fache Kreuzvalidierung wiederholt an. Der Unterschied zur k-fachen
Kreuzvalidierung besteht darin, dass der Datensatz nicht randomisiert in
disjunkte Partitionen unterteilt wird, sondern stratifiziert. Das
bedeutet die Relationen aller Partitionen bleiben so bestehen, wie sie
auch im gesamten Datensatz sind. Bei einem Datensatz mit guten und
schlechten Blaubeeren, in dem 20% der Beeren das Label *schlecht* und
80% der Blaubeeren das Label *gut* haben, werden stratifiziert $1000$
Daten gezogen, dann haben 20% der Beeren des Teildatensatzes das Label
*schlecht* und 80% der Blaubeeren des Teildatensatzes das Label *gut*.

Vorteile bietet das Stratifizieren dann, wenn die Daten ungleich
verteilt sind.
