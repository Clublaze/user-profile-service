import { getConsumer } from '../../config/kafka.js';
import ProfileRepo     from '../../repositories/profile.repo.js';
import logger          from '../../utils/logger.js';

// ── Badge definitions ─────────────────────────────────────────────────────────
const BADGES = {
  FIRST_EVENT:       { code: 'FIRST_EVENT',       label: 'First Event Organized' },
  EVENT_VETERAN:     { code: 'EVENT_VETERAN',      label: 'Event Veteran'         },
  HACKATHON_ORG:     { code: 'HACKATHON_ORG',      label: 'Hackathon Organizer'   },
  CLUB_LEAD:         { code: 'CLUB_LEAD',          label: 'Club Lead'             },
  PRESIDENT:         { code: 'PRESIDENT',          label: 'Society President'     },
  FACULTY_ADVISOR:   { code: 'FACULTY_ADVISOR',    label: 'Faculty Advisor'       },
  MULTI_CLUB:        { code: 'MULTI_CLUB',         label: 'Multi-Club Member'     },
  COMMUNITY_BUILDER: { code: 'COMMUNITY_BUILDER',  label: 'Community Builder'     },
  LEADERSHIP_TRACK:  { code: 'LEADERSHIP_TRACK',   label: 'Leadership Track'      },
};

// ── Helper: award a badge if not already held ─────────────────────────────────
const awardBadge = async (userId, badge) => {
  try {
    await ProfileRepo.addBadge(userId, { ...badge, awardedAt: new Date() });
  } catch (err) {
    logger.error(`Badge award failed for ${userId} (${badge.code}): ${err.message}`);
  }
};

// ── Topics to subscribe to ────────────────────────────────────────────────────
// These are all individual topics published by club-service.
// We subscribe to each one separately.
const TOPICS = [
  'role.assigned',
  'membership.reviewed',
  'event.created',
  'event.submitted',
  'event.approved',
  'event.rejected',
  'event.closed',
];

// Listens to club-service Kafka topics.
// Updates stats, activity feed, and awards badges reactively.
export const startClubConsumer = async () => {
  try {
    const consumer = await getConsumer('user-profile-club-consumer');

    await consumer.subscribe({
      topics:        TOPICS,
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const raw = message.value?.toString();
          if (!raw) return;

          // club-service publishes the full payload as the message value
          // (not wrapped in { event, payload } like auth-service)
          const payload = JSON.parse(raw);
          logger.debug(`Club consumer received topic: ${topic}`, { payload });

          switch (topic) {

            // ── role.assigned ───────────────────────────────────────────────
            // payload: { userId, canonicalRole, scopeId, universityId, sessionId }
            case 'role.assigned': {
              const { userId, canonicalRole } = payload;
              if (!userId) break;

              // Increment rolesHeld stat
              const updated = await ProfileRepo.incrementStat(userId, 'stats.rolesHeld');

              // Append to activity feed
              await ProfileRepo.appendActivity(userId, {
                type:      'ROLE_ASSIGNED',
                title:     `Assigned as ${canonicalRole.replace(/_/g, ' ')}`,
                entityId:  payload.scopeId,
                timestamp: new Date(),
              });

              // Award role-specific badges
              if (canonicalRole === 'CLUB_LEAD')       await awardBadge(userId, BADGES.CLUB_LEAD);
              if (canonicalRole === 'PRESIDENT')        await awardBadge(userId, BADGES.PRESIDENT);
              if (canonicalRole === 'FACULTY_ADVISOR')  await awardBadge(userId, BADGES.FACULTY_ADVISOR);

              // Award LEADERSHIP_TRACK badge when rolesHeld reaches 3
              if (updated?.stats?.rolesHeld >= 3) {
                await awardBadge(userId, BADGES.LEADERSHIP_TRACK);
              }

              logger.info(`Role assigned processed for user: ${userId} (${canonicalRole})`);
              break;
            }

            // ── membership.reviewed (APPROVED only) ────────────────────────
            // payload: { membershipId, userId, clubId, action, universityId }
            case 'membership.reviewed': {
              const { userId, action, clubId } = payload;
              if (!userId || action !== 'APPROVE') break;

              // Increment clubsJoined stat
              const updated = await ProfileRepo.incrementStat(userId, 'stats.clubsJoined');

              // Append to activity feed
              await ProfileRepo.appendActivity(userId, {
                type:      'MEMBERSHIP_APPROVED',
                title:     'Joined a new club',
                entityId:  clubId,
                timestamp: new Date(),
              });

              // Award MULTI_CLUB badge at 3 clubs
              if (updated?.stats?.clubsJoined >= 3) {
                await awardBadge(userId, BADGES.MULTI_CLUB);
              }

              // Award COMMUNITY_BUILDER badge at 5 clubs
              if (updated?.stats?.clubsJoined >= 5) {
                await awardBadge(userId, BADGES.COMMUNITY_BUILDER);
              }

              logger.info(`Membership approved processed for user: ${userId}`);
              break;
            }

            // ── event.created ───────────────────────────────────────────────
            // payload: { eventId, universityId, createdBy, title }
            case 'event.created': {
              const { createdBy, eventId, title } = payload;
              if (!createdBy) break;

              await ProfileRepo.appendActivity(createdBy, {
                type:      'EVENT_CREATED',
                title:     `Started drafting: ${title || 'an event'}`,
                entityId:  eventId,
                timestamp: new Date(),
              });

              logger.debug(`Event created activity logged for user: ${createdBy}`);
              break;
            }

            // ── event.submitted ─────────────────────────────────────────────
            // payload: { eventId, universityId, createdBy, title }
            case 'event.submitted': {
              const { createdBy, eventId, title } = payload;
              if (!createdBy) break;

              await ProfileRepo.appendActivity(createdBy, {
                type:      'EVENT_SUBMITTED',
                title:     `Submitted for approval: ${title || 'an event'}`,
                entityId:  eventId,
                timestamp: new Date(),
              });

              logger.debug(`Event submitted activity logged for user: ${createdBy}`);
              break;
            }

            // ── event.approved ──────────────────────────────────────────────
            // payload: { eventId, universityId, createdBy, title, category }
            case 'event.approved': {
              const { createdBy, eventId, title, category } = payload;
              if (!createdBy) break;

              // Increment eventsOrganized stat
              const updated = await ProfileRepo.incrementStat(createdBy, 'stats.eventsOrganized');

              // Append to activity feed
              await ProfileRepo.appendActivity(createdBy, {
                type:      'EVENT_APPROVED',
                title:     `Event approved: ${title || 'an event'}`,
                entityId:  eventId,
                timestamp: new Date(),
              });

              // Award FIRST_EVENT badge on first approved event
              if (updated?.stats?.eventsOrganized === 1) {
                await awardBadge(createdBy, BADGES.FIRST_EVENT);
              }

              // Award EVENT_VETERAN badge at 5 events
              if (updated?.stats?.eventsOrganized >= 5) {
                await awardBadge(createdBy, BADGES.EVENT_VETERAN);
              }

              // Award HACKATHON_ORG badge if the event was a hackathon
              if (category === 'HACKATHON') {
                await awardBadge(createdBy, BADGES.HACKATHON_ORG);
              }

              logger.info(`Event approved processed for user: ${createdBy}`);
              break;
            }

            // ── event.rejected ──────────────────────────────────────────────
            // payload: { eventId, universityId, reason, rejectedBy }
            // Note: payload does NOT include createdBy — club-service doesn't send it.
            // We log this at debug level only — no stat change, no badge.
            case 'event.rejected': {
              logger.debug(`Event rejected: ${payload.eventId} — no profile action needed`);
              break;
            }

            // ── event.closed ────────────────────────────────────────────────
            // payload: { eventId, universityId, organizingClubId, createdBy, title }
            case 'event.closed': {
              const { createdBy, eventId, title } = payload;
              if (!createdBy) break;

              await ProfileRepo.appendActivity(createdBy, {
                type:      'EVENT_CLOSED',
                title:     `Successfully completed: ${title || 'an event'}`,
                entityId:  eventId,
                timestamp: new Date(),
              });

              logger.info(`Event closed activity logged for user: ${createdBy}`);
              break;
            }

            default:
              logger.debug(`Club consumer: unhandled topic "${topic}"`);
          }

        } catch (err) {
          // Never crash the consumer — log and continue
          logger.error(`Club consumer message processing error on topic ${topic}: ${err.message}`);
        }
      },
    });

    logger.info(`Club consumer started — listening to: ${TOPICS.join(', ')}`);

  } catch (err) {
    logger.warn(`Club consumer failed to start: ${err.message}`);
    throw err;
  }
};
