# plotly.express

plotly.express ist eine "high-level API", um Figuren zu erstellen, und ist somit meist der erste Weg, um eine gewünschte Figur zu erstellen.

Dabei wird das plotly.express Modul normalerweise als px importiert.
Eine plotly.express Funktion benutzt intern "graph objects", sodass so eine Funktion eine "plotly.grapoh_objects.Figure" Instanz zurück gibt. 

## Von plotly.express derzeit unterstützte Funktionen:

- **Basics**: scatter, line, area, bar, funnel, timeline
- **Part-of-Whole**: pie, sunburst, treemap, icicle, funnel_area
- **1D Distributions**: histogram, box, violin, strip, ecdf
- **2D Distributions**: density_heatmap, density_contour
- **Matrix or Image Input**: imshow
- **3-Dimensional**: scatter_3d, line_3d
- **Multidimensional**: scatter_matrix, parallel_coordinates, parallel_categories
- **Tile Maps**: scatter_mapbox, line_mapbox, choropleth_mapbox, density_mapbox
- **Outline Maps**: scatter_geo, line_geo, choropleth
- **Polar Charts**: scatter_polar, line_polar, bar_polar
- **Ternary Charts**: scatter_ternary, line_ternary

Möchtest du mehr über plotly.express erfahren?
- https://plotly.com/python/plotly-express/
 
