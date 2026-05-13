const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { syncWallet, triggerFullSync } = require('../walletService');
const { verifyAdmin, JWT_SECRET } = require('../middleware/auth');

// skip auth only for the login route itself, everything else requires a valid token
router.use((req, res, next) => {
    if (req.path === '/login' && req.method === 'POST') return next();
    verifyAdmin(req, res, next);
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    try {
        const result = await db.query('SELECT * FROM admins WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const admin = result.rows[0];
        const isValid = await bcrypt.compare(password, admin.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ role: 'admin', username: admin.username }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ success: true, token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login error' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.id, u.first_name, u.last_name, u.email,
                   lc.points_balance, lc.tier, lc.qr_code_token, b.name as home_branch
            FROM users u
            JOIN loyalty_cards lc ON u.id = lc.user_id
            LEFT JOIN branches b ON u.home_branch_id = b.id
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Admin API error' });
    }
});

router.post('/update-user', async (req, res) => {
    const { userId, points, tier } = req.body;
    if (!userId || points === undefined || !tier) {
        return res.status(400).json({ error: 'userId, points, and tier are required' });
    }
    try {
        await db.query('BEGIN');
        await db.query(
            'UPDATE loyalty_cards SET points_balance = $1, tier = $2 WHERE user_id = $3',
            [points, tier, userId]
        );
        await db.query('COMMIT');
        res.json({ success: true });

        // fire wallet sync after the response so admin doesn't wait for Google API
        const emailRes = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
        if (emailRes.rows.length > 0) {
            setImmediate(() => {
                triggerFullSync(emailRes.rows[0].email).catch(e => console.error('Wallet sync error:', e));
            });
        }
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Admin update error:', err);
        res.status(500).json({ error: 'Update error' });
    }
});

router.get('/vouchers', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM voucher_templates ORDER BY cost ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching vouchers' });
    }
});

router.post('/vouchers', async (req, res) => {
    const { title, description, cost, discount_type, discount_value, image_url, is_crew_only, valid_duration_days } = req.body;
    if (!title || !description || cost === undefined) {
        return res.status(400).json({ error: 'title, description, and cost are required' });
    }
    try {
        const result = await db.query(`
            INSERT INTO voucher_templates (title, description, cost, discount_type, discount_value, image_url, is_crew_only, valid_duration_days)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `, [title, description, cost, discount_type, discount_value, image_url, is_crew_only, valid_duration_days || 30]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating voucher' });
    }
});

router.put('/vouchers/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, cost, discount_type, discount_value, image_url, is_crew_only, valid_duration_days } = req.body;
    try {
        const result = await db.query(`
            UPDATE voucher_templates
            SET title=$1, description=$2, cost=$3, discount_type=$4, discount_value=$5, image_url=$6, is_crew_only=$7, valid_duration_days=$8
            WHERE id=$9 RETURNING *
        `, [title, description, cost, discount_type, discount_value, image_url, is_crew_only, valid_duration_days, id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Voucher not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

router.delete('/vouchers/:id', async (req, res) => {
    try {
        await db.query('BEGIN');

        const templateRes = await db.query(
            'SELECT cost, title FROM voucher_templates WHERE id = $1',
            [req.params.id]
        );
        if (templateRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Voucher template not found' });
        }
        const { cost, title } = templateRes.rows[0];

        // only refund users who bought it — gifted vouchers don't cost points so no refund needed
        const activeRes = await db.query(`
            SELECT uv.id, lc.id as card_id, u.email
            FROM user_vouchers uv
            JOIN users u ON uv.user_id = u.id
            JOIN loyalty_cards lc ON u.id = lc.user_id
            WHERE uv.template_id = $1 AND uv.status = 'active' AND uv.source = 'purchased'
        `, [req.params.id]);

        for (const row of activeRes.rows) {
            await db.query(
                'UPDATE loyalty_cards SET points_balance = points_balance + $1 WHERE id = $2',
                [cost, row.card_id]
            );
            await db.query(
                'INSERT INTO point_logs (loyalty_card_id, amount, reason) VALUES ($1, $2, $3)',
                [row.card_id, cost, `Refund: "${title}" was removed by admin`]
            );
        }

        // delete user_vouchers first — template delete would fail due to FK constraint otherwise
        await db.query('DELETE FROM user_vouchers WHERE template_id = $1', [req.params.id]);
        await db.query('DELETE FROM voucher_templates WHERE id = $1', [req.params.id]);

        await db.query('COMMIT');

        // sync wallets after commit so the new balance shows up in Google Wallet
        for (const row of activeRes.rows) {
            triggerFullSync(row.email).catch(e => console.error('Wallet sync after refund:', e));
        }

        res.json({ success: true, refunded: activeRes.rows.length });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
});

router.post('/vouchers/assign-bulk', async (req, res) => {
    const { templateId, segment } = req.body;

    try {
        await db.query('BEGIN');

        const templateRes = await db.query('SELECT * FROM voucher_templates WHERE id = $1', [templateId]);
        if (templateRes.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Template not found' });
        }
        const template = templateRes.rows[0];
        const durationDays = parseInt(template.valid_duration_days, 10) || 30;

        // segment filters are all optional, build the WHERE clause only for ones that are set
        const queryParts = [];
        const values = [];
        let counter = 1;

        if (segment.gender && segment.gender !== 'all') {
            queryParts.push(`u.gender = $${counter++}`);
            values.push(segment.gender);
        }
        if (segment.tier && segment.tier !== 'all') {
            queryParts.push(`lc.tier = $${counter++}`);
            values.push(segment.tier);
        }
        if (segment.branchId && segment.branchId !== 'all') {
            queryParts.push(`u.home_branch_id = $${counter++}`);
            values.push(segment.branchId);
        } else if (segment.city && segment.city !== 'all') {
            queryParts.push(`r.name = $${counter++}`);
            values.push(segment.city);
        } else if (segment.country && segment.country !== 'all') {
            queryParts.push(`r.country = $${counter++}`);
            values.push(segment.country);
        }

        const whereClause = queryParts.length > 0 ? 'WHERE ' + queryParts.join(' AND ') : '';

        const usersRes = await db.query(`
            SELECT u.id, u.email FROM users u
            JOIN loyalty_cards lc ON u.id = lc.user_id
            JOIN branches b ON u.home_branch_id = b.id
            JOIN regions r ON b.region_id = r.id
            ${whereClause}
        `, values);

        for (const user of usersRes.rows) {
            // parameterized interval — can't concat this directly or postgres complains
            await db.query(`
                INSERT INTO user_vouchers (user_id, template_id, status, source, expires_at)
                VALUES ($1, $2, 'active', 'gifted', NOW() + ($3 * INTERVAL '1 day'))
            `, [user.id, templateId, durationDays]);

            triggerFullSync(user.email).catch(e => console.error('Wallet sync error:', e));
        }

        await db.query('COMMIT');
        res.json({ success: true, count: usersRes.rows.length });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Assignment failed' });
    }
});

router.get('/branches-full', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT b.id, b.name, b.address, r.name as city, r.country, b.region_id
            FROM branches b
            JOIN regions r ON b.region_id = r.id
            ORDER BY r.country, r.name, b.name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching branches' });
    }
});

router.post('/branches/save', async (req, res) => {
    const { id, name, address, city, country } = req.body;
    if (!name || !address || !city || !country) {
        return res.status(400).json({ error: 'name, address, city, and country are required' });
    }
    try {
        await db.query('BEGIN');

        // regions are shared — find existing one or create it if this is a new city
        let regionRes = await db.query(
            'SELECT id FROM regions WHERE name = $1 AND country = $2',
            [city, country]
        );
        let regionId;
        if (regionRes.rows.length === 0) {
            const newRegion = await db.query(
                'INSERT INTO regions (name, country) VALUES ($1, $2) RETURNING id',
                [city, country]
            );
            regionId = newRegion.rows[0].id;
        } else {
            regionId = regionRes.rows[0].id;
        }

        if (id) {
            await db.query(
                'UPDATE branches SET name=$1, address=$2, region_id=$3 WHERE id=$4',
                [name, address, regionId, id]
            );
        } else {
            await db.query(
                'INSERT INTO branches (name, address, region_id) VALUES ($1, $2, $3)',
                [name, address, regionId]
            );
        }

        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error saving branch' });
    }
});

router.delete('/branches/:id', async (req, res) => {
    try {
        const userCheck = await db.query(
            'SELECT id FROM users WHERE home_branch_id = $1 LIMIT 1',
            [req.params.id]
        );
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete branch: users are still assigned to this location' });
        }
        await db.query('DELETE FROM branches WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
});

router.get('/stats-summary', async (req, res) => {
    try {
        const [genderRes, tierRes, branchRes, growthRes, ecoRes, voucherStats, avgPoints, avgAgeRes, topBranch, totalUsersRes, countryRes, cityRes, ageRes] = await Promise.all([
            db.query('SELECT gender, COUNT(*) as count FROM users GROUP BY gender'),
            db.query(`
                SELECT tier, COUNT(*) as count FROM loyalty_cards GROUP BY tier
                ORDER BY CASE WHEN tier='STANDARD' THEN 1 WHEN tier='SILVER' THEN 2 WHEN tier='GOLD' THEN 3 WHEN tier='CREW' THEN 4 ELSE 5 END
            `),
            db.query(`
                SELECT b.name, COUNT(u.id) as count FROM branches b
                LEFT JOIN users u ON b.id = u.home_branch_id
                GROUP BY b.name ORDER BY count DESC
            `),
            db.query(`
                SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
                FROM users WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY date ORDER BY date ASC
            `),
            db.query(`
                SELECT
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as earned,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as burned
                FROM point_logs
            `),
            db.query(`
                SELECT COUNT(*) as total,
                    COUNT(CASE WHEN status = 'used' THEN 1 END) as used,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active
                FROM user_vouchers
            `),
            db.query('SELECT AVG(points_balance) as avg FROM loyalty_cards'),
            db.query(`SELECT ROUND(AVG(date_part('year', age(birth_date)))) as avg FROM users WHERE birth_date IS NOT NULL`),
            db.query(`
                SELECT b.name FROM branches b
                JOIN users u ON b.id = u.home_branch_id
                GROUP BY b.name ORDER BY COUNT(u.id) DESC LIMIT 1
            `),
            db.query('SELECT COUNT(*) as count FROM users'),
            db.query(`
                SELECT r.country, COUNT(u.id) as count
                FROM users u
                JOIN branches b ON u.home_branch_id = b.id
                JOIN regions r ON b.region_id = r.id
                WHERE r.country IS NOT NULL
                GROUP BY r.country ORDER BY count DESC
            `),
            db.query(`
                SELECT r.name as city, COUNT(u.id) as count
                FROM users u
                JOIN branches b ON u.home_branch_id = b.id
                JOIN regions r ON b.region_id = r.id
                WHERE r.name IS NOT NULL
                GROUP BY r.name ORDER BY count DESC
            `),
            db.query(`
                SELECT
                    CASE
                        WHEN date_part('year', age(birth_date)) < 18 THEN 'Under 18'
                        WHEN date_part('year', age(birth_date)) BETWEEN 18 AND 24 THEN '18-24'
                        WHEN date_part('year', age(birth_date)) BETWEEN 25 AND 34 THEN '25-34'
                        WHEN date_part('year', age(birth_date)) BETWEEN 35 AND 44 THEN '35-44'
                        ELSE '45+'
                    END as age_group,
                    COUNT(*) as count,
                    CASE
                        WHEN date_part('year', age(birth_date)) < 18 THEN 1
                        WHEN date_part('year', age(birth_date)) BETWEEN 18 AND 24 THEN 2
                        WHEN date_part('year', age(birth_date)) BETWEEN 25 AND 34 THEN 3
                        WHEN date_part('year', age(birth_date)) BETWEEN 35 AND 44 THEN 4
                        ELSE 5
                    END as sort_order
                FROM users WHERE birth_date IS NOT NULL
                GROUP BY age_group, sort_order ORDER BY sort_order ASC
            `)
        ]);

        res.json({
            totalUsers: totalUsersRes.rows[0].count,
            gender: genderRes.rows,
            tiers: tierRes.rows,
            branches: branchRes.rows,
            growth: growthRes.rows,
            economy: ecoRes.rows[0],
            vouchers: voucherStats.rows[0],
            ageGroups: ageRes.rows,
            avgAge: avgAgeRes.rows[0].avg || 0,
            avgPoints: Math.round(avgPoints.rows[0].avg || 0),
            topBranch: topBranch.rows[0]?.name || 'N/A',
            countries: countryRes.rows,
            cities: cityRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Stats error' });
    }
});

module.exports = router;
