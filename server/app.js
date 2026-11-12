const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const app = express();

// Render runs the app behind a reverse proxy — trust the first hop so req.ip
// is the real client IP (otherwise the login rate limiter sees one shared IP)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// only the frontend may call the API from a browser; CORS_ORIGIN is a
// comma-separated list, falling back to the known dev + production frontends
const allowedOrigins = (process.env.CORS_ORIGIN
    || 'http://localhost:5173,https://miners-loyalty-system-1.onrender.com')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// interactive API docs — available at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/users',    require('./routes/userRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));
app.use('/api/loyalty',  require('./routes/loyaltyRoutes'));

app.get('/', (req, res) => res.send('The Miners Loyalty API is running...'));

module.exports = app;
