import plotly.graph_objects as go
import js

def plot_model(X, y, predictions, column_name):
  fig = go.Figure()

  fig.update_layout(legend=dict(
      yanchor="top",
      y=0.99,
      xanchor="left",
      x=0.01
  ))

  fig.add_trace(go.Scatter(x=X.flatten(), y=y,
                      mode='markers',
                      name='Echter Immobilenpreis'))
  fig.add_trace(go.Scatter(x=X.flatten(), y=predictions,
                      mode='lines',
                     name='Vorhersage anhand von "' + column_name + '"'))
  fig_html = fig.to_html()
  js.sendPlotlyHtml(fig_html)
