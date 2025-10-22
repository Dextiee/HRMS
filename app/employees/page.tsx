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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, Eye, Calendar, DollarSign, CheckSquare, Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { Employee, Attendance, Payroll, Task } from '@/lib/types'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface EmployeeDetails {
  attendance: (Attendance & { employee_name?: string })[]
  payroll: (Payroll & { employee_name?: string })[]
  tasks: (Task & { employee_name?: string; project_name?: string })[]
}

interface Project {
  id: string
  project_name: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [open, setOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails>({
    attendance: [],
    payroll: [],
    tasks: []
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [taskForm, setTaskForm] = useState({
    task_name: '',
    task_details: '',
    task_deadline: '',
    project_id: '',
    attachment: null as File | null,
  })
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_number: '',
    email: '',
    date_hired: '',
    employment_status: 'Active',
    salary_rate: '',
    salary_type: 'Monthly',
  })
  
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
  
  const supabase = createClient()

  useEffect(() => {
    fetchEmployees()
    fetchProjects()
  }, [])

  const handleFileUpload = async (file: File) => {
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file)
      
      if (error) throw error
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName)
      
      return {
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name')
    
    if (data) setProjects(data)
  }

  const fetchEmployees = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) {
      setEmployees(data)
      setFilteredEmployees(data)
    }
    setLoading(false)
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...employees]

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(emp => emp.employment_status === filterStatus)
    }

    // Search by name or email
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredEmployees(filtered)
  }, [employees, filterStatus, searchTerm])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    setConfirmDialog({
      open: true,
      title: editingEmployee ? 'Save Changes?' : 'Add Employee?',
      description: editingEmployee 
        ? `Save changes to ${formData.name}'s profile?`
        : `Add ${formData.name} as a new employee?`,
      confirmText: editingEmployee ? 'Save' : 'Add',
      onConfirm: async () => {
        const employeeData = {
          ...formData,
          salary_rate: parseFloat(formData.salary_rate),
        }

        setOpen(false)
        resetForm()

        if (editingEmployee) {
          // Optimistic update
          const updatedEmployee = { ...editingEmployee, ...employeeData, salary_type: employeeData.salary_type as 'Monthly' | 'Daily' }
          setEmployees(prev => prev.map(emp => 
            emp.id === editingEmployee.id ? updatedEmployee : emp
          ))
          setFilteredEmployees(prev => prev.map(emp => 
            emp.id === editingEmployee.id ? updatedEmployee : emp
          ))
          
          const { error } = await supabase
            .from('employees')
            .update(employeeData)
            .eq('id', editingEmployee.id)
          
          if (error) {
            alert('Error updating employee: ' + error.message)
            fetchEmployees()
          }
        } else {
          await supabase.from('employees').insert([employeeData])
          fetchEmployees()
        }
      }
    })
  }

  const handleDelete = (id: string) => {
    const employee = employees.find(emp => emp.id === id)
    
    setConfirmDialog({
      open: true,
      title: 'Delete Employee?',
      description: employee 
        ? `Delete "${employee.name}"? This will also permanently delete their attendance, payroll, and task records.`
        : 'Are you sure you want to delete this employee?',
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        // Optimistic update
        setEmployees(prev => prev.filter(emp => emp.id !== id))
        setFilteredEmployees(prev => prev.filter(emp => emp.id !== id))
        
        const { error } = await supabase.from('employees').delete().eq('id', id)
        
        if (error) {
          alert('Error deleting employee: ' + error.message)
          fetchEmployees()
        }
      }
    })
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      address: employee.address,
      contact_number: employee.contact_number,
      email: employee.email,
      date_hired: employee.date_hired,
      employment_status: employee.employment_status,
      salary_rate: employee.salary_rate.toString(),
      salary_type: employee.salary_type || 'Monthly',
    })
    setOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      contact_number: '',
      email: '',
      date_hired: '',
      employment_status: 'Active',
      salary_rate: '',
      salary_type: 'Monthly',
    })
    setEditingEmployee(null)
  }

  const handleViewDetails = async (employee: Employee) => {
    setSelectedEmployee(employee)
    setDetailsOpen(true)
    await loadEmployeeDetails(employee.id)
  }

  const loadEmployeeDetails = async (employeeId: string) => {
    setDetailsLoading(true)
    
    // Fetch attendance records
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .limit(10)

    // Fetch payroll records
    const { data: payrollData } = await supabase
      .from('payroll')
      .select('*')
      .eq('employee_id', employeeId)
      .order('generated_on', { ascending: false })
      .limit(10)

    // Fetch assigned tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*, projects(project_name)')
      .eq('assigned_to', employeeId)
      .order('task_deadline', { ascending: true })

    setEmployeeDetails({
      attendance: attendanceData || [],
      payroll: payrollData || [],
      tasks: tasksData?.map((t: any) => ({
        ...t,
        project_name: (t as any).projects?.project_name || 'Unknown'
      })) || []
    })
    
    setDetailsLoading(false)
  }

  const handleAssignTask = () => {
    setTaskDialogOpen(true)
  }

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedEmployee) return

    setConfirmDialog({
      open: true,
      title: 'Assign Task?',
      description: `Assign "${taskForm.task_name}" to ${selectedEmployee.name}?`,
      confirmText: 'Assign',
      onConfirm: async () => {
        try {
          let attachmentData = null
          
          // Upload file if attached
          if (taskForm.attachment) {
            attachmentData = await handleFileUpload(taskForm.attachment)
          }

          const taskData = {
            task_name: taskForm.task_name,
            task_details: taskForm.task_details,
            task_deadline: taskForm.task_deadline,
            assigned_to: selectedEmployee.id,
            project_id: taskForm.project_id || null,
            ...(attachmentData && {
              attachment_url: attachmentData.url,
              attachment_name: attachmentData.name,
              attachment_size: attachmentData.size,
              attachment_type: attachmentData.type
            })
          }

          setTaskDialogOpen(false)
          setTaskForm({
            task_name: '',
            task_details: '',
            task_deadline: '',
            project_id: '',
            attachment: null,
          })

          await supabase.from('tasks').insert([taskData])
          
          // Refresh employee details
          if (selectedEmployee) {
            await loadEmployeeDetails(selectedEmployee.id)
          }
        } catch (error) {
          alert('Error uploading attachment: ' + (error as Error).message)
          return
        }
      }
    })
  }

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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Employees</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">Manage your workforce</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </DialogTitle>
                <DialogDescription>
                  {editingEmployee 
                    ? 'Update employee information below' 
                    : 'Fill in the details to add a new employee'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contact">Contact Number</Label>
                    <Input
                      id="contact"
                      value={formData.contact_number}
                      onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date_hired">Date Hired</Label>
                    <Input
                      id="date_hired"
                      type="date"
                      value={formData.date_hired}
                      onChange={(e) => setFormData({ ...formData, date_hired: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Employment Status</Label>
                    <Select
                      value={formData.employment_status}
                      onValueChange={(value: string) => setFormData({ ...formData, employment_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                        <SelectItem value="Terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="salary_type">Salary Type</Label>
                    <Select
                      value={formData.salary_type}
                      onValueChange={(value: string) => setFormData({ ...formData, salary_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly Rate</SelectItem>
                        <SelectItem value="Daily">Daily Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="salary">
                      Salary Rate ({formData.salary_type === 'Monthly' ? 'per month' : 'per day'})
                    </Label>
                    <Input
                      id="salary"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={formData.salary_type === 'Monthly' ? 'e.g., 5000' : 'e.g., 500'}
                      value={formData.salary_rate}
                      onChange={(e) => setFormData({ ...formData, salary_rate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingEmployee ? 'Update Employee' : 'Add Employee'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Assign Task Dialog */}
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Task to {selectedEmployee?.name}</DialogTitle>
              <DialogDescription>Create a new task for this employee</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleTaskSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="quick_task_name">Task Name</Label>
                  <Input
                    id="quick_task_name"
                    placeholder="e.g., Complete report"
                    value={taskForm.task_name}
                    onChange={(e) => setTaskForm({ ...taskForm, task_name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quick_task_details">Task Details</Label>
                  <Textarea
                    id="quick_task_details"
                    placeholder="Describe the task... (Press Enter for new line)"
                    value={taskForm.task_details}
                    onChange={(e) => setTaskForm({ ...taskForm, task_details: e.target.value })}
                    rows={4}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quick_project">Project (Optional)</Label>
                  <Select
                    value={taskForm.project_id || "none"}
                    onValueChange={(value: string) => setTaskForm({ ...taskForm, project_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project or leave empty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quick_deadline">Deadline</Label>
                  <Input
                    id="quick_deadline"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={taskForm.task_deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, task_deadline: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quick_attachment">Attachment (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="quick_attachment"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                      onChange={(e) => setTaskForm({ ...taskForm, attachment: e.target.files?.[0] || null })}
                      className="flex-1"
                    />
                    {taskForm.attachment && (
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Paperclip className="h-4 w-4" />
                        <span className="truncate max-w-[150px]">{taskForm.attachment.name}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Assign Task</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Employee Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="flex-1">
                  <DialogTitle className="text-xl">{selectedEmployee?.name}</DialogTitle>
                  <DialogDescription>
                    {selectedEmployee?.email} • {selectedEmployee?.employment_status}
                  </DialogDescription>
                </div>
                <Button size="sm" onClick={handleAssignTask} className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" />
                  Assign Task
                </Button>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs sm:text-sm text-slate-600">Contact</p>
                  <p className="text-sm sm:text-base font-medium">{selectedEmployee?.contact_number}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-600">Address</p>
                  <p className="text-sm sm:text-base font-medium">{selectedEmployee?.address}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-600">Date Hired</p>
                  <p className="text-sm sm:text-base font-medium">
                    {selectedEmployee?.date_hired && new Date(selectedEmployee.date_hired).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-600">Salary Rate</p>
                  <p className="text-sm sm:text-base font-medium">
                    ${selectedEmployee?.salary_rate.toFixed(2)} / {selectedEmployee?.salary_type || 'Monthly'}
                  </p>
                </div>
              </div>

              <Tabs defaultValue="attendance" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="attendance" className="text-xs sm:text-sm">
                    <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Attendance</span>
                    <span className="sm:hidden">Attend.</span>
                  </TabsTrigger>
                  <TabsTrigger value="payroll" className="text-xs sm:text-sm">
                    <DollarSign className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Payslips</span>
                    <span className="sm:hidden">Pay</span>
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="text-xs sm:text-sm">
                    <CheckSquare className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Tasks</span>
                    <span className="sm:hidden">Tasks</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="attendance" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">Recent Attendance</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Last 10 attendance records</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {detailsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="ml-2 text-sm text-slate-600">Loading attendance...</span>
                        </div>
                      ) : employeeDetails.attendance.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No attendance records found</p>
                      ) : (
                        <div className="space-y-2">
                          {employeeDetails.attendance.map((record) => (
                            <div key={record.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium">{new Date(record.date).toLocaleDateString()}</p>
                                <p className="text-xs text-slate-600">{record.hours_worked} hours</p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  record.status === 'Present'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {record.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payroll" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">Payroll History</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Last 10 payroll records</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {detailsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="ml-2 text-sm text-slate-600">Loading payroll...</span>
                        </div>
                      ) : employeeDetails.payroll.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No payroll records found</p>
                      ) : (
                        <div className="space-y-2">
                          {employeeDetails.payroll.map((record) => {
                            // Calculate net pay based on salary type
                            let netPay = 0
                            if (selectedEmployee?.salary_type === 'Daily') {
                              netPay = record.total_working_days * (selectedEmployee?.salary_rate || 0)
                            } else {
                              // Monthly - calculate hourly rate (assuming 160 hours/month)
                              const hourlyRate = (selectedEmployee?.salary_rate || 0) / 160
                              netPay = record.total_hours * hourlyRate
                            }
                            return (
                              <div key={record.id} className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-sm font-medium">
                                    {new Date(record.generated_on).toLocaleDateString()}
                                  </p>
                                  <p className="text-base font-bold text-green-600">${netPay.toFixed(2)}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                                  <div>
                                    <p>Working Days</p>
                                    <p className="font-medium text-slate-900">{record.total_working_days}</p>
                                  </div>
                                  <div>
                                    <p>Absent Days</p>
                                    <p className="font-medium text-slate-900">{record.total_absent_days}</p>
                                  </div>
                                  <div>
                                    <p>Total Hours</p>
                                    <p className="font-medium text-slate-900">{record.total_hours}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Assigned Tasks</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Tasks assigned to this employee</CardDescription>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleAssignTask}>
                        <Plus className="h-4 w-4 mr-1" />
                        New Task
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {detailsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="ml-2 text-sm text-slate-600">Loading tasks...</span>
                        </div>
                      ) : employeeDetails.tasks.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-slate-500 mb-4">No tasks assigned yet</p>
                          <Button size="sm" onClick={handleAssignTask}>
                            <Plus className="h-4 w-4 mr-1" />
                            Assign First Task
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {employeeDetails.tasks
                            .sort((a, b) => {
                              // Incomplete tasks first, completed tasks last
                              if (a.is_completed === b.is_completed) return 0
                              return a.is_completed ? 1 : -1
                            })
                            .map((task, index, arr) => {
                            const deadline = new Date(task.task_deadline)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const isOverdue = deadline < today && !task.is_completed
                            
                            // Check if this is the first completed task (show divider)
                            const isFirstCompleted = task.is_completed && (index === 0 || !arr[index - 1].is_completed)
                            
                            return (
                              <div key={task.id}>
                                {isFirstCompleted && (
                                  <div className="flex items-center gap-2 my-4">
                                    <div className="flex-1 border-t border-slate-300"></div>
                                    <span className="text-xs text-slate-500 font-medium">Completed Tasks</span>
                                    <div className="flex-1 border-t border-slate-300"></div>
                                  </div>
                                )}
                                <div 
                                  className={`p-3 rounded-lg border ${
                                    task.is_completed 
                                      ? 'bg-green-50/50 border-green-200 opacity-75' 
                                      : 'bg-slate-50'
                                  }`}
                                >
                                <div className="flex justify-between items-start mb-1">
                                  <p className={`text-sm font-medium ${task.is_completed ? 'line-through text-slate-500' : ''}`}>
                                    {task.task_name}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {task.is_completed ? (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        ✓ Done
                                      </span>
                                    ) : (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          isOverdue
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}
                                      >
                                        {isOverdue ? 'Overdue' : 'Pending'}
                                      </span>
                                    )}
                                    <span className="text-xs text-slate-600">
                                      {new Date(task.task_deadline).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 mb-2 whitespace-pre-line">{task.task_details}</p>
                                {task.attachment_url && (
                                  <div className="mb-2">
                                    <div className="flex items-center gap-1 text-xs text-blue-600">
                                      <Paperclip className="h-3 w-3" />
                                      <a
                                        href={task.attachment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-blue-800"
                                      >
                                        {task.attachment_name || 'Download attachment'}
                                      </a>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <div>
                                    {task.project_name && task.project_name !== 'Unknown' && (
                                      <p className="text-xs text-slate-500">Project: {task.project_name}</p>
                                    )}
                                  </div>
                                  {task.is_completed && task.completed_at && (
                                    <p className="text-xs text-green-600">
                                      Completed {new Date(task.completed_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">Filters</h3>
            {(filterStatus !== 'all' || searchTerm) && (
              <Button variant="outline" size="sm" onClick={() => { setFilterStatus('all'); setSearchTerm('') }}>
                Clear Filters
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search-emp">Search</Label>
              <Input
                id="search-emp"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter by status */}
            <div className="space-y-2">
              <Label htmlFor="filter-status">Employment Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter summary */}
          <div className="mt-4 text-sm text-slate-600">
            <span className="font-medium">
              Showing {filteredEmployees.length} of {employees.length} employees
            </span>
            {(filterStatus !== 'all' || searchTerm) && (
              <span className="text-primary ml-2">• Filters active</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead className="hidden sm:table-cell">Date Hired</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Salary</TableHead>
                <TableHead className="text-right min-w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="text-slate-600">Loading employees...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                    {searchTerm || filterStatus !== 'all'
                      ? 'No employees match your filters. Try adjusting your search criteria.'
                      : 'No employees found. Add your first employee to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-xs text-slate-500 md:hidden">{employee.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{employee.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">{employee.contact_number}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {new Date(employee.date_hired).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          employee.employment_status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : employee.employment_status === 'On Leave'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {employee.employment_status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div>
                        <p className="font-medium">${employee.salary_rate.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{employee.salary_type || 'Monthly'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(employee)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(employee)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(employee.id)}
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
      </main>
    </div>
  )
}

