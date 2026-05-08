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
const getWalletClient = () => {
    const auth = new google.auth.JWT(
        googleKey.client_email,
        null,
        googleKey.private_key,
        ['https://www.googleapis.com/auth/wallet_object.issuer']
    );
    return google.walletObjects({ version: 'v1', auth });
}

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

    const fullName = `${(user.first_name || 'GUEST').toUpperCase()} ${(user.last_name || '').toUpperCase()}`;

    return {
        id: `${ISSUER_ID}.${user.qr_code_token}`,
        classId: `${ISSUER_ID}.${CLASS_ID}`,
        state: 'ACTIVE',
        accountHolderName: fullName,
        accountId: user.qr_code_token,
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
const syncWallet = async (user, activeVouchers) => {
    try {
        const client = getWalletClient();
        const loyaltyObject = buildLoyaltyObject(user, activeVouchers);

        console.log(`Attempting to sync Wallet for: ${user.email}`);

        await client.loyaltyobject.patch({
            resourceId: `${ISSUER_ID}.${user.qr_code_token}`,
            requestBody: loyaltyObject
        });
        console.log(`Synced Google Wallet for ${user.email}`);
    } catch (err) {
        console.error("Wallet Sync Error:", err.response?.data || err.message);
    }
};

module.exports = { generateGoogleWalletLink, syncWallet };