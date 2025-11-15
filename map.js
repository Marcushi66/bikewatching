// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
const INPUT_BLUEBIKES_JSON_URL = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);


let timeFilter = -1;
let allTrips = [];
let stations = [];
let circles;
let radiusScale; 
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);


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

  stations = jsonData.data.stations;
  console.log('Stations Array:', stations);

  const TRIPS_URL = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
  const trips = await d3.csv(
    TRIPS_URL,
    (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at   = new Date(trip.ended_at);
      return trip;
    }
  );
  allTrips = trips;
  console.log("Loaded trips:", trips);

  trips.forEach(trip => {
    const startMinutes = minutesSinceMidnight(trip.started_at);
    const endMinutes   = minutesSinceMidnight(trip.ended_at);

    departuresByMinute[startMinutes].push(trip);
    arrivalsByMinute[endMinutes].push(trip);
  });

  stations = computeStationTraffic(stations);
  console.log('Stations with traffic fields:', stations.slice(0, 5));

  radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(stations, d => d.totalTraffic)])
    .range([0, 25]);

  circles = svg
    .selectAll('circle')
    .data(stations, d => d.short_name ?? d.station_id ?? d.Number)
    .enter()
    .append('circle')
    .attr('r', d => radiusScale(d.totalTraffic))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('opacity', 0.6)
    .style('--departure-ratio', d => {
      const ratio = d.totalTraffic ? d.departures / d.totalTraffic : 0;
      return stationFlow(ratio);
    });

  // tooltip
  circles
    .each(function (d) {
      d3.select(this)
        .append('title')
        .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    });

  // Function to update circle positions on the map
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


// Function to compute departures, arrivals, and total traffic per station
function computeStationTraffic(stations, currentFilter = -1) {
  const filteredDepartures = filterByMinute(departuresByMinute, currentFilter);
  const filteredArrivals = filterByMinute(arrivalsByMinute, currentFilter);

  const departures = d3.rollup(
    filteredDepartures,
    v => v.length,
    d => d.start_station_id
  );

  const arrivals = d3.rollup(
    filteredArrivals,
    v => v.length,
    d => d.end_station_id
  );

  return stations.map(station => {
    const id = station.short_name ?? station.station_id ?? station.Number;

    const dep = departures.get(id) ?? 0;
    const arr = arrivals.get(id) ?? 0;

    station.departures   = dep;
    station.arrivals     = arr;
    station.totalTraffic = dep + arr;

    return station;
  });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Filter trips based on time slider value
function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) {
    return tripsByMinute.flat();
  }

  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;

  if (minMinute <= maxMinute) {
    return tripsByMinute.slice(minMinute, maxMinute + 1).flat();
  } else {
    const beforeMidnight = tripsByMinute.slice(minMinute).flat();
    const afterMidnight  = tripsByMinute.slice(0, maxMinute + 1).flat();
    return beforeMidnight.concat(afterMidnight);
  }
}

// Update scatter plot based on time filter
function updateScatterPlot(timeFilterValue) {
  if (!stations.length || !circles) {
    return;
  }
  const filteredStations = computeStationTraffic(stations, timeFilterValue);

  if (timeFilterValue === -1) {
    radiusScale.range([0, 25]);
  } else {
    radiusScale.range([3, 50]);
  }

  circles
    .data(filteredStations, d => d.short_name ?? d.station_id ?? d.Number)
    .attr('r', d => radiusScale(d.totalTraffic))
    .style('--departure-ratio', d => {
      const ratio = d.totalTraffic ? d.departures / d.totalTraffic : 0;
      return stationFlow(ratio);
    });
}


const timeSlider = document.getElementById('time-slider');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');

// Helper function to format time in HH:MM AM/PM
function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleTimeString('en-US', { timeStyle: 'short' });
}

// Update time display based on slider value
function updateTimeDisplay() {
  timeFilter = Number(timeSlider.value);

  if (timeFilter === -1) {
    selectedTime.textContent = '';
    anyTimeLabel.style.display = 'inline';
  } else {
    selectedTime.textContent = formatTime(timeFilter);
    anyTimeLabel.style.display = 'none';
  }
  updateScatterPlot(timeFilter);
}

timeSlider.addEventListener('input', updateTimeDisplay);
updateTimeDisplay();