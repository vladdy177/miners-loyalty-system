# The Miners Coffee — Loyalty System

Bachelor's thesis project by Vladimir Mashkin, CTU FEL 2026.

## Live Demo

**Application:** https://miners-loyalty-system-1.onrender.com  
**Admin panel:** https://miners-loyalty-system-1.onrender.com/admin  
**API documentation (Swagger):** https://miners-loyalty-system-1.onrender.com/api-docs

> Note: the server runs on Render.com free tier and may take ~30 seconds to wake up on first request.

> **Google Wallet limitation:** the integration runs in test mode. The "Add to Google Wallet" button only works for Google accounts that are explicitly added as test users in the Google Pay & Wallet Console. Accounts not on that list will receive an error when attempting to save the card. This is a restriction of the Google Wallet API in development mode and does not affect any other functionality.

**Admin credentials for review:**
- Username: `admin`
- Password: `password123`

---

## Project Structure

```
BP/
├── client/   # React 19 + Vite frontend
└── server/   # Node.js + Express 5 backend
```

## Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend

```bash
cd server
npm install
```

Create a `.env` file in `server/`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=miners_loyalty
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret
```

Set up the database:

```bash
psql -U postgres -c "CREATE DATABASE miners_loyalty;"
psql -U postgres -d miners_loyalty -f scripts/setup.sql
```

Start the server:

```bash
npm start
```

The API will be available at `http://localhost:5000`.  
Swagger UI: `http://localhost:5000/api-docs`

### Frontend

```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Running Tests

```bash
cd server
npm test
```

42 tests across 3 files (unit + integration + voucher logic).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TailwindCSS, Chart.js |
| Backend | Node.js, Express 5, PostgreSQL |
| Auth | JWT, bcryptjs |
| Wallet | Google Wallet API |
| Tests | Jest, Supertest |
| Docs | Swagger / OpenAPI 3.0 |
