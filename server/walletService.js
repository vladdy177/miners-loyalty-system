const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { getTierData } = require('./tierLogic');
const db = require('./config/db');

// Улучшенная функция получения ключей
const getCredentials = () => {
    try {
        let keys;
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            keys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        } else {
            keys = require('./google-key.json');
        }
        if (!keys || !keys.private_key) return null;

        keys.private_key = keys.private_key.replace(/\\n/g, '\n');
        return keys;
    } catch (error) {
        console.error("❌ Google Credentials Error:", error.message);
        return null;
    }
};

const ISSUER_ID = '3388000000023127113';
const CLASS_ID = 'TheMinersLoyalty';

const buildLoyaltyObject = (user, activeVouchers = []) => {
    const tier = getTierData(user.points_balance, user.tier);
    const fullName = `${(user.first_name || 'MEMBER').toUpperCase()} ${(user.last_name || '').toUpperCase()}`;
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://miners-loyalty-frontend.onrender.com'
        : 'http://localhost:5173';

    const voucherList = activeVouchers.length > 0
        ? activeVouchers.map(v => `- ${v.title}`).join('\n')
        : "No active vouchers";

    return {
        id: `${ISSUER_ID}.${user.qr_code_token}`,
        classId: `${ISSUER_ID}.${CLASS_ID}`,
        state: 'ACTIVE',
        accountHolderName: fullName,
        accountId: user.qr_code_token,
        primaryLabels: [{ label: 'NAME', defaultValue: { language: 'en-US', value: fullName } }],
        secondaryLabels: [{ label: 'TIER', defaultValue: { language: 'en-US', value: tier.tierName } }],
        barcode: { type: 'QR_CODE', value: user.qr_code_token, alternateText: user.qr_code_token },
        heroImage: { sourceUri: { uri: `${baseUrl}/banners/${tier.banner}` } },
        loyaltyPoints: { label: 'Points', balance: { string: String(user.points_balance) } },
        linksModuleData: {
            uris: [{
                uri: `${baseUrl}/?email=${user.email}`,
                description: 'Open My Profile & Shop',
                id: 'profile_link'
            }]
        },
        textModulesData: [
            { header: 'MY VOUCHERS', body: voucherList, id: 'vouchers_list' },
            { header: 'BENEFITS', body: tier.benefits, id: 'benefits' },
            { header: 'NEXT TIER', body: tier.nextTierText, id: 'progress' }
        ]
    };
};

const generateGoogleWalletLink = (user, activeVouchers = []) => {
    const creds = getCredentials();
    if (!creds) return null;

    const loyaltyObject = buildLoyaltyObject(user, activeVouchers);
    const claims = {
        iss: creds.client_email,
        aud: 'google',
        typ: 'savetowallet',
        origins: ["http://localhost:5173", "https://miners-loyalty-system-1.onrender.com"],
        payload: { loyaltyObjects: [loyaltyObject] }
    };
    return jwt.sign(claims, creds.private_key, { algorithm: 'RS256' });
};

const syncWallet = async (user, activeVouchers = []) => {
    const creds = getCredentials();
    if (!creds) return;

    try {
        const auth = new google.auth.JWT(
            creds.client_email,
            null,
            creds.private_key,
            ['https://www.googleapis.com/auth/wallet_object.issuer']
        );

        // Инициализируем клиент ПРЯМО ТУТ
        const walletClient = google.walletobjects({ version: 'v1', auth });

        const loyaltyObject = buildLoyaltyObject(user, activeVouchers);
        const resourceId = `${ISSUER_ID}.${user.qr_code_token}`;

        // Вызываем patch и ПЕРЕДАЕМ auth явно
        await walletClient.loyaltyobject.patch({
            resourceId: resourceId,
            requestBody: loyaltyObject,
            auth: auth
        });

        console.log(`[SYNC] ✅ Google Wallet updated: ${user.email}`);
    } catch (err) {
        console.error(`[SYNC] ❌ Google API Error: ${err.message}`);
        if (err.response) console.error(JSON.stringify(err.response.data));
    }
};

const triggerFullSync = async (email) => {
    try {
        // Мы НЕ передаем db извне, используем локальный импорт
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