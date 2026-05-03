// server/walletService.js
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

const generateGoogleWalletLink = (user) => {
    const tier = getTierData(user.points_balance, user.tier);

    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://miners-loyalty-system-1.onrender.com'
        : 'http://localhost:5173';

    const loyaltyObject = {
        id: `${ISSUER_ID}.${user.qr_code_token}`,
        classId: `${ISSUER_ID}.${CLASS_ID}`,
        state: 'ACTIVE',
        accountName: `${(user.first_name || 'GUEST').toUpperCase()} ${(user.last_name || '').toUpperCase()}`,
        accountId: user.qr_code_token,
        barcode: {
            type: 'QR_CODE',
            value: user.qr_code_token,
            alternateText: user.qr_code_token
        },
        heroImage: {
            sourceUri: { uri: `${baseUrl}/banners/${tier.banner}` }
        },
        loyaltyPoints: {
            label: 'Points',
            balance: { string: String(user.points_balance) }
        },
        textModulesData: [
            { header: 'PASS TYPE', body: tier.tierName, id: 'tier_name' },
            { header: 'BENEFITS', body: tier.benefits, id: 'benefits' },
            { header: 'PROGRESS', body: tier.nextTierText, id: 'progress' }
        ]
    };

    const claims = {
        iss: googleKey.client_email,
        aud: 'google',
        typ: 'savetowallet',
        origins: ["http://localhost:5173", "https://miners-loyalty-system-1.onrender.com"],
        payload: { loyaltyObjects: [loyaltyObject] }
    };

    return jwt.sign(claims, googleKey.private_key, { algorithm: 'RS256' });
};

module.exports = { generateGoogleWalletLink };