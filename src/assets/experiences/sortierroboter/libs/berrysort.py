import os
import random

import js
import numpy as np
from skimage import io
from sklearn import metrics

path = "BlueberryData/TestData/"


class TestDataLoader:
    _loaded_test_data = None

    def _load_images(self):
        # TODO fix for later version
        # if not os.path.isdir("BlueberryData/NoisyTestData/"):
        #     os.makedirs("BlueberryData/NoisyTestData/")
        loaded_test_data = []
        gaussian_noise = None
        for file in os.listdir(path):
            res = io.imread(path + file)
            res = res.astype("int")
            if gaussian_noise is None:
                gaussian_noise = np.random.normal(0, 3, res.shape).astype("int8")
            res += gaussian_noise
            res = np.clip(res, 0, 255)
            res = res.astype("int")
            if 'good' in file:
                label = 1
            elif 'bad' in file:
                label = 0
            else:
                # image with incorrect name format
                continue

            image_path = path + file
            #mod_path = (path + file).replace("TestData", "NoisyTestData")
            #io.imsave(mod_path, res)
            loaded_test_data.append((res, label, image_path))
            #print(loaded_test_data[len(loaded_test_data)-1])
            #BlueberryData/TestData/good_91.JPG

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
            arg = "{},{},{}".format(self._loaded_test_data[i][1], int(y_pred[i]), self._loaded_test_data[i][2])
            js.sendManualBerry(arg)
