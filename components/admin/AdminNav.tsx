'use client'

import { AppBar, Toolbar, Typography, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import {
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon,
  Map as MapIcon,
  Apartment as ApartmentIcon,
} from '@mui/icons-material'

export function AdminNav() {
  const router = useRouter()

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Admin Dashboard
        </Typography>
        <Button startIcon={<DashboardIcon />} sx={{ mr: 2 }} onClick={() => router.push('/admin')}>
          Dashboard
        </Button>
        <Button
          startIcon={<ApartmentIcon />}
          sx={{ mr: 2 }}
          onClick={() => router.push('/admin/command-center')}
        >
          Command Center
        </Button>
        <Button
          startIcon={<MapIcon />}
          sx={{ mr: 2 }}
          onClick={() => router.push('/admin/coverage-map')}
        >
          Coverage Map
        </Button>
        <Button
          startIcon={<SettingsIcon />}
          sx={{ mr: 2 }}
          onClick={() => router.push('/admin/settings')}
        >
          Settings
        </Button>
        <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => router.push('/')}>
          Back to Site
        </Button>
      </Toolbar>
    </AppBar>
  )
}
