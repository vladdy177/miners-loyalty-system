const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/users',    require('./routes/userRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));
app.use('/api/loyalty',  require('./routes/loyaltyRoutes'));

app.get('/', (req, res) => res.send('The Miners Loyalty API is running...'));

module.exports = app;
