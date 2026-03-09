# 🚀 SemiLab - Next-Generation Laboratory Management System

**Status:** MVP Development Sprint (Day 1/7)
**Goal:** Deploy a superior iLab alternative in 7 days
**Launch Date:** March 16, 2026

---

## 📋 Quick Start (Development)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Setup (5 minutes)

1. **Start database:**
```bash
docker-compose up -d
```

2. **Install dependencies:**
```bash
cd src/backend
npm install
```

3. **Setup environment:**
```bash
cp .env.example .env
```

4. **Run migrations:**
```bash
npx prisma migrate dev --name init
```

5. **Start server:**
```bash
npm run start:dev
```

Server runs on `http://localhost:3000`

---

## 📊 Project Status (Day 1)

### ✅ Completed
- NestJS backend initialized
- PostgreSQL schema designed
- Authentication system (JWT + bcrypt)
- Login/signup/logout endpoints
- Prisma ORM configured

### ⏳ In Progress (Day 2-7)
- Equipment management API
- Scheduling with conflict detection
- Inventory management
- React frontend UI
- Integration testing
- Deployment

---

## 🎯 API Endpoints (So Far)

### Authentication
```
POST   /api/auth/signup       - Create new account
POST   /api/auth/login        - Login with email/password
POST   /api/auth/logout       - Logout (requires token)
GET    /api/auth/me           - Get current user info
```

### Example: Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Response:
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🗂️ Project Structure

```
SemiLab/
├── docker-compose.yml         # Database + Redis
├── src/
│   └── backend/
│       ├── src/
│       │   ├── auth/          # Authentication module
│       │   ├── equipment/      # (Stub - Day 2)
│       │   ├── schedule/       # (Stub - Day 3)
│       │   ├── inventory/      # (Stub - Day 4)
│       │   ├── prisma/         # Database layer
│       │   ├── app.module.ts   # Main app module
│       │   └── main.ts         # Entry point
│       ├── prisma/
│       │   └── schema.prisma   # Database schema
│       ├── package.json
│       └── tsconfig.json
│
├── (frontend coming Day 5)
└── (documentation)
```

---

## 🛠️ Development Commands

```bash
# Development server with auto-reload
npm run start:dev

# Build for production
npm run build

# Run production server
npm run start:prod

# Run tests
npm test

# Database migrations
npx prisma migrate dev --name <migration-name>
npx prisma studio                  # Open GUI for database

# Code formatting
npm run format
npm run lint
```

---

## 📈 MVP Features (7-Day Plan)

| Feature | Day | Status |
|---------|-----|--------|
| Backend setup | 1 | ✅ Done |
| Auth system | 1 | ✅ Done |
| Equipment API | 2 | ⏳ Next |
| Scheduling | 3 | ⏳ Planned |
| Inventory | 4 | ⏳ Planned |
| Frontend UI | 5 | ⏳ Planned |
| Testing | 6 | ⏳ Planned |
| Deploy | 7 | ⏳ Planned |

---

## 🔐 Security

- ✅ Password hashing (bcrypt with salt)
- ✅ JWT authentication
- ✅ CORS enabled
- ✅ Input validation
- ✅ Environment variables for secrets

---

## 📞 Architecture

For detailed architecture, see `docs/ARCHITECTURE.md`
For decisions made, see `docs/DECISIONS.md`

---

## 🚀 Next Steps

**Day 2:** Equipment CRUD API and endpoints

**Day 3:** Scheduling engine with conflict detection

**Day 4:** Inventory management and checkout/checkin

**Day 5:** React frontend UI

**Day 6:** Integration testing and bug fixes

**Day 7:** Deployment to cloud

---

## 📅 Build Timeline

Built with ❤️ using:
- Node.js + NestJS
- PostgreSQL + Prisma
- JWT Authentication
- React (coming Day 5)

**Status:** MVP Sprint in progress
**Next Update:** Day 2 evening
