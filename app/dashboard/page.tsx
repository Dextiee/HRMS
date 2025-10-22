'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  FolderKanban, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  UserCheck,
  UserX,
  FileText,
  Target
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { Employee, Attendance, Task, Payroll } from '@/lib/types'

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  totalProjects: number
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  todayPresent: number
  todayAbsent: number
  attendanceRate: number
  recentPayrolls: number
  totalPayrollAmount: number
}

interface RecentActivity {
  type: 'employee' | 'attendance' | 'task' | 'payroll'
  message: string
  timestamp: string
  icon: any
  color: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    todayPresent: 0,
    todayAbsent: 0,
    attendanceRate: 0,
    recentPayrolls: 0,
    totalPayrollAmount: 0,
  })
  
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        // Fetch all data in parallel
        const [
          employeesRes,
          projectsRes,
          tasksRes,
          attendanceRes,
          payrollRes,
          todayAttendanceRes,
          recentEmployeesRes,
          recentTasksRes,
          recentPayrollsRes
        ] = await Promise.all([
          // Basic counts
          supabase.from('employees').select('*'),
          supabase.from('projects').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('attendance').select('*'),
          supabase.from('payroll').select('*'),
          
          // Today's attendance
          supabase.from('attendance').select('*').eq('date', today),
          
          // Recent activities
          supabase.from('employees').select('*').order('created_at', { ascending: false }).limit(3),
          supabase.from('tasks').select('*, employees(name)').order('task_created', { ascending: false }).limit(3),
          supabase.from('payroll').select('*, employees(name)').order('generated_on', { ascending: false }).limit(3)
        ])

        const employees = employeesRes.data || []
        const projects = projectsRes.data || []
        const tasks = tasksRes.data || []
        const attendance = attendanceRes.data || []
        const payrolls = payrollRes.data || []
        const todayAttendance = todayAttendanceRes.data || []

        // Calculate statistics
        const activeEmployees = employees.filter(emp => emp.employment_status === 'Active').length
        const completedTasks = tasks.filter(task => task.is_completed).length
        const pendingTasks = tasks.filter(task => !task.is_completed).length
        const overdueTasks = tasks.filter(task => 
          !task.is_completed && new Date(task.task_deadline) < new Date()
        ).length
        
        const todayPresent = todayAttendance.filter(att => att.status === 'Present').length
        const todayAbsent = todayAttendance.filter(att => att.status === 'Absent').length
        const attendanceRate = todayAttendance.length > 0 
          ? Math.round((todayPresent / todayAttendance.length) * 100) 
          : 0

        const recentPayrolls = payrolls.filter(payroll => 
          new Date(payroll.generated_on) >= new Date(oneWeekAgo)
        ).length

        const totalPayrollAmount = payrolls.reduce((sum, payroll) => {
          const employee = employees.find(emp => emp.id === payroll.employee_id)
          if (employee) {
            const hourlyRate = employee.salary_type === 'Monthly' 
              ? employee.salary_rate / 160 // Assuming 160 hours per month
              : employee.salary_rate / 8 // Assuming 8 hours per day
            return sum + (payroll.total_hours * hourlyRate)
          }
          return sum
        }, 0)

        setStats({
          totalEmployees: employees.length,
          activeEmployees,
          totalProjects: projects.length,
          totalTasks: tasks.length,
          completedTasks,
          pendingTasks,
          overdueTasks,
          todayPresent,
          todayAbsent,
          attendanceRate,
          recentPayrolls,
          totalPayrollAmount: Math.round(totalPayrollAmount)
        })

        // Build recent activities
        const activities: RecentActivity[] = []
        
        // Recent employees
        recentEmployeesRes.data?.forEach(emp => {
          activities.push({
            type: 'employee',
            message: `New employee ${emp.name} joined`,
            timestamp: emp.created_at,
            icon: Users,
            color: 'text-blue-600'
          })
        })

        // Recent task completions
        recentTasksRes.data?.forEach(task => {
          if (task.is_completed) {
            activities.push({
              type: 'task',
              message: `Task "${task.task_name}" completed by ${task.employees?.name || 'Unknown'}`,
              timestamp: task.completed_at || task.task_created,
              icon: CheckCircle,
              color: 'text-green-600'
            })
          }
        })

        // Recent payrolls
        recentPayrollsRes.data?.forEach(payroll => {
          activities.push({
            type: 'payroll',
            message: `Payroll generated for ${payroll.employees?.name || 'Unknown'}`,
            timestamp: payroll.generated_on,
            icon: DollarSign,
            color: 'text-orange-600'
          })
        })

        // Sort by timestamp and take latest 5
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setRecentActivities(activities.slice(0, 5))

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [supabase])

  const statsCards = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      subtitle: `${stats.activeEmployees} active`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+12%'
    },
    {
      title: 'Active Projects',
      value: stats.totalProjects,
      subtitle: `${stats.totalTasks} total tasks`,
      icon: FolderKanban,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+5%'
    },
    {
      title: 'Today\'s Attendance',
      value: `${stats.todayPresent}/${stats.todayPresent + stats.todayAbsent}`,
      subtitle: `${stats.attendanceRate}% attendance rate`,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: stats.attendanceRate > 80 ? '+3%' : '-2%'
    },
    {
      title: 'Task Completion',
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      subtitle: `${stats.overdueTasks} overdue`,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: stats.overdueTasks > 0 ? '-1%' : '+8%'
    },
  ]

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
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
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Welcome to your HRMS overview - {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Main Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {statsCards.map((card, index) => {
            const Icon = card.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-slate-600">
                    {card.title}
                  </CardTitle>
                  <div className={`${card.bgColor} p-2 rounded-lg`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
                    {card.value}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">{card.subtitle}</p>
                    <span className={`text-xs font-medium ${
                      card.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {card.trend}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Payroll Summary</CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                ${stats.totalPayrollAmount.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500">{stats.recentPayrolls} generated this week</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Task Status</CardTitle>
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {stats.pendingTasks}
              </div>
              <p className="text-xs text-slate-500">Pending tasks</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Overdue Tasks</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {stats.overdueTasks}
              </div>
              <p className="text-xs text-slate-500">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a
                href="/employees"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 transition-colors group"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Manage Employees</h3>
                  <p className="text-xs text-slate-600">Add or edit employee information</p>
                </div>
              </a>
              <a
                href="/attendance"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-purple-50 transition-colors group"
              >
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Record Attendance</h3>
                  <p className="text-xs text-slate-600">Track daily employee attendance</p>
                </div>
              </a>
              <a
                href="/payroll"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-green-50 transition-colors group"
              >
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Generate Payroll</h3>
                  <p className="text-xs text-slate-600">Process employee payments</p>
                </div>
              </a>
              <a
                href="/projects"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-orange-50 transition-colors group"
              >
                <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <FolderKanban className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Manage Projects</h3>
                  <p className="text-xs text-slate-600">Create and assign project tasks</p>
                </div>
              </a>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Recent Activities
                </CardTitle>
                <a 
                  href="/activities"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  View All
                </a>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => {
                    const Icon = activity.icon
                    return (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className={`p-2 rounded-lg ${activity.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                          <Icon className={`h-4 w-4 ${activity.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{activity.message}</p>
                          <p className="text-xs text-slate-500">{formatTimeAgo(activity.timestamp)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm">No recent activities</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Attendance Overview */}
        <div className="mt-6 sm:mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Today's Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{stats.todayPresent}</div>
                  <div className="text-sm text-green-700">Present</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <UserX className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600">{stats.todayAbsent}</div>
                  <div className="text-sm text-red-700">Absent</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{stats.attendanceRate}%</div>
                  <div className="text-sm text-blue-700">Attendance Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

