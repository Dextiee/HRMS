import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2, Users, Calendar, DollarSign, FolderKanban, CheckCircle, Clock, Shield, TrendingUp, Award, Zap, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-xl font-bold text-primary">
              <Building2 className="h-6 w-6" />
              <span>HRMS</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            HRMS Features
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Complete human resource management solution with all the tools you need
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Users,
              title: 'Employee Management',
              description: 'Complete employee profiles with contact information, employment status, salary details, and hire dates. Add, edit, and manage your workforce efficiently.'
            },
            {
              icon: Calendar,
              title: 'Attendance Tracking',
              description: 'Monitor daily attendance records, track working hours, and identify attendance patterns. Mark employees as present or absent with hours worked.'
            },
            {
              icon: DollarSign,
              title: 'Payroll Processing',
              description: 'Generate accurate payroll summaries based on attendance and working hours. Calculate total working days, absent days, and total hours automatically.'
            },
            {
              icon: FolderKanban,
              title: 'Project Management',
              description: 'Create projects with client information and project details. Assign tasks to employees with deadlines and track completion status.'
            },
            {
              icon: CheckCircle,
              title: 'Task Management',
              description: 'Create and assign tasks to employees with deadlines. Track task completion status and monitor project progress in real-time.'
            },
            {
              icon: BarChart3,
              title: 'Dashboard Analytics',
              description: 'Comprehensive dashboard with key metrics, recent activities, and visual overviews of your HR operations and team performance.'
            }
          ].map((feature, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow">
              <feature.icon className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t mt-20 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600">
          <p>&copy; 2025 HRMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

