'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Calendar, Clock, User, X, CheckCircle, AlertCircle, XCircle, RotateCcw, Circle, Eye, EyeOff, CalendarPlus, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { Appointment, Employee } from '@/lib/types'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { googleCalendarService, appointmentToGoogleEvent } from '@/lib/googleCalendarService'

interface AppointmentWithDetails extends Appointment {
  employee_name?: string
  status_color?: string
  is_upcoming?: boolean
  is_past?: boolean
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeeAppointments, setEmployeeAppointments] = useState<AppointmentWithDetails[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithDetails | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [hideCompleted, setHideCompleted] = useState(false)
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const [googleCalendarLoading, setGoogleCalendarLoading] = useState(false)
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    variant?: 'default' | 'destructive'
    confirmText?: string
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })
  
  const [formData, setFormData] = useState({
    appointment_name: '',
    appointment_date: '',
    appointment_time: '',
    assigned_employee: '',
    appointment_info: '',
    sync_to_google_calendar: false,
  })
  
  const supabase = createClient()

  useEffect(() => {
    fetchEmployees()
    checkGoogleCalendarConnection()
  }, [])

  const checkGoogleCalendarConnection = async () => {
    try {
      // Only check if we have the required environment variables
      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
        console.warn('Google Calendar API credentials not configured')
        setGoogleCalendarConnected(false)
        return
      }

      const isConnected = await googleCalendarService.isSignedIn()
      setGoogleCalendarConnected(isConnected)
    } catch (error) {
      console.error('Failed to check Google Calendar connection:', error)
      setGoogleCalendarConnected(false)
    }
  }

  const handleGoogleCalendarConnect = async () => {
    setGoogleCalendarLoading(true)
    try {
      console.log('Starting Google Calendar authentication...')
      const connected = await googleCalendarService.authenticate()
      console.log('Authentication result:', connected)
      
      if (connected) {
        setGoogleCalendarConnected(true)
        alert('Successfully connected to Google Calendar!')
      } else {
        setGoogleCalendarConnected(false)
        console.log('Authentication failed or was cancelled')
      }
    } catch (error) {
      console.error('Failed to connect to Google Calendar:', error)
      setGoogleCalendarConnected(false)
      alert('Failed to connect to Google Calendar. Please try again.')
    } finally {
      setGoogleCalendarLoading(false)
    }
  }

  const handleGoogleCalendarDisconnect = async () => {
    try {
      await googleCalendarService.signOut()
      setGoogleCalendarConnected(false)
      alert('Disconnected from Google Calendar')
    } catch (error) {
      console.error('Failed to disconnect from Google Calendar:', error)
    }
  }

  const syncAppointmentToGoogleCalendar = async (appointment: AppointmentWithDetails) => {
    if (!googleCalendarConnected) {
      alert('Please connect to Google Calendar first')
      return
    }

    try {
      const googleEvent = appointmentToGoogleEvent(appointment)
      const result = await googleCalendarService.createEvent(googleEvent)
      
      // Update appointment with Google Calendar event ID
      await supabase
        .from('appointments')
        .update({ google_calendar_event_id: result.id })
        .eq('id', appointment.id)
      
      alert(`Appointment "${appointment.appointment_name}" added to Google Calendar!`)
      
      // Refresh appointments
      fetchEmployees()
      if (selectedEmployee) {
        handleEmployeeClick(selectedEmployee)
      }
    } catch (error) {
      console.error('Failed to sync to Google Calendar:', error)
      alert('Failed to sync appointment to Google Calendar. Please try again.')
    }
  }

  const fetchEmployees = async () => {
    setLoading(true)
    
    const { data: employeesData } = await supabase
      .from('employees')
      .select('*')
      .eq('employment_status', 'Active')
      .order('name')
    
    if (employeesData) {
      // Get appointments data for each employee
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
      
      const employeeMap = new Map(employeesData.map((emp: any) => [emp.id, emp.name]))
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Enrich appointments with employee names
      const enrichedAppointments = appointmentsData?.map((appointment: Appointment) => {
        const appointmentDate = new Date(appointment.appointment_date)
        const isUpcoming = appointmentDate >= today
        const isPast = appointmentDate < today
        
        let statusColor = 'blue'
        if (appointment.appointment_status === 'Completed') statusColor = 'green'
        else if (appointment.appointment_status === 'Cancelled') statusColor = 'red'
        else if (appointment.appointment_status === 'Active') statusColor = 'blue'
        else if (appointment.appointment_status === 'Confirmed') statusColor = 'blue'
        else if (appointment.appointment_status === 'Rescheduled') statusColor = 'yellow'
        
        return {
          ...appointment,
          employee_name: employeeMap.get(appointment.assigned_employee) || 'Unknown Employee',
          status_color: statusColor,
          is_upcoming: isUpcoming,
          is_past: isPast,
        }
      }) || []
      
      setAppointments(enrichedAppointments)
      setEmployees(employeesData)
    }
    
    setLoading(false)
  }

  const handleEmployeeClick = async (employee: Employee) => {
    setSelectedEmployee(employee)
    setAppointmentsLoading(true)
    
    // Filter appointments for this employee
    const empAppointments = appointments.filter((a: AppointmentWithDetails) => a.assigned_employee === employee.id)
    setEmployeeAppointments(empAppointments)
    
    setAppointmentsLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    setConfirmDialog({
      open: true,
      title: editingAppointment ? 'Save Changes?' : 'Create Appointment?',
      description: editingAppointment 
        ? 'Are you sure you want to save changes to this appointment?'
        : 'Are you sure you want to create this new appointment?',
      confirmText: editingAppointment ? 'Save' : 'Create',
      onConfirm: async () => {
        const appointmentData = {
          appointment_name: formData.appointment_name,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          assigned_employee: formData.assigned_employee,
          appointment_status: 'Active', // Always set to Active for new appointments
          appointment_info: formData.appointment_info || null,
        }

        setOpen(false)
        resetForm()

        if (editingAppointment) {
          // Optimistic update for edit
          const updatedAppointment = { ...editingAppointment, ...appointmentData }
          setAppointments(prev => prev.map(a => a.id === editingAppointment.id ? updatedAppointment as AppointmentWithDetails : a))
          
          const { error } = await supabase
            .from('appointments')
            .update(appointmentData)
            .eq('id', editingAppointment.id)
          
          if (error) {
            alert('Error updating appointment: ' + error.message)
          }
        } else {
          // For new appointment, insert and optionally sync to Google Calendar
          const { data: newAppointment } = await supabase.from('appointments').insert([appointmentData]).select().single()
          
          if (formData.sync_to_google_calendar && googleCalendarConnected && newAppointment) {
            try {
              const googleEvent = appointmentToGoogleEvent(newAppointment)
              const result = await googleCalendarService.createEvent(googleEvent)
              
              // Update appointment with Google Calendar event ID
              await supabase
                .from('appointments')
                .update({ google_calendar_event_id: result.id })
                .eq('id', newAppointment.id)
              
              alert(`Appointment "${newAppointment.appointment_name}" added to Google Calendar!`)
            } catch (error) {
              console.error('Failed to sync to Google Calendar:', error)
              alert('Appointment created but failed to sync to Google Calendar. Please try syncing manually.')
            }
          }
        }

        // Refresh data
        fetchEmployees()
        
        if (selectedEmployee) {
          handleEmployeeClick(selectedEmployee)
        }
      }
    })
  }

  const handleDelete = (id: string) => {
    const appointment = appointments.find(a => a.id === id)
    
    setConfirmDialog({
      open: true,
      title: 'Delete Appointment?',
      description: appointment 
        ? `Are you sure you want to delete "${appointment.appointment_name}"? This action cannot be undone.`
        : 'Are you sure you want to delete this appointment? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        // Optimistic update - remove from UI immediately
        setAppointments(prev => prev.filter(a => a.id !== id))
        
        // Delete from database
        const { error } = await supabase.from('appointments').delete().eq('id', id)
        
        if (error) {
          alert('Error deleting appointment: ' + error.message)
          // Revert on error
          fetchEmployees()
        } else {
          // Update employee appointments if viewing specific employee
          if (selectedEmployee) {
            handleEmployeeClick(selectedEmployee)
          }
        }
      }
    })
  }

  const handleEdit = (appointment: AppointmentWithDetails) => {
    setEditingAppointment(appointment)
    setFormData({
      appointment_name: appointment.appointment_name,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      assigned_employee: appointment.assigned_employee,
      appointment_info: appointment.appointment_info || '',
      sync_to_google_calendar: false,
    })
    setOpen(true)
  }

  const resetForm = () => {
    setFormData({
      appointment_name: '',
      appointment_date: '',
      appointment_time: '',
      assigned_employee: '',
      appointment_info: '',
      sync_to_google_calendar: false,
    })
    setEditingAppointment(null)
  }

  const handleStatusUpdate = (appointmentId: string, newStatus: 'Completed' | 'Cancelled') => {
    const appointment = appointments.find(a => a.id === appointmentId)
    
    setConfirmDialog({
      open: true,
      title: `Mark as ${newStatus}?`,
      description: appointment 
        ? `Are you sure you want to mark "${appointment.appointment_name}" as ${newStatus.toLowerCase()}?`
        : `Are you sure you want to mark this appointment as ${newStatus.toLowerCase()}?`,
      confirmText: newStatus,
      onConfirm: async () => {
        // Optimistic update - update UI immediately
        setAppointments(prev => prev.map(a => 
          a.id === appointmentId 
            ? { ...a, appointment_status: newStatus }
            : a
        ))
        
        // Update database
        const { error } = await supabase
          .from('appointments')
          .update({ appointment_status: newStatus })
          .eq('id', appointmentId)
        
        if (error) {
          alert('Error updating appointment: ' + error.message)
          // Revert on error
          fetchEmployees()
        } else {
          // Update employee appointments if viewing specific employee
          if (selectedEmployee) {
            handleEmployeeClick(selectedEmployee)
          }
        }
      }
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <Calendar className="h-4 w-4 text-blue-600" />
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'Cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'Confirmed':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'Rescheduled':
        return <RotateCcw className="h-4 w-4 text-yellow-600" />
      default:
        return <Calendar className="h-4 w-4 text-blue-600" />
    }
  }

  const getFilteredAppointments = () => {
    const appointmentsToFilter = selectedEmployee ? employeeAppointments : appointments
    let filtered = appointmentsToFilter

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(appointment =>
        appointment.appointment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.appointment_info?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.appointment_status === statusFilter)
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dateFilter === 'today') {
        filtered = filtered.filter(appointment => {
          const appointmentDate = new Date(appointment.appointment_date)
          appointmentDate.setHours(0, 0, 0, 0)
          return appointmentDate.getTime() === today.getTime()
        })
      } else if (dateFilter === 'upcoming') {
        filtered = filtered.filter(appointment => appointment.is_upcoming)
      } else if (dateFilter === 'past') {
        filtered = filtered.filter(appointment => appointment.is_past)
      }
    }

    // Filter out completed and cancelled appointments if hide option is enabled
    if (hideCompleted) {
      filtered = filtered.filter(appointment => 
        appointment.appointment_status !== 'Completed' && 
        appointment.appointment_status !== 'Cancelled'
      )
    }

    return filtered.sort((a, b) => {
      // Sort by date first, then by time
      const dateCompare = new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
      if (dateCompare !== 0) return dateCompare
      return a.appointment_time.localeCompare(b.appointment_time)
    })
  }

  const getStatusCounts = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const counts = {
      total: appointments.length,
      active: appointments.filter(a => a.appointment_status === 'Active').length,
      confirmed: appointments.filter(a => a.appointment_status === 'Confirmed').length,
      completed: appointments.filter(a => a.appointment_status === 'Completed').length,
      cancelled: appointments.filter(a => a.appointment_status === 'Cancelled').length,
      rescheduled: appointments.filter(a => a.appointment_status === 'Rescheduled').length,
      today: appointments.filter(a => {
        const appointmentDate = new Date(a.appointment_date)
        appointmentDate.setHours(0, 0, 0, 0)
        return appointmentDate.getTime() === today.getTime()
      }).length,
    }
    return counts
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Appointments</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              {selectedEmployee 
                ? `Viewing appointments for ${selectedEmployee.name}`
                : 'Select an employee to view their appointments'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? (
                googleCalendarConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleCalendarDisconnect}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Google Calendar Connected
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleCalendarConnect}
                    disabled={googleCalendarLoading}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    {googleCalendarLoading ? 'Connecting...' : 'Connect Google Calendar'}
                  </Button>
                )
              ) : (
                <div className="text-xs text-slate-500">
                  Google Calendar integration not configured
                </div>
              )}
            </div>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
                <DialogDescription>
                  {editingAppointment ? 'Update appointment details below' : 'Schedule a new appointment for an employee'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="appointment_name">Appointment Name</Label>
                    <Input
                      id="appointment_name"
                      placeholder="e.g., Client Meeting, Interview, Review"
                      value={formData.appointment_name}
                      onChange={(e) => setFormData({ ...formData, appointment_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="appointment_date">Date</Label>
                      <Input
                        id="appointment_date"
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.appointment_date}
                        onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="appointment_time">Time</Label>
                      <Input
                        id="appointment_time"
                        type="time"
                        value={formData.appointment_time}
                        onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assigned_employee">Assigned Employee</Label>
                    <Select
                      value={formData.assigned_employee}
                      onValueChange={(value: string) => setFormData({ ...formData, assigned_employee: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="appointment_info">Appointment Info (Optional)</Label>
                    <Textarea
                      id="appointment_info"
                      placeholder="Additional details about the appointment..."
                      value={formData.appointment_info}
                      onChange={(e) => setFormData({ ...formData, appointment_info: e.target.value })}
                      rows={3}
                    />
                  </div>
                  {googleCalendarConnected && (
                    <div className="grid gap-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="sync_to_google_calendar"
                          checked={formData.sync_to_google_calendar}
                          onChange={(e) => setFormData({ ...formData, sync_to_google_calendar: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="sync_to_google_calendar" className="text-sm font-medium">
                          Sync to Google Calendar
                        </Label>
                      </div>
                      <p className="text-xs text-slate-500">
                        This appointment will be automatically added to your Google Calendar
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingAppointment ? 'Update Appointment' : 'Add Appointment'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-xs text-slate-600">Total</p>
                  <p className="text-lg font-bold text-slate-900">{statusCounts.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-slate-600">Active</p>
                  <p className="text-lg font-bold text-blue-600">{statusCounts.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-slate-600">Today</p>
                  <p className="text-lg font-bold text-purple-600">{statusCounts.today}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-slate-600">Completed</p>
                  <p className="text-lg font-bold text-green-600">{statusCounts.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-xs text-slate-600">Cancelled</p>
                  <p className="text-lg font-bold text-red-600">{statusCounts.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedEmployee ? (
          /* Employee Appointments View */
          <div className="space-y-6">
            {/* Employee Header */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedEmployee.name}</h2>
                    <p className="text-sm text-slate-600">{selectedEmployee.email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs sm:text-sm text-slate-500">
                      <span>{selectedEmployee.contact_number}</span>
                      <span>•</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {selectedEmployee.employment_status}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedEmployee(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Employee Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600">Total Appointments</p>
                  <p className="text-xl font-bold text-slate-900">{employeeAppointments.length}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700">Active</p>
                  <p className="text-xl font-bold text-blue-700">
                    {employeeAppointments.filter((a: AppointmentWithDetails) => a.appointment_status === 'Active').length}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700">Completed</p>
                  <p className="text-xl font-bold text-green-700">
                    {employeeAppointments.filter((a: AppointmentWithDetails) => a.appointment_status === 'Completed').length}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-red-700">Cancelled</p>
                  <p className="text-xl font-bold text-red-700">
                    {employeeAppointments.filter((a: AppointmentWithDetails) => a.appointment_status === 'Cancelled').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search Appointments</Label>
                  <Input
                    id="search"
                    placeholder="Search by name or info..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="status-filter">Filter by Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                      <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date-filter">Filter by Date</Label>
                  <Select
                    value={dateFilter}
                    onValueChange={setDateFilter}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="All dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Display Options</Label>
                  <div className="mt-2">
                    <Button
                      variant={hideCompleted ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHideCompleted(!hideCompleted)}
                      className="w-full justify-start"
                    >
                      {hideCompleted ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Hide Completed/Cancelled
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Show All
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointments Table */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
              <div className="p-4 sm:p-6 border-b">
                <h3 className="text-lg font-semibold text-slate-900">Appointments</h3>
                <p className="text-sm text-slate-600">
                  {getFilteredAppointments().length} appointment(s) found
                  {hideCompleted && (
                    <span className="ml-2 text-blue-600">
                      • Hiding completed/cancelled appointments
                    </span>
                  )}
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Appointment</TableHead>
                    <TableHead className="hidden md:table-cell">Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Info</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointmentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="text-slate-600">Loading appointments...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : getFilteredAppointments().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                          ? 'No appointments match your filters.'
                          : 'No appointments scheduled for this employee yet.'}
                      </TableCell>
                    </TableRow>
              ) : (
                getFilteredAppointments().map((appointment: AppointmentWithDetails) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-medium text-sm sm:text-base">
                          {appointment.appointment_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 md:hidden">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}
                          </span>
                        </div>
                        {appointment.appointment_info && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1 lg:hidden">
                            {appointment.appointment_info}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{new Date(appointment.appointment_date).toLocaleDateString()}</span>
                        <Clock className="h-3 w-3 text-slate-400 ml-2" />
                        <span>{appointment.appointment_time}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(appointment.appointment_status)}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            appointment.appointment_status === 'Active'
                              ? 'bg-blue-100 text-blue-700'
                              : appointment.appointment_status === 'Completed'
                              ? 'bg-green-100 text-green-700'
                              : appointment.appointment_status === 'Cancelled'
                              ? 'bg-red-100 text-red-700'
                              : appointment.appointment_status === 'Confirmed'
                              ? 'bg-blue-100 text-blue-700'
                              : appointment.appointment_status === 'Rescheduled'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {appointment.appointment_status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {appointment.appointment_info ? (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {appointment.appointment_info}
                        </p>
                      ) : (
                        <span className="text-xs text-slate-400">No info</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {appointment.appointment_status === 'Active' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(appointment.id, 'Completed')}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Mark as Completed"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(appointment.id, 'Cancelled')}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Mark as Cancelled"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                        {googleCalendarConnected && !appointment.google_calendar_event_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => syncAppointmentToGoogleCalendar(appointment)}
                            title="Sync to Google Calendar"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </Button>
                        )}
                        {appointment.google_calendar_event_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open('https://calendar.google.com', '_blank')}
                            title="View in Google Calendar"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(appointment)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(appointment.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* Employee List View */
          <div>
            {/* Search */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 mb-6">
              <Label htmlFor="search">Search Employees</Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
              />
              {searchTerm && (
                <p className="mt-2 text-sm text-slate-600">
                  Showing {employees.filter((emp: Employee) =>
                    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length} of {employees.length} employees
                </p>
              )}
            </div>

            {/* Employee Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-slate-600">Loading employees...</span>
              </div>
            ) : employees.filter((emp: Employee) =>
              emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              emp.email.toLowerCase().includes(searchTerm.toLowerCase())
            ).length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  {searchTerm 
                    ? 'No employees match your search.'
                    : 'No active employees found. Add employees to start scheduling appointments.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {employees.filter((emp: Employee) =>
                  emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  emp.email.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((employee: Employee) => {
                  const empAppointments = appointments.filter((a: AppointmentWithDetails) => a.assigned_employee === employee.id)
                  const activeAppointments = empAppointments.filter((a: AppointmentWithDetails) => a.appointment_status === 'Active')
                  const completedAppointments = empAppointments.filter((a: AppointmentWithDetails) => a.appointment_status === 'Completed')
                  
                  return (
                    <Card
                      key={employee.id}
                      className="hover:shadow-lg transition-all cursor-pointer hover:border-primary"
                      onClick={() => handleEmployeeClick(employee)}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 p-2 rounded-full shrink-0">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base sm:text-lg truncate">{employee.name}</CardTitle>
                            <CardDescription className="text-xs truncate">{employee.email}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-xs text-blue-700">Active</p>
                            <p className="text-lg font-bold text-blue-700">{activeAppointments.length}</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-xs text-green-700">Completed</p>
                            <p className="text-lg font-bold text-green-700">{completedAppointments.length}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Click to view appointments</span>
                          <Calendar className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
