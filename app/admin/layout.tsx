import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { Box, Container } from '@mui/material'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  // Check authentication
  if (!session?.user) {
    redirect('/auth/login?redirect=/admin')
  }

  // Check admin status (from JWT token populated by NextAuth callbacks)
  if (!session.user.isAdmin) {
    redirect('/')
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AdminNav />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  )
}
