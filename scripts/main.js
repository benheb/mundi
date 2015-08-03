(function(){"use strict";var e,t;"undefined"!=typeof exports?(e=require("xmlhttprequest").XMLHttpRequest,"undefined"==typeof t&&(t=require("btoa"))):t=window.btoa,"undefined"!=typeof window&&"undefined"!=typeof window.XMLHttpRequest&&(e=window.XMLHttpRequest);var i=function(n){function s(i,s,r,a,u,l){function c(){var e=s.indexOf("//")>=0?s:o+s;return e+=/\?/.test(e)?"&":"?",r&&"object"==typeof r&&["GET","HEAD"].indexOf(i)>-1&&(e+="&"+Object.keys(r).map(function(e){return e+"="+r[e]}).join("&")),e+"&"+(new Date).getTime()}var p=new e;if(p.open(i,c(),!l),l||(p.onreadystatechange=function(){4===this.readyState&&(this.status>=200&&this.status<300||304===this.status?a(null,u?this.responseText:this.responseText?JSON.parse(this.responseText):!0,this):a({path:s,request:this,error:this.status}))}),u?p.setRequestHeader("Accept","application/vnd.github.v3.raw+json"):(p.dataType="json",p.setRequestHeader("Accept","application/vnd.github.v3+json")),p.setRequestHeader("Content-Type","application/json;charset=UTF-8"),n.token||n.username&&n.password){var h=n.token?"token "+n.token:"Basic "+t(n.username+":"+n.password);p.setRequestHeader("Authorization",h)}return r?p.send(JSON.stringify(r)):p.send(),l?p.response:void 0}function r(e,t){var i=[];!function n(){s("GET",e,null,function(s,r,o){if(s)return t(s);i.push.apply(i,r);var a=(o.getResponseHeader("link")||"").split(/\s*,\s*/g),u=null;a.forEach(function(e){u=/rel="next"/.test(e)?e:u}),u&&(u=(/<(.*)>/.exec(u)||[])[1]),u?(e=u,n()):t(s,i)})}()}var o=n.apiUrl||"https://api.github.com";i.User=function(){this.repos=function(e){r("/user/repos?type=all&per_page=1000&sort=updated",function(t,i){e(t,i)})},this.orgs=function(e){s("GET","/user/orgs",null,function(t,i){e(t,i)})},this.gists=function(e){s("GET","/gists",null,function(t,i){e(t,i)})},this.notifications=function(e){s("GET","/notifications",null,function(t,i){e(t,i)})},this.show=function(e,t){var i=e?"/users/"+e:"/user";s("GET",i,null,function(e,i){t(e,i)})},this.userRepos=function(e,t){r("/users/"+e+"/repos?type=all&per_page=1000&sort=updated",function(e,i){t(e,i)})},this.userGists=function(e,t){s("GET","/users/"+e+"/gists",null,function(e,i){t(e,i)})},this.orgRepos=function(e,t){r("/orgs/"+e+"/repos?type=all&&page_num=1000&sort=updated&direction=desc",function(e,i){t(e,i)})},this.follow=function(e,t){s("PUT","/user/following/"+e,null,function(e,i){t(e,i)})},this.unfollow=function(e,t){s("DELETE","/user/following/"+e,null,function(e,i){t(e,i)})},this.createRepo=function(e,t){s("POST","/user/repos",e,t)}},i.Repository=function(e){function n(e,t){return e===l.branch&&l.sha?t(null,l.sha):void a.getRef("heads/"+e,function(i,n){l.branch=e,l.sha=n,t(i,n)})}var r=e.name,o=e.user,a=this,u="/repos/"+o+"/"+r,l={branch:null,sha:null};this.deleteRepo=function(t){s("DELETE",u,e,t)},this.getRef=function(e,t){s("GET",u+"/git/refs/"+e,null,function(e,i){return e?t(e):void t(null,i.object.sha)})},this.createRef=function(e,t){s("POST",u+"/git/refs",e,t)},this.deleteRef=function(t,i){s("DELETE",u+"/git/refs/"+t,e,i)},this.createRepo=function(e,t){s("POST","/user/repos",e,t)},this.deleteRepo=function(t){s("DELETE",u,e,t)},this.listTags=function(e){s("GET",u+"/tags",null,function(t,i){return t?e(t):void e(null,i)})},this.listPulls=function(e,t){s("GET",u+"/pulls"+(e?"?state="+e:""),null,function(e,i){return e?t(e):void t(null,i)})},this.getPull=function(e,t){s("GET",u+"/pulls/"+e,null,function(e,i){return e?t(e):void t(null,i)})},this.compare=function(e,t,i){s("GET",u+"/compare/"+e+"..."+t,null,function(e,t){return e?i(e):void i(null,t)})},this.listBranches=function(e){s("GET",u+"/git/refs/heads",null,function(t,i){return t?e(t):void e(null,i.map(function(e){var t=e.ref.split("/");return t[t.length-1]}))})},this.getBlob=function(e,t){s("GET",u+"/git/blobs/"+e,null,t,"raw")},this.getCommit=function(e,t,i){s("GET",u+"/git/commits/"+t,null,function(e,t){return e?i(e):void i(null,t)})},this.getSha=function(e,t,i){return t&&""!==t?void s("GET",u+"/contents/"+t+(e?"?ref="+e:""),null,function(e,t){return e?i(e):void i(null,t.sha)}):a.getRef("heads/"+e,i)},this.getTree=function(e,t){s("GET",u+"/git/trees/"+e,null,function(e,i){return e?t(e):void t(null,i.tree)})},this.postBlob=function(e,i){e="string"==typeof e?{content:e,encoding:"utf-8"}:{content:t(String.fromCharCode.apply(null,new Uint8Array(e))),encoding:"base64"},s("POST",u+"/git/blobs",e,function(e,t){return e?i(e):void i(null,t.sha)})},this.updateTree=function(e,t,i,n){var r={base_tree:e,tree:[{path:t,mode:"100644",type:"blob",sha:i}]};s("POST",u+"/git/trees",r,function(e,t){return e?n(e):void n(null,t.sha)})},this.postTree=function(e,t){s("POST",u+"/git/trees",{tree:e},function(e,i){return e?t(e):void t(null,i.sha)})},this.commit=function(t,n,r,o){var a=new i.User;a.show(null,function(i,a){if(i)return o(i);var c={message:r,author:{name:e.user,email:a.email},parents:[t],tree:n};s("POST",u+"/git/commits",c,function(e,t){return e?o(e):(l.sha=t.sha,void o(null,t.sha))})})},this.updateHead=function(e,t,i){s("PATCH",u+"/git/refs/heads/"+e,{sha:t},function(e){i(e)})},this.show=function(e){s("GET",u,null,e)},this.contributors=function(e,t){t=t||1e3;var i=this;s("GET",u+"/stats/contributors",null,function(n,s,r){return n?e(n):void(202===r.status?setTimeout(function(){i.contributors(e,t)},t):e(n,s))})},this.contents=function(e,t,i){t=encodeURI(t),s("GET",u+"/contents"+(t?"/"+t:""),{ref:e},i)},this.fork=function(e){s("POST",u+"/forks",null,e)},this.branch=function(e,t,i){2===arguments.length&&"function"==typeof arguments[1]&&(i=t,t=e,e="master"),this.getRef("heads/"+e,function(e,n){return e&&i?i(e):void a.createRef({ref:"refs/heads/"+t,sha:n},i)})},this.createPullRequest=function(e,t){s("POST",u+"/pulls",e,t)},this.listHooks=function(e){s("GET",u+"/hooks",null,e)},this.getHook=function(e,t){s("GET",u+"/hooks/"+e,null,t)},this.createHook=function(e,t){s("POST",u+"/hooks",e,t)},this.editHook=function(e,t,i){s("PATCH",u+"/hooks/"+e,t,i)},this.deleteHook=function(e,t){s("DELETE",u+"/hooks/"+e,null,t)},this.read=function(e,t,i){s("GET",u+"/contents/"+encodeURI(t)+(e?"?ref="+e:""),null,function(e,t){return e&&404===e.error?i("not found",null,null):e?i(e):void i(null,t)},!0)},this.remove=function(e,t,i){a.getSha(e,t,function(n,r){return n?i(n):void s("DELETE",u+"/contents/"+t,{message:t+" is removed",sha:r,branch:e},i)})},this["delete"]=function(e,t,i){a.getSha(e,t,function(n,r){if(!r)return i("not found",null);var o=u+"/contents/"+t,a={message:"Deleted "+t,sha:r};o+="?message="+encodeURIComponent(a.message),o+="&sha="+encodeURIComponent(a.sha),o+="&branch="+encodeURIComponent(e),s("DELETE",o,null,i)})},this.move=function(e,t,i,s){n(e,function(n,r){a.getTree(r+"?recursive=true",function(n,o){o.forEach(function(e){e.path===t&&(e.path=i),"tree"===e.type&&delete e.sha}),a.postTree(o,function(i,n){a.commit(r,n,"Deleted "+t,function(t,i){a.updateHead(e,i,function(e){s(e)})})})})})},this.write=function(e,i,n,r,o){a.getSha(e,encodeURI(i),function(a,l){return a&&404!==a.error?o(a):void s("PUT",u+"/contents/"+encodeURI(i),{message:r,content:t(n),branch:e,sha:l},o)})},this.getCommits=function(e,t){e=e||{};var i=u+"/commits",n=[];if(e.sha&&n.push("sha="+encodeURIComponent(e.sha)),e.path&&n.push("path="+encodeURIComponent(e.path)),e.since){var r=e.since;r.constructor===Date&&(r=r.toISOString()),n.push("since="+encodeURIComponent(r))}if(e.until){var o=e.until;o.constructor===Date&&(o=o.toISOString()),n.push("until="+encodeURIComponent(o))}e.page&&n.push("page="+e.page),e.perpage&&n.push("per_page="+e.perpage),n.length>0&&(i+="?"+n.join("&")),s("GET",i,null,t)}},i.Gist=function(e){var t=e.id,i="/gists/"+t;this.read=function(e){s("GET",i,null,function(t,i){e(t,i)})},this.create=function(e,t){s("POST","/gists",e,t)},this["delete"]=function(e){s("DELETE",i,null,function(t,i){e(t,i)})},this.fork=function(e){s("POST",i+"/fork",null,function(t,i){e(t,i)})},this.update=function(e,t){s("PATCH",i,e,function(e,i){t(e,i)})},this.star=function(e){s("PUT",i+"/star",null,function(t,i){e(t,i)})},this.unstar=function(e){s("DELETE",i+"/star",null,function(t,i){e(t,i)})},this.isStarred=function(e){s("GET",i+"/star",null,function(t,i){e(t,i)})}},i.Issue=function(e){var t="/repos/"+e.user+"/"+e.repo+"/issues";this.list=function(e,i){var n=[];for(var s in e)e.hasOwnProperty(s)&&n.push(encodeURIComponent(s)+"="+encodeURIComponent(e[s]));r(t+"?"+n.join("&"),i)}},this.getIssues=function(e,t){return new i.Issue({user:e,repo:t})},this.getRepo=function(e,t){return new i.Repository({user:e,name:t})},this.getUser=function(){return new i.User},this.getGist=function(e){return new i.Gist({id:e})}};"undefined"!=typeof exports?module.exports=i:window.Github=i}).call(this),function(e){"use strict";var t=function(t){var i=this;$(document).ajaxStart(function(){NProgress.start()}),$(document).ajaxStop(function(){NProgress.done()}),this.github=null,this.gistUrl="https://gist.github.com/",this.blocksUrl="http://bl.ocks.org/";var n=localStorage.getItem("github"),s=this.getQueryString();if(n)this.github=new Github({token:n,auth:"oauth"}),$.getJSON("https://api.github.com/user?access_token="+n,function(e){$("#login").html("Hello, "+e.login).attr("href","#"),i.user=e.login,i._setHeader()});else if(s.code){var r=s.code;$.getJSON("https://whispering-stream-9425.herokuapp.com/authenticate/"+r,function(t){console.log("Token CREATED: ",t),localStorage.setItem("github",t.token),$.getJSON("https://api.github.com/user?access_token="+t.token,function(e){$("#login").html("Hello, "+e.login).attr("href","#"),i.user=e.login,i._setHeader()}),i.github=new Github({token:t.token,auth:"oauth"}),delete s.code,s=i.setQueryString(s),e.history.pushState("","","?"+s)})}else s.edit&&(delete s.edit,s=i.setQueryString(s),e.history.pushState("","","?"+s)),i.github=new Github({});this._setHeader(),this.map=null,this.layers=[],this.basemapLayers=[],this.extent=[[-115.85,-38.82],[119.25,52.58]],this.snippet="Example Webmap",this.title="New Map",this.webmap={},this.defaultWebMap={},this.defaultWebMap.item={title:this.title,snippet:this.snippet,extent:this.extent},this.defaultWebMap.itemData={baseMap:{baseMapLayers:[{opacity:.8,visibility:!1,url:"http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer"},{opacity:.5,visibility:!0,url:"http://services.arcgisonline.com/arcgis/rest/services/Specialty/DeLorme_World_Base_Map/MapServer"}],title:"basemap"},version:"1.0"},this.basemapUrls={delorme:"http://services.arcgisonline.com/arcgis/rest/services/Specialty/DeLorme_World_Base_Map/MapServer",gray:"http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer"},this.getWebMap(function(){i._setDefaultRenderers(),i._initMap(),i._wire()});new OpenSearch("search-container",{})};t.prototype.getWebMap=function(e){var t,i,n=this;if(this.github){var s=this.getQueryString(),r=s.gistId||null,o=s.mapId||this.guid;r&&o?(i=this.github.getGist(r),i.read(function(i,s){_.each(s.files,function(e){e.filename===o&&(t=JSON.parse(e.content))}),console.log("json",t),t?(n.webmap=t,n._layersFromWebMapJson()):n.webmap=n.defaultWebMap,n._basemapsFromWebMapJson(),e()})):(n.webmap=n.defaultWebMap,n._basemapsFromWebMapJson(),e())}else n.webmap=n.defaultWebMap,n._basemapsFromWebMapJson(),e()},t.prototype._initMap=function(){var e=this;this._updateGistUrl(),this._updateBlocksUrl(),require(["esri/map","esri/urlUtils","esri/arcgis/utils","esri/layers/FeatureLayer","esri/renderers/SimpleRenderer","esri/renderers/jsonUtils","dojo/domReady!"],function(t,i,n,s,r,o){e.FeatureLayer=s,e.SimpleRenderer=r,e.jsonUtils=o,e.map,n.createMap(e.webmap,"map",{mapOptions:{minZoom:2}}).then(function(t){e.map=t.map,e.map.graphicsLayerIds.forEach(function(t){var t=e.map.getLayer(t);t.setMinScale(0),t.setMaxScale(0),t.redraw(),e.snippet=t.name}),e.map.on("extent-change",function(){e._updateExtent()})})})},t.prototype.addLayerToMap=function(t,i){var n,s=this;this.malette&&this.malette.destroy();var r=new this.FeatureLayer(t,{mode:this.FeatureLayer.MODE_ONDEMAND,outFields:["*"]});this.map.addLayer(r),this.layers.push({url:t,visibility:!0,opacity:.78,mode:1,title:r.name,id:r.id,minScale:0,maxScale:0,layerDefinition:{drawingInfo:{renderer:{}}}}),r.on("load",function(){switch(r.minScale=0,r.maxScale=0,s.snippet=r.name,console.log("layer loaded!",r),r.geometryType){case"esriGeometryPoint":n="point";break;case"esriGeometryPolygon":n="polygon";break;default:n="point"}var o=s.isWebMercator(r.spatialReference);o?s.map.setExtent(r.fullExtent.expand(2),!1):s.projectGeometries(r.fullExtent.spatialReference.wkid,102100,"esriGeometryEnvelope",r.fullExtent).done(function(e){var t=e.geometries[0];t.spatialReference={wkid:102100};var i=new esri.geometry.Extent(t);s.map.setExtent(i.expand(2),!1)});var a=s.renderers[n],u=new s.SimpleRenderer(a);r.setRenderer(u),r.redraw(),s._updateLayers(t,u),s.save(),$.getJSON("http://opendata.arcgis.com/datasets/"+i+".json",function(i){var o=i.data.fields,u=i.data.name;s.malette=new Malette("map",{title:u,style:a,formatIn:"esri-json",formatOut:"esri-json",fields:o,type:n,exportStyle:!0}),e.malette=s.malette,"polygon"===n?setTimeout(function(){$("#malette-theme-color-option").trigger("click")},100):"point"===n&&setTimeout(function(){$("#malette-size-tab").trigger("click"),$("#malette-graduated-size-option").trigger("click")},100),s.malette.on("style-change",function(e){console.log("exported style",e);var i=s.jsonUtils.fromJson(e);r.setRenderer(i),r.redraw(),s._updateLayers(t,i),s.save()})})})},t.prototype._changeBasemap=function(e){var t=this,i="gray"===e?"base0":"base1",n="base0"===i?"base1":"base0",s=this.map.getLayer(i),r=this.map.getLayer(n);s.setVisibility(!0),r.setVisibility(),this.basemapLayers.forEach(function(i){i.visibility=i.url===t.basemapUrls[e]?!0:!1}),this.save()},t.prototype._basemapsFromWebMapJson=function(){var e=this;console.log("this.webmap.itemData",this.webmap.itemData),this.webmap.itemData.baseMap.baseMapLayers.forEach(function(t){var i={};i.opacity=t.opacity,i.visibility=t.visibility,i.url=t.url,e.basemapLayers.push(i)}),console.log("this.basemapLayers",this.basemapLayers)},t.prototype._layersFromWebMapJson=function(){var e=this;this.webmap.itemData.operationalLayers.forEach(function(t){var i={};i.url=t.url,i.visibility=t.visibility,i.opacity=t.opacity,i.layerDefinition=t.layerDefinition,i.mode=t.mode,i.id=t.id,e.layers.push(i)})},t.prototype._updateLayers=function(e,t){this.layers.forEach(function(i){i.url===e&&(i.layerDefinition.drawingInfo.renderer=t.toJson())})},t.prototype._updateExtent=function(){var e=this.map.geographicExtent;this.extent=[[e.xmin,e.ymin],[e.xmax,e.ymax]],this.save()},t.prototype._buildWebMapJson=function(){var e={};return e.item={title:this.title,snippet:this.snippet,extent:this.extent},e.itemData={operationalLayers:this.layers,baseMap:{baseMapLayers:this.basemapLayers,title:"basemap"},version:"1.0"},console.log("web map json: ",e),e},t.prototype.save=function(){var t=this,i=this._buildWebMapJson(),n=this.getQueryString();if(n.edit&&0!==this.layers.length){var s=n.gistId||null,r=n.mapId||this.guid();$("#save-text").html("Saving...");var o={description:this.snippet,"public":!0,files:{}};if(o.files[r]={content:JSON.stringify(i)},s){var a=this.github.getGist(s);o.files["index.html"]={content:this._getTemplate(s)},a.update(o,function(e,i){t._onSaveComplete(),t._updateGistUrl(),t._updateBlocksUrl()})}else{var a=this.github.getGist();a.create(o,function(i,s){console.log("gist",s),n.mapId=r,n.gistId=s.id,n=t.setQueryString(n),e.history.pushState("","","?"+n),t._onSaveComplete(),t._updateGistUrl(),t._updateBlocksUrl()})}}},t.prototype._onSaveComplete=function(){$("#save-text").html("Save")},t.prototype.clearLayers=function(){var e=this;$("#style-map").addClass("disabled"),this.malette&&(this.malette.destroy(),this.malette=null),this.map.graphicsLayerIds.forEach(function(t){e.map.removeLayer(e.map.getLayer(t))}),this.layers=[],this.save()},t.prototype.guid=function(){return Math.random().toString(36).substr(2,9)},t.prototype.setQueryString=function(e){return $.param(e)},t.prototype.getQueryString=function(){var t,i,n=e.location.search.substring(1).split("&"),s={};for(i in n)""!==n[i]&&(t=n[i].split("="),s[decodeURIComponent(t[0])]=decodeURIComponent(t[1]));return s},t.prototype.isWebMercator=function(e){var t=[102100,102113,3857],i=!1;return t.forEach(function(t){(e.wkid===t||e.latestWkid===t)&&(i=!0)}),i},t.prototype.projectGeometries=function(e,t,i,n){var s="http://utilitydev.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer/project",r={geometryType:i,geometries:[n]},o={geometries:JSON.stringify(r),transformForward:!1,transformation:"",inSR:e,outSR:t,f:"json"},a={url:s,method:"POST",data:o,dataType:"json"};return $.ajax(a)},t.prototype._setDefaultRenderers=function(){this.renderers={point:{type:"simple",label:"",description:"",symbol:{color:[43,140,190,200],size:6,angle:0,xoffset:0,yoffset:0,type:"esriSMS",style:"esriSMSCircle",outline:{color:[255,255,255,255],width:1.3,type:"esriSLS",style:"esriSLSSolid"}}},polygon:{type:"simple",label:"",description:"",symbol:{color:[43,140,190,200],size:6,angle:0,xoffset:0,yoffset:0,style:"esriSFSSolid",type:"esriSFS",outline:{color:[255,255,255,255],width:.5,type:"esriSLS",style:"esriSLSSolid"}}}}},t.prototype._setHeader=function(){var e=this.getQueryString(),t=localStorage.getItem("github");console.log("qs.edit",e.edit),"true"===e.edit&&$(".tool").show(),!e.edit&&t?($("#new").hide(),$("#edit").show()):($("#new").hide(),$("#edit").hide()),e.edit&&t&&$("#new").show()},t.prototype._updateGistUrl=function(){var e=this,t=this.getQueryString(),i=t.gistId;e.user&&i?($("#footer-urls").show(),$("#gist-url").show().attr("href",e.gistUrl+e.user+"/"+i).html(e.gistUrl+e.user+"/"+i)):$("#footer-urls").hide()},t.prototype._updateBlocksUrl=function(){var e=this,t=this.getQueryString(),i=t.gistId;e.user&&i?($("#footer-urls").show(),$("#blocks-url").attr("href",e.blocksUrl+e.user+"/"+i).html(e.blocksUrl+e.user+"/"+i)):$("#footer-urls").hide()},t.prototype._getTemplate=function(e){var t='<!DOCTYPE html>      <meta charset="utf-8">      <link rel="stylesheet" href="http://js.arcgis.com/3.14/esri/css/esri.css">      <style>        #map {          height:500px;        }      </style>      <body>      <div id="map"></div>      <script src="//code.jquery.com/jquery-1.11.3.min.js"></script>      <script src="//code.jquery.com/jquery-migrate-1.2.1.min.js"></script>      <script src="http://js.arcgis.com/3.14/"></script>      <script>      require(["esri/map","esri/urlUtils","esri/arcgis/utils","esri/layers/FeatureLayer","esri/renderers/SimpleRenderer","esri/renderers/jsonUtils","dojo/domReady!"],        function(Map,urlUtils,arcgisUtils,FeatureLayer,SimpleRenderer,jsonUtils) {        $.getJSON("https://api.github.com/gists/'+e+'", function(data) {          var webmap;          for (var file in data.files ) {            if ( file !== "index.html" ) {              webmap = JSON.parse(data.files[file].content);            }          };          arcgisUtils.createMap(webmap, "map").then(function(response){            var map = response.map;            map.graphicsLayerIds.forEach(function(layer) {              var layer = map.getLayer(layer);              layer.setMinScale(0);              layer.setMaxScale(0);              layer.redraw();            });          });        });      });      </script>      </body>';return t},t.prototype._wire=function(){var t=this;console.log("wire me");var i=this.getQueryString();"true"===i.edit&&$(".tool").show(),$("#clear-layers").on("click",function(){t.clearLayers()}),$("#add-data").on("click",function(){$("#search-container").toggle()}),$("#save-map").on("click",function(){t.save()}),$("#map").on("dragover",function(e){e.preventDefault()}),this.layers.length&&$("#style-map").removeClass("disabled"),$("#style-map").on("click",function(){$(this).hasClass("disabled")||t.showMalette()}),$("#map").on("drop",function(e){var i=e.originalEvent.dataTransfer.getData("text"),n=i.split(","),s=n[0],r=n[1];$("#search-container").hide(),t.addLayerToMap(s,r)}),$("#edit").on("click",function(){var i=t.getQueryString();i.edit="true",i=t.setQueryString(i),e.history.pushState("","","?"+i),t._setHeader()}),$("#new").on("click",function(){var i=t.setQueryString({edit:!0});e.history.pushState("","","?"+i),location.reload()}),$(".change-basemap").on("click",function(e){var i=$(this).attr("id");t._changeBasemap(i)})},e.App=t}(window);