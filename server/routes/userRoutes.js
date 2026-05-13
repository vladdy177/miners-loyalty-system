const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { generateGoogleWalletLink } = require('../walletService');
const { triggerFullSync } = require('../walletService');

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

        // Math.random() isn't safe enough for tokens, using crypto instead
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

router.post('/redeem-voucher', async (req, res) => {
    const { voucherId, email } = req.body;
    if (!voucherId || !email) {
        return res.status(400).json({ error: 'voucherId and email are required' });
    }
    try {
        // need the template title here to check if it's a tier upgrade voucher
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
