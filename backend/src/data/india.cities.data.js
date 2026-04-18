/**
 * India Cities Data for Large-Scale Fleet Simulation
 * Contains real coordinates and route data for major Indian cities
 */

const INDIA_CITIES = {
  delhi: {
    name: 'Delhi',
    center: [28.6139, 77.2090],
    bounds: [[28.4041, 76.8386], [28.8831, 77.3465]],
    population: 32900000,
    busCount: 300
  },
  mumbai: {
    name: 'Mumbai',
    center: [19.0760, 72.8777],
    bounds: [[18.8920, 72.7758], [19.2720, 73.0322]],
    population: 20400000,
    busCount: 280
  },
  bangalore: {
    name: 'Bangalore',
    center: [12.9716, 77.5946],
    bounds: [[12.8339, 77.4601], [13.1394, 77.7820]],
    population: 13200000,
    busCount: 250
  },
  chennai: {
    name: 'Chennai',
    center: [13.0827, 80.2707],
    bounds: [[12.8342, 80.0955], [13.2847, 80.4955]],
    population: 11500000,
    busCount: 220
  },
  hyderabad: {
    name: 'Hyderabad',
    center: [17.3850, 78.4867],
    bounds: [[17.2473, 78.2579], [17.5618, 78.6552]],
    population: 10500000,
    busCount: 200
  },
  kolkata: {
    name: 'Kolkata',
    center: [22.5726, 88.3639],
    bounds: [[22.4054, 88.2636], [22.6928, 88.4759]],
    population: 15700000,
    busCount: 240
  },
  pune: {
    name: 'Pune',
    center: [18.5204, 73.8567],
    bounds: [[18.4088, 73.7394], [18.6394, 73.9787]],
    population: 7400000,
    busCount: 180
  },
  ahmedabad: {
    name: 'Ahmedabad',
    center: [23.0225, 72.5714],
    bounds: [[22.9041, 72.4410], [23.1272, 72.6847]],
    population: 8400000,
    busCount: 160
  }
};

// Generate realistic route polylines for each city
function generateCityRoutes(cityKey, cityData) {
  const routes = [];
  const routeCount = Math.floor(Math.random() * 6) + 5; // 5-10 routes per city
  
  for (let i = 1; i <= routeCount; i++) {
    const route = generateRoute(cityKey, cityData, i);
    routes.push(route);
  }
  
  return routes;
}

function generateRoute(cityKey, cityData, routeNumber) {
  const routeTypes = ['Metro', 'Express', 'Local', 'Circular', 'Airport', 'Mall Connect', 'IT Corridor'];
  const routeType = routeTypes[Math.floor(Math.random() * routeTypes.length)];
  
  // Generate route polyline within city bounds
  const polyline = generateRoutePolyline(cityData.bounds, cityData.center);
  
  // Generate stops along the route
  const stops = generateRouteStops(polyline, cityKey, routeNumber);
  
  return {
    route_id: `${cityKey.toUpperCase()}-R${String(routeNumber).padStart(3, '0')}`,
    route_name: `${cityData.name} ${routeType} ${routeNumber}`,
    city: cityKey,
    city_name: cityData.name,
    polyline: polyline,
    stops: stops,
    distance_km: calculateRouteDistance(polyline),
    estimated_time: Math.floor(Math.random() * 60) + 30, // 30-90 minutes
    frequency: Math.floor(Math.random() * 15) + 5, // 5-20 minutes
    active: true,
    created_at: new Date().toISOString()
  };
}

function generateRoutePolyline(bounds, center) {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds;
  const pointCount = Math.floor(Math.random() * 31) + 20; // 20-50 points
  const polyline = [];
  
  // Start near city center with some randomness
  let currentLat = center[0] + (Math.random() - 0.5) * 0.1;
  let currentLng = center[1] + (Math.random() - 0.5) * 0.1;
  
  polyline.push([currentLng, currentLat]); // [lng, lat] format for GeoJSON
  
  for (let i = 1; i < pointCount; i++) {
    // Generate next point with realistic movement
    const direction = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 0.02 + 0.005; // 0.005-0.025 degrees
    
    currentLat += Math.cos(direction) * distance;
    currentLng += Math.sin(direction) * distance;
    
    // Keep within city bounds
    currentLat = Math.max(minLat, Math.min(maxLat, currentLat));
    currentLng = Math.max(minLng, Math.min(maxLng, currentLng));
    
    polyline.push([currentLng, currentLat]);
  }
  
  return polyline;
}

function generateRouteStops(polyline, cityKey, routeNumber) {
  const stopCount = Math.floor(polyline.length / 3) + 2; // Reasonable stop density
  const stops = [];
  const stopNames = getStopNames(cityKey);
  
  for (let i = 0; i < stopCount; i++) {
    const polylineIndex = Math.floor((i / (stopCount - 1)) * (polyline.length - 1));
    const [lng, lat] = polyline[polylineIndex];
    
    stops.push({
      stop_id: `${cityKey.toUpperCase()}-S${String(routeNumber).padStart(3, '0')}-${String(i + 1).padStart(2, '0')}`,
      stop_name: stopNames[i % stopNames.length] + ` ${i + 1}`,
      latitude: lat,
      longitude: lng,
      stop_sequence: i + 1,
      zone: getZoneName(cityKey, i)
    });
  }
  
  return stops;
}

function getStopNames(cityKey) {
  const stopNamesByCity = {
    delhi: ['Connaught Place', 'India Gate', 'Red Fort', 'Karol Bagh', 'Lajpat Nagar', 'Nehru Place', 'Dwarka', 'Rohini', 'Janakpuri', 'Saket'],
    mumbai: ['Gateway of India', 'Marine Drive', 'Bandra', 'Andheri', 'Borivali', 'Thane', 'Navi Mumbai', 'Powai', 'Worli', 'Colaba'],
    bangalore: ['MG Road', 'Brigade Road', 'Koramangala', 'Indiranagar', 'Whitefield', 'Electronic City', 'Jayanagar', 'Malleshwaram', 'BTM Layout', 'HSR Layout'],
    chennai: ['Marina Beach', 'T Nagar', 'Anna Nagar', 'Adyar', 'Velachery', 'OMR', 'Guindy', 'Mylapore', 'Nungambakkam', 'Porur'],
    hyderabad: ['Charminar', 'Hitech City', 'Gachibowli', 'Banjara Hills', 'Jubilee Hills', 'Secunderabad', 'Kukatpally', 'Madhapur', 'Kondapur', 'Miyapur'],
    kolkata: ['Victoria Memorial', 'Park Street', 'Salt Lake', 'New Town', 'Howrah', 'Sealdah', 'Esplanade', 'Gariahat', 'Ballygunge', 'Rajarhat'],
    pune: ['Shivaji Nagar', 'Koregaon Park', 'Hinjewadi', 'Wakad', 'Baner', 'Kothrud', 'Deccan', 'Camp', 'Hadapsar', 'Magarpatta'],
    ahmedabad: ['Sabarmati', 'Maninagar', 'Vastrapur', 'Satellite', 'Bopal', 'Gota', 'Chandkheda', 'Naroda', 'Isanpur', 'Nikol']
  };
  
  return stopNamesByCity[cityKey] || ['Stop', 'Junction', 'Square', 'Market', 'Station', 'Circle', 'Cross', 'Point', 'Hub', 'Terminal'];
}

function getZoneName(cityKey, index) {
  const zones = ['North', 'South', 'East', 'West', 'Central', 'Outer', 'Inner'];
  return zones[index % zones.length];
}

function calculateRouteDistance(polyline) {
  let distance = 0;
  for (let i = 1; i < polyline.length; i++) {
    const [lng1, lat1] = polyline[i - 1];
    const [lng2, lat2] = polyline[i];
    distance += haversineDistance(lat1, lng1, lat2, lng2);
  }
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate all routes for all cities
function generateAllCityRoutes() {
  const allRoutes = [];
  
  for (const [cityKey, cityData] of Object.entries(INDIA_CITIES)) {
    const cityRoutes = generateCityRoutes(cityKey, cityData);
    allRoutes.push(...cityRoutes);
  }
  
  return allRoutes;
}

module.exports = {
  INDIA_CITIES,
  generateAllCityRoutes,
  generateCityRoutes,
  calculateRouteDistance,
  haversineDistance
};