const getTierData = (points, dbTier) => {
    // Staff members
    if (dbTier === 'CREW') {
        return {
            tierName: 'CREW PASS',
            banner: 'CREW.png',
            benefits: '40% OFF + FREE COFFEE',
            nextTierText: 'STAFF STATUS ACTIVE'
        };
    }

    // Customer levels 
    if (dbTier === 'GOLD') {
        return {
            tierName: 'GOLD PASS',
            banner: 'GOLD.png',
            benefits: '10% OFF EVERYTHING',
            nextTierText: 'MAXIMUM PASS REACHED'
        };
    } else if (dbTier === 'SILVER') {
        return {
            tierName: 'SILVER PASS',
            banner: 'SILVER.png',
            benefits: '5% OFF EVERYTHING',
            nextTierText: points >= 30000 ? 'You have enough points to buy a GOLD PASS!' : `GET ${30000 - points} MORE POINTS TO BUY GOLD PASS`
        };
    } else {
        return {
            tierName: 'STANDARD PASS',
            banner: 'STANDARD.png',
            benefits: 'COLLECT POINTS FOR REWARDS',
            nextTierText: points >= 15000 ? 'You have enough points to buy a SILVER PASS!' : `GET ${15000 - points} MORE POINTS TO BUY SILVER PASS`
        };
    }
};

module.exports = { getTierData };