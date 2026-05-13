const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { triggerFullSync } = require('../walletService');

router.get('/rewards', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM voucher_templates ORDER BY cost ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching catalog' });
    }
});

router.post('/purchase', async (req, res) => {
    const { email, rewardId } = req.body;
    if (!email || !rewardId) {
        return res.status(400).json({ error: 'email and rewardId are required' });
    }

    try {
        await db.query('BEGIN');

        // lock the row — without this two concurrent purchases can both pass the points check
        const userRes = await db.query(`
            SELECT lc.id as card_id, u.id as user_id, lc.points_balance, lc.tier
            FROM users u
            JOIN loyalty_cards lc ON u.id = lc.user_id
            WHERE u.email = $1
            FOR UPDATE OF lc
        `, [email]);

        if (userRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];

        const rewardRes = await db.query('SELECT * FROM voucher_templates WHERE id = $1', [rewardId]);
        if (rewardRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Reward not found' });
        }
        const reward = rewardRes.rows[0];

        // all checks before any writes — rollback doesn't undo a half-written state cleanly

        if (user.points_balance < reward.cost) {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient points' });
        }

        if (reward.title.includes('STATUS')) {
            const targetTier = reward.title.split(' ')[0];

            if (targetTier === 'SILVER' && user.tier !== 'STANDARD') {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'Upgrade to SILVER is only available for STANDARD members' });
            }
            if (targetTier === 'GOLD' && user.tier !== 'SILVER') {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'You must unlock SILVER before purchasing GOLD' });
            }
            if (user.tier === 'GOLD') {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'You have already reached the maximum tier' });
            }
        }


        if (reward.title.includes('STATUS')) {
            const tierName = reward.title.split(' ')[0];
            await db.query('UPDATE loyalty_cards SET tier = $1 WHERE id = $2', [tierName, user.card_id]);
        } else {
            const durationDays = reward.valid_duration_days || 30;
            await db.query(`
                INSERT INTO user_vouchers (user_id, template_id, status, source, expires_at)
                VALUES ($1, $2, 'active', 'purchased', NOW() + ($3 * INTERVAL '1 day'))
            `, [user.user_id, reward.id, durationDays]);
        }

        await db.query(
            'UPDATE loyalty_cards SET points_balance = points_balance - $1 WHERE id = $2',
            [reward.cost, user.card_id]
        );

        await db.query(
            'INSERT INTO point_logs (loyalty_card_id, amount, reason) VALUES ($1, $2, $3)',
            [user.card_id, -reward.cost, `Purchased: ${reward.title}`]
        );

        await db.query('COMMIT');

        res.json({ success: true, message: `Purchased ${reward.title}!` });
        setImmediate(() => { triggerFullSync(email); });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Transaction failed' });
    }
});

module.exports = router;
