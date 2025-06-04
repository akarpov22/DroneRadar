# Drone Radar

**Drone Radar** — це вебплатформа для відображення польотів дронів у реальному часі, перегляду треків, зон обмежень та іншої навігаційної інформації.

## 🔧 Технології

### Frontend
- React
- TypeScript
- Chakra UI
- Apollo Client
- i18next (багатомовність)

### Backend
- Node.js
- TypeScript
- Apollo Server (GraphQL)
- Prisma ORM
- PostgreSQL

## 🚀 Запуск локально

### DataBase

```bash
docker-compose up -d
```

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```