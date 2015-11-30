App.prototype._getTemplate = function(id) {
  var tmpl = '<!DOCTYPE html>\
    <meta charset="utf-8">\
    <link rel="stylesheet" href="http://js.arcgis.com/3.14/esri/css/esri.css">\
    <link rel="stylesheet" type="text/css" href="https://rawgit.com/benheb/legend/master/legend.css">\
    <title>Webmap created with Mundi</title>\
    <style>\
      #map {\
        height:500px;\
      }\
      #mundi-link {\
        position: absolute;\
        right: 5px;\
        z-index: 200;\
        display: block;\
        background: #FFF;\
        text-decoration: none;\
        color: #4C4C4C;\
        top: 5px;\
        padding: 5px;\
        border-radius: 2px;\
      }\
      #legend-container {\
        width: 218px;\
        position: absolute;\
        bottom: 20px;\
        left: 13px;\
      }\
    </style>\
    <body>\
    <div id="map">\
      <a id="mundi-link" href="http://benheb.github.io/mundi/?id='+id+'" target="_blank">View map in Mundi</a>\
      <div id="legend-container"></div>\
    </div>\
    <script src="//code.jquery.com/jquery-1.11.3.min.js"></script>\
    <script src="//code.jquery.com/jquery-migrate-1.2.1.min.js"></script>\
    <script src="https://rawgit.com/benheb/legend/master/sortable.js"></script>\
    <script src="http://js.arcgis.com/3.14/"></script>\
    <script src="https://rawgit.com/benheb/legend/master/legend.js"></script>\
    <script>\
    require(["esri/map","esri/urlUtils","esri/arcgis/utils","esri/layers/FeatureLayer","esri/renderers/SimpleRenderer","esri/renderers/jsonUtils","dojo/domReady!"],\
      function(Map,urlUtils,arcgisUtils,FeatureLayer,SimpleRenderer,jsonUtils) {\
      var legend = new Legend("legend-container", {\
        editable: false,\
        layers: []\
      });\
      $.getJSON("https://api.github.com/gists/'+id+'", function(data) {\
        var webmap;\
        for (var file in data.files ) {\
          if ( file !== "index.html" ) {\
            webmap = JSON.parse(data.files[file].content);\
          }\
        };\
        arcgisUtils.createMap(webmap, "map").then(function(response){\
          var map = response.map;\
          map.graphicsLayerIds.forEach(function(layer) {\
            var layer = map.getLayer(layer);\
            layer.setMinScale(0);\
            layer.setMaxScale(0);\
            layer.redraw();\
            legend.addLayer({\
              "id": layer.id,\
              "name": layer.name,\
              "renderer": layer.renderer.toJson()\
            });\
          });\
        });\
      });\
    });\
    </script>\
    </body>';


  //console.log('tmpl', tmpl);
  var options = {
    "indent":"auto",
    "indent-spaces":2,
    'quiet': 'yes',
    'tidy-mark': 'no'
  }
  tmpl = tidy_html5(tmpl, options);
  //console.log('tmpl', tmpl);
  return tmpl;

};