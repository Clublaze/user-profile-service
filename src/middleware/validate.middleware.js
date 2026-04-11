import AppError from '../utils/AppError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    const message = err.errors?.[0]?.message || 'Invalid request data';
    next(new AppError(message, 400));
  }
};
