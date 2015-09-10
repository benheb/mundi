
(function(window){
  'use strict';

  var App = function App( options ) {
    var self = this;
    this.state = {};
    this.state.logged_in = false;
    this.state.editable = false;
    this.state.editing = false; 

    //HACKY AUTH STUFF!!!
    /****************************************************************************
    * THE LOGIN LOGIC
    *****************************************************************************/
    this.github = null;
    var token = localStorage.getItem('github'); //for now saving token in localstorage, is this legit??? 
    var qs = this.getQueryString(); //so we know what mode we're in 

    if ( token ) {
      //we have a token, init github wrapper, and set header login 
      this.github = new Github({
        token: token,
        auth: "oauth"
      });
      $.getJSON('https://api.github.com/user?access_token='+token, function(user) {
        $('#login').html('Hello, '+user.login).attr('href', '#');
        self.user = user.login;
        self._setHeader(true);
        self._isEditable(token, user.login);
      });
      this.state.logged_in = true;
      
    } else {
      //no token
      if ( qs.code ) {
        //we have a ?code returned from github Auth, now get an access_token 
        var code = qs.code;
        $.getJSON('https://whispering-stream-9425.herokuapp.com/authenticate/'+code, function(data) {
          
          console.log('Token CREATED: ', data);
          localStorage.setItem('github', data.token); //save token to localstorage 
          
          //set header info (have to do new request for user...)
          $.getJSON('https://api.github.com/user?access_token='+data.token, function(user) {
            $('#login').html('Hello, '+user.login).attr('href', '#');
            self.user = user.login;
            self._setHeader(true);
          });

          //initialize github wrapper for saving etc down the road 
          self.github = new Github({
            token: data.token,
            auth: "oauth"
          });

          self.state.logged_in = true;

          //remove code from url, it looks gross 
          delete qs.code; 
          qs = self.setQueryString(qs);
          window.history.pushState('', '', '?' + qs);

        });
      } else {
        //still create a github instance, but can't save 
        if ( qs.edit ) { 
          delete qs.edit; //they aren't logged in, don't let them edit! 
          qs = self.setQueryString(qs);
          window.history.pushState('', '', '?' + qs);
        }
        self.github = new Github({});
      }
    }
    /****************************************************************************
    * END THE LOGIN LOGIC
    *****************************************************************************/


    $( document ).ajaxStart(function() {
      NProgress.start();
    });

    $( document ).ajaxStop(function() {
      NProgress.done();
    });

    //set the stage!
    this.gistUrl = 'https://gist.github.com/';
    this.blocksUrl = 'http://bl.ocks.org/';
    this._setHeader(true);
    this.map = null;
    this.layers = [];
    this.basemapLayers = [];
    this.extent = [[-115.85, -38.82],[119.25, 52.58]];
    this.snippet = 'Example Webmap';
    this.title = 'New Map';
    this.webmap = {};

    //create default webmap 
    this._createDefaultWebmap();

    this.basemapUrls = {
      'delorme': 'http://services.arcgisonline.com/arcgis/rest/services/Specialty/DeLorme_World_Base_Map/MapServer',
      'gray': 'http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer',
      'dark': 'http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer'
    }

    //get initial webmap 
    this.getWebMap(function() {
      self._setDefaultRenderers();
      self._initMap();
      self._wire();
    });
  
    //initialize the search module 
    var search = new OpenSearch('search-container', {});

    this.legend = new Legend('legend-container', {
      editable: false,
      layers: []
    });

    this.legend.on('remove-layer', function(id) {
      self.removeLayerFromMap(id);
    });

    this.legend.on('reorder-layers', function(obj) {
      self._reorderLayers(obj);
    });

    this.legend.on('edit-layer', function(id) {
      var layer = self.map.getLayer(id);
      
      $.getJSON('http://opendata.arcgis.com/datasets/' + id + '.json', function(res) {
        var fields = res.data.fields;
        var name = res.data.name;

        var options = {};
        options.json = layer.renderer.toJson();
        options.name = layer.name;
        options.fields = fields;
        options.type = self.getType(layer);
        options.layerId = layer.id;
        self.initMalette(options);
      });
    });


    this.legend.on('edit-layer-end', function(id) {
      if ( self.malette ) { 
        self.malette.destroy(); 
        self.malette = null;
      }
    });

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
      var gistId = qs.id || null;
      
      if ( gistId ) {
        
        //saved map! load it 
        gist = this.github.getGist( gistId );
        gist.read(function(err, gist) {
          
          _.each(gist.files, function(file) {
            if ( file.filename === 'webmap.json' ) {
              json = JSON.parse(file.content);
            }
          });
          
          if ( json ) {
            self.webmap = json;
            self._layersFromWebMapJson();
          } else {
            self.webmap = self.defaultWebMap;
          }
          self._basemapsFromWebMapJson();

          callback();
        });
      } else {
        //no saved map! load default 
        self.webmap = self.defaultWebMap;
        self._basemapsFromWebMapJson();
        callback(); 
      }
    } else {
      //load default map, no user logged in 
      self.webmap = self.defaultWebMap;
      self._basemapsFromWebMapJson();
      callback(); 
    }
  
  }





  /*
  * Creates the actual map 
  * Requires this.webmap be defined
  * Also save some dojo hacky stuff for use elsewhere... heh 
  *
  *
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
        self._updateExtent();
          
        self.map.graphicsLayerIds.forEach(function(layer) {
          var layer = self.map.getLayer(layer);
          layer.setMinScale(0);
          layer.setMaxScale(0);
          layer.redraw();
          self.snippet = layer.name;
          self.legend.addLayer({
            "id": layer.id,
            "name": layer.name,
            "renderer": layer.renderer.toJson()
          });
        });

        self.map.on('extent-change', function() {
          self._updateExtent();
        });

        //if map initialized in edit mode && there is a graphics layer
        //init malette with the first layer!
        if ( self.state.editing && self.map.graphicsLayerIds.length ) {
          var id = self.map.graphicsLayerIds[0];
          var layer = self.map.getLayer(id);
          
          $.getJSON('http://opendata.arcgis.com/datasets/' + id + '.json', function(res) {
            var fields = res.data.fields;
            var name = res.data.name;

            var options = {};
            options.json = layer.renderer.toJson();
            options.name = layer.name;
            options.fields = fields;
            options.type = self.getType(layer);
            options.layerId = layer.id;
            self.initMalette(options);
            //self._maletteTriggers(self.getType(layer));
          });

        }
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

    //make a layer, add it to the map 
    var layer = new this.FeatureLayer(service, {
      mode: this.FeatureLayer.MODE_ONDEMAND,
      outFields: ['*']
    });
    layer.id = id;

    this.map.addLayer(layer);

    //add to local layers list
    //when we go to construct webmap.json on save, this is the layers list
    //we use to create json 
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
      console.log('layer loaded!', layer);
      
      layer.minScale = 0; 
      layer.maxScale = 0;
      self.snippet = layer.name;

      type = self.getType(layer);
      
      //layers come with all sorts of projections, we have to set to mercator 
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

      //set default renderer on our newly added layer 
      var json = self.renderers[type];
      var rend = new self.SimpleRenderer(json);
      layer.setRenderer(rend);
      layer.redraw();

      self.legend.addLayer({
        'id': layer.id,
        'name': layer.name,
        'renderer': json
      });

      self._updateLayers(service, rend);
      self.save();

      //here we get STATS from Open Data so we can make pretty maps 
      $.getJSON('http://opendata.arcgis.com/datasets/' + id + '.json', function(res) {
        var fields = res.data.fields;
        var name = res.data.name;

        var options = {};
        options.json = json;
        options.name = name;
        options.fields = fields;
        options.type = type;
        options.layerId = layer.id;
        self.initMalette(options);

        self._maletteTriggers(type);

      });

    });
  }




  App.prototype.removeLayerFromMap = function(id) {
    var self = this;
    if ( this.malette ) { 
      this.malette.destroy(); 
      this.malette = null;
    }

    this.layers.forEach(function(layer, i) {
      if ( layer.id === id ) {
        self.layers.splice(i, 1);
      }
    });

    this.map.removeLayer(this.map.getLayer(id));
    this.save(true);
  }



  /*
  * Styler logical 
  * 
  *
  */
  App.prototype.initMalette = function(options) {
    var self = this;
    
    if ( this.malette ) { 
      this.malette.destroy(); 
    }

    //console.log('options', options);

    this.malette = new Malette('map', {
      title: options.name,
      style: options.json,
      formatIn: 'esri-json',
      formatOut: 'esri-json',
      fields: options.fields,
      type: options.type,
      exportStyle: true,
      layerId: options.layerId
    });

    this.malette.on('style-change', function( style ){
      console.log('exported style', style);
      
      var layer; 
      if ( style.layerId ) {
        layer = self.map.getLayer( style.layerId );
      } else {
        return;
      }

      var rend = self.jsonUtils.fromJson(style);
      layer.setRenderer(rend);
      layer.redraw();

      self._updateLegend(layer, style);
      self._updateLayers(layer.url, rend);
      self.save();
    });

  }




  App.prototype._maletteTriggers = function(type) {
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
  }




  /*
  * Change the map basemap 
  * @param {string} id      basemap id; 
  *
  */
  App.prototype._changeBasemap = function(id) {
    var self = this;

    this.map.getLayer( 'base0' ).setVisibility();
    this.map.getLayer( 'base1' ).setVisibility();
    this.map.getLayer( 'base2' ).setVisibility();

    switch(id) {
      case 'delorme': 
        self.map.getLayer( 'base0' ).setVisibility(true);
        break;
      case 'gray': 
        self.map.getLayer( 'base1' ).setVisibility(true);
        break;
      case 'dark': 
        self.map.getLayer( 'base2' ).setVisibility(true);
        break;
    }

    this.basemapLayers.forEach(function(basemap) {
      if ( basemap.url === self.basemapUrls[ id ] )  {
        basemap.visibility = true;
      } else {
        basemap.visibility = false;
      }
    });
      
    //update gist/bl.ock with new visible basemap 
    this.save();
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




  App.prototype._updateLegend = function(layer, style) {
    var id = layer.id;
    this.legend.updateLayer({
      'id': layer.id,
      'name': layer.name,
      'renderer': layer.renderer.toJson()
    });
  }




  App.prototype._reorderLayers = function(obj) {
    var self = this;

    this.map.reorderLayer(this.map.getLayer(obj.id), obj.index);


    function swapElement(array, indexA, indexB) {
      var tmp = array[indexA];
      array[indexA] = array[indexB];
      array[indexB] = tmp;
    }

    var old;
    this.layers.forEach(function(layer, i) {
      if ( layer.id === obj.id ) {
        swapElement(self.layers, obj.index, i);
      }
    });

    this.save();
  }




  /*
  * 
  * Saves the webmap json
  * Saves to github if it can! 
  *
  */ 
  App.prototype.save = function(force) {

    //if not in edit mode OR no layers, do not save!
    if ( !this.state.editing ) { return; }
    if ( !this.state.logged_in || ( this.layers.length === 0 && !force ) ) { return; }
    //end 

    var self = this;
    var options = {};
    options.title = this.title;
    options.snippet = this.snippet;
    options.extent = this.extent;
    options.layers = this.layers;
    options.basemapLayers = this.basemapLayers;

    //build the webmap json to save 
    this._assureJson(); //OMG!!!

    var obj = this._buildWebMapJson(options);
    var qs = this.getQueryString();
    

    this._onSave();
    var gistId = qs.id || null;
    
    //create data object that gets sent to github 
    var data = {
      "description": this.snippet,
      "public": true,
      "files": {}
    }

    //webmap json file 
    data.files[ 'webmap.json' ] = {
      "content": JSON.stringify(obj, null, '\t')
    }

    if ( !gistId ) {
      //create NEW gist 
      var gist = this.github.getGist();
      gist.create(data, function(err, g) {
        
        qs.id = g.id;
        qs = self.setQueryString(qs);
        window.history.pushState('', '', '?' + qs);
        
        self._onSaveComplete();
        self._updateGistUrl();
        self._updateBlocksUrl();
      });
      
    } else {
      //gist exists! just update the file! 
      var gist = this.github.getGist( gistId );
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

    var ids = [];
    this.map.graphicsLayerIds.forEach(function(id) {
      ids.push(id);
    });

    ids.forEach(function(d) {
      self.map.removeLayer(self.map.getLayer(d));
    });

    this.layers = [];
    this.save(true);
  }


  /****** HELPERS *******/




  App.prototype._onSave = function() {
    $('#save-text').html('Saving...');
  }


  App.prototype._onSaveComplete = function() {
    $('#save-text').html('Save');
  }

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



  App.prototype.getType = function(layer) {
    var type;
    //"convert" types to send to malette; 
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

    return type; 
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




  /*
  * Crufty UI logic for what to show in header based on "state"
  * 
  *
  */
  App.prototype._setHeader = function(editable) {
    var qs = this.getQueryString();
    var token = localStorage.getItem('github');
    
    if ( !editable ) {
      $('.tool').hide();
      $('#new').hide();
      $('#edit').hide();
      if ( token ) {
        $('#new').show();
      }
      if ( this.legend ) {
        this.legend.disableEdit();
      }
    } else {
      if ( this.legend ) {
        this.legend.enableEdit();
      }
      if ( qs.edit && token ) {
        this.state.editing = true;
        this.state.logged_in = true; 
      }
      
      if ( this.state.logged_in && this.state.editing ) {
        $('.tool').show();
      }

      if ( !this.state.editing && token ) {
        $('#new').hide();
        $('#edit').show();
      } else {
        $('#new').hide();
        $('#edit').hide();
      }

      if ( this.state.editing && token ) {
        $('#new').show();
      }
    }

  }




  App.prototype._isEditable = function(token, user) {
    var self = this;
    var qs = this.getQueryString();

    if ( qs.id && token ) {
      var gist = this.github.getGist(qs.id);
      gist.read(function(err, gist) {
        if ( gist.owner.login !== user ) {
          self.state.editable = false;
          self.state.editing = false;
          if ( qs.edit ) { 
            delete qs.edit; //they aren't logged in, don't let them edit! 
            qs = self.setQueryString(qs);
            window.history.pushState('', '', '?' + qs);
          }
          self._setHeader(false);
        }
      });
    }
  }




  /*
  * Footer Gist url 
  * 
  *
  */ 
  App.prototype._updateGistUrl = function() {
    var self = this;
    var qs = this.getQueryString();
    var gistId = qs.id;
    if ( self.user && gistId ) {
      $('#footer-urls').show();
      $('#gist-url').show().attr('href', self.gistUrl + self.user + '/' + gistId).html(self.gistUrl + self.user + '/' + gistId);
    } else {
      $('#footer-urls').hide();
    }
  }



  /*
  * Footer Bl.ocks url
  * 
  *
  */ 
  App.prototype._updateBlocksUrl = function() {
    var self = this;
    var qs = this.getQueryString();
    var gistId = qs.id;
    if ( self.user && gistId ) {
      $('#footer-urls').show();
      $('#blocks-url').attr('href', self.blocksUrl + self.user + '/' + gistId).html(self.blocksUrl + self.user + '/' + gistId);
    } else {
      $('#footer-urls').hide();
    }
  }




  App.prototype._createCanvas = function() {
    
    $('#malette').hide();
    $('#legend-container').css({'bottom': '40px'});

    $('#image-out-container').show();
    document.getElementById('image-out').innerHTML = '';

    html2canvas(document.getElementById('map'), {
      onrendered: function(canvas) {
        canvas.id = 'image-out-canvas';
        document.getElementById('image-out').appendChild(canvas);
      },
      //allowTaint: true,
      useCORS: true,
      letterRendering: true
    });

  }



  App.prototype._downloadImage = function(link, id, file) {
    console.log('id', id);
    link.href = document.getElementById(id).toDataURL();
    link.download = file;
  }



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

    $('#camera').on('click', function(e) {
      self._createCanvas(e);
    });

    $('#download').on('click', function(e) {
      self._downloadImage(this, 'image-out-canvas', 'mundi-export.png');
    });

    $('#map').on('click', function(e) {
      $('#image-out-container').fadeOut();
      $('#legend-container').css({'bottom': '120px'});
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
    });

    $('#map').on('drop', function(e) {
      var data = e.originalEvent.dataTransfer.getData("text");
      var urls = data.split(',');
      var service = urls[0];
      var id = urls[1];
      $('#search-container').hide();
      self.addLayerToMap(service, id);
    });

    $('#edit').on('click', function() {
      var qs = self.getQueryString();
      qs.edit = 'true';
      qs = self.setQueryString(qs);
      window.history.pushState('', '', '?' + qs);
      self._setHeader(true);
      self.state.editing = true;
    });

    $('#new').on('click', function() {
      var qs = self.setQueryString({'edit': true});
      window.history.pushState('', '', '?' + qs);
      location.reload();
    });


    $('.change-basemap').on('click', function(e) {
      var id = $(this).attr('id');
      self._changeBasemap(id);
    });
  }

  window.App = App;

})(window);