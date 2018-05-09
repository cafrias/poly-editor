'use strict';

// POLY EDITOR _________________________________________________________________________________________________________

/**
 * Initializes the PolyEditor
 * @constructor
 */
function PolyEditor(container, field) {
  this.field = field;

  if (field && typeof field.value === 'string' && field.value !== '') {
    this.polygon = PolyEditor.ParseStringToPolygon(field.value);
    this.setPolygon(this.polygon);
  } else {
    this.polygon = null;
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
  // If polygon exists, remove it from map.
  if (this.polygon) {
    this.polygon.setMap(null);
  }

  this.polygon = poly;
  this.AddEventsToPolygon(this.polygon);

  this.updateField();
};

PolyEditor.prototype.updateField = function () {
  this.field.value = PolyEditor.ParsePolygonToString(this.polygon);
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
PolyEditor.ParsePolygonToString = function (poly) {
  var path = poly.getPath();

  var pointsStr = '';
  path.forEach(function (p) {
    pointsStr += p.lng() + ' ' + p.lat();
  });

  return 'POLYGON((' + pointsStr.slice(0, -1) + '))';
};

PolyEditor.PolyRegex = /^POLYGON\((?:(?:\(((?:-?\d+(?:\.\d+)? -?\d+(?:\.\d+)?,?)+)\),?)*)\)$/g;

/**
 * Takes in a string and parses it into a polygon, following string POLYGON SQL format.
 * @param {string} str 
 */
PolyEditor.ParseStringToPolygon = function (str) {
  var paths = [];
  var ret;

  do {
    ret = PolyEditor.PolyRegex.exec(str);
    if (ret) {
      paths.push(ret[1]);
    }
  } while (ret);

  if (paths.length > 0) {
    // Just single path for now.
    var points = paths[0].split(',');

    var coordinates = points.map(function (coordStr) {
      var coord = coordStr.split(' ');

      return new google.maps.LatLng(coord[1], coord[0]);
    });

    return new google.maps.Polygon(Object.assign({}, PolyEditor.polyOptions, {
      path: coordinates,
    }));
  }

  return null;
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

  if (this.polygon) {
    this.polygon.setMap(this.map);
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

  google.maps.event.addListener(this.drawManager, 'polygoncomplete', this.setPolygon.bind(this));

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
