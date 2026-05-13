const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { syncWallet, triggerFullSync } = require('../walletService')

// Admin login logic
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM admins WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

        const admin = result.rows[0];

        if (password === admin.password_hash) {
            res.json({ success: true, token: "mock-jwt-token" });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).send("Login error", err);
    }
});

// -- USER --

// Get all users for the dashboard
router.get('/users', async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.first_name, u.last_name, u.email, 
                   lc.points_balance, lc.tier, lc.qr_code_token, b.name as home_branch
            FROM users u
            JOIN loyalty_cards lc ON u.id = lc.user_id
            LEFT JOIN branches b ON u.home_branch_id = b.id
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
    const { userId, points, tier } = req.body;

    try {
        await db.query('BEGIN');

        // Updating the database
        await db.query(
            'UPDATE loyalty_cards SET points_balance = $1, tier = $2 WHERE user_id = $3',
            [points, tier, userId]
        );

        // Fetching the data needed to refresh the Google Wallet card
        const userQuery = `
            SELECT u.email, u.first_name, u.last_name, lc.points_balance, lc.tier, lc.qr_code_token 
            FROM users u 
            JOIN loyalty_cards lc ON u.id = lc.user_id 
            WHERE u.id = $1
        `;
        const userRes = await db.query(userQuery, [userId]);
        const userData = userRes.rows[0];

        // Fetching active vouchers
        const voucherQuery = `
            SELECT vt.title 
            FROM user_vouchers uv 
            JOIN voucher_templates vt ON uv.template_id = vt.id 
            WHERE uv.user_id = $1 AND uv.status = 'active'
        `;
        const voucherRes = await db.query(voucherQuery, [userId]);

        await db.query('COMMIT');
        res.json({ success: true });
        
        const emailRes = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
        setImmediate(() => {
            if (emailRes.rows.length > 0) {
                triggerFullSync(emailRes.rows[0].email).catch(e => console.error(e));
            }
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error("Admin Update Error:", err);
        res.status(500).send("Update error");
    }
});

// -- VOUCHERS --

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
    const { title, description, cost, discount_type, discount_value, image_url, is_crew_only, valid_duration_days } = req.body;
    try {
        const query = `
            INSERT INTO voucher_templates (title, description, cost, discount_type, discount_value, image_url, is_crew_only, valid_duration_days )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `;
        const result = await db.query(query, [title, description, cost, discount_type, discount_value, image_url, is_crew_only, valid_duration_days || 30]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating voucher");
    }
});

// PUT: Edit existing voucher
router.put('/vouchers/:id', async (req, res) => {
    const { id } = req.params;
    // ДОБАВИЛ valid_duration_days в список ниже:
    const { title, description, cost, discount_type, discount_value, image_url, is_crew_only, valid_duration_days } = req.body;

    try {
        const query = `
            UPDATE voucher_templates 
            SET title=$1, description=$2, cost=$3, discount_type=$4, discount_value=$5, image_url=$6, is_crew_only=$7, valid_duration_days=$8
            WHERE id=$9 RETURNING *
        `;
        const result = await db.query(query, [
            title, description, cost, discount_type,
            discount_value, image_url, is_crew_only,
            valid_duration_days, id
        ]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
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

// Find a user a asign the voucher
router.post('/vouchers/assign-bulk', async (req, res) => {
    const { templateId, segment } = req.body;
    const { gender, tier, branchId } = segment;

    try {
        await db.query('BEGIN');

        // 1. Получаем параметры ваучера (ценность и срок действия)
        const templateRes = await db.query('SELECT * FROM voucher_templates WHERE id = $1', [templateId]);
        if (templateRes.rows.length === 0) return res.status(404).send("Template not found");
        const template = templateRes.rows[0];

        // 2. Формируем фильтр для сегментации
        let queryParts = [];
        let values = [];
        let counter = 1;

        if (segment.gender && segment.gender !== 'all') {
            queryParts.push(`u.gender = $${counter++}`);
            values.push(segment.gender);
        }
        if (segment.branchId && segment.branchId !== 'all') {
            queryParts.push(`u.home_branch_id = $${counter++}`);
            values.push(segment.branchId);
        }
        if (segment.tier && segment.tier !== 'all') {
            queryParts.push(`lc.tier = $${counter++}`);
            values.push(segment.tier);
        }

        const whereClause = queryParts.length > 0 ? 'WHERE ' + queryParts.join(' AND ') : '';

        // Находим ID всех пользователей в этом сегменте
        const usersRes = await db.query(`
            SELECT u.id, u.email FROM users u
            JOIN loyalty_cards lc ON u.id = lc.user_id
            ${whereClause}
        `, values);

        // 3. Создаем ваучеры для каждого
        for (let user of usersRes.rows) {
            await db.query(`
                INSERT INTO user_vouchers (user_id, template_id, status, expires_at)
                VALUES ($1, $2, 'active', NOW() + INTERVAL '${template.valid_duration_days} days')
            `, [user.id, templateId]);

            // Синхронизируем с Google Wallet в фоне
            triggerFullSync(user.email).catch(e => console.error(e));
        }

        await db.query('COMMIT');
        res.json({ success: true, count: usersRes.rows.length });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).send("Assignment failed");
    }
});

// -- BRANCHES --

// Get all branches with region info
router.get('/branches-full', async (req, res) => {
    try {
        const query = `
            SELECT b.id, b.name, b.address, r.name as city, r.country, b.region_id
            FROM branches b
            JOIN regions r ON b.region_id = r.id
            ORDER BY r.country, r.name, b.name
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Error fetching branches");
    }
});

// 2. Умное создание или обновление локации
router.post('/branches/save', async (req, res) => {
    const { id, name, address, city, country } = req.body;
    try {
        await db.query('BEGIN');

        // Проверяем/Создаем регион (город + страна)
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
            // ОБНОВЛЕНИЕ
            await db.query(
                'UPDATE branches SET name=$1, address=$2, region_id=$3 WHERE id=$4',
                [name, address, regionId, id]
            );
        } else {
            // СОЗДАНИЕ
            await db.query(
                'INSERT INTO branches (name, address, region_id) VALUES ($1, $2, $3)',
                [name, address, regionId]
            );
        }

        await db.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await db.query('ROLLBACK');
        res.status(500).send("Error saving branch");
    }
});

// 3. Удаление локации
router.delete('/branches/:id', async (req, res) => {
    try {
        // Проверяем, есть ли пользователи, привязанные к этой точке
        const userCheck = await db.query('SELECT id FROM users WHERE home_branch_id = $1 LIMIT 1', [req.params.id]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: "Cannot delete branch: users are still assigned to this location." });
        }

        await db.query('DELETE FROM branches WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).send("Delete failed");
    }
});

// -- STATS --
router.get('/stats-summary', async (req, res) => {
    try {
        // 1. Распределение по полу
        const genderRes = await db.query('SELECT gender, COUNT(*) as count FROM users GROUP BY gender');

        // 2. Распределение по тирам (уровням)
        const tierRes = await db.query(`
            SELECT tier, COUNT(*) as count 
            FROM loyalty_cards 
            GROUP BY tier
            ORDER BY 
                CASE 
                    WHEN tier = 'STANDARD' THEN 1
                    WHEN tier = 'SILVER' THEN 2
                    WHEN tier = 'GOLD' THEN 3
                    WHEN tier = 'CREW' THEN 4
                    ELSE 5
                END ASC
        `);
        // 3. Популярность кофеен
        const branchRes = await db.query(`
            SELECT b.name, COUNT(u.id) as count 
            FROM branches b 
            LEFT JOIN users u ON b.id = u.home_branch_id 
            GROUP BY b.name 
            ORDER BY count DESC
        `);

        // 4. Рост пользователей по дням (последние 30 дней)
        const growthRes = await db.query(`
            SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count 
            FROM users 
            WHERE created_at > NOW() - INTERVAL '30 days'
            GROUP BY date 
            ORDER BY date ASC
        `);

        // 5. Экономика баллов
        const ecoRes = await db.query(`
            SELECT 
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as earned,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as burned
            FROM point_logs
        `);

        // 6. Статус ваучеров
        const voucherStatusRes = await db.query(`
            SELECT status, COUNT(*) as count FROM user_vouchers GROUP BY status
        `);

        // 7. Возраст (базовая сегментация)
        const ageRes = await db.query(`
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
            FROM users
            WHERE birth_date IS NOT NULL
            GROUP BY age_group, sort_order
            ORDER BY sort_order ASC -- Sort by the index, not the name
        `);
        // 8. Vouchers: Total created vs Total used
        const voucherStats = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'used' THEN 1 END) as used,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active
            FROM user_vouchers
        `);

        // 9. Economy: Average points per user
        const avgPoints = await db.query(`SELECT AVG(points_balance) as avg FROM loyalty_cards`);

        // 10. Average user age
        const avgAgeRes = await db.query(`
            SELECT ROUND(AVG(date_part('year', age(birth_date)))) as avg 
            FROM users 
            WHERE birth_date IS NOT NULL
        `);

        // 10. Top performing branch name
        const topBranch = await db.query(`
            SELECT b.name FROM branches b 
            JOIN users u ON b.id = u.home_branch_id 
            GROUP BY b.name ORDER BY COUNT(u.id) DESC LIMIT 1
        `);

        const totalUsersRes = await db.query('SELECT COUNT(*) as count FROM users');

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
            topBranch: topBranch.rows[0]?.name || "N/A"
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Stats error");
    }
});

module.exports = router;