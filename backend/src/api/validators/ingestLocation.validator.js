const Joi = require('joi');

/**
 * Joi schemas for the /ingest/location endpoints.
 */

/**
 * Single location ping schema.
 */
const locationPingSchema = Joi.object({
  vehicle_id: Joi.string().trim().min(1).max(50).required()
    .messages({ 'any.required': 'vehicle_id is required' }),

  bus_number: Joi.string().trim().min(1).max(20).required()
    .messages({ 'any.required': 'bus_number is required' }),

  lat: Joi.number().min(-90).max(90).required()
    .messages({
      'number.min': 'lat must be between -90 and 90',
      'number.max': 'lat must be between -90 and 90',
      'any.required': 'lat is required',
    }),

  lng: Joi.number().min(-180).max(180).required()
    .messages({
      'number.min': 'lng must be between -180 and 180',
      'number.max': 'lng must be between -180 and 180',
      'any.required': 'lng is required',
    }),

  speed: Joi.number().min(0).max(200).default(0)
    .messages({ 'number.max': 'speed cannot exceed 200 km/h' }),

  heading: Joi.number().min(0).max(360).default(0),

  route_id: Joi.string().trim().max(50).allow('', null).default(null),

  driver_name: Joi.string().trim().max(100).allow('', null).default(null),

  accuracy: Joi.number().min(0).max(1000).allow(null).default(null),

  timestamp: Joi.string().isoDate().allow(null).default(null)
    .messages({ 'string.isoDate': 'timestamp must be a valid ISO 8601 date' }),
});

/**
 * Single ingest request schema.
 */
const singleIngestSchema = Joi.object({
  body: locationPingSchema,
});

/**
 * Batch ingest request schema.
 * Accepts an array of pings (max 100 per batch).
 */
const batchIngestSchema = Joi.object({
  pings: Joi.array()
    .items(locationPingSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'pings array must have at least 1 item',
      'array.max': 'pings array cannot exceed 100 items',
      'any.required': 'pings array is required',
    }),
});

module.exports = {
  locationPingSchema,
  singleIngestSchema,
  batchIngestSchema,
};
