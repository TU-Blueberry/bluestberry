#  Liniendiagramme mit Plotly

Liniendiagramme können sowohl über plotly.express (—s.gloassareintrag) als auch über go.Scatter (—s.Gloassareintrag) erstellt werden.

## Liniendiagramme mit Plotly.express

Man könnte über Plotly.express ein Liniendiagramm wie folgt erstellen:

```python
import plotly.express as px

df = px.data.gapminder().query("country=='Canada'")
fig = px.line(df, x="year", y="lifeExp", title='Life expectancy in Canada')
fig.show()
```

![big-image][easyLinePlot]

Beispiel von https://plotly.com/python/line-charts/

Hierbei wird mit „import Plotly.express as px“ zunächst Plotly.express selbst importiert, sodass es genutzt werden kann.<br>
„df“ bezeichnet die Daten, welche im Diagramm genutzt werden sollen.<br>
„fig“ definiert den eigentlichen Diagrammtypen über px.line() mit Daten, x und y-Achsenbeschriftung und dem Titel.
Als letztes sorgt fig.show() dafür, dass des Diagramm auch angezeigt wird.

Möchte man ergänzend zu dem Beispiel nun noch die Farbe der Linie ändern, ist dies auch möglich. Dazu kann die Variable color in px.line(color=„…“) gesetzt werden.

Wenn man sich das Beispiel ansieht, ist hier nicht zu sehen, welche x und y-Werte eingetragen wurden. So kann man marker einfügen, die es möglich machen, dass man die Koordinaten sieht, an denen ein Datenwert eingetragen wurde.

Folgende Abänderung wäre dafür nötig:

```python
fig = px.line(df, x="year", y="lifeExp", title='Life expectancy in Canada', markers=True)
```

Benutzung von Arrays als Daten:

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

Mehr zu px.line() kann du hier finden:<br> 
https://plotly.com/python-api-reference/generated/plotly.express.line

## Liniendiagramme mit go.Scatter

Wenn mit plotly.espress noch nicht ganz das Liniendiagramm erreicht wurde, was man haben möchte, ist es möglich die Klasse go.Scatter aus Plotly.graph_objets zu nutzen.
Dabei kann go.Scatter sowohl für das Platten von Punkten als auch Linien mit oder ohne Marker benutzt werden.

Ein einfaches Beispiel, wie man mit go.Scatter arbeiten kann kann wie folgt aussehen:

```python
import plotly.graph_objects as go

x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

# Create traces
fig = go.Figure()
fig.add_trace(go.Scatter(x=x, y=[10, 20, None, 15, 10, 5, 15, None, 20, 10, 10, 15, 25, 20, 10],
                    mode='lines',
                    name='lines'))
fig.add_trace(go.Scatter(x=x, y=[15, 21, None, 15, 16, 4, 19, None, 21, 17, 14, 15, 22, 23, 5],
                    mode='lines+markers',
                    name='lines+markers'))
fig.add_trace(go.Scatter(x=x, y=[18, 23, None, 15, 13, 3, 18, None, 27, 11, 14, 14, 20, 21, 9],
                    mode='markers', name='markers'))

fig.show()
```

![big-image][moreLinesLinePlot]


Beispiel von https://plotly.com/python/line-charts/ mit abgeänderten eigenen Werten.

Hierbei wird mit „import plotly.graph_objects as go“ die plotly.graph_objects importiert, damit man go.Scatter nutzen kann.<br>
X und y sind die Arrays, die für die Liniendiagramme als Daten benutzt werden.<br>
Die mode Variable definiert hier, welche Art von Diagramm benutzt werden soll. Nur eine Linie, Linie mit Markern oder nur Marker.<br>
Ein großer Vorteil von go.Scatter() ist es über fig.add_Trace mehrere Linien in einem Diagramm darzustellen. Dies macht Vergleiche, von zum Beispiel Klassifizierungsalgorithmen einfacher.<br>
Am Ende kann dann mit fig.show() das Diagramm angezeigt werden. <br>

Mehr zu go.Scatter kann du hier finden: <br>
https://plotly.com/python/reference/scatter/

Mehr zu Liniendiagrammen findest du hier: <br>
https://plotly.com/python/line-charts/


[easyLinePlot]: /89805231-9bd6-4171-ae4b-01e997d5dcfa/hint_files/img/easyLinePlot.png
[moreLinesLinePlot]: /89805231-9bd6-4171-ae4b-01e997d5dcfa/hint_files/img/moreLinesLinePlot.png

