import { z } from 'zod';
import { TALENT_STAGES, TALENT_TYPES } from '../types/talent';

const optionalDate = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.'),
  z.literal(''),
]);

export const talentSchema = z.object({
  talentType: z.enum(TALENT_TYPES),
  softtekCode: z.string().trim().max(80),
  corporateUser: z.string().trim().max(100),
  email: z.string().trim().email('Correo inválido.').max(255),
  firstName: z.string().trim().min(2, 'El nombre es obligatorio.').max(120),
  lastName: z.string().trim().min(2, 'Los apellidos son obligatorios.').max(180),
  profile: z.string().trim().max(120),
  profileCatalogId: z.string().trim().max(36),
  technologyProfile: z.string().trim().max(120),
  technologyProfileCatalogId: z.string().trim().max(36),
  currentTechnology: z.string().trim().max(120),
  currentTechnologyCatalogId: z.string().trim().max(36),
  expertise: z.string().trim().max(40),
  stage: z.enum(TALENT_STAGES),
  active: z.boolean(),
  platformStartDate: optionalDate,
  platformEndDate: optionalDate,
  hireDate: optionalDate,
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de alta inválida.'),
  notes: z.string().trim().max(2000),
}).superRefine((value, ctx) => {
  if (value.platformStartDate && value.platformEndDate && value.platformEndDate < value.platformStartDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['platformEndDate'], message: 'El vencimiento no puede ser anterior al inicio de vigencia.' });
  }
  if (value.talentType === 'ACADEMY') {
    if (!value.softtekCode) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['softtekCode'], message: 'El IS es obligatorio para Academia.' });
    if (!value.profileCatalogId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['profileCatalogId'], message: 'El perfil es obligatorio para Academia.' });
    if (!value.currentTechnologyCatalogId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['currentTechnologyCatalogId'], message: 'La tecnología es obligatoria para Academia.' });
  }
});

export type TalentFormValues = z.infer<typeof talentSchema>;
