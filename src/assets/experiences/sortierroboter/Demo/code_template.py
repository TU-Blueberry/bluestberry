path_prefix = "Demo/"

import imp
plotting =  imp.load_source('plotting.py', path_prefix + 'plotting.py')
plot_model = plotting.plot_model

import numpy as np
import pandas as pd
from sklearn import linear_model
from sklearn.metrics import mean_squared_error, mean_absolute_error

# Hier können die verschiedenen Features aus "data.csv" ausprobiert werden.
column_name = 'Alter'

# Aufteilung in eine unabhängige Variable (X) und eine abhängige Variable (y) für die Regression.
data = pd.read_csv(path_prefix + 'data.csv', delimiter=';')
X = data[column_name].values.reshape(-1, 1)
y = data['Preis']

# Hier den Namen deiner Datei angeben, in der ein passendes Regressions-Objekt erstellt wird.
# Die Datei muss im selben Verzeichnis liegen.
file_name = 'solution.py'

# Importiert das Model.
model_definition = imp.load_source(file_name, path_prefix + file_name)
model = model_definition.model

# Trainiert ein Regressions-Modell.
model.fit(X, y)

# Trifft Vorhersagen anhand des Modells.
# Wir schauen hier nur wie genau unser Model die Trainingsdaten vorhersagen würde.
predictions = model.predict(X)

# Gibt aus wie gut unser Modell (auf den Trainingsdaten) funktioniert.
print("Für eine Vorhersage des Immobilienpreises anhand von \"%s\" beträgt:" % column_name)
print("  - Die mittlere quadratische Abweichung %.2f" % mean_squared_error(y.values, predictions))
print("  - Die mittlere absolute Abweichung %.2f \n" % mean_absolute_error(y.values, predictions))

# Visualisiert das Vorhersagemodell (die Funktionsweise kann in "plotting.py" angepasst werden).
plot_model(X, y, predictions, column_name)

# Das Ausführen des obigen Codes ist mittels des Buttons links außen im Editor möglich.
