// Mocks must be declared before any require() calls that load the routes
jest.mock('../config/db');
jest.mock('../walletService', () => ({
    generateGoogleWalletLink: jest.fn().mockReturnValue('mock-token'),
    triggerFullSync: jest.fn().mockResolvedValue(undefined),
    syncWallet: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
    hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword')
}));

const request = require('supertest');
const app     = require('../app');
const db      = require('../config/db');
const bcrypt  = require('bcryptjs');

beforeEach(() => {
    jest.clearAllMocks();
});

// Registration

describe('POST /api/users/register', () => {

    test('returns 201 and email on valid registration', async () => {
        db.query
            .mockResolvedValueOnce({})// BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 'user-uuid-1' }] })// INSERT user
            .mockResolvedValueOnce({ rows: [] })// INSERT loylty_card
            .mockResolvedValueOnce({});// COMMIT

        const res = await request(app)
            .post('/api/users/register')
            .send({ email: 'jan@test.cz', firstName: 'Jan', lastName: 'Novak', homeBranchId: 'branch-uuid-1' });

        expect(res.status).toBe(201);
        expect(res.body.email).toBe('jan@test.cz');
    });

    test('returns 400 when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/users/register')
            .send({ email: 'jan@test.cz' }); // missing firstName and homeBranchId

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Missing required fields/i);
    });

    test('returns 400 when email already exists', async () => {
        db.query
            .mockResolvedValueOnce({})// BEGIN
            .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' })); // unique violation

        const res = await request(app)
            .post('/api/users/register')
            .send({ email: 'taken@test.cz', firstName: 'Jan', homeBranchId: 'branch-uuid-1' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Email exists/i);
    });
});

// Admin login

describe('POST /api/admin/login', () => {

    test('returns 401 when admin user does not exist', async () => {
        db.query.mockResolvedValueOnce({ rows: [] }); // no admin found

        const res = await request(app)
            .post('/api/admin/login')
            .send({ username: 'nobody', password: 'test' });

        expect(res.status).toBe(401);
    });

    test('returns 401 on wrong password', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ username: 'admin', password_hash: '$2a$12$hash' }] });
        bcrypt.compare.mockResolvedValueOnce(false);

        const res = await request(app)
            .post('/api/admin/login')
            .send({ username: 'admin', password: 'wrongpassword' });

        expect(res.status).toBe(401);
    });

    test('returns 200 with JWT token on correct credentials', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ username: 'admin', password_hash: '$2a$12$hash' }] });
        bcrypt.compare.mockResolvedValueOnce(true);

        const res = await request(app)
            .post('/api/admin/login')
            .send({ username: 'admin', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(typeof res.body.token).toBe('string');
    });

    test('returns 400 when body is empty', async () => {
        const res = await request(app)
            .post('/api/admin/login')
            .send({});

        expect(res.status).toBe(400);
    });
});

// Protected admin route — no token

describe('GET /api/admin/users (protected)', () => {

    test('returns 401 without Authorization header', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.status).toBe(401);
    });

    test('returns 401 with invalid token', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', 'Bearer invalid.token.here');
        expect(res.status).toBe(401);
    });
});
