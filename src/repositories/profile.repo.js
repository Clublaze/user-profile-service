import Profile from '../models/Profile.model.js';
import redis   from '../config/redis.js';
import logger  from '../utils/logger.js';

const CACHE_TTL = 300; // 5 minutes
const cacheKey  = (userId) => `profile:${userId}`;

class ProfileRepo {

  // ── CREATE ──────────────────────────────────────────────────────────────────
  async create(data) {
    return Profile.create(data);
  }

  // ── FIND BY USER ID ─────────────────────────────────────────────────────────
  // Redis first, then MongoDB.
  async findByUserId(userId) {
    try {
      const cached = await redis.get(cacheKey(userId));
      if (cached) return JSON.parse(cached);
    } catch (err) {
      logger.warn(`Redis read failed in findByUserId: ${err.message}`);
    }

    const profile = await Profile.findOne({ userId }).lean();

    if (profile) {
      try {
        await redis.setex(cacheKey(userId), CACHE_TTL, JSON.stringify(profile));
      } catch (err) {
        logger.warn(`Redis write failed in findByUserId: ${err.message}`);
      }
    }

    return profile;
  }

  // ── UPDATE ──────────────────────────────────────────────────────────────────
  async update(userId, updates) {
    const profile = await Profile.findOneAndUpdate(
      { userId },
      updates,
      { new: true, runValidators: true }
    ).lean();

    await this._bustCache(userId);
    return profile;
  }

  // ── APPEND TO ACTIVITY FEED ─────────────────────────────────────────────────
  // Uses MongoDB $push + $slice to atomically append and cap at 20 items.
  async appendActivity(userId, activityItem) {
    const profile = await Profile.findOneAndUpdate(
      { userId },
      {
        $push: {
          activityFeed: {
            $each:  [activityItem],
            $slice: -20, // keep only the 20 most recent
          },
        },
      },
      { new: true }
    ).lean();

    await this._bustCache(userId);
    return profile;
  }

  // ── INCREMENT STAT ──────────────────────────────────────────────────────────
  // field: 'stats.eventsOrganized' | 'stats.clubsJoined' | 'stats.rolesHeld'
  async incrementStat(userId, field, amount = 1) {
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $inc: { [field]: amount } },
      { new: true }
    ).lean();

    await this._bustCache(userId);
    return profile;
  }

  // ── ADD BADGE ───────────────────────────────────────────────────────────────
  // Only adds if the user does not already have this badge code.
  async addBadge(userId, badge) {
    const existing = await Profile.findOne({
      userId,
      'badges.code': badge.code,
    }).lean();

    if (existing) return null; // already awarded

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $push: { badges: badge } },
      { new: true }
    ).lean();

    await this._bustCache(userId);
    return profile;
  }

  // ── UPDATE COMPLETION SCORE ─────────────────────────────────────────────────
  async updateCompletionScore(userId, score) {
    return this.update(userId, { completionScore: score });
  }

  // ── BATCH FIND (internal endpoint) ──────────────────────────────────────────
  // club-service calls this to get names/photos for multiple users at once
  // e.g. showing "approved by: [name, photo]" in the approval chain UI
  async findManyByUserIds(userIds) {
    return Profile.find({ userId: { $in: userIds } })
      .select('userId name photoUrl department userType')
      .lean();
  }

  // ── EXISTS CHECK ─────────────────────────────────────────────────────────────
  async existsByUserId(userId) {
    return Profile.exists({ userId });
  }

  // ── PRIVATE: bust Redis cache ─────────────────────────────────────────────
  async _bustCache(userId) {
    try {
      await redis.del(cacheKey(userId));
    } catch (err) {
      logger.warn(`Redis cache bust failed for ${userId}: ${err.message}`);
    }
  }
}

export default new ProfileRepo();
