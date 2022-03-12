import os

import pandas as pd
import numpy as np
from skimage import io

import berrytemplates as bt
from sklearn.metrics import accuracy_score

from berrysort import TestDataLoader

path = "BlueberryData/TrainingData/"


# Lade die Bilder und deren Klasse. Gute Beeren bekommen die Klasse 1, schlechte Beeren die Klasse 0.
# Betrachte die Dateinamen, um festzustellen, wie zwischen guten und schlechten Beeren unterschieden werden kann.
def load_images(path):
    samples = []
    labels = []
    for file in os.listdir(path):
        img = io.imread(path + file)

        # HIER DEIN CODE

    return samples, labels


# Um mehr Bilder für das Training zu haben, kannst du die Bilder duplizieren und leicht verändern.
def augment_images(images, labels):
    # Die neu erzeugten Bilder brauchen auch Labels/Klassen.
    augmented_images = ([], [])

    # HIER DEIN CODE

    return augmented_images


# Extrahiere eigene Merkmale aus den Bilddaten.
def extract_features(images):
    features_images = []
    for i in range(len(images)):
        features = []

        features_images.append(features)

    df_features = pd.DataFrame()
    # Wandle die erhaltenen Merkmale in ein Pandas DataFrame um.
    # HIER DEIN CODE

    return df_features


# Diese Methode wird an die Simulation übergeben. Sie erhält den Testdatensatz mit den Bildern und das trainierte Model.
# Der Prozess von der Vorverarbeitung bis zur Klassifikation muss in dieser Methode passieren. Falls eigene Änderungen
# an der Pipeline gemacht werden, füge sie hier ein.
def predict_pipeline(X_test, model):
    X_test = extract_features(X_test)
    return model.predict(X_test)


# Falls du eine Hyperparameter-Suche machen möchtest, kannst du dies in dieser Methode machen.
def hyperparameters_search(model, parameters):
    return None


def main():
    # Diese Zeile nicht löschen. Der TestDataLoader wird benötigt, um die Testdaten zu nutzen und die Klassifikation
    # zur Simulation zu schicken.
    tdl = TestDataLoader()

    # Lade zunächst die Trainingsdaten mit der eigenen Methode. X_train bezeichnet die Bilder, y_train die Klassen.
    X_train, y_train = None, None
    print("finished loading data")

    # Verarbeite hier die Daten vor. Du kannst z.B. die Merkmalsextraktion oder die Augmentation nutzen.
    # Zudem kannst du auch vorerst den Trainingsdatensatz in Trainingsdaten und Validierungsdaten aufteilen.
    X_train, X_test = None, None

    # Baue ein Modell und führe ggf. eine Hyperparameter-Suche aus.
    model = None

    # Trainiere das Modell. Normalerweise geschieht dies über eine Methode des Modells.

    # Falls du den Datensatz in Trainingsdaten und Validierungsdaten aufgeteilt hast, kannst du hier dein Modell testen.

    # Wandle die Pipeline zum Klassifizieren in eine Funktion um.
    predict_func = lambda X_test: predict_pipeline(X_test, model)

    # Hiermit kannst du die Testdaten klassifizieren und die Ergebnisse in der Simulation anzeigen lassen.
    tdl.send_to_unity(predict_func)

    # Falls du Metriken ausgewertet haben möchtest, kannst du dies mit
    # tdl.evaluate_metric(predict_func, metric=...) machen.
    acc = tdl.evaluate_metric(predict_func, metric=accuracy_score)

    return model


main()
