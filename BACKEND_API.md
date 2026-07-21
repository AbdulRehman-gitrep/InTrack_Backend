# Backend API Contract — InTrack Frontend

This document defines what the frontend expects from the backend API.

## Base URL

```
http://localhost:4000/api
```

## Authentication

All endpoints except `/auth/login` require a Bearer token:

```
Authorization: Bearer <token>
```

The token is obtained from the login response and stored by the frontend.

---

## Domain Types

```typescript
enum Role {
  ADMIN   = "admin"
  MANAGER = "manager"
  BUDDY   = "buddy"
  INTERN  = "intern"
}

interface User {
  id: string
  fullName: string
  email: string
  role: Role
  department: string
  isActive: boolean
  managerId: string | null
  buddyId: string | null
  internshipStart: string | null   // ISO date
  internshipEnd: string | null     // ISO date
  createdAt: string                 // ISO date
}

type TaskStatus = "assigned" | "in_progress" | "completed" | "pending"

interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  assigneeId: string
  createdBy: string
  createdAt: string   // ISO date
  dueDate: string     // ISO date
}

interface Attachment {
  id: string
  name: string
  type: "image" | "pdf" | "video"
  size: number           // bytes
  url?: string           // endpoint to download/view file
  thumbnailUrl?: string  // for image previews
  duration?: string      // for videos, e.g. "1:32"
}

interface Report {
  id: string
  internId: string
  title: string
  description: string
  attachments: Attachment[]
  status: "Pending" | "Reviewed"
  createdAt: string       // ISO datetime
}

interface Feedback {
  id: string
  fromId: string
  toId: string
  content: string
  createdAt: string       // ISO datetime
}
```

---

## Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET  | `/auth/me` | Get current user |

**POST /auth/login**

```json
// Request
{ "email": "string", "password": "string" }

// Response 200
{ "token": "string", "user": User }
```

**GET /auth/me**

```
// Response 200
User
```

---

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/users` | List all users |
| GET  | `/users/:id` | Get user by ID |
| POST | `/users` | Create user |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |

**POST /users**

```json
// Request
{
  "fullName": "string",
  "email": "string",
  "password": "string",
  "role": Role,
  "department": "string",
  "internshipStart": "string | null",  // ISO date
  "internshipEnd": "string | null"     // ISO date
}

// Response 201
User
```

**PATCH /users/:id**

```json
// Request
{
  "fullName": "string",
  "email": "string",
  "department": "string",
  "internshipStart": "string | null",
  "internshipEnd": "string | null"
}

// Response 200
User
```

Additional operations expected (may be separate endpoints or part of user update):
- Toggle active status (`isActive`)
- Assign role
- Assign manager (`managerId`)
- Assign buddy (`buddyId`)

---

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/tasks` | List all tasks |
| GET  | `/tasks/:id` | Get task by ID |
| POST | `/tasks` | Create task |
| PATCH | `/tasks/:id` | Update task status |

**POST /tasks**

```json
// Request
{
  "title": "string",
  "description": "string",
  "assigneeId": "string",
  "createdBy": "string",
  "dueDate": "string"   // ISO date
}

// Response 201
Task
```

**PATCH /tasks/:id**

```json
// Request
{ "status": TaskStatus }

// Response 200
Task
```

---

### Reports

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/reports` | List all reports |
| POST | `/reports` | Create a report |
| PATCH | `/reports/:id` | Update a report |
| DELETE | `/reports/:id` | Delete a report |
| PATCH | `/reports/:id/review` | Mark report as reviewed |

**GET /reports**

Query parameters (for filtering):
- `internId` — filter by intern
- `date` — filter by date (ISO date string)

```
// Response 200
Report[]
```

**POST /reports**

```json
// Request
{
  "internId": "string",
  "title": "string",
  "description": "string",
  "attachments": Attachment[]
}

// Response 201
Report
```

**PATCH /reports/:id**

```json
// Request
{
  "title": "string",
  "description": "string",
  "attachments": Attachment[]
}

// Response 200
Report
```

**DELETE /reports/:id**

```
// Response 200
{ "success": true }
```

**PATCH /reports/:id/review**

```
// Response 200
Report
```

---

### Feedback

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/feedback` | List all feedback |
| POST | `/feedback` | Create feedback |

**GET /feedback**

Query parameters:
- `userId` — filter by recipient or sender
- `type` — `"received"` or `"given"`

```
// Response 200
Feedback[]
```

**POST /feedback**

```json
// Request
{
  "fromId": "string",
  "toId": "string",
  "content": "string"
}

// Response 201
Feedback
```

---

### Dashboard / Stats

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/dashboard/admin` | Admin dashboard stats |
| GET  | `/dashboard/manager/:id` | Manager dashboard stats + per-intern progress |
| GET  | `/dashboard/buddy/:id` | Buddy dashboard stats + per-intern progress |
| GET  | `/dashboard/intern/:id` | Intern dashboard stats |

**GET /dashboard/admin**

```
// Response 200
{
  "totalUsers": number,
  "activeInterns": number,
  "departmentStats": [
    { "title": "Software Engineering", "count": number }
  ]
}
```

**GET /dashboard/manager/:id**

```
// Response 200
{
  "assignedInterns": number,
  "activeTasks": number,
  "pendingReports": number
}
```

Also returns per-intern progress (accepts ?interns=true or separate endpoint):

```
// Response 200 (separate or combined)
[
  {
    "intern": User,
    "tasksCompleted": number,
    "totalTasks": number,
    "reportsReviewed": number,
    "totalReports": number
  }
]
```

**GET /dashboard/buddy/:id**

```
// Response 200
{
  "assignedInterns": number,
  "pendingReports": number
}
```

Per-intern progress:

```
[
  {
    "intern": User,
    "reportsReviewed": number,
    "totalReports": number,
    "feedbackCount": number
  }
]
```

**GET /dashboard/intern/:id**

```
// Response 200
{
  "myTasks": Task[],
  "activeTasks": number,
  "reportsSubmitted": number,
  "feedbackReceived": number
}
```

---

## File Uploads

Reports support file attachments. The frontend currently keeps files in local state. When the backend is ready, files should be uploaded via multipart/form-data and return `Attachment` objects with `url` and `thumbnailUrl` fields.

Supported MIME types:
- Images: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- PDF: `application/pdf`
- Videos: `video/mp4`, `video/quicktime`, `video/webm`

Max files per report: **10**
Max file size: **50 MB**

---

## Error Response Format

```json
{
  "error": {
    "message": "string",
    "statusCode": number
  }
}
```

Common status codes:
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (insufficient role)
- `404` — Not found
- `422` — Validation error
- `500` — Internal server error
