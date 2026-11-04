/** Safe profile fields returned to the signed-in account owner. */
export interface Profile {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export const MAX_PROFILE_NAME_LENGTH = 120
