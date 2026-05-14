const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Public list of active coffee shop locations
 */

/**
 * @swagger
 * /api/branches:
 *   get:
 *     summary: Get all active branch locations
 *     tags: [Branches]
 *     description: Returns every active branch with its city and country. Used to populate the registration form dropdowns.
 *     responses:
 *       200:
 *         description: List of branches
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Branch'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
