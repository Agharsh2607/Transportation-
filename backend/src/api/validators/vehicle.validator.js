const Joi = require('joi');

/**
 * Schema for validating vehicle creation requests.
 */
const createVehicleSchema = Joi.object({
  id: Joi.string().trim().required(),
  registration_number: Joi.string().trim().required(),
  model: Joi.string().trim().required(),
  capacity: Joi.number().integer().min(1).max(300).required(),
  route_id: Joi.string().trim().allow(null, '').optional(),
  driver_name: Joi.string().trim().required(),
}).options({ stripUnknown: true });

module.exports = { createVehicleSchema };
