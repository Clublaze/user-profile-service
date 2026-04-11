import SettingsService from '../services/settings.service.js';

class SettingsController {

  // GET /api/v1/settings
  async getSettings(req, res, next) {
    try {
      const settings = await SettingsService.getSettings(req.user.id);
      res.success(settings);
    } catch (err) { next(err); }
  }

  // PATCH /api/v1/settings/notifications
  async updateNotifications(req, res, next) {
    try {
      const settings = await SettingsService.updateNotificationSettings(
        req.user.id,
        req.body
      );
      res.success(settings, 'Notification settings updated');
    } catch (err) { next(err); }
  }

  // PATCH /api/v1/settings/privacy
  async updatePrivacy(req, res, next) {
    try {
      const settings = await SettingsService.updatePrivacySettings(
        req.user.id,
        req.body
      );
      res.success(settings, 'Privacy settings updated');
    } catch (err) { next(err); }
  }

  // POST /api/v1/settings/change-password
  // Proxies the request to auth-service — profile-service never handles passwords.
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await SettingsService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
        req.headers.authorization // forward the Bearer token to auth-service
      );
      res.success(result, 'Password changed successfully');
    } catch (err) { next(err); }
  }
}

export default new SettingsController();
