import { Router }        from 'express';
import InternalController from '../controllers/internal.controller.js';
import { internalAuth }   from '../middleware/internalAuth.middleware.js';

const router = Router();

// All routes protected by x-internal-secret — NOT by JWT
router.use(internalAuth);

// Called by notification-service before sending any email
// to check if the user has that notification type enabled
router.get('/settings/:userId', InternalController.getSettings);

// Called by club-service to get names/photos for multiple users at once
// e.g. showing "approved by: [name, photo]" in the approval chain UI
router.post('/profiles/batch', InternalController.getBatch);

export default router;
