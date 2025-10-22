'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, User, Calendar, X, Pencil, Trash2, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { Attendance, Employee } from '@/lib/types'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface EmployeeWithStats extends Employee {
  total_attendance?: number
  present_count?: number
  absent_count?: number
  total_hours?: number
  unpaid_count?: number
}

interface AttendanceWithPayroll extends Attendance {
  is_paid?: boolean
}

export default function AttendancePage() {
  const [employees, setEmployees] = useState<EmployeeWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeeAttendance, setEmployeeAttendance] = useState<AttendanceWithPayroll[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
    hours_worked: '8',
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

  // Validation error dialog state
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean
    title: string
    description: string
  }>({
    open: false,
    title: '',
    description: '',
  })

  // DTR Preview dialog state
  const [dtrPreviewDialog, setDtrPreviewDialog] = useState<{
    open: boolean
    content: string
  }>({
    open: false,
    content: '',
  })

  const supabase = createClient()

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    const { data: employeesData } = await supabase
      .from('employees')
      .select('*')
      .order('name')
    
    if (employeesData) {
      // Get attendance stats for each employee (last 60 days)
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
      
      const employeesWithStats = employeesData.map((emp: Employee) => {
        const empAttendance = attendanceData?.filter((a: Attendance) => a.employee_id === emp.id) || []
        return {
          ...emp,
          total_attendance: empAttendance.length,
          present_count: empAttendance.filter((a: Attendance) => a.status === 'Present').length,
          absent_count: empAttendance.filter((a: Attendance) => a.status === 'Absent').length,
          total_hours: empAttendance.reduce((sum: number, a: Attendance) => sum + a.hours_worked, 0),
          unpaid_count: empAttendance.filter((a: Attendance) => !a.payroll_id).length
        }
      })
      
      setEmployees(employeesWithStats)
    }
    setLoading(false)
  }

  const handleEmployeeClick = async (employee: Employee) => {
    setSelectedEmployee(employee)
    setAttendanceLoading(true)
    
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .order('date', { ascending: false })
    
    const enrichedData = (data || []).map((record: Attendance) => ({
      ...record,
      is_paid: !!record.payroll_id
    }))
    
    setEmployeeAttendance(enrichedData)
    setAttendanceLoading(false)
  }

  const handleStatusChange = (newStatus: string) => {
    setFormData({ 
      ...formData, 
      status: newStatus,
      hours_worked: newStatus === 'Absent' ? '0' : formData.hours_worked
    })
  }

  // Check for duplicate when employee or date changes (skip if editing)
  const checkDuplicate = async (employeeId: string, date: string) => {
    if (!employeeId || !date) {
      setDuplicateWarning(null)
      return
    }

    // Skip duplicate check if we're editing and the date/employee hasn't changed
    if (editingRecord && 
        editingRecord.employee_id === employeeId && 
        editingRecord.date === date) {
      setDuplicateWarning(null)
      return
    }

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .single()

    if (data && !error) {
      setDuplicateWarning(
        `Attendance already recorded for this date (${data.status}, ${data.hours_worked} hours). Please choose a different date.`
      )
    } else {
      setDuplicateWarning(null)
    }
  }

  useEffect(() => {
    checkDuplicate(formData.employee_id, formData.date)
  }, [formData.employee_id, formData.date])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form is completely filled
    if (!formData.employee_id || !formData.date || !formData.status || !formData.hours_worked) {
      setValidationDialog({
        open: true,
        title: 'Incomplete Form',
        description: 'Please fill in all required fields before submitting.',
      })
      return
    }

    // Validate hours worked is a valid number
    const hours = parseFloat(formData.hours_worked)
    if (isNaN(hours) || hours < 0 || hours > 24) {
      setValidationDialog({
        open: true,
        title: 'Invalid Hours',
        description: 'Please enter a valid number of hours (0-24).',
      })
      return
    }

    // Final check before submission
    if (duplicateWarning) {
      setValidationDialog({
        open: true,
        title: 'Duplicate Record',
        description: 'Cannot add duplicate attendance record. Please check the date.',
      })
      return
    }

    setConfirmDialog({
      open: true,
      title: editingRecord ? 'Save Changes?' : 'Add Attendance?',
      description: editingRecord 
        ? 'Save changes to this attendance record?'
        : `Add attendance record for ${new Date(formData.date).toLocaleDateString()}?`,
      confirmText: editingRecord ? 'Save' : 'Add',
      onConfirm: async () => {
        const attendanceData = {
          employee_id: formData.employee_id,
          date: formData.date,
          status: formData.status,
          hours_worked: parseFloat(formData.hours_worked),
        }

        setOpen(false)
        resetForm()
        setDuplicateWarning(null)

        let error

        if (editingRecord) {
          // Optimistic update for edit
          const updatedRecord: AttendanceWithPayroll = {
            ...editingRecord,
            ...attendanceData,
            status: attendanceData.status as 'Present' | 'Absent',
            is_paid: !!editingRecord.payroll_id
          }
          setEmployeeAttendance(prev => prev.map(a => 
            a.id === editingRecord.id ? updatedRecord : a
          ))
          
          const result = await supabase
            .from('attendance')
            .update(attendanceData)
            .eq('id', editingRecord.id)
          error = result.error
          
          if (error) {
            alert('Error updating attendance: ' + error.message)
            if (selectedEmployee) {
              handleEmployeeClick(selectedEmployee)
            }
          }
        } else {
          // Insert new record
          const result = await supabase.from('attendance').insert([attendanceData])
          error = result.error
          
          if (error) {
            if (error.code === '23505') {
              alert('Attendance already exists for this employee on this date.')
            } else {
              alert('Error saving attendance: ' + error.message)
            }
          }
        }

        if (!error) {
          fetchEmployees()
          
          // Refresh selected employee's attendance if viewing
          if (selectedEmployee) {
            handleEmployeeClick(selectedEmployee)
          }
        }
      }
    })
  }

  const handleEdit = (record: Attendance) => {
    setEditingRecord(record)
    setFormData({
      employee_id: record.employee_id,
      date: record.date,
      status: record.status,
      hours_worked: record.hours_worked.toString(),
    })
    setOpen(true)
  }

  const handleDelete = (id: string) => {
    const record = employeeAttendance.find(a => a.id === id)
    
    setConfirmDialog({
      open: true,
      title: 'Delete Attendance?',
      description: record 
        ? `Delete attendance record for ${new Date(record.date).toLocaleDateString()}? This action cannot be undone.`
        : 'Are you sure you want to delete this attendance record?',
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        // Optimistic update - remove from UI immediately
        setEmployeeAttendance(prev => prev.filter(a => a.id !== id))
        
        const { error } = await supabase
          .from('attendance')
          .delete()
          .eq('id', id)

        if (error) {
          alert('Error deleting attendance: ' + error.message)
          // Revert on error
          if (selectedEmployee) {
            handleEmployeeClick(selectedEmployee)
          }
        } else {
          fetchEmployees()
        }
      }
    })
  }

  const resetForm = () => {
    setFormData({
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Present',
      hours_worked: '8',
    })
    setDuplicateWarning(null)
    setEditingRecord(null)
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const generateDTRContent = () => {
    if (!selectedEmployee) return ''

    // Calculate date range for the DTR
    const currentDate = new Date()
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    
    // Filter attendance records for current month
    const monthlyAttendance = employeeAttendance.filter(record => {
      const recordDate = new Date(record.date)
      return recordDate >= startOfMonth && recordDate <= endOfMonth
    })

    // Calculate totals
    const totalDays = endOfMonth.getDate()
    const presentDays = monthlyAttendance.filter(a => a.status === 'Present').length
    const absentDays = monthlyAttendance.filter(a => a.status === 'Absent').length
    const totalHours = monthlyAttendance.reduce((sum, a) => sum + a.hours_worked, 0)

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Time Record - ${selectedEmployee.name}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
            
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              line-height: 1.4;
              background-color: white;
            }
            
            @media screen {
              body {
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                border-radius: 8px;
                margin: 10px;
              }
            }
            
            @media screen and (max-width: 640px) {
              body {
                margin: 5px;
                font-size: 12px;
              }
              
              .header {
                margin-bottom: 20px;
                padding-bottom: 15px;
              }
              
              .company-name {
                font-size: 18px;
              }
              
              .dtr-title {
                font-size: 16px;
              }
              
              .employee-info {
                grid-template-columns: 1fr;
                gap: 15px;
                margin-bottom: 20px;
              }
              
              .attendance-table th,
              .attendance-table td {
                padding: 4px;
                font-size: 11px;
              }
              
              .summary {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-bottom: 20px;
              }
              
              .summary-item {
                padding: 10px;
              }
              
              .summary-value {
                font-size: 16px;
              }
              
              .signatures {
                gap: 30px;
                margin-top: 30px;
              }
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            
            .dtr-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .period {
              font-size: 14px;
              color: #666;
            }
            
            .employee-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            
            .info-section h3 {
              margin: 0 0 10px 0;
              font-size: 16px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            
            .info-row {
              display: flex;
              margin-bottom: 5px;
            }
            
            .info-label {
              font-weight: bold;
              width: 120px;
            }
            
            .attendance-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            
            .attendance-table th,
            .attendance-table td {
              border: 1px solid #333;
              padding: 8px;
              text-align: center;
            }
            
            .attendance-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            
            .summary-item {
              text-align: center;
              padding: 15px;
              border: 1px solid #333;
              background-color: #f9f9f9;
            }
            
            .summary-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            
            .summary-value {
              font-size: 18px;
              font-weight: bold;
            }
            
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 50px;
              margin-top: 50px;
            }
            
            .signature-box {
              text-align: center;
            }
            
            .signature-line {
              border-bottom: 1px solid #333;
              height: 40px;
              margin-bottom: 5px;
            }
            
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            
            .status-present { color: #16a34a; font-weight: bold; }
            .status-absent { color: #dc2626; font-weight: bold; }
            .status-paid { color: #2563eb; font-weight: bold; }
            .status-unpaid { color: #ea580c; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">HUMAN RESOURCE MANAGEMENT SYSTEM</div>
            <div class="dtr-title">DAILY TIME RECORD</div>
            <div class="period">${startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          </div>
          
          <div class="employee-info">
            <div class="info-section">
              <h3>Employee Information</h3>
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span>${selectedEmployee.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span>${selectedEmployee.email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Contact:</span>
                <span>${selectedEmployee.contact_number}</span>
              </div>
            </div>
            
            <div class="info-section">
              <h3>Employment Details</h3>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span>${selectedEmployee.employment_status}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date Hired:</span>
                <span>${new Date(selectedEmployee.date_hired).toLocaleDateString()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Salary Rate:</span>
                <span>₱${selectedEmployee.salary_rate.toLocaleString()} (${selectedEmployee.salary_type})</span>
              </div>
            </div>
          </div>
          
          <table class="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Status</th>
                <th>Hours Worked</th>
                <th>Payroll Status</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from({ length: totalDays }, (_, i) => {
                const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
                const attendanceRecord = monthlyAttendance.find(a => 
                  new Date(a.date).getDate() === currentDay.getDate()
                )
                
                return `
                  <tr>
                    <td>${currentDay.toLocaleDateString()}</td>
                    <td>${currentDay.toLocaleDateString('en-US', { weekday: 'short' })}</td>
                    <td class="${attendanceRecord ? `status-${attendanceRecord.status.toLowerCase()}` : ''}">
                      ${attendanceRecord ? attendanceRecord.status : '-'}
                    </td>
                    <td>${attendanceRecord ? attendanceRecord.hours_worked : '-'}</td>
                    <td class="${attendanceRecord ? (attendanceRecord.is_paid ? 'status-paid' : 'status-unpaid') : ''}">
                      ${attendanceRecord ? (attendanceRecord.is_paid ? 'Paid' : 'Unpaid') : '-'}
                    </td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Days</div>
              <div class="summary-value">${totalDays}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Present Days</div>
              <div class="summary-value">${presentDays}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Absent Days</div>
              <div class="summary-value">${absentDays}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Hours</div>
              <div class="summary-value">${totalHours.toFixed(1)}</div>
            </div>
          </div>
          
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>Employee Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div>HR/Supervisor Signature</div>
            </div>
          </div>
          
          <div class="footer">
            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </div>
        </body>
      </html>
    `
  }

  const handlePrintDTR = () => {
    if (!selectedEmployee) return

    // Show confirmation dialog first
    setConfirmDialog({
      open: true,
      title: 'Print Daily Time Record',
      description: `Generate and print the DTR for ${selectedEmployee.name} for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}?`,
      confirmText: 'Preview DTR',
      onConfirm: () => {
        const dtrContent = generateDTRContent()
        setDtrPreviewDialog({
          open: true,
          content: dtrContent
        })
      }
    })
  }

  const handlePrintFromPreview = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    
    if (!printWindow) return

    printWindow.document.write(dtrPreviewDialog.content)
    printWindow.document.close()
    
    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }

    // Close preview dialog
    setDtrPreviewDialog({ open: false, content: '' })
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

      {/* Validation Error Dialog */}
      <Dialog open={validationDialog.open} onOpenChange={(open) => setValidationDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">{validationDialog.title}</DialogTitle>
            <DialogDescription>
              {validationDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setValidationDialog(prev => ({ ...prev, open: false }))}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DTR Preview Dialog */}
      <Dialog open={dtrPreviewDialog.open} onOpenChange={(open) => setDtrPreviewDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-2 sm:p-6">
          <DialogHeader className="px-2 sm:px-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Printer className="h-5 w-5" />
              Daily Time Record Preview
            </DialogTitle>
            <DialogDescription className="text-sm">
              Review the DTR before printing. You can print directly or close to cancel.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh] sm:max-h-[70vh] border rounded-lg">
            <iframe
              srcDoc={dtrPreviewDialog.content}
              className="w-full h-[400px] sm:h-[600px] border-0"
              title="DTR Preview"
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 px-2 sm:px-0">
            <Button 
              variant="outline" 
              onClick={() => setDtrPreviewDialog({ open: false, content: '' })}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePrintFromPreview} 
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Printer className="h-4 w-4" />
              Print DTR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Attendance</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              {selectedEmployee 
                ? `Viewing attendance for ${selectedEmployee.name}`
                : 'Select an employee to view attendance records'}
            </p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {'Add Attendance'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit Attendance' : 'Record Attendance'}</DialogTitle>
                <DialogDescription>
                  {editingRecord 
                    ? 'Update the attendance record below'
                    : 'Add a new attendance record for an employee'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  {duplicateWarning && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800 font-medium">⚠️ Duplicate Detected</p>
                      <p className="text-xs text-yellow-700 mt-1">{duplicateWarning}</p>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="employee">Employee</Label>
                    <Select
                      value={formData.employee_id}
                      onValueChange={(value: string) => setFormData({ ...formData, employee_id: value })}
                      disabled={!!editingRecord}
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
                    {editingRecord && (
                      <p className="text-xs text-slate-500">Employee cannot be changed when editing</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Present">Present</SelectItem>
                        <SelectItem value="Absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hours">Hours Worked</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={formData.hours_worked}
                      onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                      disabled={formData.status === 'Absent'}
                      className={formData.status === 'Absent' ? 'bg-slate-100 cursor-not-allowed' : ''}
                      required
                    />
                    {formData.status === 'Absent' && (
                      <p className="text-xs text-slate-500">Hours automatically set to 0 for absent status</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!!duplicateWarning}>
                    {duplicateWarning 
                      ? 'Duplicate Exists' 
                      : editingRecord 
                      ? 'Update Record' 
                      : 'Add Record'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {selectedEmployee ? (
          /* Employee Attendance View */
          <div className="space-y-6">
            {/* Employee Header */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0">
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedEmployee.employment_status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedEmployee.employment_status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 sm:flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={handlePrintDTR} className="flex items-center gap-2 flex-1 sm:flex-none">
                    <Printer className="h-4 w-4" />
                    {'Print DTR'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedEmployee(null)} className="flex-shrink-0">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600">Total Records</p>
                  <p className="text-xl font-bold text-slate-900">{employeeAttendance.length}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-orange-700">Unpaid Records</p>
                  <p className="text-xl font-bold text-orange-700">
                    {employeeAttendance.filter(a => !a.is_paid).length}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700">Present Days</p>
                  <p className="text-xl font-bold text-green-700">
                    {employeeAttendance.filter(a => a.status === 'Present').length}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700">Total Hours</p>
                  <p className="text-xl font-bold text-blue-700">
                    {employeeAttendance.reduce((sum, a) => sum + a.hours_worked, 0).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            {/* Attendance Records Table */}
            <div className="bg-white rounded-2xl shadow-sm border">
              <div className="p-4 sm:p-6 border-b">
                <h3 className="text-lg font-semibold text-slate-900">Attendance Records</h3>
                <p className="text-sm text-slate-600">All attendance history</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead>Payroll Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {attendanceLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="text-slate-600">Loading attendance...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : employeeAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        No attendance records found for this employee.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employeeAttendance.map((record) => (
                      <TableRow key={record.id} className={record.is_paid ? 'bg-slate-50/50' : ''}>
                        <TableCell className="font-medium">
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'Present'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {record.status}
                          </span>
                        </TableCell>
                        <TableCell>{record.hours_worked} hours</TableCell>
                        <TableCell>
                          {record.is_paid ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              ✓ Paid
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              Unpaid
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(record)}
                              title="Edit"
                              disabled={record.is_paid}
                            >
                              <Pencil className={`h-4 w-4 ${record.is_paid ? 'text-slate-300' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(record.id)}
                              title={record.is_paid ? 'Cannot delete paid attendance' : 'Delete'}
                              disabled={record.is_paid}
                            >
                              <Trash2 className={`h-4 w-4 ${record.is_paid ? 'text-slate-300' : 'text-red-600'}`} />
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
                    : 'No employees found. Add employees to start tracking attendance.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredEmployees.map((employee) => (
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
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-600">Total Records</p>
                          <p className="text-lg font-bold text-slate-900">{employee.total_attendance || 0}</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2">
                          <p className="text-xs text-orange-700">Unpaid</p>
                          <p className="text-lg font-bold text-orange-700">{employee.unpaid_count || 0}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <p className="text-xs text-green-700">Present</p>
                          <p className="text-lg font-bold text-green-700">{employee.present_count || 0}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                          <p className="text-xs text-blue-700">Hours</p>
                          <p className="text-lg font-bold text-blue-700">{employee.total_hours?.toFixed(0) || 0}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>Last 60 days</span>
                        <Calendar className="h-4 w-4" />
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
