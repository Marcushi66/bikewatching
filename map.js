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