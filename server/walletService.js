const { getTierData } = require('./tierLogic');
const jwt = require('jsonwebtoken');

const generateGoogleWalletLink = (user, googleKey, ISSUER_ID, CLASS_ID) => {
    const tier = getTierData(user.points_balance, user.tier);

    // Frontend link for banners
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://miners-loyalty-system-1.onrender.com'
        : 'http://localhost:5173';

    const loyaltyObject = {
        id: `${ISSUER_ID}.${user.qr_code_token}`,
        classId: `${ISSUER_ID}.${CLASS_ID}`,
        state: 'ACTIVE',
        accountHolderName: `${user.first_name.toUpperCase()} ${user.last_name.toUpperCase()}`,
        accountId: user.qr_code_token,

        // QR-code with card number
        barcode: {
            type: 'QR_CODE',
            value: user.qr_code_token,
            alternateText: user.qr_code_token
        },

        // Card banners
        heroImage: {
            sourceUri: {
                uri: `${baseUrl}/banners/${tier.banner}`
            }
        },

        // Points
        loyaltyPoints: {
            label: 'Points',
            balance: { string: String(user.points_balance) }
        },

        // Text blocks (info about tiers and benefits) 
        textModulesData: [
            {
                header: 'PASS TYPE',
                body: tier.tierName,
                id: 'tier_name'
            },
            {
                header: 'BENEFITS',
                body: tier.benefits,
                id: 'benefits'
            },
            {
                header: 'PROGRESS',
                body: tier.nextTierText,
                id: 'progress'
            }
        ]
    };

    const claims = {
        iss: googleKey.client_email,
        aud: 'google',
        typ: 'savetowallet',
        origins: ["http://localhost:5173", "https://miners-loyalty-system-1.onrender.com"],
        payload: {
            loyaltyObjects: [loyaltyObject]
        }
    };

    return jwt.sign(claims, googleKey.private_key, { algorithm: 'RS256' });
};

module.exports = { generateGoogleWalletLink };