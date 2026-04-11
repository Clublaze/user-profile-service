import { z } from 'zod';

export const updateProfileSchema = z.object({
  name:           z.string().min(2).max(100).optional(),
  department:     z.string().min(2).max(100).optional(),
  graduationYear: z.number().int().min(2020).max(2040).optional().nullable(),
  bio:            z.string().max(300).optional().nullable(),
  linkedinUrl:    z.string().url('Invalid LinkedIn URL').optional().nullable(),
  githubUrl:      z.string().url('Invalid GitHub URL').optional().nullable(),
  portfolioUrl:   z.string().url('Invalid portfolio URL').optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const pinnedHighlightSchema = z.object({
  type:        z.enum(['EVENT', 'ROLE', 'ACHIEVEMENT']),
  entityId:    z.string().min(1),
  title:       z.string().min(1).max(200),
  description: z.string().max(500).optional(),
});
