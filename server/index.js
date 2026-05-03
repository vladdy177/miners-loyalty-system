const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routs importing
const branchRoutes = require('./routes/branchRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');

// Connection
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/loyalty', loyaltyRoutes);

app.get("/", (req, res) => {
  res.send("The Miners Loyalty API is running...");
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});