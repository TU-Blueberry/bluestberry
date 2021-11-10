import os
import js

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from skimage import io
from skimage import transform
from sklearn import metrics
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV, train_test_split, RepeatedStratifiedKFold

RANDOM_STATE = 1
IMG_SIZE = 28

# TODO
path = "path_to_files"

def load_images(path):
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


def augment_images(images, labels):
    augmented_images = ([], [])
    for image, label in zip(images, labels):
        for angle in range(4):
            augmented_image = transform.rotate(image, 45 + 90 * angle) * 255
            augmented_image = augmented_image.astype(np.uint8)
            augmented_images[0].append(augmented_image)
            augmented_images[1].append(label)

    return augmented_images


def extract_features(images, bins=24):
    pre_images = []
    for i in range(len(images)):
        image = images[i]
        mod_image = transform.resize(image, [IMG_SIZE, IMG_SIZE], anti_aliasing=True)
        features = np.array(mod_image.flatten())
        for channel in range(image.shape[2]):
            histogram, _ = np.histogram(image[:, :, channel], bins=bins, range=(0, 256))
            features = np.append(features, histogram.flatten())
        pre_images.append(features)

    return pd.DataFrame(np.array(pre_images))


def print_metrics(y, predictions, set_name):
    accuracy = metrics.accuracy_score(y, predictions)
    f1 = metrics.f1_score(y, predictions)
    tn, fp, fn, tp = metrics.confusion_matrix(y, predictions).ravel()

    print("Random forest performance on the {} set".format(set_name))
    print("-------------------------------------------------")
    print("Accuracy: {:.3f}".format(accuracy))
    print("F1 score: {:.3f}".format(f1))
    print("True negatives: {:d}".format(tn))
    print("False positives: {:d}".format(fp))
    print("False negatives: {:d}".format(fn))
    print("True positives: {:d}".format(tp))
    print(metrics.classification_report(y, predictions))
    print("\n")


def plot_histograms(data, labels, bins=24):
    data = data.to_numpy()
    fig = go.Figure()
    x = [i for i in range(bins)]
    colors = ["red", "green", "blue"]
    line_form = ["dash", "solid"]
    for label in range(2):
        for channel_idx in range(3):
            label_idx = np.array(labels) == label
            hist_idx = IMG_SIZE * IMG_SIZE * 3 + bins * channel_idx
            histogram = data[label_idx, hist_idx:hist_idx + bins]
            histogram = np.mean(histogram, axis=0)
            name = "histogram for {}, class {}".format(colors[channel_idx], "good" if label == 1 else "bad")
            fig.add_trace(go.Scatter(x=x, y=histogram, name=name,
                                     line=dict(color=colors[channel_idx], dash=line_form[label]), marker={"size": 10}))
    fig.update_traces(mode="lines+markers")
    fig.update_xaxes(title_text="bucket")
    fig.update_yaxes(title_text="frequency")
    fig.show()


def visualize_wrong_predictions(X, y, predictions):
    for i in range(len(predictions)):
        if y[i] != predictions[i]:
            fig = px.imshow(
                X.iloc[i].to_numpy(dtype=np.uint8)[:(IMG_SIZE * IMG_SIZE * 3)].reshape([IMG_SIZE, IMG_SIZE, 3]))
            fig.show()


def hyperparameters_search(fixed_hyperparams=False):
    if fixed_hyperparams:
        model = RandomForestClassifier(random_state=RANDOM_STATE, n_estimators=550, min_samples_split=4,
                                       min_samples_leaf=1, max_features="auto", max_depth=20, bootstrap=True)
        return model

    randfor = RandomForestClassifier(random_state=RANDOM_STATE)
    parameters = {
        "n_estimators": [int(x) for x in np.linspace(start=50, stop=750, num=15)],
        "max_features": ["auto", "sqrt"],
        "min_samples_leaf": [1, 2, 4, 6],
        "min_samples_split": [2, 4, 8],
        "max_depth": [5, 10, 20]
    }
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=RANDOM_STATE)
    model = RandomizedSearchCV(estimator=randfor, scoring="f1_macro", param_distributions=parameters, n_iter=25, cv=cv,
                               verbose=50, n_jobs=8, random_state=RANDOM_STATE)

    return model


def send_to_unity(labels, predictions):
    str_labels = np.char.mod("%d", labels).tolist()
    str_labels = ",".join(str_labels)
    print(str_labels)
    js.sendTraits(str_labels)

    str_predictions = np.char.mod("%d", predictions).tolist()
    str_predictions = ",".join(str_predictions)
    print(str_predictions)
    js.sendClassification(str_predictions)


def main():
    bins = 32

    # load images
    X_train, y_train = load_images(path + "TrainingData/")
    X_test, y_test = load_images(path + "TestData/")

    print("finished loading data")

    # X_train, y_train = augment_images(X_train, y_train)
    X_train, X_test = extract_features(X_train, bins=bins), extract_features(X_test, bins=bins)
    plot_histograms(X_train, y_train, bins=bins)

    # build model pipeline and hyperparameter search
    fixed_hyperparams = True
    model = hyperparameters_search(fixed_hyperparams=fixed_hyperparams)

    # train model
    model.fit(X_train, y_train)
    train_predictions = model.predict(X_train)
    print_metrics(y_train, train_predictions, "training")

    if not fixed_hyperparams:
        print("Best score on training set: {:.4f}", model.best_score_)
        print("Best hyperparameters: ", model.best_params_)

    # evaluate model
    predictions = model.predict(X_test)
    print_metrics(y_test, predictions, "test")

    # visualize_wrong_predictions(X_test, y_test, predictions)
    send_to_unity(y_test, predictions)

    return model, predictions


if __name__ == '__main__':
    main()
