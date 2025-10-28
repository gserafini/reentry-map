'use client'

import { useEffect } from 'react'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Typography,
} from '@mui/material'
import { Email as EmailIcon, Phone as PhoneIcon } from '@mui/icons-material'
import { useAuth } from '@/lib/hooks/useAuth'
import { getInitials, getAvatarColor, getUserDisplayName } from '@/lib/utils/avatar'
import { useGravatar } from '@/lib/hooks/useGravatar'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth()
  const router = useRouter()
  const { gravatarUrl, hasGravatar } = useGravatar(user?.email, 160) // 2x size for retina

  // Redirect if not authenticated (in useEffect to avoid render-phase state updates)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    )
  }

  if (!user) {
    return null
  }

  const displayName = getUserDisplayName(user.email, user.phone)
  const identifier = user.email || user.phone || 'user'

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          {/* Avatar and Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              src={hasGravatar && gravatarUrl ? gravatarUrl : undefined}
              sx={{
                width: 80,
                height: 80,
                bgcolor: getAvatarColor(identifier),
                fontSize: '2rem',
                fontWeight: 600,
                mr: 3,
              }}
            >
              {!hasGravatar && getInitials(identifier)}
            </Avatar>
            <Box>
              <Typography variant="h4" gutterBottom>
                {displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Member since {new Date(user.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Contact Information */}
          <Typography variant="h6" gutterBottom>
            Contact Information
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
            {user.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon fontSize="small" color="action" />
                <Typography>{user.email}</Typography>
              </Box>
            )}
            {user.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography>{user.phone}</Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Activity Stats */}
          <Typography variant="h6" gutterBottom>
            Activity
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 2,
              mb: 4,
            }}
          >
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Favorites
                </Typography>
                <Typography variant="h4">0</Typography>
                <Typography variant="body2" color="text.secondary">
                  Saved resources
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Reviews
                </Typography>
                <Typography variant="h4">0</Typography>
                <Typography variant="body2" color="text.secondary">
                  Written reviews
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" color="error" onClick={signOut} sx={{ minWidth: 120 }}>
              Sign Out
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}
