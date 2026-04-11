import { Router } from 'express';

import SettingsController from '../controllers/settings.controller.js';
import authMiddleware     from '../middleware/auth.middleware.js';
import { validate }       from '../middleware/validate.middleware.js';
import {
  notificationSettingsSchema,
  privacySettingsSchema,
  changePasswordSchema,
} from '../validators/settings.validator.js';

const router = Router();

router.use(authMiddleware);

router.get('/',                        SettingsController.getSettings);
router.patch('/notifications',         validate(notificationSettingsSchema), SettingsController.updateNotifications);
router.patch('/privacy',               validate(privacySettingsSchema),      SettingsController.updatePrivacy);
router.post('/change-password',        validate(changePasswordSchema),       SettingsController.changePassword);

export default router;
