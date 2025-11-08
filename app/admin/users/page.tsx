'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
} from '@mui/material'
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface UserWithAuth {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  is_admin: boolean
  created_at: string
  email: string | null
}

export default function UsersListPage() {
  const [users, setUsers] = useState<UserWithAuth[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithAuth | null>(null)
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    is_admin: false,
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      setError(null)

      // Use database function to fetch users with emails efficiently
      const { data: usersData, error: usersError } = await supabase.rpc(
        'admin_get_users_with_emails'
      )

      if (usersError) throw usersError

      setUsers(usersData || [])
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Failed to load users. Make sure you have admin privileges.')
      // Fallback: load users without emails
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      setUsers(
        (usersData || []).map((user) => ({
          ...user,
          email: null,
        }))
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleEdit(user: UserWithAuth) {
    setSelectedUser(user)
    setEditFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      is_admin: user.is_admin,
    })
    setEditDialogOpen(true)
  }

  async function handleSave() {
    if (!selectedUser) return

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update(editFormData)
        .eq('id', selectedUser.id)

      if (updateError) throw updateError

      // Update local state
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                ...editFormData,
              }
            : u
        )
      )

      setEditDialogOpen(false)
      setSelectedUser(null)
    } catch (err) {
      console.error('Error updating user:', err)
      setError('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(user: UserWithAuth) {
    if (
      !confirm(
        `Are you sure you want to delete ${user.first_name || user.email}? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      // Note: This only deletes from public.users table
      // To fully delete auth.users entry, you need to use auth.admin.deleteUser()
      // which requires service role key
      const { error: deleteError } = await supabase.from('users').delete().eq('id', user.id)

      if (deleteError) throw deleteError

      setUsers(users.filter((u) => u.id !== user.id))
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Failed to delete user')
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Users Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredUsers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No users found. {searchQuery && 'Try a different search term.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {user.is_admin ? (
                        <AdminIcon fontSize="small" color="primary" />
                      ) : (
                        <PersonIcon fontSize="small" color="action" />
                      )}
                      <Typography variant="body2" fontWeight="medium">
                        {user.first_name || user.last_name
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : '—'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.email || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.phone || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_admin ? 'Admin' : 'User'}
                      size="small"
                      color={user.is_admin ? 'primary' : 'default'}
                      variant={user.is_admin ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(user.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => handleEdit(user)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(user)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit User:{' '}
          {selectedUser?.email || `${selectedUser?.first_name} ${selectedUser?.last_name}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="First Name"
              value={editFormData.first_name}
              onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Last Name"
              value={editFormData.last_name}
              onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Phone"
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editFormData.is_admin}
                  onChange={(e) => setEditFormData({ ...editFormData, is_admin: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Admin Privileges</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Grant full access to admin dashboard and all management features
                  </Typography>
                </Box>
              }
            />
            {editFormData.is_admin && (
              <Alert severity="warning">
                This user will have full admin access including user management, resource
                management, and settings configuration.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
