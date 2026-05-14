const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { generateGoogleWalletLink } = require('../walletService');
const { triggerFullSync } = require('../walletService');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Customer registration, profile, vouchers and wallet
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new customer
 *     tags: [Users]
 *     description: Creates a user account and a loyalty card with a unique QR token. Tier starts at STANDARD with 0 points.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, homeBranchId]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jan.novak@email.cz
 *               firstName:
 *                 type: string
 *                 example: Jan
 *               lastName:
 *                 type: string
 *                 example: Novák
 *               gender:
 *                 type: string
 *                 enum: [male, female, other, unspecified]
 *                 default: unspecified
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 example: "1995-03-15"
 *               homeBranchId:
 *                 type: string
 *                 format: uuid
 *                 example: "a4fdd054-9c40-4ae1-97de-711bf19c96d6"
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Success }
 *                 email:   { type: string, example: jan.novak@email.cz }
 *       400:
 *         description: Missing required fields or email already taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', async (req, res) => {
    const { email, firstName, lastName, gender, birthDate, homeBranchId } = req.body;

    if (!email || !firstName || !homeBranchId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.query('BEGIN');
        const userResult = await db.query(
            'INSERT INTO users (email, first_name, last_name, gender, birth_date, home_branch_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [email, firstName, lastName, gender, birthDate, homeBranchId]
        );
        const userId = userResult.rows[0].id;

        // use cryptographically secure random bytes instead of Math.random()
        const qrToken = `MINERS-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

        await db.query(
            'INSERT INTO loyalty_cards (user_id, points_balance, qr_code_token, tier) VALUES ($1, 0, $2, $3)',
            [userId, qrToken, 'STANDARD']
        );

        await db.query('COMMIT');
        res.status(201).json({ message: 'Success', email });
    } catch (err) {
        await db.query('ROLLBACK');
        if (err.code === '23505') return res.status(400).json({ error: 'Email exists' });
        res.status(500).json({ error: 'Server Error' });
    }
});

/**
 * @swagger
 * /api/users/profile/{email}:
 *   get:
 *     summary: Get customer profile and loyalty card data
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         example: jan.novak@email.cz
 *     responses:
 *       200:
 *         description: Profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile/:email', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.first_name, u.last_name, lc.points_balance, lc.qr_code_token, lc.tier, b.name as home_branch
            FROM users u
            JOIN loyalty_cards lc ON u.id = lc.user_id
            JOIN branches b ON u.home_branch_id = b.id
            WHERE u.email = $1
        `, [req.params.email]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

/**
 * @swagger
 * /api/users/my-vouchers/{email}:
 *   get:
 *     summary: Get all vouchers belonging to a customer
 *     tags: [Users]
 *     description: Returns both active and used vouchers, sorted by status then expiry date.
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: List of vouchers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserVoucher'
 */
router.get('/my-vouchers/:email', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT uv.id, vt.title, vt.description, vt.image_url, uv.expires_at, uv.status, uv.redeemed_at
            FROM user_vouchers uv
            JOIN voucher_templates vt ON uv.template_id = vt.id
            JOIN users u ON uv.user_id = u.id
            WHERE u.email = $1
            ORDER BY uv.status ASC, uv.expires_at ASC
        `, [req.params.email]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching vouchers' });
    }
});

/**
 * @swagger
 * /api/users/redeem-voucher:
 *   post:
 *     summary: Redeem (mark as used) an active voucher
 *     tags: [Users]
 *     description: >
 *       Marks the voucher as used. If the voucher title contains "STATUS"
 *       (e.g. "SILVER STATUS"), it also upgrades the customer's tier.
 *       The sequential tier rule is enforced: STANDARD → SILVER → GOLD only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [voucherId, email]
 *             properties:
 *               voucherId:
 *                 type: string
 *                 format: uuid
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Used to verify ownership — only the voucher's owner can redeem it
 *     responses:
 *       200:
 *         description: Voucher redeemed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:     { type: boolean, example: true }
 *                 tierUpgraded: { type: boolean, example: false }
 *       400:
 *         description: Tier sequence violation (e.g. trying to redeem GOLD STATUS without SILVER)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Voucher not found or does not belong to this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/redeem-voucher', async (req, res) => {
    const { voucherId, email } = req.body;
    if (!voucherId || !email) {
        return res.status(400).json({ error: 'voucherId and email are required' });
    }
    try {
        // fetch voucher with template title and current tier for upgrade validation
        const ownerCheck = await db.query(`
            SELECT uv.id, vt.title, lc.tier, lc.id as card_id
            FROM user_vouchers uv
            JOIN users u ON uv.user_id = u.id
            JOIN loyalty_cards lc ON u.id = lc.user_id
            JOIN voucher_templates vt ON uv.template_id = vt.id
            WHERE uv.id = $1 AND u.email = $2 AND uv.status = 'active'
        `, [voucherId, email]);

        if (ownerCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Voucher not found or access denied' });
        }

        const { title, tier, card_id } = ownerCheck.rows[0];
        const isUpgrade = title.includes('STATUS');

        await db.query('BEGIN');

        if (isUpgrade) {
            const targetTier = title.split(' ')[0];

            if (targetTier === 'SILVER' && tier !== 'STANDARD') {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'Upgrade to SILVER is only for STANDARD members' });
            }
            if (targetTier === 'GOLD' && tier !== 'SILVER') {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'You must unlock SILVER before upgrading to GOLD' });
            }
            if (tier === 'GOLD') {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'You have already reached the maximum tier' });
            }

            await db.query('UPDATE loyalty_cards SET tier = $1 WHERE id = $2', [targetTier, card_id]);
        }

        await db.query(
            "UPDATE user_vouchers SET status = 'used', redeemed_at = NOW() WHERE id = $1",
            [voucherId]
        );

        await db.query('COMMIT');

        triggerFullSync(email).catch(e => console.error('Sync after redeem failed', e));
        res.json({ success: true, tierUpgraded: isUpgrade });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Redemption failed' });
    }
});

/**
 * @swagger
 * /api/users/wallet/google/{email}:
 *   get:
 *     summary: Generate a "Save to Google Wallet" link for a customer
 *     tags: [Users]
 *     description: >
 *       Returns a signed JWT URL that, when opened on Android, adds the loyalty card
 *       to Google Wallet. The card displays the customer's name, current points and tier banner.
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: Google Wallet save URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 saveUrl:
 *                   type: string
 *                   example: "https://pay.google.com/gp/v/save/<jwt>"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/wallet/google/:email', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.*, lc.*, b.name as home_branch
            FROM users u
            JOIN loyalty_cards lc ON u.id = lc.user_id
            JOIN branches b ON u.home_branch_id = b.id
            WHERE u.email = $1
        `, [req.params.email]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const token = generateGoogleWalletLink(result.rows[0]);
        res.json({ saveUrl: `https://pay.google.com/gp/v/save/${token}` });
    } catch (err) {
        res.status(500).json({ error: 'Wallet Error' });
    }
});

module.exports = router;
