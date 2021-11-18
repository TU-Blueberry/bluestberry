import { Component, OnInit } from '@angular/core'
import { PyodideService } from 'src/app/pyodide/pyodide.service'
import { EditorComponent } from 'ngx-monaco-editor'
import { editor } from 'monaco-editor'
import ICodeEditor = editor.ICodeEditor

@Component({
  selector: 'app-code-viewer',
  templateUrl: './code-viewer.component.html',
  styleUrls: ['./code-viewer.component.scss'],
})
export class CodeViewerComponent implements OnInit {
  private editor!: ICodeEditor
  editorOptions = {
    theme: 'vs-dark',
    language: 'python',
    lineNumbersMinChars: 3,
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
  }
  code = `import os
import js

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from skimage import io
from sklearn import metrics
from sklearn.dummy import DummyClassifier

# TODO
path = "BlueberryData/"


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
    print("\\n")


def send_to_unity(labels, predictions):
    # do not touch this function
    str_labels = np.char.mod("%d", labels).tolist()
    str_labels = ",".join(str_labels)
    print(str_labels)
    js.sendTraits(str_labels)

    str_predictions = np.char.mod("%d", predictions).tolist()
    str_predictions = ",".join(str_predictions)
    print(str_predictions)
    js.sendClassification(str_predictions)


def plot_results(predictions):
    # plot the number of images classified as 0 (bad)
    count_good = sum(predictions)
    fig = go.Figure(data=[
        go.Bar(name="good blueberries", x=["good"], y=[count_good])
    ])
    # plotly does not work yet
    # fig.show()


def main():
    # load images
    X_train, y_train = load_images(path + "TrainingData/")
    X_test, y_test = load_images(path + "TestData/")
    print("finished loading data")
    print("\\n")

    # extract features from the images
    X_train, X_test = extract_features(X_train), extract_features(X_test)

    # build model
    model = DummyClassifier()

    # train model
    model.fit(X_train, y_train)

    # evaluate model
    predictions = model.predict(X_test)
    print_metrics(y_test, predictions, "test")
    plot_results(predictions)

    send_to_unity(y_test, predictions)

# comment the following line out for own classifier
send_to_unity(np.array([1,0,1,1,0,1,0]), np.array([1,0,0,1,1,1,0]))
#main()`

  constructor(private pyodideService: PyodideService) {}

  ngOnInit(): void {}

  executeCode(): void {
    this.pyodideService.runCode(this.code).subscribe()
  }

  editorInit(editor: any) {
    this.editor = editor
  }

  undo(): void {
    this.editor?.trigger(null, 'undo', '')
  }

  redo(): void {
    this.editor?.trigger(null, 'redo', '')
  }
}
