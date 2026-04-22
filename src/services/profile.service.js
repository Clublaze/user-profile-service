import ProfileRepo        from '../repositories/profile.repo.js';
import authServiceClient  from '../utils/authServiceClient.js';
import clubServiceClient  from '../utils/clubServiceClient.js';
import leaderboardClient  from '../utils/leaderboardClient.js';
import AppError           from '../utils/AppError.js';

// ── Completion score calculation ──────────────────────────────────────────────
// Points awarded for each profile field.
// Total possible: 100 points.
// graduationYear is STUDENT-only (5 pts) — faculty leave it null intentionally.
const calculateCompletionScore = (profile) => {
  let score = 0;

  if (profile.name)           score += 15;
  if (profile.photoUrl)       score += 20;
  if (profile.bio)            score += 15;
  if (profile.department)     score += 10;
  if (profile.coverPhotoUrl)  score += 10;

  if (profile.linkedinUrl || profile.githubUrl) score += 10;
  if (profile.portfolioUrl)   score += 5;

  // graduationYear only counts for STUDENTs
  if (profile.userType === 'STUDENT' && profile.graduationYear) score += 5;

  if (profile.pinnedHighlight) score += 5;

  if (profile.badges && profile.badges.length > 0) score += 5;

  return Math.min(score, 100);
};

class ProfileService {
  async ensureOwnProfile(userId) {
    let profile = await ProfileRepo.findByUserId(userId);
    if (profile) return profile;

    const user = await authServiceClient.getUser(userId);
    if (!user) throw new AppError('Profile not found', 404);

    profile = await ProfileRepo.create({
      userId: user._id?.toString?.() || userId,
      universityId: user.universityId,
      userType: user.userType,
      email: user.email,
      name: user.displayName || null,
    });

    const completionScore = calculateCompletionScore(profile);
    if (completionScore !== profile.completionScore) {
      profile = await ProfileRepo.updateCompletionScore(userId, completionScore);
    }

    return profile;
  }

  // ── GET OWN FULL PROFILE ───────────────────────────────────────────────────
  // Aggregates local profile data + live data from club-service and leaderboard-service.
  // This is the main profile page response.
  async getMyProfile(userId, universityId) {
    const profile = await this.ensureOwnProfile(userId);

    if (!profile.isActive) throw new AppError('This account has been deactivated', 403);

    // Fetch live data in parallel — all three fail gracefully if services are down
    const [currentRoles, memberships, recentEvents, leaderboard] = await Promise.all([
      clubServiceClient.getRolesForUser(userId, universityId),
      clubServiceClient.getMembershipsForUser(userId, universityId),
      clubServiceClient.getEventsForUser(userId, universityId, 10),
      leaderboardClient.getUserScore(userId),
    ]);

    return {
      // Local profile data
      userId:          profile.userId,
      universityId:    profile.universityId,
      userType:        profile.userType,
      email:           profile.email,
      name:            profile.name,
      department:      profile.department,
      graduationYear:  profile.graduationYear,
      bio:             profile.bio,
      photoUrl:        profile.photoUrl,
      coverPhotoUrl:   profile.coverPhotoUrl,
      linkedinUrl:     profile.linkedinUrl,
      githubUrl:       profile.githubUrl,
      portfolioUrl:    profile.portfolioUrl,
      pinnedHighlight: profile.pinnedHighlight,
      badges:          profile.badges,
      stats:           profile.stats,
      activityFeed:    profile.activityFeed,
      completionScore: profile.completionScore,
      settings:        profile.settings,
      createdAt:       profile.createdAt, // "Member since..."

      // Live data from other services
      currentRoles,
      memberships,
      recentEvents,
      leaderboard, // null if leaderboard-service is not running yet
    };
  }

  // ── GET ANOTHER USER'S PROFILE ─────────────────────────────────────────────
  // Respects privacy settings — hides email and activity feed if user opted out.
  async getProfileById(targetUserId, universityId) {
    const profile = await ProfileRepo.findByUserId(targetUserId);
    if (!profile) throw new AppError('Profile not found', 404);

    if (!profile.isActive) throw new AppError('This profile is not available', 404);

    // Respect privacy: if showProfile is false, hide almost everything
    if (!profile.settings?.privacy?.showProfile) {
      return {
        userId:   profile.userId,
        name:     profile.name || 'UniHub User',
        photoUrl: profile.photoUrl,
        userType: profile.userType,
        message:  'This user has set their profile to private',
      };
    }

    const [currentRoles, recentEvents, leaderboard] = await Promise.all([
      clubServiceClient.getRolesForUser(targetUserId, universityId),
      clubServiceClient.getEventsForUser(targetUserId, universityId, 5),
      leaderboardClient.getUserScore(targetUserId),
    ]);

    return {
      userId:          profile.userId,
      userType:        profile.userType,
      name:            profile.name,
      department:      profile.department,
      bio:             profile.bio,
      photoUrl:        profile.photoUrl,
      coverPhotoUrl:   profile.coverPhotoUrl,
      linkedinUrl:     profile.linkedinUrl,
      githubUrl:       profile.githubUrl,
      portfolioUrl:    profile.portfolioUrl,
      pinnedHighlight: profile.pinnedHighlight,
      badges:          profile.badges,
      stats:           profile.stats,
      createdAt:       profile.createdAt,

      // Conditionally include based on privacy settings
      email:        profile.settings?.privacy?.showEmail        ? profile.email        : undefined,
      activityFeed: profile.settings?.privacy?.showActivityFeed ? profile.activityFeed : undefined,

      currentRoles,
      recentEvents,
      leaderboard,
    };
  }

  // ── UPDATE PROFILE ─────────────────────────────────────────────────────────
  // Only allows editable fields — identity fields (email, userType) cannot be changed here.
  async updateProfile(userId, updates) {
    await this.ensureOwnProfile(userId);

    // Strip fields the user is not allowed to change
    const forbidden = ['userId', 'universityId', 'userType', 'email', 'isActive',
                       'badges', 'stats', 'activityFeed', 'completionScore'];
    for (const field of forbidden) {
      delete updates[field];
    }

    const updated = await ProfileRepo.update(userId, updates);

    // Recalculate completion score after every profile update
    const newScore = calculateCompletionScore(updated);
    await ProfileRepo.updateCompletionScore(userId, newScore);

    return { ...updated, completionScore: newScore };
  }

  // ── SET PINNED HIGHLIGHT ───────────────────────────────────────────────────
  async setPinnedHighlight(userId, highlight) {
    await this.ensureOwnProfile(userId);
    const updated = await ProfileRepo.update(userId, { pinnedHighlight: highlight });
    const newScore = calculateCompletionScore(updated);
    await ProfileRepo.updateCompletionScore(userId, newScore);
    return updated;
  }

  // ── REMOVE PINNED HIGHLIGHT ────────────────────────────────────────────────
  async removePinnedHighlight(userId) {
    await this.ensureOwnProfile(userId);
    return ProfileRepo.update(userId, { pinnedHighlight: null });
  }

  // ── CALCULATE COMPLETION (exported for Kafka consumers to use) ────────────
  calculateCompletionScore(profile) {
    return calculateCompletionScore(profile);
  }
}

export default new ProfileService();
