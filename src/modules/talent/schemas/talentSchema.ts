import { z } from 'zod';
import { TALENT_STAGES } from '../types/talent';

export const talentSchema = z.object({
  fullName: z.string().trim().min(2, 'El nombre es obligatorio.').max(200),
  email: z.union([z.string().trim().email('Correo inválido.'), z.literal('')]),
  profile: z.string().trim().max(120),
  technologyProfile: z.string().trim().max(120),
  targetTechnology: z.string().trim().max(120),
  stage: z.enum(TALENT_STAGES),
  active: z.boolean(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.'),
  notes: z.string().trim().max(1000),
});

export type TalentFormValues = z.infer<typeof talentSchema>;
