import ProfileRepo from '../repositories/profile.repo.js';
import AppError    from '../utils/AppError.js';
import authServiceClient from '../utils/authServiceClient.js';

class SettingsService {
  async ensureProfile(userId) {
    let profile = await ProfileRepo.findByUserId(userId);
    if (profile) return profile;

    const user = await authServiceClient.getUser(userId);
    if (!user) throw new AppError('Profile not found', 404);

    return ProfileRepo.create({
      userId: user._id?.toString?.() || userId,
      universityId: user.universityId,
      userType: user.userType,
      email: user.email,
      name: user.displayName || null,
    });
  }

  // ── GET SETTINGS ───────────────────────────────────────────────────────────
  async getSettings(userId) {
    const profile = await this.ensureProfile(userId);
    return profile.settings;
  }

  // ── UPDATE NOTIFICATION SETTINGS ──────────────────────────────────────────
  async updateNotificationSettings(userId, updates) {
    const profile = await this.ensureProfile(userId);

    // Merge with existing — only update the fields provided
    const merged = {
      ...profile.settings.notifications,
      ...updates,
    };

    return ProfileRepo.update(userId, {
      'settings.notifications': merged,
    });
  }

  // ── UPDATE PRIVACY SETTINGS ────────────────────────────────────────────────
  async updatePrivacySettings(userId, updates) {
    const profile = await this.ensureProfile(userId);

    const merged = {
      ...profile.settings.privacy,
      ...updates,
    };

    return ProfileRepo.update(userId, {
      'settings.privacy': merged,
    });
  }

  // ── CHANGE PASSWORD ────────────────────────────────────────────────────────
  // Proxied to auth-service — profile-service never handles passwords directly.
  async changePassword(userId, currentPassword, newPassword, authorizationHeader) {
    // auth-service does not yet expose a change-password endpoint.
    // This method will be wired up when that route is added.
    // For now, throw a clear operational error so the frontend
    // can display a meaningful message to the user.
    throw new AppError(
      'Password change is not available yet. Please use the forgot password flow or contact your administrator.',
      503
    );
  }

  // ── GET NOTIFICATION SETTINGS (internal — called by notification-service) ──
  // Returns only notification preferences — used before sending any email.
  async getNotificationSettings(userId) {
    const profile = await ProfileRepo.findByUserId(userId);
    if (!profile) return null; // not found — notification-service will use defaults
    return profile.settings?.notifications || {};
  }
}

export default new SettingsService();
