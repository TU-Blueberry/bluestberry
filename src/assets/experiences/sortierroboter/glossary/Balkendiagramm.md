#  Balkendiagramme mit Plotly

Mit Plotly können Balkendiagramme sowohl mit Hilfe von plotly.express(—s.Glossareintrag) als auch mit go.Bar (— s.Gloassareintrag) erstellt werden.

## Balkendiagramme könnten mit plotly.express wie folgt erstellt werden:

```python
import plotly.express as px
df = px.data.gapminder().query("country == 'Canada'")
fig = px.bar(df, x='year', y='pop')
fig.show()
```

![medium-image][easyBarPlot]

Beispiel von https://plotly.com/python/bar-charts/

Hierbei wird mit „import plotly.express as px“ zunächst plotly.express selbst importiert, sodass es genutzt werden kann.
„df“ bezeichnet die Daten, welche im Diagramm genutzt werden sollen.<br>
„fig“ bezeichnet den eigentlichen Diagrammtypen über px.line() mit Daten, x und y-Achsenbeschriftung.<br>
Als letztes sorgt „fig.show()“ dafür, dass das Diagramm auch angezeigt wird.<br>

Möchte man dem Diagramm zusätzlich noch einen Titel geben, geht das mit Hilfe von px.bar(title=„…“). Auch kann man eine spezifische Farbe oder Farbspektrum angeben, welche die Balken haben sollen. Dies erricht man mit Hilfe von px.bar(color=„…“).

## Benutzung von Arrays als Daten:

In Plotly ist es möglich direkt eine Datentabelle als Daten anzugeben. Wenn man allerdings seine eigenen Daten angeben möchte, kann man dazu pandas (—link) nutzen.<br>
Dies könnte wie folgt aussehen:

```python
import pandas as pd

df = pd.DataFrame(dict(
    x = [1, 3, 2, 4],
    y = [1, 2, 3, 4]
))
```

Hier kann man direkt über pandas ein erstelltes Array mit werten als Daten für das Diagramm nutzen.

Mehr zu px.bar() kannst du hier finden: <br>
https://plotly.com/python-api-reference/generated/plotly.express.bar

## Balkendiagramme mit go.Bar

Wenn mit plotly.express nicht ganz das zufriedenstellende Balkendiagramm erreicht wurde, kann die Klasse go.Bar aus Plotly.graph_objects genutzt werden.

Ein einfaches Beispiel, wie man mit go.Bar arbeiten kann, sähe wie folgt aus:

```python
import plotly.graph_objects as go
animals=['giraffes', 'orangutans', 'monkeys']

fig = go.Figure(data=[
    go.Bar(name='SF Zoo', x=animals, y=[20, 14, 23]),
    go.Bar(name='LA Zoo', x=animals, y=[12, 18, 29])
])
# Change the bar mode
fig.update_layout(barmode='group')
fig.show()
```
![medium-image][twoBarPlot]

Beispiel von https://plotly.com/python/bar-charts/

Hierbei wird mit „import plotly.graph_objects as go“ die plotly.graph_objects importiert, damit man go.Bar nutzen kann.<br>
X und y sind die Arrays die für die Balkendiagramme als Daten benutzt werden.<br>
fig.update_layout(barmode=‚group') definiert, wie das Balkendiagramm angeordnet wird. In diesem Fall nebeneinander. Es gibt aber auch zum Beispiel „barmode=‚stack‘". Hierbei werden je die zwei Balken, welche derzeit nebeneinander angeordnet sind, übereinander geordnet.<br>

Möchte man nun zum Beispiel mehr Daten im Balkendiagramm darstellen, geht dies mit der Benutzung von fig.add_trace().<br>
Ein Beispiel dazu könnte wie folgt aussehen:

```python
import plotly.graph_objects as go

years = ['2016','2017','2018']

fig = go.Figure()
fig.add_trace(go.Bar(x=years, y=[500, 600, 700],
                base=[-500,-600,-700],
                marker_color='crimson',
                name='expenses'))
fig.add_trace(go.Bar(x=years, y=[300, 400, 700],
                base=0,
                marker_color='lightslategrey',
                name='revenue'
                ))

fig.show()
```

![medium-image][moreBarPlots]

Beispiel von https://plotly.com/python/bar-charts/


Mehr zu go.Bar kannst du hier finden: <br>
https://plotly.com/python/reference/bar/

Mehr zu Liniendiagrammen findest du hier: <br>
https://plotly.com/python/bar-charts/

[easyBarPlot]: ../hint_files/img/easyBarPlot.png
[twoBarPlot]: ../hint_files/img/twoBarPlot.png
[moreBarPlots]: ../hint_files/img/moreBarPlots.png
