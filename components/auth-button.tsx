import { Box, Button, Typography } from '@mui/material'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from './logout-button'

export async function AuthButton() {
  const supabase = await createClient()

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims()

  const user = data?.claims

  return user ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="body2">Hey, {user.email}!</Typography>
      <LogoutButton />
    </Box>
  ) : (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Link href="/auth/login" style={{ textDecoration: 'none' }}>
        <Button
          size="small"
          variant="outlined"
          sx={{
            borderColor: '#000',
            color: '#000',
            '&:hover': {
              borderColor: '#000',
              bgcolor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          Sign in
        </Button>
      </Link>
      <Link href="/auth/sign-up" style={{ textDecoration: 'none' }}>
        <Button
          size="small"
          variant="contained"
          sx={{
            bgcolor: '#000',
            color: '#fff',
            '&:hover': {
              bgcolor: '#333',
            },
          }}
        >
          Sign up
        </Button>
      </Link>
    </Box>
  )
}
