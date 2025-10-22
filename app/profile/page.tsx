'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, LogOut, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function ProfilePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
      }
    }
    getUser()
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleLogoutClick = () => {
    setConfirmLogout(true)
  }

  const confirmLogoutAction = async () => {
    setConfirmLogout(false)
    await handleLogout()
  }

  const handleDeleteAllClick = () => {
    setConfirmDeleteAll(true)
  }

  const confirmDeleteAllAction = async () => {
    setConfirmDeleteAll(false)
    setDeleteLoading(true)
    setMessage(null)

    try {
      // Delete ALL rows (child tables first to satisfy foreign keys)
      await supabase.from('attendance').delete().not('id', 'is', null)
      await supabase.from('payroll').delete().not('id', 'is', null)
      await supabase.from('tasks').delete().not('id', 'is', null)
      await supabase.from('projects').delete().not('id', 'is', null)
      await supabase.from('employees').delete().not('id', 'is', null)

      // Attempt to clear task attachments from storage (ignore errors)
      try {
        const { data: files } = await supabase.storage.from('task-attachments').list('', { limit: 1000 })
        if (files && files.length > 0) {
          await supabase.storage.from('task-attachments').remove(files.map((f) => f.name))
        }
      } catch (_) {}

      setMessage({ 
        type: 'success', 
        text: 'All data has been successfully deleted. You will be logged out.' 
      })

      // Logout after successful deletion
      setTimeout(() => {
        handleLogout()
      }, 2000)

    } catch (error) {
      console.error('Error deleting data:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to delete all data. Please try again or contact support.' 
      })
    }

    setDeleteLoading(false)
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({ email })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Email updated successfully! Please check your inbox for confirmation.' })
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
          <p className="text-slate-600 mt-1">Manage your account information</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Update your account email address
              </CardDescription>
            </CardHeader>
            <CardContent>
              {message && (
                <div
                  className={`p-3 mb-4 text-sm rounded-md ${
                    message.type === 'success'
                      ? 'text-green-600 bg-green-50 border border-green-200'
                      : 'text-red-600 bg-red-50 border border-red-200'
                  }`}
                >
                  {message.text}
                </div>
              )}
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Email'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Account Actions
              </CardTitle>
              <CardDescription>
                Manage your session and account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">
                    Sign out of your account on this device
                  </p>
                  <Button variant="destructive" onClick={handleLogoutClick}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
                
                <div className="border-t pt-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">Danger Zone</h4>
                    <p className="text-sm text-red-700 mb-3">
                      Permanently delete all your data including:
                    </p>
                    <ul className="text-sm text-red-700 list-disc list-inside mb-4 space-y-1">
                      <li>Employee profile information</li>
                      <li>All attendance records</li>
                      <li>All payroll history</li>
                      <li>All assigned tasks</li>
                      <li>All project associations</li>
                    </ul>
                    <p className="text-sm text-red-700 font-medium mb-3">
                      ⚠️ This action cannot be undone!
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteAllClick}
                      disabled={deleteLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deleteLoading ? 'Deleting...' : 'Delete All Data'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Logout"
        description="Are you sure you want to logout? You will need to sign in again to access your account."
        confirmText="Logout"
        variant="destructive"
        onConfirm={confirmLogoutAction}
      />

      {/* Delete All Data Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDeleteAll}
        onOpenChange={setConfirmDeleteAll}
        title="Delete All Data"
        description="This will permanently delete ALL your data including employee profile, attendance records, payroll history, tasks, and project associations. This action CANNOT be undone. Are you absolutely sure?"
        confirmText="Yes, Delete Everything"
        variant="destructive"
        onConfirm={confirmDeleteAllAction}
      />
    </div>
  )
}

