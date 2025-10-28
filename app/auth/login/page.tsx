'use client'

import { LoginForm } from '@/components/login-form'
import { PhoneAuth } from '@/components/auth/PhoneAuth'
import { Box, Tab, Tabs } from '@mui/material'
import { useState } from 'react'

export default function Page() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Box sx={{ mb: 2 }}>
          <Tabs
            value={authMethod}
            onChange={(_, value) => setAuthMethod(value)}
            variant="fullWidth"
            aria-label="authentication method tabs"
          >
            <Tab label="Email" value="email" />
            <Tab label="Phone" value="phone" />
          </Tabs>
        </Box>
        {authMethod === 'email' ? <LoginForm /> : <PhoneAuth />}
      </div>
    </div>
  )
}
