import jwt      from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import env      from '../config/env.js';

// Verifies the Bearer JWT issued by auth-service.
// Populates req.user with { id, universityId, userType }.
// Must run before tenantMiddleware on any protected route.
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Please log in.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    // JWT payload from auth-service: { sub, universityId, type, permissions }
    const decoded = jwt.verify(token, env.jwtSecret);

    req.user = {
      id:           decoded.sub,          // auth-service uses 'sub' for userId
      universityId: decoded.universityId,
      userType:     decoded.type,         // auth-service uses 'type', we expose as 'userType'
      permissions:  decoded.permissions || [],
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    next(err);
  }
};

export default authMiddleware;
