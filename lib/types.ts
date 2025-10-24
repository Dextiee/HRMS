export interface Employee {
  id: string
  name: string
  address: string
  contact_number: string
  email: string
  date_hired: string
  employment_status: string
  salary_rate: number
  salary_type: 'Monthly' | 'Daily'
  created_at: string
}

export interface Attendance {
  id: string
  employee_id: string
  date: string
  status: 'Present' | 'Absent'
  hours_worked: number
  payroll_id: string | null
}

export interface Payroll {
  id: string
  employee_id: string
  total_working_days: number
  total_absent_days: number
  total_hours: number
  generated_on: string
}

export interface Project {
  id: string
  project_name: string
  client_name: string
  project_details: string
  project_created: string
}

export interface Task {
  id: string
  project_id: string
  task_name: string
  task_details: string
  task_created: string
  task_deadline: string
  assigned_to: string
  is_completed: boolean
  completed_at: string | null
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_size?: number | null
  attachment_type?: string | null
}

export interface Appointment {
  id: string
  appointment_name: string
  appointment_date: string
  appointment_time: string
  assigned_employee: string
  appointment_status: 'Active' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Rescheduled'
  appointment_info: string | null
  google_calendar_event_id: string | null
  created_at: string
  updated_at: string
}

