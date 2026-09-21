# Build a Personal Project & Task Management App

You are an expert Next.js developer and UI/UX designer.

Build a clean, modern, lightweight **personal project and task management application** for everyday use.

This is NOT a large-scale project management platform like Jira, Asana, or Trello.

The purpose is simple:

> I want to create projects, add tasks to each project, organize those tasks, track their progress, add notes, set priorities and due dates, and quickly see what I need to work on today.

The application should be fast, simple, visually polished, and easy to use.

---

# Tech Stack

Use:

* Next.js
* App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* PostgreSQL
* Neon PostgreSQL
* Prisma ORM
* Vercel deployment
* Zod
* React Hook Form
* Lucide React
* Sonner for toast notifications

Use Server Components by default.

Use Client Components only where interactivity is required.

Use Server Actions for database mutations where appropriate.

---

# Core Concept

The application has two main entities:

## Projects

A project represents something I am working on.

Examples:

* Client Website
* Personal Website
* Next.js SaaS
* WordPress Project
* DawahSoft Tasks
* Home Automation

## Tasks

Each project contains tasks.

Example:

Project:

"Client Website"

Tasks:

* Fix homepage header
* Replace hero image
* Add contact form
* Fix mobile navigation
* Deploy to staging

A task belongs to exactly one project.

---

# Main Navigation

Keep navigation extremely simple.

Sidebar:

* Dashboard
* Projects
* Today
* Upcoming
* Completed

Bottom/sidebar:

* Settings

On mobile use a responsive mobile navigation.

---

# Dashboard

The dashboard should be the main screen.

Display:

## Greeting

Example:

"Good afternoon, Jack"

Then:

"Here's what you have to work on."

---

## Statistics

Show small cards:

* Total Projects
* Active Tasks
* Due Today
* Completed This Week

Keep these compact.

---

# Today's Tasks

Show tasks due today.

Group them by project.

Example:

### Client Website

☐ Fix mobile header

☐ Update contact form

### Personal Website

☐ Add portfolio section

☐ Update About page

Allow completing tasks directly from the dashboard.

---

# Upcoming Tasks

Show tasks coming up over the next few days.

Display:

* Task name
* Project
* Due date
* Priority

---

# Recent Projects

Show recently accessed projects.

Each project card should display:

* Project name
* Description
* Progress
* Number of remaining tasks
* Last updated

---

# Projects Page

Route:

`/projects`

Display all projects.

Provide:

`+ New Project`

Each project card should show:

* Project name
* Description
* Status
* Progress bar
* Completed tasks
* Remaining tasks
* Last updated

Allow:

* Open
* Edit
* Archive
* Delete

---

# Create Project

Use a simple modal or sheet.

Fields:

Project Name

Description

Color

Status

Statuses:

* Active
* On Hold
* Completed
* Archived

Allow selecting a project color.

Do not overcomplicate project creation.

---

# Project Details

Route:

`/projects/[id]`

This is the main working area.

Header:

Project name

Description

Progress

Edit Project button

---

# Task Sections

Use a simple Kanban-style layout or grouped task lists.

Default sections:

## To Do

## In Progress

## Completed

Allow dragging tasks between sections.

Use dnd-kit.

However, the drag-and-drop implementation should remain lightweight.

---

# Tasks

Each task should contain:

* Title
* Description
* Status
* Priority
* Due date
* Project
* Created date
* Updated date
* Completed date
* Notes

Priority:

* Low
* Medium
* High
* Urgent

Status:

* Todo
* In Progress
* Completed

---

# Quick Add Task

Make adding tasks extremely fast.

Provide a prominent:

`+ Add Task`

button.

The form should allow:

Task title

Project

Priority

Due date

Description

The task title should be the only required field.

After creating a task:

* Save immediately
* Show toast
* Update the UI without a full page refresh

---

# Task Details

Clicking a task opens a modal or side panel.

Display:

Task title

Description

Status

Priority

Due date

Project

Notes

Created date

Updated date

Actions:

* Edit
* Complete
* Delete

---

# Task Notes

Allow a task to contain additional notes.

Example:

"Client wants the hero section changed to the new design."

Keep notes simple.

No need for a complex rich-text editor.

A multiline textarea is sufficient.

---

# Due Dates

Tasks can have optional due dates.

Display due dates clearly.

Examples:

Today

Tomorrow

Sep 25

Overdue

Use different visual indicators for:

* Overdue
* Due today
* Upcoming
* No due date

Do not use excessive colors.

---

# Today Page

Route:

`/today`

Show only tasks that need attention today.

Sections:

### Overdue

### Due Today

### No Due Date

Allow completing tasks directly.

---

# Upcoming Page

Route:

`/upcoming`

Display upcoming tasks grouped by date.

Example:

### Tomorrow

* Fix homepage
* Update database

### September 24

* Deploy staging version

### September 26

* Client review

---

# Completed Page

Route:

`/completed`

Show completed tasks.

Allow:

* Search
* Filter by project
* Filter by completion date

Allow restoring a completed task.

---

# Search

Add a simple global search.

Search:

* Projects
* Tasks

Example:

Search:

`homepage`

Results:

Client Website

→ Fix homepage header

Personal Website

→ Homepage redesign

Use a keyboard shortcut:

`Ctrl + K`

to open search.

---

# Filters

Tasks can be filtered by:

Project

Status

Priority

Due date

Add filters to the project task view.

Keep the filtering UI simple.

---

# Task Sorting

Allow sorting by:

* Due date
* Priority
* Created date
* Updated date

Default:

Priority + due date.

---

# Project Progress

Automatically calculate project progress.

Example:

20 total tasks

15 completed

Progress:

75%

Do NOT store progress as a separate database field.

Calculate it from tasks.

---

# Project Activity

Keep a lightweight activity section.

Examples:

"Task completed"

"Task created"

"Task priority changed"

"Project created"

Only track useful activity.

Do not build a complicated enterprise audit system.

---

# Dashboard Calendar

Add a small calendar widget showing task due dates.

Clicking a date should show tasks due that day.

Keep it simple.

---

# Notifications

Do NOT build push notifications initially.

Instead:

Show visual reminders for:

* Overdue tasks
* Tasks due today
* Tasks due tomorrow

Notifications can be added later.

---

# Authentication

Since this is primarily a personal application, implement simple authentication.

Use:

* Auth.js
* Email/password
* Google OAuth optionally

All projects and tasks must belong to the authenticated user.

A user must never be able to access another user's projects or tasks.

---

# Database

Use Neon PostgreSQL with Prisma.

Create these core models:

## User

* id
* name
* email
* image
* createdAt
* updatedAt

## Project

* id
* userId
* name
* description
* color
* status
* createdAt
* updatedAt
* archivedAt

## Task

* id
* projectId
* userId
* title
* description
* notes
* status
* priority
* dueDate
* completedAt
* createdAt
* updatedAt

## Activity

* id
* userId
* projectId
* taskId
* type
* metadata
* createdAt

Use proper foreign keys and indexes.

Important indexes:

* Task.userId
* Task.projectId
* Task.status
* Task.priority
* Task.dueDate
* Project.userId

---

# Database Rules

Use Prisma migrations.

Never directly manipulate the production database schema manually.

Create:

`prisma/schema.prisma`

and migration files.

Create a seed script with example projects and tasks for development.

---

# UI Design

The application should look like a modern personal productivity app.

Design inspiration:

* Linear
* Todoist
* Notion
* Things
* Height

But create an original design.

Use:

* Clean layout
* Minimal sidebar
* Subtle borders
* Rounded cards
* Good whitespace
* Clear typography
* Small animations
* Excellent hover states

Avoid:

* Excessive gradients
* Excessive glassmorphism
* Huge dashboard cards
* Unnecessary animations
* Overly colorful UI

The application should feel calm and productive.

---

# Dark Mode

Support:

* Light mode
* Dark mode
* System mode

Remember the user's preference.

---

# Responsive Design

Desktop:

Sidebar + main content.

Tablet:

Compact sidebar.

Mobile:

Bottom navigation or collapsible sidebar.

Task creation and editing must work comfortably on mobile.

---

# Keyboard Shortcuts

Add useful shortcuts:

`N` → New task

`P` → New project

`/` → Search

`Ctrl + K` → Global search

`Esc` → Close modal

Keep shortcuts optional and avoid interfering with normal typing.

---

# Performance

The application should be lightweight.

Use:

* Server Components
* Server Actions
* Prisma
* Database indexes
* Pagination where necessary
* Optimistic UI for task completion
* Minimal client-side JavaScript

Do not use a large state-management library unless genuinely necessary.

---

# Error Handling

Implement:

* Loading states
* Skeletons
* Empty states
* Error states
* Form validation
* Confirmation dialogs for destructive actions
* Toast notifications

Examples:

"No projects yet"

"You don't have any tasks due today."

"No upcoming tasks."

---

# Empty States

Make empty states useful.

For example:

No projects:

"Create your first project to start organizing your work."

Button:

"Create Project"

No tasks:

"No tasks yet."

Button:

"Add Task"

---

# Admin / Management

There is no need for a separate enterprise admin panel.

This is a personal productivity application.

The authenticated user effectively manages their own projects and tasks.

Create a simple Settings page for:

* Profile
* Theme
* Account
* Data management

---

# Data Management

Add:

Export Data

Allow exporting:

* Projects
* Tasks
* Activity

as JSON or CSV.

Also provide:

Delete Account

with confirmation.

---

# Vercel Deployment

The application must be deployment-ready for Vercel.

Use environment variables:

DATABASE_URL

DIRECT_URL

AUTH_SECRET

AUTH_URL

Optional:

GOOGLE_CLIENT_ID

GOOGLE_CLIENT_SECRET

Create:

`.env.example`

Never commit secrets.

---

# Project Structure

Use a clean structure similar to:

app/
(dashboard)/
page.tsx
projects/
today/
upcoming/
completed/
settings/

auth/
login/
register/

components/
dashboard/
projects/
tasks/
layout/
ui/

actions/
projects.ts
tasks.ts
activity.ts

lib/
db.ts
auth.ts
validations/
utils/

prisma/
schema.prisma
seed.ts

---

# Development Approach

Build this incrementally.

## Phase 1

Set up:

* Next.js
* TypeScript
* Tailwind
* shadcn/ui
* Prisma
* Neon
* Authentication

## Phase 2

Create database schema and migrations.

## Phase 3

Build Projects CRUD.

## Phase 4

Build Tasks CRUD.

## Phase 5

Build Project Details with task management.

## Phase 6

Add drag-and-drop.

## Phase 7

Build Dashboard.

## Phase 8

Build Today and Upcoming views.

## Phase 9

Add search and filters.

## Phase 10

Add activity tracking.

## Phase 11

Add dark mode and responsive design.

## Phase 12

Polish UI and optimize performance.

## Phase 13

Deploy to Vercel.

---

# Important

Do NOT turn this into Jira.

Do NOT add:

* Teams
* Workspaces
* Complex permissions
* Enterprise roles
* Chat
* Real-time collaboration
* Video calls
* Complex reporting
* Gantt charts
* Sprints
* Story points
* Complicated notifications

The goal is a **fast personal project/task manager that I can open every day and immediately know what I need to work on.**

Prioritize simplicity, speed, clean UI, and excellent task management.

Before implementing each phase, inspect the existing codebase and reuse existing components and utilities instead of creating duplicates.

After each phase, verify that the application builds successfully and that the implemented functionality works before moving to the next phase.
