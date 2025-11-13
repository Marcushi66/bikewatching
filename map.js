// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
const INPUT_BLUEBIKES_JSON_URL = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

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


// Create an SVG overlay on top of the Mapbox map
const svg = d3.select('#map').select('svg');

function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(point);
    return { cx: x, cy: y };
}

// Load the Bluebikes stations data and plot them
try {
  const jsonData = await d3.json(INPUT_BLUEBIKES_JSON_URL);
  console.log('Loaded JSON Data:', jsonData);

  const stations = jsonData.data.stations;
  console.log('Stations Array:', stations);

  const TRIPS_URL = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
  const trips = await d3.csv(TRIPS_URL);
  console.log("Loaded trips:", trips);

  // Compute departures and arrivals per station
  const departures = d3.rollup(
    trips,
    v => v.length,
    d => d.start_station_id
  );

  const arrivals = d3.rollup(
    trips,
    v => v.length,
    d => d.end_station_id
  );

  // Annotate stations with traffic data
  stations.forEach(station => {
    const id = station.short_name ?? station.station_id ?? station.Number;

    const dep = departures.get(id) ?? 0;
    const arr = arrivals.get(id) ?? 0;

    station.departures   = dep;
    station.arrivals     = arr;
    station.totalTraffic = dep + arr;
  });
  console.log('Stations with traffic fields:', stations.slice(0, 5));

  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(stations, d => d.totalTraffic)])
    .range([0, 25]);   

  const circles = svg
    .selectAll('circle')
    .data(stations)
    .enter()
    .append('circle')
    .attr('r', d => radiusScale(d.totalTraffic))
    .attr('fill', 'steelblue')
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('opacity', 0.6);

  circles
    .each(function (d) {
      d3.select(this)
        .append('title')
        .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    });

  function updatePositions() {
    circles
      .attr('cx', d => getCoords(d).cx)
      .attr('cy', d => getCoords(d).cy);
  }

  updatePositions();

  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);

} catch (err) {
  console.error('Error loading stations JSON:', err);
}
