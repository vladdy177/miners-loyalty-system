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
const GENERIC_CLASS_ID = 'TheMinersGeneric';

// GENERIC PASS
const buildGenericObject = (user, activeVouchers = []) => {
    const tier = getTierData(user.points_balance, user.tier);
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://miners-loyalty-system-1.onrender.com'
        : 'http://localhost:5173';

    const voucherList = activeVouchers.length > 0
        ? activeVouchers.map(v => `• ${v.title}`).join('\n')
        : "No active vouchers";

    const fullName = [user.first_name, user.last_name]
        .filter(Boolean)
        .map(s => s.toUpperCase())
        .join(' ') || 'MEMBER';

    const branchDisplay = user.home_branch ? `The Miners ${user.home_branch}` : "The Miners Coffee Club";

    return {
        id: `${ISSUER_ID}.${user.qr_code_token}`,
        classId: `${ISSUER_ID}.${GENERIC_CLASS_ID}`,
        logo: {
            sourceUri: { uri: "https://cdn.myshoptet.com/usr/www.theminers.eu/user/logos/black-logo2.svg?v=1777204447502" },
            contentDescription: { defaultValue: { language: 'en-US', value: "The Miners Logo" } }
        },
        cardTitle: { defaultValue: { language: 'en-US', value: "The Miners Coffee Club" } },
        subheader: { defaultValue: { language: "en-US", value: branchDisplay } },
        header: { defaultValue: { language: "en-US", value: fullName } },

        // Все блоки данных объединяем в ОДИН массив textModulesData
        textModulesData: [
            {
                id: "tier",
                header: "Tier",
                body: tier.tierName.toUpperCase()
            },
            {
                id: "points",
                header: "Points",
                body: String(user.points_balance)
            },
            {
                id: "vouchers",
                header: "My vouchers",
                body: voucherList
            },
            {
                id: "progress",
                header: "Next goal",
                body: tier.nextTierText.toUpperCase()
            }
        ],
        barcode: {
            type: "QR_CODE",
            value: user.qr_code_token,
            alternateText: user.qr_code_token
        },
        heroImage: {
            sourceUri: { uri: `${baseUrl}/banners/${tier.banner}` }
        },
        hexBackgroundColor: "#000000"
    };
};

const generateGoogleWalletLink = (user, activeVouchers = []) => {
    const creds = getCredentials();
    if (!creds) return null;

    const genericObject = buildGenericObject(user, activeVouchers);
    const claims = {
        iss: creds.clientEmail,
        aud: 'google',
        typ: 'savetowallet',
        origins: ["http://localhost:5173", "https://miners-loyalty-system-1.onrender.com"],
        payload: {
            genericObjects: [genericObject]
        }
    };

    const pk = creds.privateKey.replace(/\\n/g, '\n');
    return jwt.sign(claims, pk, { algorithm: 'RS256' });
};

const syncWallet = async (user, activeVouchers = []) => {
    const creds = getCredentials();
    if (!creds) return;

    try {
        const walletClient = google.walletobjects({ version: 'v1', auth: creds.auth });
        const genericObject = buildGenericObject(user, activeVouchers);
        const resourceId = `${ISSUER_ID}.${user.qr_code_token}`;

        await walletClient.genericobject.patch({
            resourceId: resourceId,
            requestBody: genericObject,
            auth: creds.auth
        });

        console.log(`[SYNC] ✅ Generic Wallet success: ${user.email}`);
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