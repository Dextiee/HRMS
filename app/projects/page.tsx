'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, FolderKanban, CalendarDays, User, X, Clock, Pencil, Trash2, CheckCircle, Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { Project, Task, Employee } from '@/lib/types'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface TaskWithEmployee extends Task {
  employee_name?: string
}

interface ProjectWithStats extends Project {
  task_count?: number
  latest_task_date?: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<TaskWithEmployee[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [openProject, setOpenProject] = useState(false)
  const [openTask, setOpenTask] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  
  const [projectForm, setProjectForm] = useState({
    project_name: '',
    client_name: '',
    project_details: '',
  })
  
  const [taskForm, setTaskForm] = useState({
    project_id: '',
    task_name: '',
    task_details: '',
    task_deadline: '',
    assigned_to: '',
    attachment: null as File | null,
  })
  
  const [editProjectForm, setEditProjectForm] = useState({
    project_name: '',
    client_name: '',
    project_details: '',
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
    fetchProjects()
    fetchTasks()
    fetchEmployees()
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
      .order('project_created', { ascending: false })
    
    if (data) setProjects(data)
  }

  const fetchTasks = async () => {
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .order('task_created', { ascending: false })
    
    if (tasksData) {
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, name')
      
      const employeeMap = new Map(employeesData?.map((e: any) => [e.id, e.name]) || [])
      
      const enrichedTasks = tasksData.map((task: Task) => ({
        ...task,
        employee_name: employeeMap.get(task.assigned_to) || 'Unassigned',
      }))
      
      setTasks(enrichedTasks)
    }
  }

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('name')
    
    if (data) setEmployees(data)
  }

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    setConfirmDialog({
      open: true,
      title: 'Create Project?',
      description: `Create project "${projectForm.project_name}"?`,
      confirmText: 'Create',
      onConfirm: async () => {
        setOpenProject(false)
        resetProjectForm()
        
        await supabase.from('projects').insert([projectForm])
        fetchProjects()
      }
    })
  }

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate deadline is not in the past
    const today = new Date()
    const deadline = new Date(taskForm.task_deadline)
    today.setHours(0, 0, 0, 0) // Reset time to start of day for accurate comparison
    
    if (deadline < today) {
      alert('Deadline cannot be set in the past. Please select a future date.')
      return
    }
    
    setConfirmDialog({
      open: true,
      title: 'Create Task?',
      description: `Create task "${taskForm.task_name}"?`,
      confirmText: 'Create',
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
            assigned_to: taskForm.assigned_to,
            project_id: taskForm.project_id,
            ...(attachmentData && {
              attachment_url: attachmentData.url,
              attachment_name: attachmentData.name,
              attachment_size: attachmentData.size,
              attachment_type: attachmentData.type
            })
          }

          setOpenTask(false)
          resetTaskForm()
          
          await supabase.from('tasks').insert([taskData])
          fetchTasks()
        } catch (error) {
          alert('Error uploading attachment: ' + (error as Error).message)
          return
        }
      }
    })
  }

  const resetProjectForm = () => {
    setProjectForm({
      project_name: '',
      client_name: '',
      project_details: '',
    })
  }

  const resetTaskForm = () => {
    setTaskForm({
      project_id: '',
      task_name: '',
      task_details: '',
      task_deadline: '',
      assigned_to: '',
      attachment: null,
    })
    setSelectedProjectId(null)
  }

  const resetEditProjectForm = () => {
    setEditProjectForm({
      project_name: '',
      client_name: '',
      project_details: '',
    })
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setEditProjectForm({
      project_name: project.project_name,
      client_name: project.client_name,
      project_details: project.project_details,
    })
    setEditDialogOpen(true)
  }

  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingProject) return

    setConfirmDialog({
      open: true,
      title: 'Save Changes?',
      description: `Save changes to project "${editingProject.project_name}"?`,
      confirmText: 'Save',
      onConfirm: async () => {
        setEditDialogOpen(false)
        setEditingProject(null)

        // Optimistic update
        setProjects(prev => prev.map(p => 
          p.id === editingProject.id 
            ? { ...p, ...editProjectForm }
            : p
        ))

        const { error } = await supabase
          .from('projects')
          .update(editProjectForm)
          .eq('id', editingProject.id)

        if (error) {
          alert('Error updating project: ' + error.message)
          fetchProjects()
        } else {
          resetEditProjectForm()
        }
      }
    })
  }

  const handleDeleteProject = (project: Project) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Project?',
      description: `Delete project "${project.project_name}"? This will also delete all associated tasks and cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        // Optimistic update - remove from UI immediately
        setProjects(prev => prev.filter(p => p.id !== project.id))

        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', project.id)

        if (error) {
          alert('Error deleting project: ' + error.message)
          fetchProjects()
        }
      }
    })
  }

  const openTaskDialog = (projectId: string) => {
    setSelectedProjectId(projectId)
    setTaskForm({ ...taskForm, project_id: projectId })
    setOpenTask(true)
  }

  const getProjectTasks = (projectId: string) => {
    return tasks.filter(task => task.project_id === projectId)
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
  }

  const getProjectsWithStats = (): ProjectWithStats[] => {
    return projects.map(project => {
      const projectTasks = getProjectTasks(project.id)
      const latestTask = projectTasks.sort((a, b) => 
        new Date(b.task_deadline).getTime() - new Date(a.task_deadline).getTime()
      )[0]
      
      return {
        ...project,
        task_count: projectTasks.length,
        latest_task_date: latestTask?.task_deadline
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-600 mt-1">Manage projects and assign tasks</p>
          </div>
          <Dialog open={openProject} onOpenChange={(isOpen) => {
            setOpenProject(isOpen)
            if (!isOpen) resetProjectForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to your organization
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleProjectSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="project_name">Project Name</Label>
                    <Input
                      id="project_name"
                      value={projectForm.project_name}
                      onChange={(e) => setProjectForm({ ...projectForm, project_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="client_name">Client Name</Label>
                    <Input
                      id="client_name"
                      value={projectForm.client_name}
                      onChange={(e) => setProjectForm({ ...projectForm, client_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="project_details">Project Details</Label>
                    <Input
                      id="project_details"
                      value={projectForm.project_details}
                      onChange={(e) => setProjectForm({ ...projectForm, project_details: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Project</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Project Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateProject}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_project_name">Project Name</Label>
                  <Input
                    id="edit_project_name"
                    value={editProjectForm.project_name}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, project_name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_client_name">Client Name</Label>
                  <Input
                    id="edit_client_name"
                    value={editProjectForm.client_name}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, client_name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_project_details">Project Details</Label>
                  <Input
                    id="edit_project_details"
                    value={editProjectForm.project_details}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, project_details: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={openTask} onOpenChange={(isOpen) => {
          setOpenTask(isOpen)
          if (!isOpen) resetTaskForm()
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task</DialogTitle>
              <DialogDescription>
                Create a new task and assign it to an employee
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleTaskSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="task_name">Task Name</Label>
                  <Input
                    id="task_name"
                    value={taskForm.task_name}
                    onChange={(e) => setTaskForm({ ...taskForm, task_name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task_details">Task Details</Label>
                  <Textarea
                    id="task_details"
                    placeholder="Describe the task... (Press Enter for new line)"
                    value={taskForm.task_details}
                    onChange={(e) => setTaskForm({ ...taskForm, task_details: e.target.value })}
                    rows={4}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task_deadline">Deadline</Label>
                  <Input
                    id="task_deadline"
                    type="date"
                    value={taskForm.task_deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, task_deadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select
                    value={taskForm.assigned_to}
                    onValueChange={(value: string) => setTaskForm({ ...taskForm, assigned_to: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="attachment">Attachment (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="attachment"
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
                <Button type="submit">Add Task</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {selectedProject ? (
          /* Project Detail View */
          <div className="space-y-6">
            {/* Project Header */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <FolderKanban className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedProject.project_name}</h2>
                    <p className="text-sm text-slate-600">Client: {selectedProject.client_name}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs sm:text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        Created {new Date(selectedProject.project_created).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedProject(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Project Details */}
              <div className="mt-6 bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-700 mb-2">Project Details</p>
                <p className="text-sm text-slate-600">{selectedProject.project_details}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700">Total Tasks</p>
                  <p className="text-xl font-bold text-blue-700">{getProjectTasks(selectedProject.id).length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700">Active Tasks</p>
                  <p className="text-xl font-bold text-green-700">
                    {getProjectTasks(selectedProject.id).filter(t => new Date(t.task_deadline) >= new Date()).length}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-700">Team Members</p>
                  <p className="text-xl font-bold text-purple-700">
                    {new Set(getProjectTasks(selectedProject.id).map(t => t.assigned_to)).size}
                  </p>
                </div>
              </div>

              {/* Add Task Button */}
              <div className="mt-6">
                <Button onClick={() => openTaskDialog(selectedProject.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task to Project
                </Button>
              </div>
            </div>

            {/* Tasks List */}
            <div className="bg-white rounded-2xl shadow-sm border">
              <div className="p-4 sm:p-6 border-b">
                <h3 className="text-lg font-semibold text-slate-900">Project Tasks</h3>
                <p className="text-sm text-slate-600">All tasks for this project</p>
              </div>
              <div className="p-4 sm:p-6">
                {getProjectTasks(selectedProject.id).length === 0 ? (
                  <div className="text-center py-8">
                    <FolderKanban className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No tasks assigned yet. Add your first task to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getProjectTasks(selectedProject.id)
                      .sort((a, b) => {
                        // Sort: incomplete tasks first, then completed tasks
                        if (a.is_completed !== b.is_completed) {
                          return a.is_completed ? 1 : -1
                        }
                        // Within each group, sort by deadline
                        return new Date(a.task_deadline).getTime() - new Date(b.task_deadline).getTime()
                      })
                      .map((task) => (
                      <div
                        key={task.id}
                        className={`rounded-lg p-4 border hover:shadow-md transition-shadow ${
                          task.is_completed 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-semibold ${
                              task.is_completed 
                                ? 'text-green-700 line-through' 
                                : 'text-slate-900'
                            }`}>
                              {task.task_name}
                            </h4>
                            {task.is_completed && (
                              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                <CheckCircle className="h-3 w-3" />
                                <span>Done</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>Due: {new Date(task.task_deadline).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <p className={`text-sm mb-3 whitespace-pre-line ${
                          task.is_completed ? 'text-green-600' : 'text-slate-600'
                        }`}>
                          {task.task_details}
                        </p>
                        {task.attachment_url && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1 text-sm text-blue-600">
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
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-1.5 rounded-full">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-sm text-slate-700 font-medium">{task.employee_name}</span>
                          </div>
                          {task.is_completed && task.completed_at && (
                            <div className="text-xs text-green-600">
                              Completed: {new Date(task.completed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Projects Grid View */
          <div>
            {projects.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                <FolderKanban className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No projects found. Create your first project to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {getProjectsWithStats().map((project) => (
                  <Card
                    key={project.id}
                    className="hover:shadow-lg transition-all hover:border-primary"
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 p-2 rounded-full shrink-0">
                          <FolderKanban className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg truncate">{project.project_name}</CardTitle>
                          <CardDescription className="text-xs truncate">Client: {project.client_name}</CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditProject(project)
                            }}
                            className="h-8 w-8 p-0 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProject(project)
                            }}
                            className="h-8 w-8 p-0 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent 
                      className="cursor-pointer"
                      onClick={() => handleProjectClick(project)}
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-600">Total</p>
                          <p className="text-lg font-bold text-slate-900">{project.task_count || 0}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-xs text-blue-700">Active</p>
                          <p className="text-lg font-bold text-blue-700">
                            {getProjectTasks(project.id).filter(t => !t.is_completed).length}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <p className="text-xs text-green-700">Done</p>
                          <p className="text-lg font-bold text-green-700">
                            {getProjectTasks(project.id).filter(t => t.is_completed).length}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>Created {new Date(project.project_created).toLocaleDateString()}</span>
                        <CalendarDays className="h-4 w-4" />
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

