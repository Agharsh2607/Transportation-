const logger = require('../utils/logger');

/**
 * Returns an Express middleware that validates req.body against a Joi schema.
 * On success, replaces req.body with the validated (and potentially coerced) value.
 * On failure, returns 400 with structured error details.
 *
 * @param {import('joi').Schema} schema
 * @returns {import('express').RequestHandler}
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      logger.debug('Validation failed', { path: req.path, details });
      return res.status(400).json({
        error: 'Validation failed',
        code: 400,
        details,
      });
    }

    req.body = value;
    next();
  };
}

module.exports = { validate };
