
(function(window){
  'use strict';

  var App = function App( options ) {
    var self = this;

    $( document ).ajaxStart(function() {
      NProgress.start();
    });

    $( document ).ajaxStop(function() {
      NProgress.done();
    });

    //HACKY AUTH STUFF!!!
    /*
    * GITHUB LOGIN LOGIC 
    *
    */
    this.github = null;
    this.gistUrl = 'https://gist.github.com/';
    this.blocksUrl = 'http://bl.ocks.org/';

    var token = localStorage.getItem('github');
    console.log('token', token);

    if ( token ) {
      console.log('token already exists!');
      this.github = new Github({
        token: token,
        auth: "oauth"
      });
      $.getJSON('https://api.github.com/user?access_token='+token, function(user) {
        $('#login').html('Hello, '+user.login).attr('href', '#');
        self.user = user.login;
      });
    } else {
      var qs = this.getQueryString();
      if ( qs.code ) {
        console.log('code:', qs.code);
        var code = qs.code;
        $.getJSON('https://whispering-stream-9425.herokuapp.com/authenticate/'+code, function(data) {
          
          console.log('Token CREATED: ', data);
          localStorage.setItem('github', data.token); //save token 
          
          $.getJSON('https://api.github.com/user?access_token='+data.token, function(user) {
            $('#login').html('Hello, '+user.login).attr('href', '#');
            self.user = user.login;
          });

          self.github = new Github({
            token: data.token,
            auth: "oauth"
          });

          delete qs.code; 
          qs = self.setQueryString(qs);
          window.history.pushState('', '', '?' + qs);

        });
      } else {
        //still create a github instance, but can't save 
        if ( qs.edit ) { 
          delete qs.edit;
          qs = self.setQueryString(qs);
          window.history.pushState('', '', '?' + qs);          
        }
        self.github = new Github({});        
      }
    }
    /*
    * END THE LOGIN LOGIC
    *
    */


    //set the stage
    this.map = null;
    //this.id = (location.hash) ? location.hash.replace(/#/, '') : null;
    this.layers = [];
    this.extent = [[-115.85, -38.82],[119.25, 52.58]];
    this.snippet = 'Example Webmap';
    this.title = 'New Map';
    this.webmap = {};

    this.defaultWebMap = {};
    this.defaultWebMap.item = {
      "title": this.title,
      "snippet": this.snippet,
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

    this.getWebMap(function() {
      self._setDefaultRenderers();
      self._initMap();
      self._wire();
    });
  
    var search = new OpenSearch('search-container', {});

  };




  /*
  * Get webmap!
  * IF gist and gist file, load webmap from gist
  * if !github, load default webamp (blank map)
  *
  */
  App.prototype.getWebMap = function(callback) {
    var self = this;

    var json, gist;
    
    //user exists, try to load save map 
    if ( this.github ) {
      var qs = this.getQueryString();
      var gistId = qs.gistId || null;
      var mapId = qs.mapId || this.guid; 
      
      if ( gistId && mapId ) {
        //console.log('here', gistId, mapId);
        //saved map! load it 
        gist = this.github.getGist( gistId );
        gist.read(function(err, gist) {
          
          _.each(gist.files, function(file) {
            if ( file.filename === mapId ) {
              json = JSON.parse(file.content);
            }
          });
          console.log('json', json);
          if ( json ) {
            self.webmap = json;
            self._layersFromWebMapJson();
          } else {
            self.webmap = self.defaultWebMap;
          }

          callback();
        });
      } else {
        //no saved map! load default 
        self.webmap = self.defaultWebMap;
        callback(); 
      }
    } else {
      //load default map, no user logged in 
      self.webmap = self.defaultWebMap;
      callback(); 
    }
  
  }




  /*
  * Creates the actual map 
  * Requires this.webmap be defined
  * Also save some dojo hacky stuff for use elsewhere... heh 
  */ 
  App.prototype._initMap = function() {
    var self = this;

    //update gist url 
    this._updateGistUrl();
    this._updateBlocksUrl();
    
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

      //HACK! I want to use these elsewhere OUTSIDE of require, so saving them to App 
      self.FeatureLayer = FeatureLayer;
      self.SimpleRenderer = SimpleRenderer;
      self.jsonUtils = jsonUtils;
      //end hack 

      //create the map
      self.map;
      arcgisUtils.createMap(self.webmap, "map", {
        mapOptions: {
          minZoom: 2
        }
      }).then(function(response){
        self.map = response.map;
        self.map.graphicsLayerIds.forEach(function(layer) {
          var layer = self.map.getLayer(layer);
          layer.setMinScale(0);
          layer.setMaxScale(0);
          layer.redraw();
          self.snippet = layer.name;
        });
        self.map.on('extent-change', function() {
          self._updateExtent();
        });

      });

    });
  }




  /*
  * Add layer to map 
  * @param {string}     service URL 
  * @param {string}     item id 
  *
  *
  */
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
      minScale: 0, 
      maxScale: 0,
      layerDefinition: {
        drawingInfo: {
          renderer: {}
        }
      }
    });

    layer.on('load', function() {
      layer.minScale = 0; 
      layer.maxScale = 0;

      self.snippet = layer.name;

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
      self.save();

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
          self.save();
        });
      });

    });
  }




  /*
  * build layers array from saved webmap json 
  *
  *
  */
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
    this.save();
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





  /*
  * Build the webmap json! 
  * 
  *
  */
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




  /*
  * Saves the webmap json
  * Saves to localstorage 
  * Saves to github if it can! 
  *
  */ 
  App.prototype.save = function() {
    var self = this;
    var obj = this._buildWebMapJson();


    //get gist id from location.search
    //get file id from location.search 
    //TODO remove hash!
    var qs = this.getQueryString();
    var gistId = qs.gistId || null;
    var mapId = qs.mapId || this.guid(); 

    //ui diddy 
    $('#save-text').html('Saving...');
    
    //console.log('saving...', obj);
    var data = {
      "description": this.snippet,
      "public": true,
      "files": {}
    }

    data.files[ mapId ] = {
      "content": JSON.stringify(obj)
    }


    if ( !gistId ) {
      //create NEW gist 
      var gist = this.github.getGist();
      gist.create(data, function(err, g) {
        console.log('gist', g);
        
        qs.mapId = mapId; 
        qs.gistId = g.id;
        qs = self.setQueryString(qs);
        window.history.pushState('', '', '?' + qs);
        
        self._onSaveComplete();
        self._updateGistUrl();
        self._updateBlocksUrl();
      });
      
    } else {
      //just update the file! 
      var gist = this.github.getGist(gistId);
      data.files['index.html'] = {
        "content": this._getTemplate( gistId )
      }

      gist.update(data, function(err, d) {
        self._onSaveComplete();
        self._updateGistUrl();
        self._updateBlocksUrl();
      });
    }
  
  }




  App.prototype._onSaveComplete = function() {
    $('#save-text').html('Save');
  }




  /*
  * Clear all layers from map 
  *
  *
  */
  App.prototype.clearLayers = function() {
    var self = this;

    $('#style-map').addClass('disabled');

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




  /*
  * Create random GUID 
  *
  *
  */
  App.prototype.guid = function () {
    return Math.random().toString(36).substr(2, 9);
  }




  App.prototype.setQueryString = function(qs) {
    return $.param(qs);
  }



  App.prototype.getQueryString = function() {
    var pairs = window.location.search.substring(1).split("&"),
      obj = {},
      pair,
      i;

    for ( i in pairs ) {
      if ( pairs[i] === "" ) continue;

      pair = pairs[i].split("=");
      obj[ decodeURIComponent( pair[0] ) ] = decodeURIComponent( pair[1] );
    }

    return obj;
  }



  /* projection stuff */
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




  /*
  * Project layer extent geoms 
  *
  *
  */ 
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



  /* default rendereres */
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




  App.prototype._updateGistUrl = function() {
    var self = this;
    var qs = this.getQueryString();
    var gistId = qs.gistId;
    if ( self.user && gistId ) {
      $('#footer-urls').show();
      $('#gist-url').show().attr('href', self.gistUrl + self.user + '/' + gistId).html(self.gistUrl + self.user + '/' + gistId);
    } else {
      $('#footer-urls').hide();
    }
  }


  App.prototype._updateBlocksUrl = function() {
    var self = this;
    var qs = this.getQueryString();
    var gistId = qs.gistId;
    if ( self.user && gistId ) {
      $('#footer-urls').show();
      $('#blocks-url').attr('href', self.blocksUrl + self.user + '/' + gistId).html(self.blocksUrl + self.user + '/' + gistId);
    } else {
      $('#footer-urls').hide();
    }
  }


  App.prototype._getTemplate = function(id) {
    var tmpl = '<!DOCTYPE html>\
      <meta charset="utf-8">\
      <link rel="stylesheet" href="http://js.arcgis.com/3.14/esri/css/esri.css">\
      <style>\
        #map {\
          height:500px;\
        }\
      </style>\
      <body>\
      <div id="map"></div>\
      <script src="//code.jquery.com/jquery-1.11.3.min.js"></script>\
      <script src="//code.jquery.com/jquery-migrate-1.2.1.min.js"></script>\
      <script src="http://js.arcgis.com/3.14/"></script>\
      <script>\
      require(["esri/map","esri/urlUtils","esri/arcgis/utils","esri/layers/FeatureLayer","esri/renderers/SimpleRenderer","esri/renderers/jsonUtils","dojo/domReady!"],\
        function(Map,urlUtils,arcgisUtils,FeatureLayer,SimpleRenderer,jsonUtils) {\
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
            });\
          });\
        });\
      });\
      </script>\
      </body>';

    return tmpl;

  };



  /******* WIRE EVENTS *******/ 

  App.prototype._wire = function() {
    var self = this;
    console.log('wire me');

    var qs = this.getQueryString();
    if ( qs.edit === 'true' ) {
      $('.tool').show();
    }

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

    if ( this.layers.length ) {
      $('#style-map').removeClass('disabled');
    }

    $('#style-map').on('click', function() {
      if ( $(this).hasClass('disabled') ) {
        return;
      } else {
        self.showMalette();
      }
    })

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