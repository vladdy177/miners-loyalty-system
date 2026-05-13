const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { getTierData } = require('./tierLogic');
const db = require('./config/db');

const getCredentials = () => {
    try {
        let keys;
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            keys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        } else {
            keys = require('./google-key.json');
        }

        const auth = google.auth.fromJSON(keys);
        auth.scopes = ['https://www.googleapis.com/auth/wallet_object.issuer'];

        return { auth, clientEmail: keys.client_email, privateKey: keys.private_key };
    } catch (error) {
        console.error("❌ CRITICAL: Auth Initialization Failed:", error.message);
        return null;
    }
};

const ISSUER_ID = '3388000000023127113';
const CLASS_ID = 'TheMinersLoyalty';

const buildLoyaltyObject = (user, activeVouchers = []) => {
    const tier = getTierData(user.points_balance, user.tier);
    const fullName = `${(user.first_name || 'MEMBER')} ${(user.last_name || '')}`;
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://miners-loyalty-system-1.onrender.com'
        : 'http://localhost:5173';

    const voucherList = activeVouchers.length > 0
        ? activeVouchers.map(v => `- ${v.title}`).join('\n')
        : "No active vouchers";

    const branchName = user.home_branch ? `${user.home_branch}` : "The Miners Coffee Club";

    return {
        id: `${ISSUER_ID}.${user.qr_code_token}`,
        classId: `${ISSUER_ID}.${CLASS_ID}`,
        state: 'ACTIVE',
        accountHolderName: fullName,
        accountId: user.qr_code_token,
        loyaltyPoints: {
            label: 'Points',
            balance: { string: String(user.points_balance) }
        },
        secondaryLoyaltyPoints: {
            label: 'Member',
            balance: { string: fullName }
        },
        barcode: { type: 'QR_CODE', value: user.qr_code_token, alternateText: user.qr_code_token },
        heroImage: { sourceUri: { uri: `${baseUrl}/banners/${tier.banner}` } },
        linksModuleData: {
            uris: [{
                uri: `${baseUrl}/?email=${user.email}`,
                description: 'Open My Profile & Shop',
                id: 'profile_link'
            }]
        },
        textModulesData: [
            { header: 'Favorite branch', body: branchName, id: 'branch' },
            { header: 'Benefits', body: tier.benefits, id: 'benefits' },
            { header: 'Next tier', body: tier.nextTierText, id: 'progress' },
            { header: 'My vouchers', body: voucherList, id: 'vouchers_list' }
        ]
    };
};

// builds a signed JWT for the "Add to Google Wallet" button — doesn't call the API
const generateGoogleWalletLink = (user, activeVouchers = []) => {
    const creds = getCredentials();
    if (!creds) return null;

    const loyaltyObject = buildLoyaltyObject(user, activeVouchers);
    const claims = {
        iss: creds.clientEmail,
        aud: 'google',
        typ: 'savetowallet',
        origins: ["http://localhost:5173", "https://miners-loyalty-system-1.onrender.com"],
        payload: { loyaltyObjects: [loyaltyObject] }
    };

    // env vars escape newlines, need to convert them back or RS256 signing breaks
    const pk = creds.privateKey.replace(/\\n/g, '\n');
    return jwt.sign(claims, pk, { algorithm: 'RS256' });
};

// patches existing wallet object — called after any data change, runs in background
const syncWallet = async (user, activeVouchers = []) => {
    const creds = getCredentials();
    if (!creds) return;

    try {
        const walletClient = google.walletobjects({ version: 'v1', auth: creds.auth });
        const loyaltyObject = buildLoyaltyObject(user, activeVouchers);
        const resourceId = `${ISSUER_ID}.${user.qr_code_token}`;

        await walletClient.loyaltyobject.patch({
            resourceId: resourceId,
            requestBody: loyaltyObject
        });

        await db.query(
            'UPDATE loyalty_cards SET last_sync_at = NOW() WHERE qr_code_token = $1',
            [user.qr_code_token]
        );

        console.log(`[SYNC] ✅ Google Wallet success: ${user.email}`);
    } catch (err) {
        console.error(`[SYNC] ❌ Google API Error: ${err.message}`);
        if (err.response) console.error(JSON.stringify(err.response.data));
    }
};

const triggerFullSync = async (email) => {
    try {
        const userRes = await db.query(`
            SELECT u.email, u.first_name, u.last_name, lc.points_balance, lc.tier, lc.qr_code_token, b.name as home_branch, u.id as user_uuid
            FROM users u
            JOIN loyalty_cards lc ON u.id = lc.user_id
            JOIN branches b ON u.home_branch_id = b.id
            WHERE u.email = $1`, [email]);

        if (userRes.rows.length === 0) return;
        const userData = userRes.rows[0];

        const voucherRes = await db.query(`
            SELECT vt.title FROM user_vouchers uv 
            JOIN voucher_templates vt ON uv.template_id = vt.id 
            WHERE uv.user_id = $1 AND uv.status = 'active'`, [userData.user_uuid]);

        await syncWallet(userData, voucherRes.rows);
    } catch (err) {
        console.error("[SYNC] Full Sync DB Error:", err.message);
    }
};

module.exports = { generateGoogleWalletLink, syncWallet, triggerFullSync };