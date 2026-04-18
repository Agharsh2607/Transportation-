const Joi = require('joi');

const packetSchema = Joi.object({
  vehicle_id: Joi.string().trim().required(),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  speed_kmh: Joi.number().min(0).max(200).required(),
  heading: Joi.number().min(0).max(359).required(),
  seq: Joi.number().integer().min(0).required(),
  replayed: Joi.boolean().default(false),
  signal_strength: Joi.string().valid('good', 'degraded', 'offline').default('good'),
  timestamp: Joi.string().isoDate().default(() => new Date().toISOString()),
}).options({ stripUnknown: true });

/**
 * Schema for validating a single GPS packet.
 */
const ingestSchema = packetSchema;

/**
 * Schema for validating a batch of GPS packets.
 * Accepts either an array of packets or a { packets: [...] } envelope.
 */
const batchIngestSchema = Joi.alternatives().try(
  Joi.array().items(packetSchema).min(1).max(500),
  Joi.object({
    packets: Joi.array().items(packetSchema).min(1).max(500).required(),
  }),
  packetSchema
);

module.exports = { ingestSchema, batchIngestSchema };
