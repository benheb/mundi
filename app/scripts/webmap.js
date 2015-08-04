
  
  /*
  * Creates a default webmap 
  * In case of Mundi, if not loading saved webmap, hydrate a base webmap with 
  * these defaults 
  */
  App.prototype._createDefaultWebmap = function() {
    this.defaultWebMap = {};
    this.defaultWebMap.item = {
      "title": this.title,
      "snippet": this.snippet,
      "extent": this.extent
    };
    this.defaultWebMap.itemData = {
      "baseMap": {
        "baseMapLayers": [
          {
            "opacity": 0.5,
            "visibility": true,
            "url": "http://services.arcgisonline.com/arcgis/rest/services/Specialty/DeLorme_World_Base_Map/MapServer"
          },
          {
            "opacity": 0.8,
            "visibility": false,
            "url": "http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer"
          },
          {
            "opacity": 1,
            "visibility": false,
            "url": "http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer"
          }
          ],
        "title": "basemap"
      },
      "version": "1.0"
    };
  }





  /*
  * Build the webmap json! 
  * Before save, need to rebuild the webmap json with updated layers, styles, extents... etc. 
  *
  */
  App.prototype._buildWebMapJson = function(options) {
    
    var json = {};

    json.item = {
      "title": options.title,
      "snippet": options.snippet,
      "extent": options.extent
    };

    json.itemData = {
      "operationalLayers": options.layers,
      "baseMap": {
        "baseMapLayers": options.basemapLayers,
        "title": "basemap"
      },
      "version": "1.0"
    }

    console.log('web map json: ', json);
    return json;
  }

  


  /*
  * build layers array from saved webmap json 
  *
  *
  */
  App.prototype._basemapsFromWebMapJson = function() {
    
    var self = this;
    this.webmap.itemData.baseMap.baseMapLayers.forEach(function(l) {
      var basemap = {};
      basemap.opacity = l.opacity;
      basemap.visibility = l.visibility;
      basemap.url = l.url;
      self.basemapLayers.push(basemap);
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