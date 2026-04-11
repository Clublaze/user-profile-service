import { getConsumer } from '../../config/kafka.js';
import ProfileRepo     from '../../repositories/profile.repo.js';
import logger          from '../../utils/logger.js';

// Listens to auth-service's user-events topic.
// Handles: user.registered → create profile
//          user.blocked    → deactivate profile
//          user.unblocked  → reactivate profile
export const startAuthConsumer = async () => {
  try {
    const consumer = await getConsumer('user-profile-auth-consumer');

    await consumer.subscribe({
      topic:         'user-events',
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const raw = message.value?.toString();
          if (!raw) return;

          const { event, payload } = JSON.parse(raw);
          logger.debug(`Auth consumer received: ${event}`);

          switch (event) {

            // ── user.registered ─────────────────────────────────────────────
            // auth-service payload: { userId, email, userType, universityId }
            // Create a minimal profile. User fills in name etc. themselves.
            case 'user.registered': {
              const { userId, email, userType, universityId } = payload;

              // Guard: don't create duplicate profiles
              const exists = await ProfileRepo.existsByUserId(userId);
              if (exists) {
                logger.debug(`Profile already exists for user ${userId} — skipping`);
                break;
              }

              await ProfileRepo.create({
                userId,
                universityId,
                userType,
                email,
                // name, department etc. are null until user fills their profile
              });

              logger.info(`Profile created for new user: ${userId} (${userType})`);
              break;
            }

            // ── user.blocked ─────────────────────────────────────────────────
            // Hide the profile — blocked users should not appear in discovery
            case 'user.blocked': {
              const { userId } = payload;
              await ProfileRepo.update(userId, { isActive: false });
              logger.info(`Profile deactivated for blocked user: ${userId}`);
              break;
            }

            // ── user.unblocked ───────────────────────────────────────────────
            // Restore profile visibility
            case 'user.unblocked': {
              const { userId } = payload;
              await ProfileRepo.update(userId, { isActive: true });
              logger.info(`Profile reactivated for unblocked user: ${userId}`);
              break;
            }

            default:
              logger.debug(`Auth consumer: unhandled event "${event}"`);
          }

        } catch (err) {
          // Never crash the consumer — log and continue
          logger.error(`Auth consumer message processing error: ${err.message}`);
        }
      },
    });

    logger.info('Auth consumer started — listening to user-events topic');

  } catch (err) {
    logger.warn(`Auth consumer failed to start: ${err.message}`);
    throw err;
  }
};
