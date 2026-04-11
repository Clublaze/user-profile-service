import logger from './logger.js';
import env    from '../config/env.js';

// HTTP client for calling club-service internal endpoints.
// These call the /api/v1/internal/* routes we added to club-service.
// All methods fail gracefully — return [] on error so the profile page still loads.
const clubServiceClient = {

  // GET /api/v1/internal/roles/user/:userId
  // Returns all role assignments for the user (all sessions, all scopes).
  async getRolesForUser(userId, universityId) {
    try {
      const response = await fetch(
        `${env.services.clubServiceUrl}/api/v1/internal/roles/user/${userId}?universityId=${universityId}`,
        {
          method:  'GET',
          headers: {
            'x-internal-secret': env.internalServiceSecret,
            'Content-Type':      'application/json',
          },
        }
      );

      if (!response.ok) {
        logger.warn(`Club service roles fetch failed: ${response.status} for user ${userId}`);
        return [];
      }

      const body = await response.json();
      return body.data || [];

    } catch (err) {
      logger.error(`Club service unreachable (getRolesForUser): ${err.message}`);
      return [];
    }
  },

  // GET /api/v1/internal/memberships/user/:userId
  // Returns all club memberships for the user.
  async getMembershipsForUser(userId, universityId) {
    try {
      const response = await fetch(
        `${env.services.clubServiceUrl}/api/v1/internal/memberships/user/${userId}?universityId=${universityId}`,
        {
          method:  'GET',
          headers: {
            'x-internal-secret': env.internalServiceSecret,
            'Content-Type':      'application/json',
          },
        }
      );

      if (!response.ok) {
        logger.warn(`Club service memberships fetch failed: ${response.status} for user ${userId}`);
        return [];
      }

      const body = await response.json();
      return body.data || [];

    } catch (err) {
      logger.error(`Club service unreachable (getMembershipsForUser): ${err.message}`);
      return [];
    }
  },

  // GET /api/v1/internal/events/user/:userId
  // Returns recent events created by the user.
  async getEventsForUser(userId, universityId, limit = 10) {
    try {
      const response = await fetch(
        `${env.services.clubServiceUrl}/api/v1/internal/events/user/${userId}?universityId=${universityId}&limit=${limit}`,
        {
          method:  'GET',
          headers: {
            'x-internal-secret': env.internalServiceSecret,
            'Content-Type':      'application/json',
          },
        }
      );

      if (!response.ok) {
        logger.warn(`Club service events fetch failed: ${response.status} for user ${userId}`);
        return [];
      }

      const body = await response.json();
      return body.data || [];

    } catch (err) {
      logger.error(`Club service unreachable (getEventsForUser): ${err.message}`);
      return [];
    }
  },
};

export default clubServiceClient;
