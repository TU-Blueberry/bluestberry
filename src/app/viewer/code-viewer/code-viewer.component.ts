import {Component, Input, OnInit} from '@angular/core'
import { PyodideService } from 'src/app/pyodide/pyodide.service'
import { EditorComponent } from 'ngx-monaco-editor'
import { editor } from 'monaco-editor'
import ICodeEditor = editor.ICodeEditor
import {FileTabDirective} from 'src/app/tab/file-tab.directive';

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

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from skimage import io
from sklearn import metrics
from sklearn.dummy import DummyClassifier

import berrytemplates as bt
from berrysort import TestDataLoader

path = "sortierroboter/BlueberryData/"


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
    X_train, y_train = load_images(path + "TrainingData/")
    print("finished loading data")
    print("\\n")

    # extract features from the images
    X_train = extract_features(X_train)

    # build model
    model = DummyClassifier(strategy="uniform")

    # train model
    model.fit(X_train, y_train)

    # evaluate model
    predict_func = lambda X_test: predict_pipeline(X_test, model)

    # example for template methods
    # X_train, y_train = bt.load_images()
    # X_train = bt.extract_features(X_train)
    # model = bt.classifier()
    # model.fit(X_train, y_train)
    # predict_func = lambda X_test: model.predict(bt.extract_features(X_test))
    # bt.print_prediction_metrics(predict_func, tdl)

    tdl.send_to_unity(predict_func)
    acc = tdl.evaluate_metric(predict_func)
    print(acc)


# comment out the following line for own classifier
# js.enableManual()
# js.start()
# js.stop()
# js.sendManualBerry("1,1,THIS IS THE FILEPATH")
# js.sendManualBerry("0,0,THIS IS THE FILEPATH")
# js.sendManualBerry("1,0,THIS IS THE FILEPATH")
# js.sendManualBerry("0,1,THIS IS THE FILEPATH")

main()
`

  constructor(private pyodideService: PyodideService, private fileTabDirective: FileTabDirective) {}

  ngOnInit(): void {
    this.fileTabDirective.dataChanges.subscribe(data => {
        this.code = new TextDecoder().decode(data.content);
    });
  }

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
