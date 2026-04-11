import logger from './logger.js';
import env    from '../config/env.js';

// HTTP client for calling leaderboard-service.
// leaderboard-service does not exist yet — always returns null gracefully.
// When it is built, this client will start working with zero changes.
const leaderboardClient = {

  // GET /api/v1/leaderboard/users/:userId
  // Returns { xp, rank, level, totalUsers } or null.
  async getUserScore(userId) {
    try {
      const response = await fetch(
        `${env.services.leaderboardServiceUrl}/api/v1/leaderboard/users/${userId}`,
        {
          method:  'GET',
          headers: {
            'x-internal-secret': env.internalServiceSecret,
            'Content-Type':      'application/json',
          },
        }
      );

      if (!response.ok) {
        logger.debug(`Leaderboard service returned ${response.status} for user ${userId}`);
        return null;
      }

      const body = await response.json();
      return body.data || null;

    } catch (err) {
      // Leaderboard service not running yet — fail silently, not a hard error
      logger.debug(`Leaderboard service unreachable: ${err.message}`);
      return null;
    }
  },
};

export default leaderboardClient;
