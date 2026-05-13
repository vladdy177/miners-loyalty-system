jest.mock('../config/db');
jest.mock('../walletService', () => ({
    generateGoogleWalletLink: jest.fn().mockReturnValue('mock-token'),
    triggerFullSync: jest.fn().mockResolvedValue(undefined),
    syncWallet: jest.fn().mockResolvedValue(undefined)
}));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../app');
const db      = require('../config/db');

// Generate a valid admin token using the same secret as the middleware
const ADMIN_TOKEN = jwt.sign({ role: 'admin', username: 'admin' }, 'miners-admin-secret-2026');
const authHeader  = { Authorization: `Bearer ${ADMIN_TOKEN}` };

beforeEach(() => jest.clearAllMocks());

// Voucher purchase

describe('POST /api/loyalty/purchase', () => {

    test('successful purchase deducts points and creates user_voucher', async () => {
        db.query
            .mockResolvedValueOnce({})  // BEGIN
            .mockResolvedValueOnce({ rows: [{ card_id: 'card-1', user_id: 'user-1', points_balance: 1000, tier: 'STANDARD' }] }) // SELECT user FOR UPDATE
            .mockResolvedValueOnce({ rows: [{ id: 'reward-1', title: 'FREE COFFEE', cost: 500, valid_duration_days: 30 }] })     // SELECT reward
            .mockResolvedValueOnce({ rows: [] }) // INSERT user_voucher
            .mockResolvedValueOnce({ rows: [] })// UPDATE points
            .mockResolvedValueOnce({ rows: [] }) // INSERT point_logs
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/loyalty/purchase')
            .send({ email: 'jan@test.cz', rewardId: 'reward-1' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('returns 400 when user has insufficient points', async () => {
        db.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ card_id: 'card-1', user_id: 'user-1', points_balance: 100, tier: 'STANDARD' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'reward-1', title: 'FREE COFFEE', cost: 500 }] })
            .mockResolvedValueOnce({});// ROLLBACK

        const res = await request(app)
            .post('/api/loyalty/purchase')
            .send({ email: 'jan@test.cz', rewardId: 'reward-1' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/insufficient points/i);
    });

    test('returns 400 when STANDARD member tries to buy GOLD STATUS directly', async () => {
        db.query
            .mockResolvedValueOnce({})// BEGIN
            .mockResolvedValueOnce({ rows: [{ card_id: 'card-1', user_id: 'user-1', points_balance: 50000, tier: 'STANDARD' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'reward-2', title: 'GOLD STATUS', cost: 30000 }] })
            .mockResolvedValueOnce({}); // ROLLBACK

        const res = await request(app)
            .post('/api/loyalty/purchase')
            .send({ email: 'jan@test.cz', rewardId: 'reward-2' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/SILVER/i);
    });

    test('SILVER member can successfully upgrade to GOLD', async () => {
        db.query
            .mockResolvedValueOnce({})  // BEGIN
            .mockResolvedValueOnce({ rows: [{ card_id: 'card-1', user_id: 'user-1', points_balance: 35000, tier: 'SILVER' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'reward-3', title: 'GOLD STATUS', cost: 30000 }] })
            .mockResolvedValueOnce({ rows: [] }) // UPDATE tier
            .mockResolvedValueOnce({ rows: [] }) // UPDATE points
            .mockResolvedValueOnce({ rows: [] }) // INSERT point_logs
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/loyalty/purchase')
            .send({ email: 'jan@test.cz', rewardId: 'reward-3' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('returns 400 when email or rewardId is missing', async () => {
        const res = await request(app)
            .post('/api/loyalty/purchase')
            .send({ email: 'jan@test.cz' }); // missing rewardId

        expect(res.status).toBe(400);
    });
});

// Voucher redemption

describe('POST /api/users/redeem-voucher', () => {

    test('successfully redeems an active voucher', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ id: 'uv-1', title: 'FREE COFFEE', tier: 'STANDARD', card_id: 'card-1' }] }) // ownerCheck
            .mockResolvedValueOnce({})// BEGIN
            .mockResolvedValueOnce({ rows: [] }) // UPDATE user_vouchers
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/users/redeem-voucher')
            .send({ voucherId: 'uv-1', email: 'jan@test.cz' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.tierUpgraded).toBe(false);
    });

    test('returns 403 when voucher does not belong to the user', async () => {
        db.query.mockResolvedValueOnce({ rows: [] }); // ownerCheck returns empty

        const res = await request(app)
            .post('/api/users/redeem-voucher')
            .send({ voucherId: 'uv-99', email: 'wrong@test.cz' });

        expect(res.status).toBe(403);
    });

    test('STATUS voucher upgrades tier on redemption', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ id: 'uv-2', title: 'SILVER STATUS', tier: 'STANDARD', card_id: 'card-1' }] }) // ownerCheck
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // UPDATE loyalty_cards tier
            .mockResolvedValueOnce({ rows: [] }) // UPDATE user_vouchers
            .mockResolvedValueOnce({});// COMMIT

        const res = await request(app)
            .post('/api/users/redeem-voucher')
            .send({ voucherId: 'uv-2', email: 'jan@test.cz' });

        expect(res.status).toBe(200);
        expect(res.body.tierUpgraded).toBe(true);
    });

    test('STATUS upgrade blocked when tier sequence is violated', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ id: 'uv-3', title: 'GOLD STATUS', tier: 'STANDARD', card_id: 'card-1' }] }) // ownerCheck
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({});// ROLLBACK

        const res = await request(app)
            .post('/api/users/redeem-voucher')
            .send({ voucherId: 'uv-3', email: 'jan@test.cz' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/SILVER/i);
    });
});

// Tier upgrade — DB write verification

describe('Tier upgrade — verifying exact DB writes', () => {

    const mockUpgrade = (currentTier, targetTitle, pointsBalance) => {
        db.query
            .mockResolvedValueOnce({})  // BEGIN
            .mockResolvedValueOnce({ rows: [{ card_id: 'card-1', user_id: 'user-1', points_balance: pointsBalance, tier: currentTier }] })
            .mockResolvedValueOnce({ rows: [{ id: 'reward-x', title: targetTitle, cost: pointsBalance - 1 }] })
            .mockResolvedValueOnce({ rows: [] }) // UPDATE tier
            .mockResolvedValueOnce({ rows: [] }) //UPDAT points
            .mockResolvedValueOnce({ rows: [] }) //INSERT point_logs
            .mockResolvedValueOnce({});//COMMIT
    };

    test('buying SILVER STATUS writes SILVER to loyalty_cards', async () => {
        mockUpgrade('STANDARD', 'SILVER STATUS', 15000);

        await request(app)
            .post('/api/loyalty/purchase')
            .send({ email: 'jan@test.cz', rewardId: 'reward-x' });

        const tierUpdate = db.query.mock.calls.find(
            ([sql]) => typeof sql === 'string' && sql.includes('UPDATE loyalty_cards SET tier')
        );
        expect(tierUpdate).toBeDefined();
        expect(tierUpdate[1]).toContain('SILVER');
    });

    test('buying GOLD STATUS writes GOLD to loyalty_cards', async () => {
        mockUpgrade('SILVER', 'GOLD STATUS', 30000);

        await request(app)
            .post('/api/loyalty/purchase')
            .send({ email: 'jan@test.cz', rewardId: 'reward-x' });

        const tierUpdate = db.query.mock.calls.find(
            ([sql]) => typeof sql === 'string' && sql.includes('UPDATE loyalty_cards SET tier')
        );
        expect(tierUpdate).toBeDefined();
        expect(tierUpdate[1]).toContain('GOLD');
    });

    test('regular voucher purchase does NOT write to loyalty_cards tier', async () => {
        db.query
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ rows: [{ card_id: 'card-1', user_id: 'user-1', points_balance: 1000, tier: 'STANDARD' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'reward-x', title: 'FREE COFFEE', cost: 500, valid_duration_days: 30 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({});

        await request(app)
            .post('/api/loyalty/purchase')
            .send({ email: 'jan@test.cz', rewardId: 'reward-x' });

        const tierUpdate = db.query.mock.calls.find(
            ([sql]) => typeof sql === 'string' && sql.includes('UPDATE loyalty_cards SET tier')
        );
        expect(tierUpdate).toBeUndefined();
    });

    test('GOLD member cannot buy SILVER STATUS — blocked by sequence check', async () => {
        db.query
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ rows: [{ card_id: 'card-1', user_id: 'user-1', points_balance: 50000, tier: 'GOLD' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'reward-x', title: 'SILVER STATUS', cost: 15000 }] })
            .mockResolvedValueOnce({}); // ROLLBACK

        const res = await request(app)
            .post('/api/loyalty/purchase')
            .send({ email: 'jan@test.cz', rewardId: 'reward-x' });

        expect(res.status).toBe(400);
        // GOLD user hits the STANDARD-only check for SILVER — corect sequential validation
        expect(res.body.error).toMatch(/STANDARD members/i);

        // Must NOT write tier change to DB
        const tierUpdate = db.query.mock.calls.find(
            ([sql]) => typeof sql === 'string' && sql.includes('UPDATE loyalty_cards SET tier')
        );
        expect(tierUpdate).toBeUndefined();
    });

    test('point_logs receives correct negative amount after purchase', async () => {
        const cost = 500;
        db.query
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ rows: [{ card_id: 'card-1', user_id: 'user-1', points_balance: 1000, tier: 'STANDARD' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'reward-x', title: 'FREE COFFEE', cost, valid_duration_days: 30 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({});

        await request(app)
            .post('/api/loyalty/purchase')
            .send({ email: 'jan@test.cz', rewardId: 'reward-x' });

        const logInsert = db.query.mock.calls.find(
            ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO point_logs')
        );
        expect(logInsert).toBeDefined();
        expect(logInsert[1][1]).toBe(-cost); // second param is the amount
    });
});

//Bulk campign segmentation

describe('POST /api/admin/vouchers/assign-bulk', () => {

    test('assigns voucher to all users when no filters set', async () => {
        db.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 'tpl-1', title: 'PROMO', valid_duration_days: 30 }] }) // SELECT template
            .mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'a@a.cz' }, { id: 'u2', email: 'b@b.cz' }] }) // SELECT users
            .mockResolvedValueOnce({ rows: [] }) // INSERT voucher user 1
            .mockResolvedValueOnce({ rows: [] }) // INSERT vouher user 2
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/admin/vouchers/assign-bulk')
            .set(authHeader)
            .send({ templateId: 'tpl-1', segment: { gender: 'all', tier: 'all', country: 'all', city: 'all', branchId: 'all' } });

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);
    });

    test('assigns only to matching segment (gender=female)', async () => {
        db.query
            .mockResolvedValueOnce({})// BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 'tpl-1', title: 'PROMO', valid_duration_days: 30 }] })
            .mockResolvedValueOnce({ rows: [{ id: 'u3', email: 'female@test.cz' }] }) // only 1 match
            .mockResolvedValueOnce({ rows: [] })// INSERT
            .mockResolvedValueOnce({});// COMMIT

        const res = await request(app)
            .post('/api/admin/vouchers/assign-bulk')
            .set(authHeader)
            .send({ templateId: 'tpl-1', segment: { gender: 'female', tier: 'all', country: 'all', city: 'all', branchId: 'all' } });

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(1);
    });

    test('returns count 0 when no users match the segment', async () => {
        db.query
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 'tpl-1', title: 'PROMO', valid_duration_days: 30 }] })
            .mockResolvedValueOnce({ rows: [] }) // no matching users
            .mockResolvedValueOnce({}); //COMMIT

        const res = await request(app)
            .post('/api/admin/vouchers/assign-bulk')
            .set(authHeader)
            .send({ templateId: 'tpl-1', segment: { gender: 'all', tier: 'GOLD', country: 'all', city: 'all', branchId: 'all' } });

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(0);
    });

    test('returns 401 without admin token', async () => {
        const res = await request(app)
            .post('/api/admin/vouchers/assign-bulk')
            .send({ templateId: 'tpl-1', segment: {} });

        expect(res.status).toBe(401);
    });
});