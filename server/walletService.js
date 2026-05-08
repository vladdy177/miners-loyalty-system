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
        ? 'https://miners-loyalty-frontend.onrender.com'
        : 'http://localhost:5173';

    // 1. Форматируем список ваучеров
    const voucherList = activeVouchers.length > 0
        ? activeVouchers.map(v => `• ${v.title}`).join('\n')
        : "No active vouchers yet.";

    const fullName = [user.first_name, user.last_name]
        .filter(Boolean)
        .join(' ') || 'MEMBER';

    const branchName = user.home_branch ? `${user.home_branch}` : "The Miners Coffee Club";

    return {
        id: `${ISSUER_ID}.${user.qr_code_token}`,
        classId: `${ISSUER_ID}.${GENERIC_CLASS_ID}`,
        logo: {
            sourceUri: { uri: "https://cdn.myshoptet.com/usr/www.theminers.eu/user/logos/black-logo2.svg?v=1777204447502" }
        },
        cardTitle: { defaultValue: { language: 'en-US', value: "The Miners Coffee Club" } },

        // --- ЛИЦЕВАЯ СТОРОНА (Минимализм) ---
        subheader: { defaultValue: { language: "en-US", value: branchName } },
        header: { defaultValue: { language: "en-US", value: fullName } },

        
        // --- ДЕТАЛИ КАРТЫ (Меню "3 точки") ---
        // Эти данные Google спрячет в подробности, если на лицевой стороне нет места
        textModulesData: [
            {
                id: "tier_main",
                label: "Tier",
                value: tier.tierName.toUpperCase()
            },
            {
                id: "points_main",
                label: "Points",
                value: String(user.points_balance)
            },
            // {
            //     id: "vouchers_details",
            //     header: "MY ACTIVE VOUCHERS",
            //     body: voucherList
            // },
            {
                id: "benefits_details",
                header: "TIER BENEFITS",
                body: tier.benefits
            },
            {
                id: "next_goal_details",
                header: "NEXT GOAL",
                body: tier.nextTierText
            }
        ],

        // Кнопка в деталях для перехода на сайт
        linksModuleData: {
            uris: [
                {
                    uri: `${baseUrl}/?email=${user.email}`,
                    description: 'MY PROFILE & SHOP',
                    id: 'profile_link'
                }
            ]
        },

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