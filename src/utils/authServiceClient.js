import AppError from './AppError.js';
import logger   from './logger.js';
import env      from '../config/env.js';

// HTTP client for calling auth-service internal endpoints.
// Used to verify user identity when building the full profile response.
const authServiceClient = {

  // GET /api/auth/internal/users/:userId
  // Returns { _id, email, userType, universityId, isEmailVerified, status }
  // Returns null if user not found or auth-service is unreachable.
  async getUser(userId) {
    try {
      const response = await fetch(
        `${env.services.authServiceUrl}/api/auth/internal/users/${userId}`,
        {
          method:  'GET',
          headers: {
            'x-internal-secret': env.internalServiceSecret,
            'Content-Type':      'application/json',
          },
        }
      );

      if (response.status === 404) return null;

      if (response.status === 403) {
        throw new AppError('User account is deactivated', 403);
      }

      if (!response.ok) {
        logger.error(`Auth service returned ${response.status} for userId: ${userId}`);
        return null;
      }

      const body = await response.json();
      return body.data;

    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error(`Auth service unreachable (getUser): ${err.message}`);
      // Return null so profile page still loads even if auth-service is briefly down
      return null;
    }
  },
};

export default authServiceClient;
