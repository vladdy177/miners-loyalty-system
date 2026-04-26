const express = require("express");
const cors = require("cors");
const db = require("./config/db");
require("dotenv").config();

// 1. Initialize the app (THIS MUST COME FIRST)
const app = express();
const PORT = process.env.PORT || 5000;

// 2. Middleware (Tells the app how to handle data)
app.use(cors());
app.use(express.json()); // Essential for reading the JSON we send from Postman

// 3. Basic Test Routes
app.get("/", (req, res) => {
  res.send("The Miners Loyalty API is running...");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM branches WHERE name = $1", [
      "Letná",
    ]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error connecting to Database");
  }
});

// 4. Registration Route (The "Logic")
app.post("/api/register", async (req, res) => {
  const { email, firstName, lastName, gender, birthDate, homeBranchId } =
    req.body;

  if (!email || !firstName || !homeBranchId) {
    return res
      .status(400)
      .json({
        error: "Missing required fields (email, firstName, or branchId)",
      });
  }

  try {
    await db.query("BEGIN"); // Start a transaction

    // Insert the User
    const userQuery = `
      INSERT INTO users (email, first_name, last_name, gender, birth_date, home_branch_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const userValues = [
      email,
      firstName,
      lastName,
      gender,
      birthDate,
      homeBranchId,
    ];
    const userResult = await db.query(userQuery, userValues);
    const userId = userResult.rows[0].id;

    // Create the Loyalty Card automatically
    const qrToken = `MINERS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const cardQuery = `
      INSERT INTO loyalty_cards (user_id, points_balance, qr_code_token, tier)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const cardValues = [userId, 0, qrToken, "Standard"];
    const cardResult = await db.query(cardQuery, cardValues);

    await db.query("COMMIT"); // Success!

    res.status(201).json({
      message: "Registration successful!",
      user: { id: userId, email },
      card: cardResult.rows[0],
    });
  } catch (err) {
    await db.query("ROLLBACK"); // Error! Undo everything.

    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already registered." });
    }

    console.error(err.message);
    res.status(500).send("Server Error during registration");
  }
});

// 5. Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});


// --- GET USER PROFILE ---
// This allows the frontend to fetch a user's points and QR code using their email
app.get('/api/user/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const query = `
      SELECT 
        users.first_name, 
        users.last_name, 
        loyalty_cards.points_balance, 
        loyalty_cards.qr_code_token, 
        loyalty_cards.tier,
        branches.name as home_branch
      FROM users
      JOIN loyalty_cards ON users.id = loyalty_cards.user_id
      JOIN branches ON users.home_branch_id = branches.id
      WHERE users.email = $1
    `;

    const result = await db.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error fetching profile");
  }
});

// --- GET ALL BRANCHES ---
app.get('/api/branches', async (req, res) => {
  try {
    // We must use JOIN to get data from the 'regions' table
    const query = `
      SELECT 
        branches.id, 
        branches.name, 
        regions.name as city, 
        regions.country 
      FROM branches
      JOIN regions ON branches.region_id = regions.id
      WHERE branches.is_active = true
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});