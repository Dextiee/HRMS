# 🎯 Getting Started with HRMS

Welcome to your HRMS (Human Resource Management System)! This guide will walk you through your first steps.

## 📝 Table of Contents

1. [First Time Setup](#first-time-setup)
2. [Creating Your First Employee](#creating-your-first-employee)
3. [Recording Attendance](#recording-attendance)
4. [Generating Payroll](#generating-payroll)
5. [Managing Projects](#managing-projects)
6. [Common Workflows](#common-workflows)

## 🚀 First Time Setup

### Prerequisites Checklist

Before you begin, ensure you have completed:

- ✅ Installed dependencies (`npm install`)
- ✅ Created `.env.local` file with Supabase credentials
- ✅ Run the database schema in Supabase
- ✅ Started the development server (`npm run dev`)

### Initial Account Setup

1. **Navigate to the app**: Open `http://localhost:3000`
2. **Sign Up**: Click "Sign Up" button
3. **Create Account**:
   - Enter your email
   - Create a strong password (min 6 characters)
   - Click "Sign Up"
4. **Access Dashboard**: You'll be automatically redirected

## 👥 Creating Your First Employee

### Step 1: Navigate to Employees
- Click "Employees" in the navigation bar
- You'll see an empty employee list

### Step 2: Add New Employee
1. Click the "Add Employee" button (top right)
2. Fill in the form:
   - **Full Name**: e.g., "John Doe"
   - **Email**: e.g., "john.doe@company.com"
   - **Contact Number**: e.g., "+1234567890"
   - **Address**: e.g., "123 Main St, New York"
   - **Date Hired**: Select from calendar
   - **Employment Status**: Choose (Active/On Leave/Terminated)
   - **Salary Rate**: e.g., "5000.00"
3. Click "Add Employee"

### Step 3: Verify
- Your new employee should appear in the table
- You can edit or delete using the action buttons

### Tips for Employee Management
- ✅ Use descriptive names
- ✅ Keep email addresses unique
- ✅ Update employment status regularly
- ✅ Enter accurate salary rates for payroll calculations

## 📅 Recording Attendance

### Why Track Attendance?
Attendance records are used to:
- Monitor employee presence
- Calculate working hours
- Generate accurate payroll

### How to Record Attendance

1. **Navigate to Attendance**
   - Click "Attendance" in the navigation bar

2. **Add Attendance Record**
   - Click "Add Attendance" button
   - Select employee from dropdown
   - Choose date (defaults to today)
   - Select status (Present/Absent)
   - Enter hours worked (e.g., 8 for full day)
   - Click "Add Record"

3. **View Records**
   - All attendance records appear in the table
   - Sorted by most recent first

### Best Practices
- ✅ Record attendance daily
- ✅ Use 8 hours for standard work day
- ✅ Mark partial days with actual hours
- ✅ Track weekend work if applicable

## 💰 Generating Payroll

### Understanding Payroll

The payroll system automatically calculates:
- Total working days (Present status)
- Total absent days (Absent status)
- Total hours worked
- Net pay (based on hours × hourly rate)

### How to Generate Payroll

1. **Record Attendance First**
   - Ensure you have attendance records for the period
   - Payroll is calculated based on attendance data

2. **Navigate to Payroll**
   - Click "Payroll" in the navigation bar

3. **Generate Payroll**
   - Click "Generate Payroll" button
   - System processes all employees with attendance records
   - Calculates totals automatically

4. **Review Summary**
   - View working days, absent days, and hours
   - Check net pay calculations
   - Export or print as needed

### Payroll Calculation Formula
```
Hourly Rate = Salary Rate ÷ 160 (standard monthly hours)
Net Pay = Total Hours × Hourly Rate
```

### Tips
- ✅ Generate payroll at end of each pay period
- ✅ Review attendance before generating
- ✅ Keep historical payroll records
- ✅ Verify calculations for accuracy

## 📁 Managing Projects

### Creating a Project

1. **Navigate to Projects**
   - Click "Projects" in the navigation bar

2. **Add New Project**
   - Click "Add Project" button
   - Fill in details:
     - **Project Name**: e.g., "Website Redesign"
     - **Client Name**: e.g., "Acme Corp"
     - **Project Details**: Brief description
   - Click "Create Project"

### Adding Tasks to Projects

1. **Locate Your Project**
   - Find the project card in the projects view

2. **Add Task**
   - Click "+ Task" button on the project card
   - Fill in task details:
     - **Task Name**: e.g., "Design Homepage"
     - **Task Details**: Description
     - **Deadline**: Select date
     - **Assign To**: Choose employee
   - Click "Add Task"

3. **View Tasks**
   - Tasks appear under their respective projects
   - See assignee and deadline for each task

### Project Management Tips
- ✅ Break projects into manageable tasks
- ✅ Set realistic deadlines
- ✅ Assign tasks to appropriate employees
- ✅ Update project details regularly

## 🔄 Common Workflows

### Daily Workflow

**Morning**
1. Log in to the system
2. Navigate to Attendance
3. Record today's attendance for all employees

**During Day**
4. Check Dashboard for overview
5. Update project tasks as needed
6. Add new employees if hired

**End of Day**
7. Verify attendance records
8. Review pending tasks

### Weekly Workflow

**Monday**
- Review last week's attendance
- Plan project tasks for the week
- Assign new tasks to employees

**Mid-Week**
- Check project progress
- Update employment statuses if needed

**Friday**
- Generate weekly attendance report
- Prepare for payroll if applicable

### Monthly Workflow

**Start of Month**
- Review previous month's data
- Update any employee information

**Mid-Month**
- Generate payroll for first half
- Review project milestones

**End of Month**
- Generate final payroll
- Create monthly summary report
- Archive completed projects

## 🎯 Quick Tips for Success

### Employee Management
- Keep records updated
- Document status changes
- Maintain accurate contact info

### Attendance Tracking
- Record daily for accuracy
- Note any discrepancies
- Track overtime separately

### Payroll Processing
- Verify attendance first
- Review calculations
- Keep historical records

### Project Management
- Set clear deadlines
- Assign tasks appropriately
- Monitor progress regularly

## 🔒 Security Best Practices

1. **Account Security**
   - Use strong passwords
   - Log out when done
   - Don't share credentials

2. **Data Management**
   - Regular backups via Supabase
   - Verify data accuracy
   - Delete old records when appropriate

3. **Access Control**
   - Only authenticated users can access data
   - Row Level Security enforced
   - Audit changes regularly

## 📊 Understanding the Dashboard

The dashboard provides:

### Overview Cards
- **Total Employees**: Current employee count
- **Total Projects**: Active projects
- **Attendance Records**: Total attendance entries
- **Payroll Status**: System status

### Quick Actions
- Direct links to main features
- Fast access to common tasks

### Recent Activity
- System status updates
- Connection verification

## 🆘 Need Help?

### Troubleshooting Resources
1. Check [README.md](./README.md) for detailed documentation
2. Review [SETUP.md](./SETUP.md) for configuration issues
3. Check Supabase dashboard for database issues

### Common Questions

**Q: Can I import existing employee data?**
A: Currently, employees must be added individually through the UI.

**Q: Can I edit past attendance records?**
A: Yes, navigate to attendance and modify existing records.

**Q: How is payroll calculated?**
A: Based on hours worked × (salary rate ÷ 160 standard hours).

**Q: Can I export data?**
A: Currently, data can be viewed and copied from tables. Export features may be added in future updates.

## 🎉 You're Ready!

You now have everything you need to start managing your HR operations effectively!

### Next Steps:
1. ✅ Add your first employee
2. ✅ Record some attendance
3. ✅ Create a project
4. ✅ Generate payroll

### Need More Features?
This is a base implementation that can be extended with:
- PDF export functionality
- Data filtering and search
- Charts and analytics
- Email notifications
- Leave management
- Performance reviews

---

**Happy HR Management! 🚀**

For technical details, refer to the [README.md](./README.md)

