#### Split

Jeder Knoten eines Entscheidungsbaums wird geteilt, sofern es kein Blatt
ist. Denn ein Blatt eines Entscheidungsbaums ist ein Knoten, der keine
nachfolgenden Knoten hat. Diese Teilung der Knoten nennt man Split.
Dabei gibt es eine große Anzahl an Splitkriterien, denn die Güte eines
Entscheidungsbaums hängt maßgeblich von den verwendeten Splitkriterien
ab. Es sind sowohl binäre Splits als auch Mehrfachsplits möglich.

#### Splitkriterien

Die Splitkriterien werden auf der Basis verschiedener Gütemaße bewertet.
Generell gilt ein guter Split bringt reine Knoten hervor. Das bedeutet
Knoten, die möglichst vollständig klassifizieren.

**Gini Index**: Der Gini Index ist ein Maß für Unreinheit. Je höher der
Gini Index, desto größer ist die Unreinheit und je niedriger der Index
desto geringer ist die Unreinheit. Wird der Gini Index als
Splitkriterium verwendet, entstehen bevorzugt viele Knoten.

**Information Gain**: Der Information Gain wird mithilfe der Entropie
berechnet und ist maximal, wenn in der Trainingsmenge eine
Normalverteilung der Klassen vorliegt und minimal, wenn alle Daten zu
der gleichen Klassen gehören. Ein Nachteil ist, dass auch der
Information Gain Knoten mit wenig Daten, aber reiner Klassifizierung
bevorzugt und ähnlich wie bei dem Gini Index viele Knoten entstehen.

**Gain Ratio**: Die Gain Ratio wird mithilfe des Information Gains
berechnet und gibt intuitiv an wie hoch der Gewinn geteilt durch die
erwartete Entropie ist. Der Information Gain wird also geteilt durch die
Entropie der Partitionierung. Daher werden Partitionierungen mit einer
hoher Entropie benachteiligt. Ein Nachteil dieses Maßes ist, dass es
weniger gute Ergebnisse liefert, wenn die Anzahl an Klassen groß ist.

**Classification Error**: Dieses Maß bestimmt den Klassifikationsfehler
für jeden Knoten. Das Minimum liegt hier genauso wie beim Information
Gain vor, wenn alle Daten zu der gleichen Klasse gehören und das Maß
wird maximiert, wenn eine Normalverteilung aller Daten vorliegt. Dieses
Maß ist häufig kein gutes Splitkriterium, da die Daten häufig
unbalanciert sind und das Maß häufig gleiche Werte liefert, aber
hilfreich für das spätere Prunen des Entscheidungsbaums.
