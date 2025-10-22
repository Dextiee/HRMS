# ⚡ HRMS Quick Reference

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 📋 Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🗄️ Database Quick Setup

1. Go to Supabase SQL Editor
2. Run `supabase-schema.sql`
3. Verify tables created

## 📍 Application Routes

### Public Routes
- `/` - Landing page
- `/login` - Sign in
- `/signup` - Create account

### Protected Routes (Requires Auth)
- `/dashboard` - Main dashboard
- `/employees` - Employee management
- `/attendance` - Attendance tracking
- `/payroll` - Payroll processing
- `/projects` - Project management
- `/profile` - User settings

## 🎯 Key Features Checklist

### Employee Management
- ✅ Add employee
- ✅ Edit employee
- ✅ Delete employee
- ✅ View all employees

### Attendance
- ✅ Record attendance
- ✅ Set Present/Absent
- ✅ Track hours worked
- ✅ View history

### Payroll
- ✅ Generate payroll
- ✅ View summaries
- ✅ Calculate net pay
- ✅ Track working days

### Projects
- ✅ Create projects
- ✅ Add tasks
- ✅ Assign to employees
- ✅ Set deadlines

## 🔑 Database Tables

| Table | Key Fields |
|-------|------------|
| `employees` | name, email, salary_rate, employment_status |
| `attendance` | employee_id, date, status, hours_worked |
| `payroll` | employee_id, total_working_days, total_hours |
| `projects` | project_name, client_name, project_details |
| `tasks` | project_id, task_name, assigned_to, task_deadline |

## 🎨 Component Quick Access

### UI Components Location
All in `components/ui/`:
- `button.tsx` - Buttons
- `card.tsx` - Cards
- `dialog.tsx` - Modals
- `input.tsx` - Input fields
- `label.tsx` - Form labels
- `select.tsx` - Dropdowns
- `table.tsx` - Tables
- `avatar.tsx` - Avatars
- `dropdown-menu.tsx` - Dropdown menus

### Custom Components
- `components/Navbar.tsx` - Navigation bar

## 📦 Key Dependencies

```json
{
  "next": "14.2.5",
  "react": "18.3.1",
  "typescript": "5.6.2",
  "@supabase/supabase-js": "2.45.4",
  "tailwindcss": "3.4.1"
}
```

## 🔧 Common Tasks

### Add New Page
1. Create `app/newpage/page.tsx`
2. Add route to `Navbar.tsx`
3. Update middleware if protected

### Add New Component
1. Create in `components/ui/`
2. Export from component file
3. Import where needed

### Add Database Table
1. Write SQL in Supabase
2. Add interface to `lib/types.ts`
3. Add RLS policies
4. Create CRUD operations

### Modify Styles
- Global: `app/globals.css`
- Theme: `tailwind.config.ts`
- Component: Inline with Tailwind classes

## 🐛 Troubleshooting Quick Fixes

### Issue: Database connection fails
```bash
# Check environment variables
cat .env.local

# Verify Supabase project is active
# Go to supabase.com dashboard
```

### Issue: Build errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Auth not working
```bash
# Check Supabase Auth settings
# Verify email confirmation settings
# Clear browser cookies
```

### Issue: Tables not visible
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## 📱 Testing Checklist

### Before Committing
- [ ] TypeScript checks pass
- [ ] No console errors
- [ ] All features work
- [ ] Responsive on mobile

### Before Deploying
- [ ] Environment variables set
- [ ] Database schema applied
- [ ] Build succeeds
- [ ] Auth working

## 🎯 Common Workflows

### Add Employee Workflow
1. Navigate to `/employees`
2. Click "Add Employee"
3. Fill form
4. Submit

### Record Attendance Workflow
1. Navigate to `/attendance`
2. Click "Add Attendance"
3. Select employee
4. Set status and hours
5. Submit

### Generate Payroll Workflow
1. Record attendance first
2. Navigate to `/payroll`
3. Click "Generate Payroll"
4. Review results

### Create Project Workflow
1. Navigate to `/projects`
2. Click "Add Project"
3. Fill project details
4. Click "+ Task" to add tasks
5. Assign tasks to employees

## 🔐 Security Checklist

- [ ] `.env.local` not in git
- [ ] RLS enabled on all tables
- [ ] Protected routes in middleware
- [ ] Secure Supabase keys
- [ ] HTTPS in production

## 📊 Performance Tips

### Optimization Ideas
- Add pagination for large tables
- Implement search/filter
- Use React Query for caching
- Lazy load components
- Optimize images

### Monitoring
- Check Supabase dashboard for usage
- Monitor API response times
- Track error logs
- Review user feedback

## 🚀 Deployment Quick Guide

### Vercel Deployment
1. Push code to GitHub
2. Import on Vercel
3. Add environment variables
4. Deploy

### Environment Variables on Vercel
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 📚 Documentation Files

- `README.md` - Complete documentation
- `SETUP.md` - Setup instructions
- `GETTING-STARTED.md` - User guide
- `PROJECT-OVERVIEW.md` - Technical overview
- `QUICK-REFERENCE.md` - This file

## 🆘 Help Resources

### In This Project
1. Check README.md for detailed docs
2. Review SETUP.md for configuration
3. See GETTING-STARTED.md for usage

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [Shadcn UI](https://ui.shadcn.com/)

## 💡 Pro Tips

1. **Use TypeScript**: Leverage type checking
2. **Check Console**: Monitor for errors
3. **Test Often**: Verify changes immediately
4. **Document Changes**: Update docs when needed
5. **Backup Data**: Regular Supabase backups
6. **Version Control**: Commit regularly
7. **Review Code**: Check before pushing
8. **Monitor Performance**: Use Supabase dashboard

## 🎓 Learning Path

### Beginner
1. Understand the file structure
2. Learn basic CRUD operations
3. Customize styling
4. Add simple features

### Intermediate
1. Add new pages
2. Create custom components
3. Implement search/filter
4. Add data validation

### Advanced
1. Optimize performance
2. Add real-time features
3. Implement complex workflows
4. Add analytics

---

**Keep this file bookmarked for quick access! 📌**

For detailed information, refer to the complete documentation files.

