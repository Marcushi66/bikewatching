// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1IjoibWFyY3VzaGkiLCJhIjoiY21oc3JubW94MWEwOTJtcHZvcGNhbXk4YSJ9.3rq6TyWpee2fiRlHe2EPNA';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18
});
map.addControl(new mapboxgl.NavigationControl(), 'top-right');


const bikeLinePaint = {
  'line-color': '#32D400',
  'line-width': 3,
  'line-opacity': 0.4
};

map.on('load', async () => {
  // --- Boston ---
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
  });

  map.addLayer({
    id: 'bike-lanes-boston',
    type: 'line',
    source: 'boston_route',
    paint: bikeLinePaint
  });

  // --- Cambridge ---
  const CAMBRIDGE_URL = 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson';
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: CAMBRIDGE_URL
  });

  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: bikeLinePaint
  });
});
