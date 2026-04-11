import { z } from 'zod';

export const notificationSettingsSchema = z.object({
  emailOnRoleAssigned:  z.boolean().optional(),
  emailOnEventApproved: z.boolean().optional(),
  emailOnEventRejected: z.boolean().optional(),
  emailOnMembership:    z.boolean().optional(),
  emailOnEcrReminder:   z.boolean().optional(),
  emailOnStepAssigned:  z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one notification setting must be provided',
});

export const privacySettingsSchema = z.object({
  showProfile:      z.boolean().optional(),
  showEmail:        z.boolean().optional(),
  showActivityFeed: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one privacy setting must be provided',
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
