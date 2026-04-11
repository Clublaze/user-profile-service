import AppError from '../utils/AppError.js';
import env      from '../config/env.js';

// Protects internal endpoints — only other microservices can call these.
// Uses the shared INTERNAL_SERVICE_SECRET across all UniHub services.
// notification-service will use this to query notification settings before sending emails.
export const internalAuth = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];

  if (!secret || secret !== env.internalServiceSecret) {
    return next(new AppError('Unauthorized', 401));
  }

  next();
};
