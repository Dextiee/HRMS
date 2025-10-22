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
import { Plus, Pencil, Trash2, CheckSquare, User, FolderKanban, Calendar, X, Clock, Paperclip, Download } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { Task, Employee, Project } from '@/lib/types'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface TaskWithDetails extends Task {
  employee_name?: string
  project_name?: string
  status_color?: string
  is_overdue?: boolean
}

interface EmployeeWithStats extends Employee {
  total_tasks?: number
  upcoming_tasks?: number
  overdue_tasks?: number
  completed_tasks?: number
  active_tasks?: number
}

export default function TasksPage() {
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([])
  const [allTasks, setAllTasks] = useState<TaskWithDetails[]>([])
  const [employeeTasks, setEmployeeTasks] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [open, setOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCompleted, setShowCompleted] = useState(true)
  
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
    task_name: '',
    task_details: '',
    task_deadline: '',
    assigned_to: '',
    project_id: '',
    attachment: null as File | null,
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
      .select('*')
      .order('project_name')
    
    if (data) setProjects(data)
  }

  const fetchEmployees = async () => {
    setLoading(true)
    
    // Fetch all employees
    const { data: employeesData } = await supabase
      .from('employees')
      .select('*')
      .eq('employment_status', 'Active')
      .order('name')
    
    // Fetch all tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .order('task_deadline', { ascending: true })
    
    if (employeesData && tasksData) {
      const [projectsData] = await Promise.all([
        supabase.from('projects').select('id, project_name')
      ])
      
      const projectMap = new Map(projectsData?.data?.map((p: Project) => [p.id, p.project_name]) || [])
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Enrich tasks with project names and overdue status
      const enrichedTasks = tasksData.map((task: Task) => {
        const deadline = new Date(task.task_deadline)
        const isOverdue = deadline < today
        
        return {
          ...task,
          project_name: projectMap.get(task.project_id) || 'No Project',
          is_overdue: isOverdue,
          status_color: isOverdue ? 'red' : 'green'
        }
      })
      
      setAllTasks(enrichedTasks)
      
      // Calculate stats for each employee
      const employeesWithStats = employeesData.map((emp: Employee) => {
        const empTasks = enrichedTasks.filter((t: TaskWithDetails) => t.assigned_to === emp.id)
        const activeTasks = empTasks.filter((t: TaskWithDetails) => !t.is_completed)
        return {
          ...emp,
          total_tasks: empTasks.length,
          active_tasks: activeTasks.length,
          upcoming_tasks: activeTasks.filter((t: TaskWithDetails) => !t.is_overdue).length,
          overdue_tasks: activeTasks.filter((t: TaskWithDetails) => t.is_overdue).length,
          completed_tasks: empTasks.filter((t: TaskWithDetails) => t.is_completed).length,
        }
      })
      
      setEmployees(employeesWithStats)
    }
    
    setLoading(false)
  }

  const handleEmployeeClick = async (employee: Employee) => {
    setSelectedEmployee(employee)
    setTasksLoading(true)
    
    // Filter tasks for this employee
    const empTasks = allTasks.filter((t: TaskWithDetails) => t.assigned_to === employee.id)
    setEmployeeTasks(empTasks)
    
    setTasksLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    setConfirmDialog({
      open: true,
      title: editingTask ? 'Save Changes?' : 'Create Task?',
      description: editingTask 
        ? 'Are you sure you want to save changes to this task?'
        : 'Are you sure you want to create this new task?',
      confirmText: editingTask ? 'Save' : 'Create',
      onConfirm: async () => {
        try {
          let attachmentData = null
          
          // Upload file if attached
          if (formData.attachment) {
            attachmentData = await handleFileUpload(formData.attachment)
          }

          const taskData = {
            task_name: formData.task_name,
            task_details: formData.task_details,
            task_deadline: formData.task_deadline,
            assigned_to: formData.assigned_to,
            project_id: formData.project_id || null,
            ...(attachmentData && {
              attachment_url: attachmentData.url,
              attachment_name: attachmentData.name,
              attachment_size: attachmentData.size,
              attachment_type: attachmentData.type
            })
          }

          setOpen(false)
          resetForm()

          if (editingTask) {
            // Optimistic update for edit
            const updatedTask = { ...editingTask, ...taskData }
            setEmployeeTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask as TaskWithDetails : t))
            
            const { error } = await supabase
              .from('tasks')
              .update(taskData)
              .eq('id', editingTask.id)
            
            if (error) {
              alert('Error updating task: ' + error.message)
            }
          } else {
            // For new task, just refresh after insert
            await supabase.from('tasks').insert([taskData])
          }
        } catch (error) {
          alert('Error uploading attachment: ' + (error as Error).message)
          return
        }

        // Refresh data
        fetchEmployees()
        
        if (selectedEmployee) {
          const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', selectedEmployee.id)
            .order('task_deadline', { ascending: true })
          
          if (tasksData) {
            const [projectsData] = await Promise.all([
              supabase.from('projects').select('id, project_name')
            ])
            
            const projectMap = new Map(projectsData?.data?.map((p: Project) => [p.id, p.project_name]) || [])
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            const enrichedTasks = tasksData.map((task: Task) => {
              const deadline = new Date(task.task_deadline)
              const isOverdue = deadline < today
              
              return {
                ...task,
                project_name: projectMap.get(task.project_id) || 'No Project',
                is_overdue: isOverdue,
                status_color: isOverdue ? 'red' : 'green'
              }
            })
            
            setEmployeeTasks(enrichedTasks)
          }
        }
      }
    })
  }

  const handleDelete = (id: string) => {
    const task = employeeTasks.find(t => t.id === id)
    
    setConfirmDialog({
      open: true,
      title: 'Delete Task?',
      description: task 
        ? `Are you sure you want to delete "${task.task_name}"? This action cannot be undone.`
        : 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        // Optimistic update - remove from UI immediately
        setEmployeeTasks(prev => prev.filter(t => t.id !== id))
        setAllTasks(prev => prev.filter(t => t.id !== id))
        
        // Delete from database
        const { error } = await supabase.from('tasks').delete().eq('id', id)
        
        if (error) {
          alert('Error deleting task: ' + error.message)
          // Revert on error
          fetchEmployees()
          if (selectedEmployee) {
            handleEmployeeClick(selectedEmployee)
          }
        } else {
          // Update employee stats
          fetchEmployees()
        }
      }
    })
  }

  const handleEdit = (task: TaskWithDetails) => {
    setEditingTask(task)
    setFormData({
      task_name: task.task_name,
      task_details: task.task_details,
      task_deadline: task.task_deadline,
      assigned_to: task.assigned_to,
      project_id: task.project_id,
      attachment: null, // Don't pre-populate file input for security
    })
    setOpen(true)
  }

  const resetForm = () => {
    setFormData({
      task_name: '',
      task_details: '',
      task_deadline: '',
      assigned_to: '',
      project_id: '',
      attachment: null,
    })
    setEditingTask(null)
  }

  const handleToggleComplete = (task: TaskWithDetails) => {
    const newCompletedStatus = !task.is_completed
    
    setConfirmDialog({
      open: true,
      title: newCompletedStatus ? 'Mark as Complete?' : 'Mark as Incomplete?',
      description: newCompletedStatus 
        ? `Mark "${task.task_name}" as completed?`
        : `Mark "${task.task_name}" as incomplete?`,
      confirmText: newCompletedStatus ? 'Complete' : 'Undo',
      onConfirm: async () => {
        const completedAt = newCompletedStatus ? new Date().toISOString() : null
        
        // Optimistic update - update UI immediately
        setEmployeeTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, is_completed: newCompletedStatus, completed_at: completedAt }
            : t
        ))
        setAllTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, is_completed: newCompletedStatus, completed_at: completedAt }
            : t
        ))
        
        // Update database
        const { error } = await supabase
          .from('tasks')
          .update({ 
            is_completed: newCompletedStatus,
            completed_at: completedAt
          })
          .eq('id', task.id)
        
        if (error) {
          alert('Error updating task: ' + error.message)
          // Revert on error
          setEmployeeTasks(prev => prev.map(t => 
            t.id === task.id ? task : t
          ))
          setAllTasks(prev => prev.map(t => 
            t.id === task.id ? task : t
          ))
        } else {
          // Update employee stats
          fetchEmployees()
        }
      }
    })
  }

  const getFilteredTasks = () => {
    let filtered = showCompleted 
      ? employeeTasks 
      : employeeTasks.filter((t: TaskWithDetails) => !t.is_completed)
    
    // Sort: incomplete tasks first, completed tasks last
    return filtered.sort((a, b) => {
      if (a.is_completed === b.is_completed) return 0
      return a.is_completed ? 1 : -1
    })
  }

  const filteredEmployees = employees.filter((emp: EmployeeWithStats) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tasks</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              {selectedEmployee 
                ? `Viewing tasks for ${selectedEmployee.name}`
                : 'Select an employee to view their tasks'}
            </p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                <DialogDescription>
                  {editingTask ? 'Update task details below' : 'Assign a new task to an employee'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="task_name">Task Name</Label>
                    <Input
                      id="task_name"
                      placeholder="e.g., Design Homepage"
                      value={formData.task_name}
                      onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task_details">Task Details</Label>
                    <Textarea
                      id="task_details"
                      placeholder="Describe the task... (Press Enter for new line)"
                      value={formData.task_details}
                      onChange={(e) => setFormData({ ...formData, task_details: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assigned_to">Assign To Employee</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value: string) => setFormData({ ...formData, assigned_to: value })}
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
                    <Label htmlFor="project_id">Project (Optional)</Label>
                    <Select
                      value={formData.project_id || "none"}
                      onValueChange={(value: string) => setFormData({ ...formData, project_id: value === "none" ? "" : value })}
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
                    <Label htmlFor="task_deadline">Deadline</Label>
                    <Input
                      id="task_deadline"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.task_deadline}
                      onChange={(e) => setFormData({ ...formData, task_deadline: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="attachment">Attachment (Optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="attachment"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                        onChange={(e) => setFormData({ ...formData, attachment: e.target.files?.[0] || null })}
                        className="flex-1"
                      />
                      {formData.attachment && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Paperclip className="h-4 w-4" />
                          <span className="truncate max-w-[150px]">{formData.attachment.name}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingTask ? 'Update Task' : 'Add Task'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {selectedEmployee ? (
          /* Employee Tasks View */
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

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600">Total Tasks</p>
                  <p className="text-xl font-bold text-slate-900">{employeeTasks.length}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700">Active</p>
                  <p className="text-xl font-bold text-blue-700">
                    {employeeTasks.filter((t: TaskWithDetails) => !t.is_completed).length}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700">Completed</p>
                  <p className="text-xl font-bold text-green-700">
                    {employeeTasks.filter((t: TaskWithDetails) => t.is_completed).length}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-red-700">Overdue</p>
                  <p className="text-xl font-bold text-red-700">
                    {employeeTasks.filter((t: TaskWithDetails) => t.is_overdue && !t.is_completed).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
              <div className="p-4 sm:p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Assigned Tasks</h3>
                    <p className="text-sm text-slate-600">
                      {showCompleted ? 'All tasks' : 'Active tasks only'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    {showCompleted ? 'Hide Completed' : 'Show All'}
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead className="hidden lg:table-cell">Project</TableHead>
                    <TableHead className="hidden md:table-cell">Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attachment</TableHead>
                    <TableHead className="text-center">Complete</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasksLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="text-slate-600">Loading tasks...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : getFilteredTasks().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                        {showCompleted 
                          ? 'No tasks assigned to this employee yet.'
                          : 'No active tasks. All tasks are completed!'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {getFilteredTasks().map((task: TaskWithDetails, index: number, arr: TaskWithDetails[]) => {
                        // Check if this is the first completed task (show divider row)
                        const isFirstCompleted = task.is_completed && (index === 0 || !arr[index - 1].is_completed)
                        
                        return (
                          <>
                            {isFirstCompleted && (
                              <TableRow>
                                <TableCell colSpan={7} className="bg-slate-50 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 border-t border-slate-300"></div>
                                    <span className="text-xs text-slate-500 font-medium">Completed Tasks</span>
                                    <div className="flex-1 border-t border-slate-300"></div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow key={task.id} className={task.is_completed ? 'bg-slate-50/50 opacity-75' : ''}>
                        <TableCell className="font-medium">
                          <div>
                            <p className={`font-medium text-sm sm:text-base ${task.is_completed ? 'line-through text-slate-500' : ''}`}>
                              {task.task_name}
                            </p>
                            <p className="text-xs text-slate-500 line-clamp-2 whitespace-pre-line mt-1">{task.task_details}</p>
                            <div className="flex items-center gap-2 mt-1 md:hidden">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span className="text-xs text-slate-500">
                                Due: {new Date(task.task_deadline).toLocaleDateString()}
                              </span>
                            </div>
                            {task.is_completed && task.completed_at && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Completed {new Date(task.completed_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-slate-400" />
                            <span className="text-sm">{task.project_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {new Date(task.task_deadline).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.is_completed ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-green-100 text-green-700">
                              ✓ Done
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                task.is_overdue
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {task.is_overdue ? 'Overdue' : 'Pending'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.attachment_url ? (
                            <div className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3 text-slate-400" />
                              <a
                                href={task.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 truncate max-w-[80px] sm:max-w-[100px]"
                                title={task.attachment_name || 'Download attachment'}
                              >
                                {task.attachment_name || 'Attachment'}
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No attachment</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={task.is_completed ? "outline" : "default"}
                            onClick={() => handleToggleComplete(task)}
                            className={task.is_completed ? 'bg-green-50 text-green-700 hover:bg-green-100' : ''}
                          >
                            {task.is_completed ? (
                              <>
                                <CheckSquare className="h-4 w-4 mr-1" />
                                Undo
                              </>
                            ) : (
                              <>
                                <CheckSquare className="h-4 w-4 mr-1" />
                                Done
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(task)}
                              title="Edit"
                              disabled={task.is_completed}
                            >
                              <Pencil className={`h-4 w-4 ${task.is_completed ? 'text-slate-300' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(task.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                          </>
                        )
                      })}
                    </>
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
                  Showing {filteredEmployees.length} of {employees.length} employees
                </p>
              )}
            </div>

            {/* Employee Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-slate-600">Loading employees...</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  {searchTerm 
                    ? 'No employees match your search.'
                    : 'No active employees found. Add employees to start assigning tasks.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredEmployees.map((employee: EmployeeWithStats) => (
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
                          <p className="text-lg font-bold text-blue-700">{employee.active_tasks || 0}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <p className="text-xs text-green-700">Done</p>
                          <p className="text-lg font-bold text-green-700">{employee.completed_tasks || 0}</p>
                        </div>
                      </div>
                      {(employee.overdue_tasks || 0) > 0 && (
                        <div className="bg-red-50 rounded-lg p-2 mb-3">
                          <p className="text-xs text-red-700">⚠️ Overdue Tasks</p>
                          <p className="text-lg font-bold text-red-700">{employee.overdue_tasks}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Click to view tasks</span>
                        <CheckSquare className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
