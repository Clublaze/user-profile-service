import { Router } from 'express';
import multer       from 'multer';

import ProfileController from '../controllers/profile.controller.js';
import authMiddleware    from '../middleware/auth.middleware.js';
import { validate }      from '../middleware/validate.middleware.js';
import {
  updateProfileSchema,
  pinnedHighlightSchema,
} from '../validators/profile.validator.js';
import env from '../config/env.js';

const router = Router();

// ── Multer — memory storage (buffer sent to S3, no disk writes) ───────────────
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: env.upload.maxAvatarSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and WEBP images are allowed'), false);
    }
  },
});

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: env.upload.maxCoverSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and WEBP images are allowed'), false);
    }
  },
});

// All profile routes require authentication
router.use(authMiddleware);

// ── Own profile ───────────────────────────────────────────────────────────────
router.get('/me',                   ProfileController.getMe);
router.patch('/me',                 validate(updateProfileSchema), ProfileController.updateMe);

// ── Photo uploads ─────────────────────────────────────────────────────────────
router.post('/me/photo',            avatarUpload.single('photo'),  ProfileController.uploadPhoto);
router.delete('/me/photo',          ProfileController.deletePhoto);

router.post('/me/cover',            coverUpload.single('cover'),   ProfileController.uploadCover);
router.delete('/me/cover',          ProfileController.deleteCover);

// ── Pinned highlight ──────────────────────────────────────────────────────────
router.put('/me/highlight',         validate(pinnedHighlightSchema), ProfileController.setHighlight);
router.delete('/me/highlight',      ProfileController.removeHighlight);

// ── View another user's profile ───────────────────────────────────────────────
router.get('/:userId',              ProfileController.getProfile);

export default router;
