
(function(window){
  'use strict';

  var App = function App( options ) {
    var self = this;

    this.map = null;
    this.layers = [];
    this.extent = [[-115.85, -38.82],[119.25, 52.58]];
    this.snippet = 'This is a new map';
    this.title = 'New Map';
    this.webmap = {};

    this.defaultWebMap = {};
    this.defaultWebMap.item = {
      "title": this.title,
      "snippet": this.snippit,
      "extent": this.extent
    };
    this.defaultWebMap.itemData = {
      "baseMap": {
        "baseMapLayers": [{
            "opacity": 1,
            "visibility": true,
            "url": "http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer"
          },
          {
            "opacity": 0.3,
            "visibility": true,
            "url": "http://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer"
          }],
        "title": "basemap"
      },
      "version": "1.0"
    };

    this.getWebMap();
    this._setDefaultRenderers();
    this._initMap();
    this._wire();

    var search = new OpenSearch('search-container', {});

  };



  App.prototype.getWebMap = function() {
    var json = localStorage.getItem('webMapJson');
    console.log('LOAD JSON:', JSON.parse(json));

    if ( json ) {
      this.webmap = JSON.parse(json);
      this._layersFromWebMapJson();
    } else {
      this.webmap = this.defaultWebMap;
      console.log('this.webmap.extent', this.webmap.extent);
    }

    window.webmap = this.webmap;
  }



  App.prototype._initMap = function() {
    var self = this;

    require([
      "esri/map",
      "esri/urlUtils",
      "esri/arcgis/utils",
      "esri/layers/FeatureLayer", 
      "esri/renderers/SimpleRenderer", 
      "esri/renderers/jsonUtils",
      "dojo/domReady!"
    ], function(
      Map,
      urlUtils, 
      arcgisUtils,
      FeatureLayer, 
      SimpleRenderer,
      jsonUtils
    ) { 

      self.FeatureLayer = FeatureLayer;
      self.SimpleRenderer = SimpleRenderer;
      self.jsonUtils = jsonUtils;

      arcgisUtils.createMap(self.webmap, "map", {
        mapOptions: {
          minZoom: 2
        }
      }).then(function(response){
        self.map = response.map;

        self.map.on('extent-change', function() {
          self._updateExtent();
        });

      });

    });
  }





  App.prototype.addLayerToMap = function(service,id) {
    var self = this;
    var type;

    if ( this.malette ) { 
      this.malette.destroy(); 
    }

    var layer = new this.FeatureLayer(service, {
      mode: this.FeatureLayer.MODE_ONDEMAND,
      outFields: ['*']
    });

    this.map.addLayer(layer);

    //add to layers list
    this.layers.push({
      url: service,
      visibility: true,
      opacity: 0.78,
      mode:1, 
      title: layer.name,
      id: layer.id,
      layerDefinition: {
        drawingInfo: {
          renderer: {}
        }
      }
    });

    layer.on('load', function() {
      layer.minScale = 0; 
      layer.maxScale = 0;

      console.log('layer loaded!', layer);
      switch(layer.geometryType) {
        case 'esriGeometryPoint': 
          type = 'point';
          break;
        case 'esriGeometryPolygon': 
          type = 'polygon';
          break;
        default: 
          type = 'point';
      }
      
      var merc = self.isWebMercator(layer.spatialReference);
      if ( merc ) {
        self.map.setExtent(layer.fullExtent.expand(2), false);
      } else {
        self.projectGeometries(layer.fullExtent.spatialReference.wkid, 102100, 'esriGeometryEnvelope', layer.fullExtent )
          .done(function(data){
            //console.log('data', data);
            var prjExtJson = data.geometries[0];
            prjExtJson.spatialReference = {wkid: 102100};
            var prjExt = new esri.geometry.Extent(prjExtJson);
            self.map.setExtent(prjExt.expand(2), false);
          })
      }

      var json = self.renderers[type];
      var rend = new self.SimpleRenderer(json);
      layer.setRenderer(rend);
      layer.redraw();

      self._updateLayers(service, rend);

      $.getJSON('http://opendata.arcgis.com/datasets/' + id + '.json', function(res) {
        var fields = res.data.fields;
        var name = res.data.name;
        self.malette = new Malette('map', {
          title: name,
          style: json,
          formatIn: 'esri-json',
          formatOut: 'esri-json',
          fields: fields,
          type: type,
          exportStyle: true
        });

        window.malette = self.malette; 

        if ( type === "polygon" ) {
          setTimeout(function() {
            $('#malette-theme-color-option').trigger('click');  
          },100);
        } else if ( type === 'point' ) {
          setTimeout(function() {
            $('#malette-size-tab').trigger('click');
            $('#malette-graduated-size-option').trigger('click');
          },100);
        }

        self.malette.on('style-change', function( style ){
          console.log('exported style', style);

          var rend = self.jsonUtils.fromJson(style);
          layer.setRenderer(rend);
          layer.redraw();

          self._updateLayers(service, rend);
        });
      });

    });
  }




  App.prototype._layersFromWebMapJson = function() {
    
    var self = this;
    this.webmap.itemData.operationalLayers.forEach(function(l) {
      var layer = {};
      layer.url = l.url;
      layer.visibility = l.visibility;
      layer.opacity = l.opacity;
      layer.layerDefinition = l.layerDefinition;
      layer.mode = l.mode;
      layer.id = l.id;
      self.layers.push(layer);
    });

    //console.log('hydrated layers: ', this.layers);
  }



  // local copy of layers 
  App.prototype._updateLayers = function(service, renderer) {
    
    //console.log('UPDATE LAYERS: service', service, 'renderer', renderer);
    this.layers.forEach(function( layer ) {
      if ( layer.url === service ) {
        layer.layerDefinition.drawingInfo.renderer = renderer.toJson();
      }
    });

  }



  //local copy of current extent 
  App.prototype._updateExtent = function() {
    var extent = this.map.geographicExtent;
    this.extent = [[extent.xmin, extent.ymin],[extent.xmax, extent.ymax]];
  }


  
  //get basemap layers ( for webmap json )
  App.prototype.getBasemapLayers = function() {
    var basemaps = [];
    this.webmap.itemData.baseMap.baseMapLayers.forEach(function(basemap) {
      var b = {};
      b.opacity = basemap.opacity;
      b.visibility = basemap.visibility;
      b.url = basemap.url;
      basemaps.push(b);
    });

    return basemaps;
  }




  App.prototype._buildWebMapJson = function() {
    
    var json = {};
    var basemaps = this.getBasemapLayers();

    json.item = {
      "title": this.title,
      "snippet": this.snippet,
      "extent": this.extent
    };

    json.itemData = {
      "operationalLayers": this.layers,
      "baseMap": {
        "baseMapLayers": basemaps,
        "title": "basemap"
      },
      "version": "1.0"
    }

    console.log('web map json: ', json);
    return json;
  }




  App.prototype.save = function() {
    var obj = this._buildWebMapJson();
    $('#save-text').html('Saving...');
    
    console.log('saving...', obj);
    localStorage.setItem('webMapJson', JSON.stringify(obj));

    setTimeout( function() {
      $('#save-text').html('Save');
    },300);

  }



  App.prototype.clearLayers = function() {
    var self = this;
    if ( this.malette ) { 
      this.malette.destroy(); 
      this.malette = null;
    }

    this.map.graphicsLayerIds.forEach(function(layer) {
      self.map.removeLayer(self.map.getLayer(layer));
    });
    this.layers = [];
    this.save();
  }


  /****** HELPERS *******/

  App.prototype.isWebMercator = function(spatialReference){
    //Esri wkids that are "web mercator"
    var wkids = [102100,102113,3857];
    var result = false;
    wkids.forEach(function(id){
      if(spatialReference.wkid === id || spatialReference.latestWkid === id){
        result = true;
      }
    });
    return result;
  }


  App.prototype.projectGeometries = function(inSR, outSR, geometryType, geometries){
    //url
    var prjUrl = 'http://utilitydev.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer/project';
    
    //setup the params
    var gparam = {
      geometryType: geometryType,
      geometries: [geometries]
    };
    var params = {
      geometries: JSON.stringify(gparam),
      transformForward:false,
      transformation:'',
      inSR: inSR,
      outSR: outSR,
      f:'json' 
    };
    
    //ajax options
    var options = {
      url: prjUrl,
      method:'POST',
      data: params,
      dataType:'json'
    };
    
    //return the jquery promise
    return $.ajax(options);
  }



  App.prototype._setDefaultRenderers = function() {
    this.renderers = {
      'point' : {
        "type": "simple",
        "label": "",
        "description": "",
        "symbol": {
          "color": [43,140,190,200],
          "size": 6,
          "angle": 0,
          "xoffset": 0,
          "yoffset": 0,
          "type": "esriSMS",
          "style": "esriSMSCircle",
          "outline": {
            "color": [255,255,255,255],
            "width": 1.3,
            "type": "esriSLS",
            "style": "esriSLSSolid"
          }
        }
      },
      'polygon': {
        "type": "simple",
        "label": "",
        "description": "",
        "symbol": {
          "color": [43,140,190,200],
          "size": 6,
          "angle": 0,
          "xoffset": 0,
          "yoffset": 0,
          'style': "esriSFSSolid",
          'type': "esriSFS",
          "outline": {
            "color": [255,255,255,255],
            "width": 0.5,
            "type": "esriSLS",
            "style": "esriSLSSolid"
          }
        }
      }
    };
  }




  /******* WIRE EVENTS *******/ 

  App.prototype._wire = function() {
    var self = this;
    console.log('wire me');

    $('#clear-layers').on('click', function() {
      self.clearLayers();
    });

    $('#add-data').on('click', function() {
      $('#search-container').toggle();
    });

    $('#save-map').on('click', function() {
      self.save();
    });

    $('#map').on('dragover', function(e) {
      e.preventDefault();
    });

    $('#map').on('drop', function(e) {
      var data = e.originalEvent.dataTransfer.getData("text");
      var urls = data.split(',');
      var service = urls[0];
      var id = urls[1];
      $('#search-container').hide();
      self.addLayerToMap(service, id);
    });

  }

  window.App = App;

})(window);