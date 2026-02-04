'use client'

import { Box, Button, Avatar, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import {
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Favorite as FavoriteIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getInitials, getAvatarColor } from '@/lib/utils/avatar'
import { useGravatar } from '@/lib/hooks/useGravatar'
import { AuthModal } from '@/components/auth/AuthModal'

interface AuthButtonProps {
  userEmail?: string | null
  isAdmin?: boolean
}

export function AuthButton({ userEmail, isAdmin = false }: AuthButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login')
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
    handleClose()
    await signOut({ redirect: false })
    router.refresh()
  }

  const handleOpenLogin = () => {
    setAuthModalMode('login')
    setAuthModalOpen(true)
  }

  const handleOpenSignup = () => {
    setAuthModalMode('signup')
    setAuthModalOpen(true)
  }

  const handleCloseAuthModal = () => {
    setAuthModalOpen(false)
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
        {isAdmin && (
          <MenuItem onClick={() => router.push('/admin')}>
            <ListItemIcon>
              <AdminIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Admin Dashboard</ListItemText>
          </MenuItem>
        )}
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
    <>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          onClick={handleOpenLogin}
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
        <Button
          onClick={handleOpenSignup}
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
      </Box>

      <AuthModal open={authModalOpen} onClose={handleCloseAuthModal} initialMode={authModalMode} />
    </>
  )
}
