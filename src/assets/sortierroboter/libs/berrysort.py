import os
import random

import js
import numpy as np
from skimage import io
from sklearn import metrics

path = "sortierroboter/BlueberryData/TestData/"


class TestDataLoader:
    _loaded_test_data = None

    def _load_images(self):
        loaded_test_data = []
        gaussian_noise = None
        for file in os.listdir(path):
            res = io.imread(path + file)
            res = res.astype("int")
            if gaussian_noise is None:
                gaussian_noise = np.random.normal(0, 3, res.shape).astype("int8")
            res += gaussian_noise
            res = np.clip(res, 0, 255)
            res = res.astype("uint8")
            if 'good' in file:
                label = 1
            elif 'bad' in file:
                label = 0
            else:
                # image with incorrect name format
                continue

            # mod_path = (path + file).replace("TestData", "NoisyTestData")
            # io.imsave(mod_path, res)
            loaded_test_data.append((res, label, path + file))
            random.shuffle(loaded_test_data)
        self._loaded_test_data = loaded_test_data

    def evaluate_metric(self, predict_func, metric=metrics.accuracy_score, **kwargs):
        if self._loaded_test_data is None:
            self._load_images()
        test_images = [entry[0] for entry in self._loaded_test_data]
        y_pred = predict_func(test_images)
        labels = np.array([entry[1] for entry in self._loaded_test_data])
        return metric(y_pred=y_pred, y_true=labels, **kwargs)

    def send_to_unity(self, predict_func):
        if self._loaded_test_data is None:
            self._load_images()
        test_images = [entry[0] for entry in self._loaded_test_data]
        y_pred = predict_func(test_images)

        js.reset()
        
        for i in range(len(self._loaded_test_data)):
            arg = "{},{},{}".format(self._loaded_test_data[i][1], y_pred[i], self._loaded_test_data[i][2])
            js.sendManualBerry(arg)
