import ProfileRepo                      from '../repositories/profile.repo.js';
import { uploadFile, deleteFile,
         extractKeyFromUrl }            from '../utils/s3.util.js';
import ProfileService                   from './profile.service.js';
import AppError                         from '../utils/AppError.js';

class PhotoService {

  // ── UPLOAD PROFILE PHOTO ───────────────────────────────────────────────────
  async uploadAvatar(userId, file) {
    if (!file) throw new AppError('No file provided', 400);

    const profile = await ProfileRepo.findByUserId(userId);
    if (!profile) throw new AppError('Profile not found', 404);

    // Delete old photo from S3 if one exists
    if (profile.photoUrl) {
      const oldKey = extractKeyFromUrl(profile.photoUrl);
      if (oldKey) {
        await deleteFile(oldKey).catch(() => {}); // best-effort delete
      }
    }

    // S3 key pattern: profiles/{userId}/avatar.jpg
    const ext = file.mimetype.split('/')[1] || 'jpg';
    const key = `profiles/${userId}/avatar.${ext}`;

    const url = await uploadFile(file.buffer, key, file.mimetype);

    const updated = await ProfileRepo.update(userId, { photoUrl: url });

    // Recalculate completion score — photoUrl is worth 20 points
    const newScore = ProfileService.calculateCompletionScore(updated);
    await ProfileRepo.updateCompletionScore(userId, newScore);

    return { photoUrl: url, completionScore: newScore };
  }

  // ── DELETE PROFILE PHOTO ───────────────────────────────────────────────────
  async deleteAvatar(userId) {
    const profile = await ProfileRepo.findByUserId(userId);
    if (!profile) throw new AppError('Profile not found', 404);

    if (!profile.photoUrl) throw new AppError('No profile photo to delete', 400);

    const key = extractKeyFromUrl(profile.photoUrl);
    if (key) {
      await deleteFile(key).catch(() => {}); // best-effort delete
    }

    const updated = await ProfileRepo.update(userId, { photoUrl: null });

    const newScore = ProfileService.calculateCompletionScore(updated);
    await ProfileRepo.updateCompletionScore(userId, newScore);

    return { completionScore: newScore };
  }

  // ── UPLOAD COVER PHOTO ─────────────────────────────────────────────────────
  async uploadCover(userId, file) {
    if (!file) throw new AppError('No file provided', 400);

    const profile = await ProfileRepo.findByUserId(userId);
    if (!profile) throw new AppError('Profile not found', 404);

    if (profile.coverPhotoUrl) {
      const oldKey = extractKeyFromUrl(profile.coverPhotoUrl);
      if (oldKey) {
        await deleteFile(oldKey).catch(() => {});
      }
    }

    const ext = file.mimetype.split('/')[1] || 'jpg';
    const key = `profiles/${userId}/cover.${ext}`;

    const url = await uploadFile(file.buffer, key, file.mimetype);

    const updated = await ProfileRepo.update(userId, { coverPhotoUrl: url });

    const newScore = ProfileService.calculateCompletionScore(updated);
    await ProfileRepo.updateCompletionScore(userId, newScore);

    return { coverPhotoUrl: url, completionScore: newScore };
  }

  // ── DELETE COVER PHOTO ─────────────────────────────────────────────────────
  async deleteCover(userId) {
    const profile = await ProfileRepo.findByUserId(userId);
    if (!profile) throw new AppError('Profile not found', 404);

    if (!profile.coverPhotoUrl) throw new AppError('No cover photo to delete', 400);

    const key = extractKeyFromUrl(profile.coverPhotoUrl);
    if (key) {
      await deleteFile(key).catch(() => {});
    }

    const updated = await ProfileRepo.update(userId, { coverPhotoUrl: null });

    const newScore = ProfileService.calculateCompletionScore(updated);
    await ProfileRepo.updateCompletionScore(userId, newScore);

    return { completionScore: newScore };
  }
}

export default new PhotoService();
