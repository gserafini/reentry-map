'use client'

import { Box, Button, Avatar, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import {
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getInitials, getAvatarColor } from '@/lib/utils/avatar'
import { useGravatar } from '@/lib/hooks/useGravatar'

interface AuthButtonProps {
  userEmail?: string | null
}

export function AuthButton({ userEmail }: AuthButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const router = useRouter()
  const open = Boolean(anchorEl)
  const { gravatarUrl, hasGravatar } = useGravatar(userEmail, 72) // 2x size for retina

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    handleClose()
    router.push('/auth/login')
    router.refresh()
  }

  return userEmail ? (
    <>
      <Avatar
        onClick={handleClick}
        src={hasGravatar && gravatarUrl ? gravatarUrl : undefined}
        sx={{
          width: 36,
          height: 36,
          bgcolor: getAvatarColor(userEmail),
          color: '#fff',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.9,
          },
        }}
      >
        {!hasGravatar && getInitials(userEmail)}
      </Avatar>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              minWidth: 180,
            },
          },
        }}
      >
        <MenuItem onClick={() => router.push('/favorites')}>
          <ListItemIcon>
            <FavoriteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Favorites</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => router.push('/profile')}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Log Out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  ) : (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Link href="/auth/login" style={{ textDecoration: 'none' }}>
        <Button
          size="small"
          variant="outlined"
          sx={{
            borderColor: '#000',
            color: '#000',
            whiteSpace: 'nowrap',
            minWidth: 'auto',
            px: 2,
            '&:hover': {
              borderColor: '#000',
              bgcolor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          Log In
        </Button>
      </Link>
      <Link href="/auth/sign-up" style={{ textDecoration: 'none' }}>
        <Button
          size="small"
          variant="contained"
          sx={{
            bgcolor: '#000',
            color: '#fff',
            whiteSpace: 'nowrap',
            minWidth: 'auto',
            px: 2,
            '&:hover': {
              bgcolor: '#333',
            },
          }}
        >
          Sign Up
        </Button>
      </Link>
    </Box>
  )
}
