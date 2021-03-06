import os

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from skimage import io
from sklearn import metrics
from sklearn.dummy import DummyClassifier

import berrytemplates as bt
from berrysort import TestDataLoader

# Der Pfad zu den Trainingsdaten
path = "BlueberryData/TrainingData/"


def load_images(path):
    # load images and their labels
    samples = []
    labels = []

    # os.listdir(path) returns a list of files and folders in the folder
    for file in os.listdir(path):
        res = io.imread(path + file)
        samples.append(res)
        if 'good' in file:
            labels.append(1)
        elif 'bad' in file:
            labels.append(0)
        else:
            # image with incorrect name format
            continue
    return samples, labels


def extract_features(images):
    # example for feature extraction
    features = []
    for i in range(len(images)):
        image = images[i]
        # since the images are 64x64, we get the middle pixel rgb values as features
        middle_pixel = image[32, 32, :]
        features.append(middle_pixel)

    # convert to DataFrame for classifier
    return pd.DataFrame(np.array(features))


def print_metrics(y, predictions, set_name="test"):
    # extend for more metrics
    accuracy = metrics.accuracy_score(y, predictions)

    print("Classifier performance on the {} set".format(set_name))
    print("-------------------------------------------------")
    print("Accuracy: {:.3f}".format(accuracy))
    print("\n")


def plot_results(predictions):
    # plot the number of images classified as 0 (bad)
    count_good = sum(predictions)
    fig = go.Figure(data=[
        go.Bar(name="good blueberries", x=["good"], y=[count_good])
    ])
    # plotly does not work yet
    # fig.show()


def predict_pipeline(X_test, model):
    X_test = extract_features(X_test)
    return model.predict(X_test)


def main():
    # required line to work with the test data
    tdl = TestDataLoader()
    # load images
    X_train, y_train = load_images(path)
    print("finished loading data")
    print("\n")

    # extract features from the images
    X_train = extract_features(X_train)

    # build model
    model = DummyClassifier(strategy="uniform")

    # train model
    model.fit(X_train, y_train)

    # evaluate model
    predict_func = lambda X_test: predict_pipeline(X_test, model)

    # examples for template methods
    # X_train, y_train = bt.load_images()
    # X_train = bt.extract_features(X_train)
    # model = bt.classifier()
    # model.fit(X_train, y_train)
    # predict_func = lambda X_test: model.predict(bt.extract_features(X_test))
    # bt.print_prediction_metrics(predict_func, tdl)

    tdl.send_to_unity(predict_func)
    acc = tdl.evaluate_metric(predict_func)
    print(acc)


main()
