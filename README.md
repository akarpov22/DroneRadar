# Drone Radar

**Drone Radar** — вебплатформа для відображення польотів дронів у реальному часі, перегляду треків, зон обмежень та іншої навігаційної інформації.

## Технології

### Frontend
- React, TypeScript, Chakra UI, Apollo Client, i18next

### Backend
- Node.js, TypeScript, Apollo Server (GraphQL), Prisma, PostgreSQL

### Телеметрія дронів
- **Eclipse Mosquitto** (MQTT broker) — єдина точка входу для дронів
- Backend підписується на broker, записує позиції в БД; клієнт отримує оновлення через GraphQL WebSocket

## Архітектура

```
Drone/Simulator  →  Mosquitto (MQTT)  →  Backend consumer  →  PostgreSQL
                                                              ↓ PG NOTIFY
Frontend  ←  GraphQL WS subscription  ←  pg-listener
Frontend  ↔  GraphQL HTTP  ↔  Backend (реєстрація дронів, зони, Auth0)
```

**Дрон** знає лише `MQTT_BROKER_URL`. Під час першої телеметрії з новим `serial` backend **автоматично реєструє** дрон і створює сесію.

**Пілот** може прив’язати дрон до облікового запису через `registerDrone` (GraphQL) за серійним номером.

## Локальний запуск (Docker)

```bash
docker-compose up -d --build
```

Сервіси:
- PostgreSQL — `localhost:5439`
- Mosquitto — `localhost:1883`
- Backend GraphQL — `http://localhost:4000/graphql`
- Frontend — `http://localhost:3000`

Simulator використовує `DRONE_SERIAL` з env. Дрон з’явиться в системі автоматично після першого надсилання координат.

## Запуск без Docker

### Mosquitto + PostgreSQL

```bash
docker-compose up -d postgres mosquitto
```

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

У `.env` backend додайте `MQTT_BROKER_URL=mqtt://localhost:1883`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Simulator

```bash
cd simulator
npm install
cp .env.example .env
npm start
```

Перед запуском достатньо вказати `MQTT_BROKER_URL` і `DRONE_SERIAL` у `.env`. Реєстрація в БД відбудеться під час першої телеметрії.

## MQTT-контракт

| Параметр | Значення |
|----------|----------|
| Topic | `droneradar/telemetry/{serial}` |
| Payload | `{ latitude, longitude, altitude?, heading?, speed?, timestamp, regionCode }` |
| `regionCode` | Код країни ISO 3166-1 alpha-2 (`UA`, `SE`), **обов'язковий** у кожному повідомленні |
| Авто-реєстрація | Новий `serial` → дрон + сесія в БД |
| Прив’язка до пілота | `registerDrone` в UI за серійним номером |

## Production

- Mosquitto хоститься окремо (не на Render)
- Backend: `MQTT_BROKER_URL`, `DATABASE_LISTEN_URL` (для PG NOTIFY)
- Mosquitto: `allow_anonymous false`, TLS, ACL за `serial`
