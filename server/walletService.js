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

        // This is the "Magic Fix" for the 401 error on Render:
        // We use the official helper to build the auth object
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
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://miners-loyalty-system-1.onrender.com'
        : 'http://localhost:5173';

    const voucherList = activeVouchers.length > 0
        ? activeVouchers.map(v => `- ${v.title}`).join('\n')
        : "No active vouchers";

    const fullName = [user.first_name, user.last_name]
        .filter(Boolean)           // drop null/undefined/empty
        .map(s => s.toUpperCase())
        .join(' ') || 'MEMBER';    // fallback only if both are missing

    return {
        id: `${ISSUER_ID}.${user.qr_code_token}`,
        classId: `${ISSUER_ID}.${CLASS_ID}`,
        state: 'ACTIVE',
        accountHolderName: fullName,   // ← this is what renders above the QR
        accountId: user.qr_code_token,
        barcode: {
            type: 'QR_CODE',
            value: user.qr_code_token,
            alternateText: user.qr_code_token
        },
        heroImage: { sourceUri: { uri: `${baseUrl}/banners/${tier.banner}` } },
        loyaltyPoints: {
            label: 'Points',
            balance: { string: String(user.points_balance) }
        },
        linksModuleData: {
            uris: [{
                uri: `${baseUrl}/?email=${user.email}`,
                description: 'Open My Profile & Shop',
                id: 'profile_link'
            }]
        },
        textModulesData: [
            { header: 'TIER', body: tier.tierName, id: 'tier' },
            { header: 'MY VOUCHERS', body: voucherList, id: 'vouchers_list' },
            { header: 'BENEFITS', body: tier.benefits, id: 'benefits' },
            { header: 'NEXT TIER', body: tier.nextTierText, id: 'progress' }
        ]
    };
};

// Used for the "Save to Google Wallet" button
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

    // Use the private key from the loaded credentials
    const pk = creds.privateKey.replace(/\\n/g, '\n');
    return jwt.sign(claims, pk, { algorithm: 'RS256' });
};

// Used for background syncing (Admin updates / Purchases)
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

        console.log(`[SYNC] ✅ Google Wallet success: ${user.email}`);
    } catch (err) {
        console.error(`[SYNC] ❌ Google API Error: ${err.message}`);
        if (err.response) console.error(JSON.stringify(err.response.data));
    }
};

const triggerFullSync = async (email) => {
    try {
        const userRes = await db.query(`
            SELECT u.email, u.first_name, u.last_name, lc.points_balance, lc.tier, lc.qr_code_token, u.id as user_uuid
            FROM users u 
            JOIN loyalty_cards lc ON u.id = lc.user_id 
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