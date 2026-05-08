// server/walletService.js
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { getTierData } = require('./tierLogic');

// Google keys
let googleKey;
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    googleKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
} else {
    try {
        googleKey = require('./google-key.json');
    } catch (e) {
        console.error("Warning: Google Wallet keys not found");
    }
}

if (googleKey && googleKey.private_key) {
    googleKey.private_key = googleKey.private_key.replace(/\\n/g, '\n');
}

const ISSUER_ID = '3388000000023127113';
const CLASS_ID = 'TheMinersLoyalty';

// Helper to get the authenticated Google Wallet client
const auth = new google.auth.JWT(
    googleKey.client_email,
    null,
    googleKey.private_key,
    ['https://www.googleapis.com/auth/wallet_object.issuer']
);

const walletClient = google.walletobjects({
    version: 'v1',
    auth: auth
});

// Logic to build the Card Object (used for both Create and Sync)
const buildLoyaltyObject = (user, activeVouchers = []) => {
    const tier = getTierData(user.points_balance, user.tier);
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://miners-loyalty-system-1.onrender.com'
        : 'http://localhost:5173';

    // Format voucher list for the "Details" section
    const voucherList = activeVouchers.length > 0
        ? activeVouchers.map(v => `- ${v.title}`).join('\n')
        : "No active vouchers";

    const firstName = user.first_name || 'MEMBER';
    const lastName = user.last_name || '';
    const fullName = `${firstName} ${lastName}`.toUpperCase();

    return {
        id: `${ISSUER_ID}.${user.qr_code_token}`,
        classId: `${ISSUER_ID}.${CLASS_ID}`,
        state: 'ACTIVE',
        accountHolderName: fullName,
        accountId: user.qr_code_token,

        primaryLabels: [
            {
                label: 'NAME',
                defaultValue: { language: 'en-US', value: fullName }
            }
        ],

        secondaryLabels: [
            {
                label: 'TIER',
                defaultValue: { language: 'en-US', value: tier.tierName }
            }
        ],

        barcode: { type: 'QR_CODE', value: user.qr_code_token },
        heroImage: { sourceUri: { uri: `${baseUrl}/banners/${tier.banner}` } },
        loyaltyPoints: { label: 'Points', balance: { string: String(user.points_balance) } },

        // Buttons & Info in the details menu
        linksModuleData: {
            uris: [
                {
                    // Deep link to users profile
                    uri: `${baseUrl}/?email=${user.email}`, 
                    description: 'Open My Profile & Shop',
                    id: 'profile_link'
                }
            ]
        },

        // Purchased vouchers in details
        textModulesData: [
            { header: 'MY VOUCHERS', body: voucherList, id: 'vouchers_list' },
            { header: 'BENEFITS', body: tier.benefits, id: 'benefits' },
            { header: 'NEXT TIER', body: tier.nextTierText, id: 'progress' }
        ]
    };
};

// Function for initial link generation
const generateGoogleWalletLink = (user, activeVouchers) => {
    const loyaltyObject = buildLoyaltyObject(user, activeVouchers);
    const claims = {
        iss: googleKey.client_email,
        aud: 'google',
        typ: 'savetowallet',
        origins: ["http://localhost:5173", "https://miners-loyalty-system-1.onrender.com"],
        payload: { loyaltyObjects: [loyaltyObject] }
    };
    return jwt.sign(claims, googleKey.private_key, { algorithm: 'RS256' });
};

// Sync function for Admin updates
const syncWallet = async (user, activeVouchers = []) => {
    try {
        const loyaltyObject = buildLoyaltyObject(user, activeVouchers);
        const resourceId = `${ISSUER_ID}.${user.qr_code_token}`;

        console.log(`[SYNC] Авторизация и обновление карты: ${resourceId}`);

        // Явно просим auth получить токен перед запросом
        await auth.authorize();

        await walletClient.loyaltyobject.patch({
            resourceId: resourceId,
            requestBody: loyaltyObject
        });

        console.log(`[SYNC] Успешно синхронизировано с Google`);
    } catch (err) {
        console.error(`[SYNC] Ошибка 401/403. Проверь права доступа.`);
        if (err.response) {
            console.error(JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message);
        }
    }
};

const triggerFullSync = async (db, email) => {
    try {
        // Fresh user data
        const userRes = await db.query(`
            SELECT u.email, u.first_name, u.last_name, lc.points_balance, lc.tier, lc.qr_code_token 
            FROM users u 
            JOIN loyalty_cards lc ON u.id = lc.user_id 
            WHERE u.email = $1`, [email]);

        if (userRes.rows.length === 0) return;
        const userData = userRes.rows[0];

        // Fresh vouchers
        const voucherRes = await db.query(`
            SELECT vt.title FROM user_vouchers uv 
            JOIN voucher_templates vt ON uv.template_id = vt.id 
            WHERE uv.user_id = (SELECT id FROM users WHERE email = $1) 
            AND uv.status = 'active'`, [email]);

        // SyncWallet
        await module.exports.syncWallet(userData, voucherRes.rows);

    } catch (err) {
        console.error("Critical Sync Error:", err.message);
    }
};

module.exports = { generateGoogleWalletLink, syncWallet, triggerFullSync };