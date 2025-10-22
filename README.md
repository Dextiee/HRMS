# HRMS - Human Resource Management System

A modern, elegant, and fully functional HRMS web application built with **Next.js 14**, **TypeScript**, **TailwindCSS**, **Shadcn/UI**, and **Supabase**.

![HRMS Dashboard](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-Enabled-3ecf8e)

## ✨ Features

- **🔐 Authentication** - Secure user authentication with Supabase Auth
- **👥 Employee Management** - Complete CRUD operations for employee records
- **📅 Attendance Tracking** - Record and view employee attendance with hours worked
- **💰 Payroll Processing** - Automated payroll generation based on attendance
- **📁 Project Management** - Create projects and assign tasks to employees
- **👤 Profile Management** - Edit user account information
- **📱 Responsive Design** - Beautiful UI that works on desktop and mobile
- **🎨 Modern UI** - Clean interface with Shadcn/UI components

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account ([sign up here](https://supabase.com))
- Git installed

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd HRMS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to be fully set up
3. Go to **Project Settings > API**
4. Copy your **Project URL** and **anon/public key**

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Set Up Database Schema

Go to your Supabase project **SQL Editor** and run the following SQL:

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

-- Create indexes for better performance
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);

-- Enable Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Employees policies
CREATE POLICY "Enable read access for authenticated users" ON employees
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON employees
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON employees
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON employees
    FOR DELETE USING (auth.role() = 'authenticated');

-- Attendance policies
CREATE POLICY "Enable read access for authenticated users" ON attendance
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON attendance
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Payroll policies
CREATE POLICY "Enable read access for authenticated users" ON payroll
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON payroll
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Projects policies
CREATE POLICY "Enable read access for authenticated users" ON projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON projects
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Tasks policies
CREATE POLICY "Enable read access for authenticated users" ON tasks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Usage Guide

### 1. Authentication

- **Sign Up**: Create a new account at `/signup`
- **Login**: Sign in at `/login`
- **Logout**: Use the profile dropdown in the navigation bar

### 2. Dashboard

After logging in, you'll see the dashboard with:
- Total employees count
- Total projects count
- Total attendance records
- Quick action links

### 3. Employee Management

Navigate to **Employees** to:
- ➕ Add new employees
- ✏️ Edit employee information
- 🗑️ Delete employees
- View complete employee records

### 4. Attendance Tracking

Navigate to **Attendance** to:
- Record daily attendance
- Mark employees as Present/Absent
- Track hours worked
- View attendance history

### 5. Payroll Processing

Navigate to **Payroll** to:
- Generate payroll summaries
- View working days and hours
- Calculate net pay automatically
- View payroll history

### 6. Project Management

Navigate to **Projects** to:
- Create new projects
- Add tasks to projects
- Assign tasks to employees
- Set task deadlines
- View project details

### 7. Profile Settings

Navigate to **Profile** to:
- Update email address
- Logout from your account
- View application information

## 🏗️ Project Structure

```
HRMS/
├── app/
│   ├── attendance/          # Attendance tracking page
│   ├── dashboard/           # Dashboard page
│   ├── employees/           # Employee management page
│   ├── login/               # Login page
│   ├── payroll/             # Payroll processing page
│   ├── profile/             # Profile settings page
│   ├── projects/            # Project management page
│   ├── signup/              # Signup page
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # Shadcn/UI components
│   └── Navbar.tsx           # Navigation component
├── lib/
│   ├── supabaseClient.ts    # Browser Supabase client
│   ├── supabase-server.ts   # Server Supabase client
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utility functions
├── middleware.ts            # Auth middleware
├── package.json             # Dependencies
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## 🎨 Design Philosophy

- **Minimal & Elegant**: Clean white backgrounds with soft shadows
- **Professional**: Blue-gray color scheme suitable for business
- **User-Friendly**: Intuitive navigation and clear actions
- **Responsive**: Works seamlessly on desktop and mobile
- **Modern**: Latest design trends with Shadcn/UI components

## 🔒 Security Features

- ✅ Secure authentication with Supabase Auth
- ✅ Protected routes with middleware
- ✅ Row Level Security (RLS) on all tables
- ✅ Server-side validation
- ✅ Secure session management

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

Your Supabase database is already deployed and will work automatically.

### Environment Variables on Vercel

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add both variables with their values
4. Redeploy your application

## 📚 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/UI](https://ui.shadcn.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: [Lucide React](https://lucide.dev/)

## 🎯 Key Features Breakdown

### Employee Management
- Add, edit, and delete employee records
- Track employment status (Active, On Leave, Terminated)
- Store contact information and salary rates
- View complete employee directory

### Attendance System
- Daily attendance recording
- Present/Absent status tracking
- Hours worked per day
- Historical attendance records

### Payroll System
- Automated calculation based on attendance
- Working days and absent days tracking
- Total hours calculation
- Net pay computation

### Project Management
- Create multiple projects
- Add tasks per project
- Assign tasks to employees
- Track task deadlines

## 🐛 Troubleshooting

### Database Connection Issues
- Verify your Supabase URL and anon key are correct
- Check if your Supabase project is active
- Ensure you've run all SQL schema commands

### Authentication Not Working
- Clear browser cache and cookies
- Check if Supabase Auth is enabled in your project
- Verify email confirmation settings in Supabase

### Data Not Showing
- Ensure Row Level Security policies are set up correctly
- Check browser console for errors
- Verify you're logged in with an authenticated user

## 📄 License

This project is open source and available for educational and commercial use.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 👨‍💻 Author

Built with ❤️ using Next.js 14, TypeScript, and Supabase

## 🌟 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Shadcn/UI](https://ui.shadcn.com/)
- [TailwindCSS](https://tailwindcss.com/)

---

**Happy HR Management! 🎉**

For questions or support, please open an issue or contact the development team.

