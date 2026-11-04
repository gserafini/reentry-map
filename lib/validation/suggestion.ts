import { z } from 'zod'

const text = (max: number) => z.string().trim().max(max).nullable().optional()
const list = z.array(z.string().trim().min(1).max(200)).max(50).nullable().optional()

// Strip unknown fields, including all moderation, provenance and ownership fields.
export const publicSuggestionSchema = z.object({
  name: z.string().trim().min(1).max(300),
  address: text(1000),
  address_type: z.enum(['physical', 'confidential', 'regional', 'online', 'mobile']).optional(),
  service_area: z
    .object({
      type: z.enum(['city', 'county', 'statewide', 'region', 'nationwide']),
      values: z.array(z.string().trim().min(1).max(200)).max(100),
    })
    .nullable()
    .optional(),
  city: text(200),
  state: text(100),
  zip: text(30),
  phone: text(100),
  email: z.string().trim().email().max(320).or(z.literal('')).nullable().optional(),
  website: z
    .string()
    .trim()
    .max(2000)
    .url()
    .refine((value) => /^https?:\/\//i.test(value))
    .or(z.literal(''))
    .nullable()
    .optional(),
  description: text(10000),
  category: text(100),
  primary_category: text(100),
  categories: list,
  tags: list,
  hours: z
    .record(z.string().max(100), z.string().max(500))
    .refine((value) => Object.keys(value).length <= 30)
    .nullable()
    .optional(),
  services_offered: list,
  eligibility_requirements: text(5000),
  languages: list,
  accessibility_features: list,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  reason: text(5000),
  personal_experience: text(5000),
})
