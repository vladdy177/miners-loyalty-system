const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { generateGoogleWalletLink } = require('../walletService');

// Registration (POST /api/users/register)
router.post('/register', async (req, res) => {
    const { email, firstName, lastName, gender, birthDate, homeBranchId } = req.body;

    if (!email || !firstName || !homeBranchId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        await db.query('BEGIN');
        const userResult = await db.query(
            'INSERT INTO users (email, first_name, last_name, gender, birth_date, home_branch_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [email, firstName, lastName, gender, birthDate, homeBranchId]
        );
        const userId = userResult.rows[0].id;
        const qrToken = `MINERS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        await db.query(
            'INSERT INTO loyalty_cards (user_id, points_balance, qr_code_token, tier) VALUES ($1, 0, $2, $3)',
            [userId, qrToken, 'STANDARD']
        );

        await db.query('COMMIT');
        res.status(201).json({ message: "Success", email });
    } catch (err) {
        await db.query('ROLLBACK');
        if (err.code === '23505') return res.status(400).json({ error: "Email exists" });
        res.status(500).send("Server Error");
    }
});

// User profile (GET /api/users/profile/:email)
router.get('/profile/:email', async (req, res) => {
    try {
        const query = `
      SELECT u.first_name, u.last_name, lc.points_balance, lc.qr_code_token, lc.tier, b.name as home_branch
      FROM users u
      JOIN loyalty_cards lc ON u.id = lc.user_id
      JOIN branches b ON u.home_branch_id = b.id
      WHERE u.email = $1
    `;
        const result = await db.query(query, [req.params.email]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// User Wallet (GET /api/users/wallet/google/:email)
router.get('/wallet/google/:email', async (req, res) => {
    try {
        const query = 'SELECT u.*, lc.* FROM users u JOIN loyalty_cards lc ON u.id = lc.user_id WHERE u.email = $1';
        const result = await db.query(query, [req.params.email]);
        if (result.rows.length === 0) return res.status(404).send('Not found');

        const token = generateGoogleWalletLink(result.rows[0]);
        res.json({ saveUrl: `https://pay.google.com/gp/v/save/${token}` });
    } catch (err) {
        res.status(500).send('Wallet Error');
    }
});

module.exports = router;