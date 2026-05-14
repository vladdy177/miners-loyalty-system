const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// interactive API docs — available at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/users',    require('./routes/userRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));
app.use('/api/loyalty',  require('./routes/loyaltyRoutes'));

app.get('/', (req, res) => res.send('The Miners Loyalty API is running...'));

module.exports = app;
