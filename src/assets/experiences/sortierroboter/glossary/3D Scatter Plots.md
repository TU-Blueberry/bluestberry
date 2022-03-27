# 3D Scatter Plots mit Plotly


Mit Plotly können 3D Scanner Plots sowohl mit Hilfe von plotly.express(—s.Glossareintrag) als auch mit go.Scatter3d erstellt werden.

## 3D Scatter Plots mit plotly.express

3D Scatter Plots können mit plotly.express wie folgt erstellt werden:


```python
import plotly.express as px
df = Array mit Klassifizierungen
fig = px.scatter_3d(df, x='sepal_length', y='sepal_width', z=‚petal_width', color='species')
fig.show()
```

![big-image][ScatterPlot]

Beispiel von https://plotly.com/python/3d-scatter-plots/

Hierbei wird mit „import plotly.express as px“ zunächst plotly.express selbst importiert, sodass es genutzt werden kann.
„df“ bezeichnet die Daten, welche im Diagramm genutzt werden sollen.
„fig“ bezeichnet den eigentlichen Diagrammtypen über px.scatter_3d() mit Daten, x, y und z-Achsenbeschriftung, sowie die Farbe in der die Ergebnisse dargestellt werden sollen.
Dabei kann für Color ein Name einer Spalte in df, oder eine Pandas Serie oder ein array_like Objekt genutzt werden.
Als letztes sorgt „fig.show()“ dafür, dass das Diagramm auch angezeigt wird.

## Benutzung von Arrays als Daten:

In Plotly ist es möglich direkt eine Datentabelle als Daten anzugeben. Wenn man allerdings seine eigenen Daten angeben möchte, kann man dazu pandas (—link) nutzen.
Dies könnte wie folgt aussehen:

```python
import pandas as pd

df = pd.DataFrame(dict(
    x = [1, 3, 2, 4],
    y = [1, 2, 3, 4]
))
```
Hier kann man direkt über pandas ein erstelltes Array mit werten als Daten für das Diagramm nutzen.

Mehr zu px.scatter_3d() kannst du hier finden: https://plotly.com/python-api-reference/generated/plotly.express.scatter_3d

## 3D Scatter Plots mit go.Scatter3d

Wenn mit plotly.express nicht der gewünschte Scanner Plot erreicht wurde, kann die Klasse go.Scatter3d aus plotly.graph_objects genutzt werden.

Um go.Scatter3d zu nutzen ist folgende Änderung - an dem Code mit plotly.express - nötig:

```python
import plotly.graph_objects as go 
```
anstatt 
```python
import plotly.express as px
```

```python
fig = go.Figure(data=[go.Scatter3d(x=x, y=y, z=z,
                                   mode=‚markers')]) 
```
anstatt
```python
fig = px.scatter_3d(df, x='sepal_length', y='sepal_width', z=‚petal_width', color='species')
```

Hierbei sind x,y und z Arrays die, die zu benutzenden Werte angeben.

Mehr zu go.Scatter3d kannst du hier finden: https://plotly.com/python/reference/scatter3d/

Mehr zu den Scatter Plots kannst du hier finden: https://plotly.com/python/3d-scatter-plots/

[ScatterPlot]: /89805231-9bd6-4171-ae4b-01e997d5dcfa/hint_files/img/ScatterPlot.png
