import ProfileRepo from '../repositories/profile.repo.js';
import AppError    from '../utils/AppError.js';

// These endpoints are ONLY for service-to-service communication.
// Protected by internalAuth middleware — NOT by JWT.
class InternalController {

  // GET /api/v1/internal/settings/:userId
  // Called by notification-service before sending any email.
  // Returns only the notification settings object — nothing else.
  async getSettings(req, res, next) {
    try {
      const profile = await ProfileRepo.findByUserId(req.params.userId);

      if (!profile) {
        // Return default settings if profile doesn't exist yet
        // This prevents notification-service from crashing on new users
        return res.status(200).json({
          success: true,
          data: {
            emailOnRoleAssigned:  true,
            emailOnEventApproved: true,
            emailOnEventRejected: true,
            emailOnMembership:    true,
            emailOnEcrReminder:   true,
            emailOnStepAssigned:  true,
          },
        });
      }

      res.status(200).json({
        success: true,
        data: profile.settings?.notifications || {},
      });
    } catch (err) { next(err); }
  }

  // POST /api/v1/internal/profiles/batch
  // Called by club-service to get names and photos for multiple users at once.
  // Used in the approval chain display — "Approved by: [name, avatar]"
  // Body: { userIds: ['id1', 'id2', ...] }
  async getBatch(req, res, next) {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('userIds must be a non-empty array', 400);
      }

      if (userIds.length > 50) {
        throw new AppError('Cannot fetch more than 50 profiles at once', 400);
      }

      const profiles = await ProfileRepo.findManyByUserIds(userIds);

      res.status(200).json({
        success: true,
        data: profiles,
      });
    } catch (err) { next(err); }
  }
}

export default new InternalController();
