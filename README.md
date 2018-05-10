# Poly Editor

Contains a Polygon editor for Google Maps, coordinates of polygons drawn to the map are printed into a form field, in POLYGON sql format.

## TODO

- [] Allow set default center and zoom
- [] Rewrite to Typescript

## Development

Copy `public/index.html.dist` contents into `public/index.html` replacing `<API_KEY>` with your Google Maps API Key.

To start development server, run: `npm start`.

Go to `localhost:8080/public/index.html`.

## Usage

Build project: `npm run build`.

Import file built in HTML: `<script src="dist/poly-editor.js"></script>`.

In HTML file:
``` javascript
function initMap() {

  ped = new PolyEditor(
    document.getElementById('map'), // node where to draw the map
    document.getElementById('field') // text field to output
  );

  // initialize PolyEditor instance, ensure this is run after `google` global variable from Google Maps has been loaded.
  ped.init();
}
```

## License

Under MIT, [read](./LICENSE).
