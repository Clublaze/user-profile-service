import ProfileService from '../services/profile.service.js';
import PhotoService   from '../services/photo.service.js';
import AppError       from '../utils/AppError.js';

class ProfileController {

  // GET /api/v1/profiles/me
  async getMe(req, res, next) {
    try {
      const profile = await ProfileService.getMyProfile(
        req.user.id,
        req.user.universityId
      );
      res.success(profile);
    } catch (err) { next(err); }
  }

  // PATCH /api/v1/profiles/me
  async updateMe(req, res, next) {
    try {
      const updated = await ProfileService.updateProfile(
        req.user.id,
        req.body
      );
      res.success(updated, 'Profile updated successfully');
    } catch (err) { next(err); }
  }

  // GET /api/v1/profiles/:userId
  async getProfile(req, res, next) {
    try {
      const profile = await ProfileService.getProfileById(
        req.params.userId,
        req.user.universityId
      );
      res.success(profile);
    } catch (err) { next(err); }
  }

  // POST /api/v1/profiles/me/photo
  async uploadPhoto(req, res, next) {
    try {
      if (!req.file) {
        return next(new AppError('No file uploaded', 400));
      }
      const result = await PhotoService.uploadAvatar(req.user.id, req.file);
      res.success(result, 'Profile photo uploaded successfully');
    } catch (err) { next(err); }
  }

  // DELETE /api/v1/profiles/me/photo
  async deletePhoto(req, res, next) {
    try {
      const result = await PhotoService.deleteAvatar(req.user.id);
      res.success(result, 'Profile photo removed');
    } catch (err) { next(err); }
  }

  // POST /api/v1/profiles/me/cover
  async uploadCover(req, res, next) {
    try {
      if (!req.file) {
        return next(new AppError('No file uploaded', 400));
      }
      const result = await PhotoService.uploadCover(req.user.id, req.file);
      res.success(result, 'Cover photo uploaded successfully');
    } catch (err) { next(err); }
  }

  // DELETE /api/v1/profiles/me/cover
  async deleteCover(req, res, next) {
    try {
      const result = await PhotoService.deleteCover(req.user.id);
      res.success(result, 'Cover photo removed');
    } catch (err) { next(err); }
  }

  // PUT /api/v1/profiles/me/highlight
  async setHighlight(req, res, next) {
    try {
      const result = await ProfileService.setPinnedHighlight(
        req.user.id,
        req.body
      );
      res.success(result, 'Pinned highlight updated');
    } catch (err) { next(err); }
  }

  // DELETE /api/v1/profiles/me/highlight
  async removeHighlight(req, res, next) {
    try {
      const result = await ProfileService.removePinnedHighlight(req.user.id);
      res.success(result, 'Pinned highlight removed');
    } catch (err) { next(err); }
  }
}

export default new ProfileController();
