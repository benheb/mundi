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
    'line': {
      "type": "simple",
      "label": "",
      "description": "",
      "symbol": {
        "color": [0,122,194,255],
        "width": 2,
        "type": "esriSLS",
        "style": "esriSLSSolid"
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