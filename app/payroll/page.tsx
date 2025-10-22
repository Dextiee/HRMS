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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign, Calculator, User, X, TrendingUp, Calendar, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { Payroll, Employee } from '@/lib/types'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface EmployeeWithPayroll extends Employee {
  total_payrolls?: number
  latest_payroll?: number
  total_earnings?: number
  avg_hours?: number
}

interface PayrollWithEmployee extends Payroll {
  employee_name?: string
  employee_salary?: number
  employee_salary_type?: string
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<EmployeeWithPayroll[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeePayrolls, setEmployeePayrolls] = useState<PayrollWithEmployee[]>([])
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null)
  const [editFormData, setEditFormData] = useState({
    total_working_days: '',
    total_absent_days: '',
    total_hours: '',
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
  }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    const { data: employeesData } = await supabase
      .from('employees')
      .select('*')
      .order('name')
    
    if (employeesData) {
      // Get payroll data for each employee
      const { data: payrollData } = await supabase
        .from('payroll')
        .select('*')
      
      const employeesWithPayroll = employeesData.map(emp => {
        const empPayrolls = payrollData?.filter(p => p.employee_id === emp.id) || []
        
        let totalEarnings = 0
        empPayrolls.forEach(p => {
          if (emp.salary_type === 'Daily') {
            totalEarnings += p.total_working_days * emp.salary_rate
          } else {
            const hourlyRate = emp.salary_rate / 160
            totalEarnings += p.total_hours * hourlyRate
          }
        })

        const avgHours = empPayrolls.length > 0 
          ? empPayrolls.reduce((sum, p) => sum + p.total_hours, 0) / empPayrolls.length
          : 0

        return {
          ...emp,
          total_payrolls: empPayrolls.length,
          latest_payroll: empPayrolls.length > 0 ? empPayrolls[0].total_hours : 0,
          total_earnings: totalEarnings,
          avg_hours: avgHours
        }
      })
      
      setEmployees(employeesWithPayroll)
    }
    setLoading(false)
  }

  const handleEmployeeClick = async (employee: Employee) => {
    setSelectedEmployee(employee)
    setPayrollLoading(true)
    
    const { data } = await supabase
      .from('payroll')
      .select('*')
      .eq('employee_id', employee.id)
      .order('generated_on', { ascending: false })
    
    const enriched = data?.map(p => ({
      ...p,
      employee_name: employee.name,
      employee_salary: employee.salary_rate,
      employee_salary_type: employee.salary_type
    })) || []
    
    setEmployeePayrolls(enriched)
    setPayrollLoading(false)
  }

  const generatePayroll = () => {
    setConfirmDialog({
      open: true,
      title: 'Generate Payroll?',
      description: 'Generate payroll for all employees based on unpaid attendance records? This will create payroll records for all employees with unpaid attendance.',
      confirmText: 'Generate',
      onConfirm: async () => {
        setGenerating(true)
    
    try {
      // Get all employees
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
      
      if (!employees) {
        alert('No employees found')
        return
      }

      // Get UNPAID attendance only (payroll_id is null)
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .is('payroll_id', null)
      
      if (!attendanceData || attendanceData.length === 0) {
        setConfirmDialog({
          open: true,
          title: 'No Unpaid Records Found',
          description: 'No unpaid attendance records found. All attendance has already been processed for payroll.',
          confirmText: 'OK',
          onConfirm: () => {}
        })
        return
      }

      // Calculate payroll for each employee (only if they have unpaid attendance)
      const payrollRecords = []
      const attendanceUpdates = []

      for (const employee of employees) {
        const employeeAttendance = attendanceData.filter(a => a.employee_id === employee.id)
        
        if (employeeAttendance.length === 0) continue // Skip if no unpaid attendance
        
        const totalWorkingDays = employeeAttendance.filter(a => a.status === 'Present').length
        const totalAbsentDays = employeeAttendance.filter(a => a.status === 'Absent').length
        const totalHours = employeeAttendance.reduce((sum, a) => sum + (a.hours_worked || 0), 0)
        
        payrollRecords.push({
          employee_id: employee.id,
          total_working_days: totalWorkingDays,
          total_absent_days: totalAbsentDays,
          total_hours: totalHours,
        })
      }

      if (payrollRecords.length === 0) {
        alert('No unpaid attendance records to process.')
        return
      }

      // Insert payroll records
      const { data: insertedPayrolls, error: payrollError } = await supabase
        .from('payroll')
        .insert(payrollRecords)
        .select()
      
      if (payrollError) {
        alert('Error generating payroll: ' + payrollError.message)
        return
      }

      // Link attendance records to their payroll
      if (insertedPayrolls) {
        for (const payroll of insertedPayrolls) {
          const employeeAttendance = attendanceData.filter(a => a.employee_id === payroll.employee_id)
          const attendanceIds = employeeAttendance.map(a => a.id)
          
          // Update all attendance records for this employee to link to this payroll
          await supabase
            .from('attendance')
            .update({ payroll_id: payroll.id })
            .in('id', attendanceIds)
        }
      }
      
      setConfirmDialog({
        open: true,
        title: 'Payroll Generated Successfully!',
        description: `Payroll has been generated successfully for ${payrollRecords.length} employee(s)! All unpaid attendance records have been linked to the new payroll records.`,
        confirmText: 'OK',
        onConfirm: () => {
          fetchEmployees()
          
          // Refresh selected employee if viewing
          if (selectedEmployee) {
            handleEmployeeClick(selectedEmployee)
          }
        }
      })
    } catch (error) {
      setConfirmDialog({
        open: true,
        title: 'Error Generating Payroll',
        description: 'There was an error generating payroll. Please try again or contact support if the issue persists.',
        confirmText: 'OK',
        variant: 'destructive',
        onConfirm: () => {}
      })
      console.error(error)
    } finally {
      setGenerating(false)
    }
      }
    })
  }

  const calculateNetPay = (payroll: PayrollWithEmployee) => {
    if (payroll.employee_salary_type === 'Daily') {
      return (payroll.total_working_days * (payroll.employee_salary || 0)).toFixed(2)
    } else {
      const hourlyRate = (payroll.employee_salary || 0) / 160
      return (payroll.total_hours * hourlyRate).toFixed(2)
    }
  }

  const handleEditPayroll = (payroll: Payroll) => {
    setEditingPayroll(payroll)
    setEditFormData({
      total_working_days: payroll.total_working_days.toString(),
      total_absent_days: payroll.total_absent_days.toString(),
      total_hours: payroll.total_hours.toString(),
    })
    setEditDialogOpen(true)
  }

  const handleUpdatePayroll = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingPayroll) return

    setConfirmDialog({
      open: true,
      title: 'Save Changes?',
      description: 'Save changes to this payroll record?',
      confirmText: 'Save',
      onConfirm: async () => {
        const updatedData = {
          total_working_days: parseInt(editFormData.total_working_days),
          total_absent_days: parseInt(editFormData.total_absent_days),
          total_hours: parseFloat(editFormData.total_hours),
        }

        setEditDialogOpen(false)
        setEditingPayroll(null)

        // Optimistic update
        setEmployeePayrolls(prev => prev.map(p => 
          p.id === editingPayroll.id 
            ? { ...p, ...updatedData }
            : p
        ))

        const { error } = await supabase
          .from('payroll')
          .update(updatedData)
          .eq('id', editingPayroll.id)

        if (error) {
          alert('Error updating payroll: ' + error.message)
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

  const handleDeletePayroll = (id: string) => {
    const payroll = employeePayrolls.find(p => p.id === id)
    
    setConfirmDialog({
      open: true,
      title: 'Delete Payroll?',
      description: payroll 
        ? `Delete payroll record from ${new Date(payroll.generated_on).toLocaleDateString()}? This will unlink associated attendance records and cannot be undone.`
        : 'Are you sure you want to delete this payroll record?',
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        // Optimistic update - remove from UI immediately
        setEmployeePayrolls(prev => prev.filter(p => p.id !== id))

        const { error } = await supabase
          .from('payroll')
          .delete()
          .eq('id', id)

        if (error) {
          alert('Error deleting payroll: ' + error.message)
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

  const filteredEmployees = employees.filter(emp =>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Payroll</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              {selectedEmployee 
                ? `Viewing payroll for ${selectedEmployee.name}`
                : 'Generate and view employee payroll'}
            </p>
          </div>
          <Button onClick={generatePayroll} disabled={generating} className="w-full sm:w-auto">
            <Calculator className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : 'Generate Payroll'}
          </Button>
        </div>

        {/* Edit Payroll Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Payroll Record</DialogTitle>
              <DialogDescription>
                Update the payroll details below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePayroll}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="working_days">Total Working Days</Label>
                  <Input
                    id="working_days"
                    type="number"
                    min="0"
                    value={editFormData.total_working_days}
                    onChange={(e) => setEditFormData({ ...editFormData, total_working_days: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="absent_days">Total Absent Days</Label>
                  <Input
                    id="absent_days"
                    type="number"
                    min="0"
                    value={editFormData.total_absent_days}
                    onChange={(e) => setEditFormData({ ...editFormData, total_absent_days: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="total_hours">Total Hours</Label>
                  <Input
                    id="total_hours"
                    type="number"
                    step="0.5"
                    min="0"
                    value={editFormData.total_hours}
                    onChange={(e) => setEditFormData({ ...editFormData, total_hours: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Update Payroll</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {selectedEmployee ? (
          /* Employee Payroll View */
          <div className="space-y-6">
            {/* Employee Header */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedEmployee.name}</h2>
                    <p className="text-sm text-slate-600">{selectedEmployee.email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs sm:text-sm text-slate-500">
                      <span>
                        ${selectedEmployee.salary_rate.toFixed(2)} / {selectedEmployee.salary_type}
                      </span>
                      <span>•</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedEmployee.employment_status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
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
                  <p className="text-xs text-slate-600">Total Payrolls</p>
                  <p className="text-xl font-bold text-slate-900">{employeePayrolls.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700">Total Earned</p>
                  <p className="text-xl font-bold text-green-700">
                    ${employeePayrolls.reduce((sum, p) => sum + parseFloat(calculateNetPay(p)), 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700">Total Hours</p>
                  <p className="text-xl font-bold text-blue-700">
                    {employeePayrolls.reduce((sum, p) => sum + p.total_hours, 0).toFixed(0)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-700">Working Days</p>
                  <p className="text-xl font-bold text-purple-700">
                    {employeePayrolls.reduce((sum, p) => sum + p.total_working_days, 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payroll Records Table */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
              <div className="p-4 sm:p-6 border-b">
                <h3 className="text-lg font-semibold text-slate-900">Payroll History</h3>
                <p className="text-sm text-slate-600">All payroll records for this employee</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Generated On</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Absent Days</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="text-slate-600">Loading payroll...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : employeePayrolls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        No payroll records found for this employee.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employeePayrolls.map((payroll) => (
                      <TableRow key={payroll.id}>
                        <TableCell className="font-medium">
                          {new Date(payroll.generated_on).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </TableCell>
                        <TableCell>{payroll.total_working_days}</TableCell>
                        <TableCell>{payroll.total_absent_days}</TableCell>
                        <TableCell>{payroll.total_hours} hours</TableCell>
                        <TableCell className="font-bold text-green-600">
                          ${calculateNetPay(payroll)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPayroll(payroll)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePayroll(payroll.id)}
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
                <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  {searchTerm 
                    ? 'No employees match your search.'
                    : 'No employees found. Add employees to start managing payroll.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredEmployees.map((employee) => {
                  const latestNetPay = employee.total_earnings || 0
                  
                  return (
                    <Card
                      key={employee.id}
                      className="hover:shadow-lg transition-all cursor-pointer hover:border-primary"
                      onClick={() => handleEmployeeClick(employee)}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 p-2 rounded-full shrink-0">
                            <DollarSign className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base sm:text-lg truncate">{employee.name}</CardTitle>
                            <CardDescription className="text-xs truncate">{employee.email}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                            <p className="text-xs text-green-700 mb-1">Total Earnings</p>
                            <p className="text-2xl font-bold text-green-700">
                              ${latestNetPay.toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-50 rounded-lg p-2">
                              <p className="text-xs text-slate-600">Payrolls</p>
                              <p className="text-base font-bold text-slate-900">{employee.total_payrolls || 0}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-2">
                              <p className="text-xs text-blue-700">Avg Hours</p>
                              <p className="text-base font-bold text-blue-700">{employee.avg_hours?.toFixed(0) || 0}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-2">
                              <p className="text-xs text-purple-700">Rate</p>
                              <p className="text-base font-bold text-purple-700 truncate">
                                ${employee.salary_rate.toFixed(0)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                          <span>{employee.salary_type} Rate</span>
                          <TrendingUp className="h-4 w-4" />
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
