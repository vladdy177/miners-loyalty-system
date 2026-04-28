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
    if (points >= 30000) {
        return {
            tierName: 'GOLD PASS',
            banner: 'GOLD.png',
            benefits: '10% OFF EVERYTHING',
            nextTierText: 'MAXIMUM PASS REACHED'
        };
    } else if (points >= 15000) {
        return {
            tierName: 'SILVER PASS',
            banner: 'SILVER.png',
            benefits: '5% OFF EVERYTHING',
            nextTierText: `${30000 - points} POINTS TO GOLD PASS`
        };
    } else {
        return {
            tierName: 'STANDARD PASS',
            banner: 'STANDARD.png',
            benefits: 'COLLECT POINTS FOR REWARDS',
            nextTierText: `${15000 - points} POINTS TO SILVER PASS`
        };
    }
};

module.exports = { getTierData };