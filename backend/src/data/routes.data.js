/**
 * Predefined route data with coordinates and stops
 * Real-world route examples for GPS tracking
 */

const routes = [
  {
    id: 'ROUTE_1',
    name: 'Downtown Express',
    short_name: 'Route 1',
    color: '#667eea',
    description: 'Main downtown loop',
    polyline: [
      [-73.9857, 40.7484], // Times Square
      [-73.9776, 40.7505], // Bryant Park
      [-73.9712, 40.7527], // Grand Central
      [-73.9665, 40.7589], // Central Park South
      [-73.9807, 40.7614], // Columbus Circle
      [-73.9896, 40.7505], // Lincoln Center
      [-73.9969, 40.7505], // Riverside Drive
      [-74.0059, 40.7505], // Hudson River
    ],
    stops: [
      {
        id: 'STOP_1_1',
        name: 'Times Square Station',
        latitude: 40.7484,
        longitude: -73.9857,
        stop_order: 1,
      },
      {
        id: 'STOP_1_2',
        name: 'Bryant Park',
        latitude: 40.7505,
        longitude: -73.9776,
        stop_order: 2,
      },
      {
        id: 'STOP_1_3',
        name: 'Grand Central Terminal',
        latitude: 40.7527,
        longitude: -73.9712,
        stop_order: 3,
      },
      {
        id: 'STOP_1_4',
        name: 'Central Park South',
        latitude: 40.7589,
        longitude: -73.9665,
        stop_order: 4,
      },
      {
        id: 'STOP_1_5',
        name: 'Columbus Circle',
        latitude: 40.7614,
        longitude: -73.9807,
        stop_order: 5,
      },
      {
        id: 'STOP_1_6',
        name: 'Lincoln Center',
        latitude: 40.7505,
        longitude: -73.9896,
        stop_order: 6,
      },
    ],
  },
  {
    id: 'ROUTE_2',
    name: 'Airport Shuttle',
    short_name: 'Route 2',
    color: '#28a745',
    description: 'Airport to downtown service',
    polyline: [
      [-73.7781, 40.6413], // JFK Airport
      [-73.8370, 40.6892], // Jamaica Station
      [-73.8648, 40.7282], // Forest Hills
      [-73.9442, 40.7282], // Long Island City
      [-73.9776, 40.7505], // Midtown Manhattan
      [-73.9857, 40.7484], // Times Square
    ],
    stops: [
      {
        id: 'STOP_2_1',
        name: 'JFK Airport Terminal 4',
        latitude: 40.6413,
        longitude: -73.7781,
        stop_order: 1,
      },
      {
        id: 'STOP_2_2',
        name: 'Jamaica Station',
        latitude: 40.6892,
        longitude: -73.8370,
        stop_order: 2,
      },
      {
        id: 'STOP_2_3',
        name: 'Forest Hills',
        latitude: 40.7282,
        longitude: -73.8648,
        stop_order: 3,
      },
      {
        id: 'STOP_2_4',
        name: 'Long Island City',
        latitude: 40.7282,
        longitude: -73.9442,
        stop_order: 4,
      },
      {
        id: 'STOP_2_5',
        name: 'Midtown Manhattan',
        latitude: 40.7505,
        longitude: -73.9776,
        stop_order: 5,
      },
      {
        id: 'STOP_2_6',
        name: 'Times Square',
        latitude: 40.7484,
        longitude: -73.9857,
        stop_order: 6,
      },
    ],
  },
  {
    id: 'ROUTE_3',
    name: 'Campus Loop',
    short_name: 'Route 3',
    color: '#dc3545',
    description: 'University campus loop',
    polyline: [
      [-73.9626, 40.8075], // Columbia University
      [-73.9533, 40.7957], // Central Park North
      [-73.9665, 40.7589], // Central Park South
      [-73.9776, 40.7505], // Bryant Park
      [-73.9857, 40.7484], // Times Square
      [-73.9969, 40.7505], // West Side
      [-73.9896, 40.7614], // Upper West Side
      [-73.9626, 40.8075], // Back to Columbia
    ],
    stops: [
      {
        id: 'STOP_3_1',
        name: 'Columbia University',
        latitude: 40.8075,
        longitude: -73.9626,
        stop_order: 1,
      },
      {
        id: 'STOP_3_2',
        name: 'Central Park North',
        latitude: 40.7957,
        longitude: -73.9533,
        stop_order: 2,
      },
      {
        id: 'STOP_3_3',
        name: 'Central Park South',
        latitude: 40.7589,
        longitude: -73.9665,
        stop_order: 3,
      },
      {
        id: 'STOP_3_4',
        name: 'Bryant Park',
        latitude: 40.7505,
        longitude: -73.9776,
        stop_order: 4,
      },
      {
        id: 'STOP_3_5',
        name: 'Times Square',
        latitude: 40.7484,
        longitude: -73.9857,
        stop_order: 5,
      },
      {
        id: 'STOP_3_6',
        name: 'Upper West Side',
        latitude: 40.7614,
        longitude: -73.9896,
        stop_order: 6,
      },
    ],
  },
];

module.exports = routes;
