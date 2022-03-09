import os

import numpy as np
import pandas as pd
from skimage import io
from skimage import transform
from sklearn import metrics
from sklearn.ensemble import RandomForestClassifier

path = "sortierroboter/BlueberryData/TrainingData/"


def load_images():
    labels = []
    samples = []
    for file in os.listdir(path):
        res = io.imread(path + file)
        samples.append(res)
        if 'good' in file:
            labels.append(1)
        else:
            labels.append(0)
    return samples, labels


def extract_features(images, img_size=28):
    bins = 24
    pre_images = []
    for i in range(len(images)):
        image = images[i]
        mod_image = transform.resize(image, [img_size, img_size], anti_aliasing=True)
        features = np.array(mod_image.flatten())
        for channel in range(image.shape[2]):
            histogram, _ = np.histogram(image[:, :, channel], bins=bins, range=(0, 256))
            features = np.append(features, histogram.flatten())
        pre_images.append(features)

    return pd.DataFrame(np.array(pre_images))


def classifier():
    model = RandomForestClassifier(n_estimators=550, min_samples_split=4,
                                   min_samples_leaf=1, max_features="auto", max_depth=20, bootstrap=True)
    return model


def print_prediction_metrics(prediction_function, test_data_loader):
    accuracy = test_data_loader.evaluate_metric(prediction_function, metric=metrics.accuracy_score)
    f1 = test_data_loader.evaluate_metric(prediction_function, metric=metrics.f1_score)
    class_report = test_data_loader.evaluate_metric(prediction_function, metric=metrics.classification_report, digits=2)

    print("Classifier performance on the test set")
    print("-------------------------------------------------")
    print("Accuracy: {:.3f}".format(accuracy))
    print("F1 score: {:.3f}".format(f1))
    print(class_report)
    print("\n")
