const { getTierData } = require('../tierLogic');

// Basic tier properties

describe('getTierData — tier names and benefits', () => {

    test.each([
        ['STANDARD', 'STANDARD PASS', 'COLLECT POINTS FOR REWARDS'],
        ['SILVER',   'SILVER PASS',   '5% OFF EVERYTHING'],
        ['GOLD',     'GOLD PASS',     '10% OFF EVERYTHING'],
        ['CREW',     'CREW PASS',     '40% OFF + FREE COFFEE'],
    ])('%s tier has correct name and benefits', (tier, expectedName, expectedBenefit) => {
        const result = getTierData(0, tier);
        expect(result.tierName).toBe(expectedName);
        expect(result.benefits).toBe(expectedBenefit);
    });

    test('each tier returns a .png banner filename', () => {
        ['STANDARD', 'SILVER', 'GOLD', 'CREW'].forEach(tier => {
            expect(getTierData(0, tier).banner).toMatch(/\.png$/);
        });
    });
});

// Boundary values — STANDARD → SILVER threshold (15 000 pts)

describe('getTierData — STANDARD tier boundary at 15 000', () => {

    test('14 999 points: shows exactly 1 point needed', () => {
        const result = getTierData(14999, 'STANDARD');
        expect(result.nextTierText).toBe('GET 1 MORE POINTS TO BUY SILVER PASS');
    });

    test('15 000 points: shows upgrade-ready message', () => {
        const result = getTierData(15000, 'STANDARD');
        expect(result.nextTierText).toContain('enough points');
        expect(result.nextTierText).toContain('SILVER');
    });

    test('15 001 points: still shows upgrade-ready message (no negative)', () => {
        const result = getTierData(15001, 'STANDARD');
        expect(result.nextTierText).toContain('enough points');
        expect(result.nextTierText).not.toMatch(/-\d+/);
    });

    test('very high points do not produce negative text', () => {
        const result = getTierData(999999, 'STANDARD');
        expect(result.nextTierText).not.toMatch(/-\d+/);
    });
});

// Boundary values — SILVER → GOLD threshold (30 000 pts)

describe('getTierData — SILVER tier boundary at 30 000', () => {

    test('29 999 points: shows exactly 1 point needed for GOLD', () => {
        const result = getTierData(29999, 'SILVER');
        expect(result.nextTierText).toBe('GET 1 MORE POINTS TO BUY GOLD PASS');
    });

    test('30 000 points: shows upgrade-ready message for GOLD', () => {
        const result = getTierData(30000, 'SILVER');
        expect(result.nextTierText).toContain('enough points');
        expect(result.nextTierText).toContain('GOLD');
    });

    test('points above 30 000 never show negative number', () => {
        const result = getTierData(45000, 'SILVER');
        expect(result.nextTierText).not.toMatch(/-\d+/);
    });
});

// Terminal tiers — no next tier text

describe('getTierData — terminal tiers', () => {

    test('GOLD tier always shows maximum reached regardless of points', () => {
        [0, 15000, 30000, 999999].forEach(points => {
            expect(getTierData(points, 'GOLD').nextTierText).toBe('MAXIMUM PASS REACHED');
        });
    });

    test('CREW tier always shows staff status regardless of points', () => {
        [0, 15000, 999999].forEach(points => {
            expect(getTierData(points, 'CREW').nextTierText).toBe('STAFF STATUS ACTIVE');
        });
    });
});

// Full progression path simulation

describe('getTierData — full progression path', () => {

    test('simulates STANDARD → SILVER → GOLD journey', () => {
        // New user, 0 points
        let state = getTierData(0, 'STANDARD');
        expect(state.tierName).toBe('STANDARD PASS');
        expect(state.nextTierText).toContain('15000');

        // Reached SILVER threshold
        state = getTierData(15000, 'STANDARD');
        expect(state.nextTierText).toContain('enough points');

        // After tier upgrade: now SILVER with 0 points left
        state = getTierData(0, 'SILVER');
        expect(state.tierName).toBe('SILVER PASS');
        expect(state.nextTierText).toContain('30000');

        // Reached GOLD threshold while on SILVER
        state = getTierData(30000, 'SILVER');
        expect(state.nextTierText).toContain('enough points');

        // After final upgrade: GOLD
        state = getTierData(0, 'GOLD');
        expect(state.tierName).toBe('GOLD PASS');
        expect(state.nextTierText).toBe('MAXIMUM PASS REACHED');
    });
});
