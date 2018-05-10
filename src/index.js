'use strict';

// POLY EDITOR _________________________________________________________________________________________________________

/**
 * Initializes the PolyEditor
 * @constructor
 */
function PolyEditor(container, field) {
  this.field = field;
  this.paths = [];

  if (field && typeof field.value === 'string' && field.value !== '') {
    var paths = PolyEditor.ParseStringToPaths(field.value);
    if (paths) {
      paths.forEach(function (path) {
        this.setPolygon(path);
      }, this);
    }
  }

  this.container = container;
  this.map = null;
  this.drawManager = null;
}

/**
 * Centers map on polygon `poly`.
 */
PolyEditor.prototype.centerOnPolygon = function (poly) {
  var bounds = new google.maps.LatLngBounds();
  var polyCoords = poly.getPath();

  for (var i = 0; i < polyCoords.length; i++) {
    bounds.extend(polyCoords[i]);
  }

  this.map.fitBounds(bounds);
};

/**
 * Creates a new polygon.
 * @param {*} poly 
 */
PolyEditor.prototype.setPolygon = function (poly) {
  this.AddEventsToPolygon(poly);
  this.paths.push(poly);
};

PolyEditor.prototype.updateField = function () {
  this.field.value = this.ParsePathsToString();
};

/**
 * Adds events to polygon `poly`.
 * @param {*} poly 
 */
PolyEditor.prototype.AddEventsToPolygon = function (poly) {
  google.maps.event.addListener(poly, 'dragend', this.updateField.bind(this));
  google.maps.event.addListener(poly.getPath(), 'set_at', this.updateField.bind(this));
  google.maps.event.addListener(poly.getPath(), 'insert_at', this.updateField.bind(this));
  google.maps.event.addListener(poly.getPath(), 'remove_at', this.updateField.bind(this));

  google.maps.event.addListener(poly, 'rightclick', (function (poly, e) {
    var del = new this.DeleteMenu(this.deletePolygon.bind(this));
    del.open(this.map, this.poly, e.latLng);
  }).bind(this, poly));
};

PolyEditor.prototype.deletePolygon = function (poly) {
  console.log('delete poly');
};

/**
 * Parses a polygon to string.
 * @param {*} poly 
 */
PolyEditor.prototype.ParsePathsToString = function () {
  var pathsStr = this.paths.map(function (path) {
    var pointsStr = '';

    path.getPath().forEach(function (p) {
      pointsStr += p.lng() + ' ' + p.lat() + ',';
    });

    return '(' + pointsStr.slice(0, -1) + ')';
  }, this);


  return 'POLYGON(' + pathsStr.join(', ') + ')';
};

PolyEditor.PolyRegex = /^POLYGON\(((?:\((?:(?:-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?,?)+)\)(?:, )?)*)\)$/g;

/**
 * Takes in a string and parses it into a polygon, following string POLYGON SQL format.
 * @param {string} str 
 */
PolyEditor.ParseStringToPaths = function (strIn) {
  var strMatch = PolyEditor.PolyRegex.exec(strIn);

  // If matches SQL format ...
  if (strMatch) {
    var strPolys = strMatch[1].match(/\(.*?\)/g);

    if (strPolys) {
      var polys = strPolys.map(function (strPoly) {
        var strCoords = strPoly.slice(1, -1).split(',');
        var path = strCoords.map(function (strCoord) {
          var c = strCoord.split(' ');
          return new google.maps.LatLng(parseFloat(c[1]), parseFloat(c[0]));
        });

        return new google.maps.Polygon(Object.assign({
          path: path,
        }, PolyEditor.polyOptions));
      });

      return polys;
    }
  }

  // If not ...
  return [];
};

PolyEditor.polyOptions = {
  editable: true,
  clickable: true,
  draggable: true,
  strokeColor: '#548ce5',
  fillColor: '#548ce5',
};


// INITIALIZERS ________________________________________________________________________________________________________

/**
 * Initializes Poly Editor.
 */
PolyEditor.prototype.init = function () {
  this.initMap();
  this.initDrawManager();
  this.initDeleteMenu();
};

/**
 * Initializes map.
 */
PolyEditor.prototype.initMap = function () {
  this.map = new google.maps.Map(this.container, {
    center: { lat: -53.79087255, lng: -67.69589780000001 },
    zoom: 16,
  });

  if (this.paths) {
    this.paths.forEach(function (path) { path.setMap(this.map); }, this);
  }
};

/**
 * Initializes the DrawingManager.
 */
PolyEditor.prototype.initDrawManager = function () {
  this.drawManager = new google.maps.drawing.DrawingManager({
    drawingMode: null,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: ['polygon']
    },
    polygonOptions: PolyEditor.polyOptions,
  });

  google.maps.event.addListener(this.drawManager, 'polygoncomplete', (function (poly) {
    this.setPolygon(poly);
    this.updateField();
  }).bind(this));

  this.drawManager.setMap(this.map);
};


// POLYGON DELETE MENU ________________________________________________________________________________________________

/**
 * Wraps DeleteMenu so that it can be executed after Google Maps has been initialized.
 */
PolyEditor.prototype.initDeleteMenu = function () {
  /**
   * A menu that lets a user delete a polygon
   * @constructor
   */
  this.DeleteMenu = function (delCb) {
    // Set CSS for the control interior
    var controlText = document.createElement('div');
    controlText.style.backgroundColor = '#fff';
    controlText.style.border = '2px solid #fff';
    controlText.style.borderRadius = '3px';
    controlText.style.zIndex = '10';
    controlText.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlText.style.cursor = 'pointer';
    controlText.style.marginBottom = '22px';
    controlText.style.position = 'absolute';
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlText.style.fontSize = '16px';
    controlText.style.lineHeight = '38px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.innerHTML = 'Eliminar';

    this.div_ = controlText;

    google.maps.event.addDomListener(controlText, 'click', (function () {
      delCb();
      this.close();
    }).bind(this));
  };

  this.DeleteMenu.prototype = new google.maps.OverlayView();

  this.DeleteMenu.prototype.onAdd = function () {
    var deleteMenu = this;
    var map = this.getMap();
    this.getPanes().floatPane.appendChild(this.div_);

    // mousedown anywhere on the map except on the menu div will close the
    // menu.
    this.divListener_ = google.maps.event.addDomListener(map.getDiv(), 'mousedown', function (e) {
      if (e.target != deleteMenu.div_) {
        deleteMenu.close();
      }
    }, true);
  };

  this.DeleteMenu.prototype.onRemove = function () {
    google.maps.event.removeListener(this.divListener_);
    this.div_.parentNode.removeChild(this.div_);

    // clean up
    this.set('position');
    this.set('polygon');
  };

  this.DeleteMenu.prototype.close = function () {
    this.setMap(null);
  };

  this.DeleteMenu.prototype.draw = function () {
    var position = this.get('position');
    var projection = this.getProjection();

    if (!position || !projection) {
      return;
    }

    var point = projection.fromLatLngToDivPixel(position);
    this.div_.style.top = point.y + 'px';
    this.div_.style.left = point.x + 'px';
  };

  /**
   * Opens the menu at a vertex of a given path.
   */
  this.DeleteMenu.prototype.open = function (map, poly, position) {
    this.set('polygon', poly);
    this.set('position', position);
    this.setMap(map);
    this.draw();
  };
};
