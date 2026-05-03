const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all users for the dashboard
router.get('/users', async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.first_name, u.last_name, u.email, 
                   lc.points_balance, lc.tier, lc.qr_code_token
            FROM users u
            JOIN loyalty_cards lc ON u.id = lc.user_id
            ORDER BY u.created_at DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Admin API error");
    }
});

// Manual points or tier update
router.post('/update-user', async (req, res) => {
    const { userId, points, tier } = req.body; // Accepting absolute values now
    try {
        await db.query(
            'UPDATE loyalty_cards SET points_balance = $1, tier = $2 WHERE user_id = $3',
            [points, tier, userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Update error");
    }
});

// Get all voucher templates
router.get('/vouchers', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM voucher_templates ORDER BY cost ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Error fetching vouchers");
    }
});

// POST: Create new voucher
router.post('/vouchers', async (req, res) => {
    const { title, description, cost, discount_type, discount_value, image_url, is_crew_only } = req.body;
    try {
        const query = `
            INSERT INTO voucher_templates (title, description, cost, discount_type, discount_value, image_url, is_crew_only)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `;
        const result = await db.query(query, [title, description, cost, discount_type, discount_value, image_url, is_crew_only]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating voucher");
    }
});

// PUT: Edit existing voucher
router.put('/vouchers/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, cost, discount_type, discount_value, image_url, is_crew_only } = req.body;
    try {
        const query = `
            UPDATE voucher_templates 
            SET title=$1, description=$2, cost=$3, discount_type=$4, discount_value=$5, image_url=$6, is_crew_only=$7
            WHERE id=$8 RETURNING *
        `;
        const result = await db.query(query, [title, description, cost, discount_type, discount_value, image_url, is_crew_only, id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send("Update failed");
    }
});

// Delete a voucher
router.delete('/vouchers/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM voucher_templates WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).send("Delete failed (it might be linked to existing users)");
    }
});

module.exports = router;