'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  FileText,
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'

interface Activity {
  id: string
  type: 'employee' | 'attendance' | 'task' | 'payroll'
  message: string
  timestamp: string
  icon: any
  color: string
  details?: string
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    const fetchAllActivities = async () => {
      try {
        // Fetch all data in parallel
        const [
          employeesRes,
          tasksRes,
          payrollsRes,
          attendanceRes
        ] = await Promise.all([
          supabase.from('employees').select('*').order('created_at', { ascending: false }),
          supabase.from('tasks').select('*, employees(name)').order('task_created', { ascending: false }),
          supabase.from('payroll').select('*, employees(name)').order('generated_on', { ascending: false }),
          supabase.from('attendance').select('*, employees(name)').order('created_at', { ascending: false })
        ])

        const allActivities: Activity[] = []

        // Process employees
        employeesRes.data?.forEach(emp => {
          allActivities.push({
            id: emp.id,
            type: 'employee',
            message: `New employee ${emp.name} joined the company`,
            timestamp: emp.created_at,
            icon: Users,
            color: 'text-blue-600',
            details: `Email: ${emp.email} • Status: ${emp.employment_status}`
          })
        })

        // Process tasks
        tasksRes.data?.forEach(task => {
          if (task.is_completed) {
            allActivities.push({
              id: task.id,
              type: 'task',
              message: `Task "${task.task_name}" completed by ${task.employees?.name || 'Unknown'}`,
              timestamp: task.completed_at || task.task_created,
              icon: CheckCircle,
              color: 'text-green-600',
              details: `Project: ${task.project_id ? 'Assigned to project' : 'Standalone task'}`
            })
          } else {
            allActivities.push({
              id: task.id,
              type: 'task',
              message: `New task "${task.task_name}" assigned to ${task.employees?.name || 'Unknown'}`,
              timestamp: task.task_created,
              icon: AlertCircle,
              color: 'text-orange-600',
              details: `Deadline: ${new Date(task.task_deadline).toLocaleDateString()}`
            })
          }
        })

        // Process payrolls
        payrollsRes.data?.forEach(payroll => {
          allActivities.push({
            id: payroll.id,
            type: 'payroll',
            message: `Payroll generated for ${payroll.employees?.name || 'Unknown'}`,
            timestamp: payroll.generated_on,
            icon: DollarSign,
            color: 'text-purple-600',
            details: `Working days: ${payroll.total_working_days} • Hours: ${payroll.total_hours}`
          })
        })

        // Process attendance
        attendanceRes.data?.forEach(attendance => {
          allActivities.push({
            id: attendance.id,
            type: 'attendance',
            message: `${attendance.employees?.name || 'Unknown'} marked ${attendance.status.toLowerCase()}`,
            timestamp: attendance.created_at,
            icon: Calendar,
            color: attendance.status === 'Present' ? 'text-green-600' : 'text-red-600',
            details: `Date: ${new Date(attendance.date).toLocaleDateString()} • Hours: ${attendance.hours_worked}`
          })
        })

        // Sort by timestamp (most recent first)
        allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        
        setActivities(allActivities)
        setFilteredActivities(allActivities)

      } catch (error) {
        console.error('Error fetching activities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllActivities()
  }, [supabase])

  useEffect(() => {
    let filtered = activities

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(activity => activity.type === filterType)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(activity => 
        activity.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.details?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredActivities(filtered)
  }, [activities, searchTerm, filterType])

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`
    const diffInMonths = Math.floor(diffInDays / 30)
    return `${diffInMonths}mo ago`
  }

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'employee': return 'Employee'
      case 'attendance': return 'Attendance'
      case 'task': return 'Task'
      case 'payroll': return 'Payroll'
      default: return 'All'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">All Activities</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Complete activity log for your HRMS system
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              Filter Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Activity Log
              </span>
              <span className="text-sm text-slate-500">
                {filteredActivities.length} activities
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredActivities.length > 0 ? (
              <div className="space-y-4">
                {filteredActivities.map((activity, index) => {
                  const Icon = activity.icon
                  return (
                    <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className={`p-3 rounded-lg ${activity.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                        <Icon className={`h-5 w-5 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 mb-1">{activity.message}</p>
                            {activity.details && (
                              <p className="text-xs text-slate-500 mb-2">{activity.details}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                {getActivityTypeLabel(activity.type)}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(activity.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium mb-2">No activities found</p>
                <p className="text-sm">
                  {searchTerm || filterType !== 'all' 
                    ? 'Try adjusting your search or filter criteria' 
                    : 'Activities will appear here as they happen'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
