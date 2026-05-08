const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { triggerFullSync } = require('../walletService');

// Get list of available rewards in the "Shop"
router.get('/rewards', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM voucher_templates ORDER BY cost ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Error fetching catalog");
    }
});

// The "Purchase" Logic (Deduct points -> Add perk/voucher)
router.post('/purchase', async (req, res) => {
    const { email, rewardId } = req.body;

    try {
        await db.query('BEGIN');

        const userRes = await db.query(
            'SELECT lc.id as card_id, u.id as user_id, lc.points_balance, lc.tier FROM users u JOIN loyalty_cards lc ON u.id = lc.user_id WHERE u.email = $1',
            [email]
        );
        const user = userRes.rows[0];

        const rewardRes = await db.query('SELECT * FROM voucher_templates WHERE id = $1', [rewardId]);
        const reward = rewardRes.rows[0];

        if (user.points_balance < reward.cost) {
            return res.status(400).json({ error: "Insufficient points" });
        }

        // Deduct Points
        await db.query('UPDATE loyalty_cards SET points_balance = points_balance - $1 WHERE id = $2', [reward.cost, user.card_id]);

        // Grant Reward
        if (reward.title.includes('STATUS')) {
            const tierName = reward.title.split(' ')[0];
            await db.query('UPDATE loyalty_cards SET tier = $1 WHERE id = $2', [tierName, user.card_id]);
        } else {
            await db.query(
                'INSERT INTO user_vouchers (user_id, template_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
                [user.user_id, reward.id]
            );
        }

        await db.query('INSERT INTO point_logs (loyalty_card_id, amount, reason) VALUES ($1, $2, $3)',
            [user.card_id, -reward.cost, `Purchased: ${reward.title}`]);

        await db.query('COMMIT');

        
        res.json({ success: true, message: `Purchased ${reward.title}!` });
        setImmediate(() => {
            triggerFullSync(email);
        });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).send("Transaction failed");
    }
});

module.exports = router;