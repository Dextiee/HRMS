# 🚀 HRMS Setup Guide

## Quick Setup Checklist

- [ ] Node.js 18+ installed
- [ ] Supabase account created
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Database schema created
- [ ] Development server running

## Step-by-Step Setup

### 1️⃣ Install Node.js

Download and install Node.js 18 or higher from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version
npm --version
```

### 2️⃣ Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up or log in
4. Click "New Project"
5. Fill in:
   - **Project Name**: HRMS
   - **Database Password**: (create a strong password)
   - **Region**: (select closest to you)
6. Click "Create new project"
7. Wait 2-3 minutes for setup to complete

### 3️⃣ Get Supabase Credentials

1. In your Supabase dashboard, go to **Settings** (gear icon)
2. Click on **API** in the sidebar
3. You'll see:
   - **Project URL** - Copy this
   - **anon public** key - Copy this

### 4️⃣ Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd HRMS

# Install dependencies
npm install
```

### 5️⃣ Create Environment File

Create a file named `.env.local` in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Replace the values with your actual Supabase credentials!

### 6️⃣ Set Up Database

1. Go to your Supabase project
2. Click on **SQL Editor** in the sidebar
3. Click **New query**
4. Copy and paste the entire SQL schema from below
5. Click **Run** or press `Ctrl+Enter`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    date_hired DATE NOT NULL,
    employment_status TEXT NOT NULL DEFAULT 'Active',
    salary_rate NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
    hours_worked NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payroll table
CREATE TABLE payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    total_working_days INT NOT NULL DEFAULT 0,
    total_absent_days INT NOT NULL DEFAULT 0,
    total_hours NUMERIC NOT NULL DEFAULT 0,
    generated_on TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    project_details TEXT NOT NULL,
    project_created TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    task_details TEXT NOT NULL,
    task_created TIMESTAMPTZ DEFAULT NOW(),
    task_deadline DATE NOT NULL,
    assigned_to UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policies for employees
CREATE POLICY "Enable all for authenticated users" ON employees
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for attendance
CREATE POLICY "Enable all for authenticated users" ON attendance
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for payroll
CREATE POLICY "Enable all for authenticated users" ON payroll
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for projects
CREATE POLICY "Enable all for authenticated users" ON projects
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for tasks
CREATE POLICY "Enable all for authenticated users" ON tasks
    FOR ALL USING (auth.role() = 'authenticated');
```

### 7️⃣ Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## ✅ Verify Setup

1. You should see the landing page
2. Click "Sign Up"
3. Create a test account
4. After signup, you should be redirected to the dashboard
5. Try adding an employee
6. Check if the employee appears in the table

## 🎯 Next Steps

1. **Add Employees** - Go to Employees page and add your first employee
2. **Record Attendance** - Track attendance for your employees
3. **Create Projects** - Set up projects and assign tasks
4. **Generate Payroll** - Process payroll based on attendance

## 🐛 Common Issues

### Issue: "Invalid API credentials"
**Solution**: Double-check your `.env.local` file has correct URL and key

### Issue: "Cannot read properties of undefined"
**Solution**: Make sure database schema is created in Supabase

### Issue: "Failed to fetch"
**Solution**: Check if Supabase project is active and running

### Issue: Tables not found
**Solution**: Re-run the SQL schema in Supabase SQL Editor

### Issue: Port 3000 already in use
**Solution**: 
```bash
# Kill the process on port 3000
npx kill-port 3000

# Or use a different port
npm run dev -- -p 3001
```

## 🔒 Security Notes

- Never commit `.env.local` to git (already in .gitignore)
- Keep your Supabase keys private
- Use different credentials for production
- Enable email confirmation in Supabase for production

## 🚀 Ready to Deploy?

See the main [README.md](./README.md) for deployment instructions to Vercel.

## 📞 Need Help?

- Check the [README.md](./README.md) for detailed documentation
- Review Supabase documentation at [supabase.com/docs](https://supabase.com/docs)
- Check Next.js documentation at [nextjs.org/docs](https://nextjs.org/docs)

---

**You're all set! Start managing your HR operations efficiently! 🎉**

