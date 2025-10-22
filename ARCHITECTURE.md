# 🏛️ HRMS Architecture Documentation

## 🎯 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Next.js 14 Frontend                     │   │
│  │                                                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │   │
│  │  │  Pages   │  │Components│  │  Styles  │         │   │
│  │  │ (Routes) │  │ (UI/UX)  │  │(Tailwind)│         │   │
│  │  └──────────┘  └──────────┘  └──────────┘         │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │         Supabase Client SDK                  │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                          │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │    Auth       │  │   Storage    │     │
│  │  Database    │  │   Service     │  │   (Optional) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Row Level Security (RLS)                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Architecture

### Authentication Flow
```
User Input (Email/Password)
    ↓
Login Form Component
    ↓
Supabase Auth SDK
    ↓
Supabase Auth Service
    ↓
Session Token Generated
    ↓
Stored in HTTP-only Cookie
    ↓
User Redirected to Dashboard
```

### CRUD Operation Flow
```
User Action (Click/Form Submit)
    ↓
Event Handler in Component
    ↓
Optimistic UI Update (Optional)
    ↓
Supabase Client Method Call
    ↓
Request to Supabase API
    ↓
RLS Policy Check
    ↓
Database Operation (INSERT/UPDATE/DELETE/SELECT)
    ↓
Response to Client
    ↓
Update React State
    ↓
UI Re-render
```

### Protected Route Flow
```
User Navigates to Protected Route
    ↓
Next.js Middleware Intercepts
    ↓
Check Session Cookie
    ↓
Verify with Supabase Auth
    ↓
┌─────────────┬─────────────┐
│ Authenticated │ Not Auth   │
↓             ↓
Allow Access  Redirect to /login
```

## 🧩 Component Architecture

### Page Components Structure
```
app/
├── layout.tsx (Root Layout)
│   └── Wraps all pages
│
├── page.tsx (Landing)
│   └── Public homepage
│
├── login/page.tsx
│   └── Authentication form
│
├── signup/page.tsx
│   └── Registration form
│
└── (Protected Pages)
    ├── dashboard/page.tsx
    │   ├── Uses: Card, Button
    │   └── Shows: Stats, Quick Actions
    │
    ├── employees/page.tsx
    │   ├── Uses: Table, Dialog, Form
    │   └── CRUD: Employees
    │
    ├── attendance/page.tsx
    │   ├── Uses: Table, Dialog, Select
    │   └── CRUD: Attendance Records
    │
    ├── payroll/page.tsx
    │   ├── Uses: Table, Card, Button
    │   └── Read: Payroll, Create: New Payroll
    │
    ├── projects/page.tsx
    │   ├── Uses: Card, Dialog, Form
    │   └── CRUD: Projects & Tasks
    │
    └── profile/page.tsx
        ├── Uses: Card, Form, Button
        └── Update: User Info, Action: Logout
```

### Component Hierarchy
```
Root Layout
├── Navbar (All Protected Pages)
│   ├── Logo/Home Link
│   ├── Navigation Links
│   └── Profile Dropdown
│       ├── User Avatar
│       ├── Email Display
│       ├── Profile Link
│       └── Logout Button
│
└── Page Content
    ├── Page Header
    │   ├── Title
    │   ├── Description
    │   └── Action Buttons
    │
    └── Page Body
        ├── Data Display (Table/Cards)
        └── Dialogs/Modals (Forms)
```

## 🗄️ Database Architecture

### Entity Relationship Diagram
```
┌─────────────┐
│  employees  │
└──────┬──────┘
       │
       │ 1:N
       ├──────────────┐
       │              │
       ↓              ↓
┌─────────────┐  ┌─────────────┐
│ attendance  │  │   payroll   │
└─────────────┘  └─────────────┘
       │
       │ N:1
       ↓
┌─────────────┐
│    tasks    │
└──────┬──────┘
       │ N:1
       ↓
┌─────────────┐
│  projects   │
└─────────────┘
```

### Table Details

#### employees
```
id              UUID (PK)
name            TEXT
address         TEXT
contact_number  TEXT
email           TEXT (UNIQUE)
date_hired      DATE
employment_status TEXT
salary_rate     NUMERIC
created_at      TIMESTAMP
```

#### attendance
```
id              UUID (PK)
employee_id     UUID (FK → employees.id)
date            DATE
status          TEXT ('Present'|'Absent')
hours_worked    NUMERIC
created_at      TIMESTAMP
UNIQUE(employee_id, date)
```

#### payroll
```
id                  UUID (PK)
employee_id         UUID (FK → employees.id)
total_working_days  INT
total_absent_days   INT
total_hours         NUMERIC
generated_on        TIMESTAMP
```

#### projects
```
id              UUID (PK)
project_name    TEXT
client_name     TEXT
project_details TEXT
project_created TIMESTAMP
```

#### tasks
```
id              UUID (PK)
project_id      UUID (FK → projects.id)
task_name       TEXT
task_details    TEXT
task_created    TIMESTAMP
task_deadline   DATE
assigned_to     UUID (FK → employees.id)
```

## 🔒 Security Architecture

### Authentication Layer
```
┌─────────────────────────────────────┐
│        Supabase Auth Service         │
│  • Email/Password Authentication     │
│  • Session Management                │
│  • JWT Token Generation              │
│  • Password Hashing (bcrypt)         │
└─────────────────────────────────────┘
```

### Authorization Layer
```
┌─────────────────────────────────────┐
│    Row Level Security (RLS)          │
│                                       │
│  Policy: authenticated users only    │
│  • Check auth.role() = 'authenticated' │
│  • Applied to ALL operations         │
│  • Enforced at database level        │
└─────────────────────────────────────┘
```

### Middleware Protection
```
middleware.ts
    ↓
Check Request Path
    ↓
Is Protected Route?
    ↓ Yes
Verify Session
    ↓
┌─────────────┬─────────────┐
│   Valid     │   Invalid   │
↓             ↓
Continue      Redirect to /login
```

## 🎨 Styling Architecture

### Design System Hierarchy
```
tailwind.config.ts (Theme Configuration)
    ↓
app/globals.css (Base Styles + CSS Variables)
    ↓
Component Styles (Tailwind Classes)
    ↓
Rendered Output
```

### CSS Variables
```
:root {
  --background: 0 0% 100%
  --foreground: 222.2 84% 4.9%
  --primary: 215 100% 50%
  --secondary: 210 40% 96.1%
  --muted: 210 40% 96.1%
  --accent: 210 40% 96.1%
  --destructive: 0 84.2% 60.2%
  --border: 214.3 31.8% 91.4%
  --radius: 0.5rem
}
```

## 🔄 State Management

### Current Approach
```
Component State (useState)
    ↓
User Interaction
    ↓
State Update
    ↓
Re-render
    ↓
Fetch Fresh Data
```

### Data Fetching Pattern
```
useEffect Hook
    ↓
Supabase Query
    ↓
Store in Component State
    ↓
Display in UI
    ↓
On Mutation: Refresh Data
```

## 📦 Build Architecture

### Development Build
```
Source Code (TypeScript/TSX)
    ↓
TypeScript Compiler
    ↓
Next.js Dev Server
    ↓
Hot Module Replacement
    ↓
Browser
```

### Production Build
```
Source Code
    ↓
TypeScript Compilation
    ↓
Next.js Build
    ├── Static Generation
    ├── Server Components
    └── Client Components
        ↓
Optimized Bundle
    ↓
Deployment (Vercel)
```

## 🌐 Deployment Architecture

### Vercel Deployment
```
GitHub Repository
    ↓
Push to main branch
    ↓
Vercel Webhook Trigger
    ↓
Build Process
    ├── Install dependencies
    ├── Run TypeScript checks
    ├── Build Next.js app
    └── Generate static assets
        ↓
Deploy to Edge Network
    ↓
Live Application
```

### Environment Setup
```
Local Development
├── .env.local (ignored by git)
└── localhost:3000

Production
├── Environment Variables (Vercel)
└── your-app.vercel.app
```

## 🔌 API Architecture

### Supabase Client Pattern
```typescript
// Browser Client
createBrowserClient() → supabaseClient.ts
    ↓
Used in Client Components

// Server Client  
createServerClient() → supabase-server.ts
    ↓
Used in Server Components/API Routes
```

### API Request Flow
```
Component → Supabase Client → API Gateway → Database
                                    ↓
                            Authentication Check
                                    ↓
                            RLS Policy Check
                                    ↓
                            Execute Query
                                    ↓
                            Return Results
```

## 📱 Responsive Design Architecture

### Breakpoint Strategy
```
Mobile First Approach
    ↓
Base Styles (Mobile)
    ↓
sm: 640px   (Small tablets)
    ↓
md: 768px   (Tablets)
    ↓
lg: 1024px  (Desktop)
    ↓
xl: 1280px  (Large Desktop)
    ↓
2xl: 1536px (Extra Large)
```

### Layout Adaptation
```
Mobile:
└── Single column
└── Stacked navigation
└── Full-width cards

Desktop:
└── Multi-column grids
└── Horizontal navigation
└── Sidebar layouts
```

## 🧪 Testing Architecture (Recommended)

### Testing Pyramid
```
                    E2E Tests
                   (Playwright)
                  Few, Slow, Expensive
                /                    \
              /                        \
        Integration Tests            
      (React Testing Library)      
      More, Faster                 
          /              \          
        /                  \        
   Unit Tests              
 (Jest + RTL)              
Many, Fast, Cheap
```

## 📈 Performance Architecture

### Optimization Strategies
```
Server Components (Default)
    ↓
Reduce Client Bundle

Client Components (Interactive)
    ↓
Code Splitting

Database Indexes
    ↓
Fast Queries

CDN (Vercel Edge)
    ↓
Fast Asset Delivery
```

## 🔧 Configuration Files Map

```
Project Root
├── package.json          → Dependencies
├── tsconfig.json         → TypeScript config
├── next.config.js        → Next.js config
├── tailwind.config.ts    → Tailwind config
├── postcss.config.js     → PostCSS config
├── components.json       → Shadcn config
├── .gitignore            → Git ignore rules
└── .env.local            → Environment variables (not in git)
```

---

## 🎓 Architecture Decisions

### Why Next.js 14?
- ✅ App Router for modern routing
- ✅ Server Components for performance
- ✅ Built-in optimization
- ✅ Excellent developer experience

### Why Supabase?
- ✅ PostgreSQL database
- ✅ Built-in authentication
- ✅ Real-time capabilities
- ✅ Row Level Security
- ✅ Easy to use SDK

### Why TypeScript?
- ✅ Type safety
- ✅ Better IDE support
- ✅ Catch errors early
- ✅ Self-documenting code

### Why Tailwind CSS?
- ✅ Utility-first approach
- ✅ Fast development
- ✅ Consistent design
- ✅ Small bundle size

### Why Shadcn/UI?
- ✅ Accessible components
- ✅ Customizable
- ✅ No runtime overhead
- ✅ Copy/paste components

---

**This architecture supports scalability, maintainability, and excellent user experience! 🚀**

