const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/branches
router.get('/', async (req, res) => {
    try {
        const query = `
      SELECT branches.id, branches.name, regions.name as city, regions.country 
      FROM branches
      JOIN regions ON branches.region_id = regions.id
      WHERE branches.is_active = true
    `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

module.exports = router;