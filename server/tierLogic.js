const getTierData = (points, dbTier) => {
    if (dbTier === 'CREW') {
        return {
            tierName: 'CREW PASS',
            banner: 'CREW.png',
            benefits: '40% OFF + FREE COFFEE',
            nextTierText: 'STAFF STATUS ACTIVE'
        };
    }

    if (dbTier === 'GOLD') {
        return {
            tierName: 'GOLD PASS',
            banner: 'GOLD.png',
            benefits: '10% OFF EVERYTHING',
            nextTierText: 'MAXIMUM PASS REACHED'
        };
    }

    if (dbTier === 'SILVER') {
        const needed = Math.max(0, 30000 - points); // 30k is the GOLD unlock threshold
        return {
            tierName: 'SILVER PASS',
            banner: 'SILVER.png',
            benefits: '5% OFF EVERYTHING',
            nextTierText: points >= 30000
                ? 'You have enough points to buy a GOLD PASS!'
                : `GET ${needed} MORE POINTS TO BUY GOLD PASS`
        };
    }

    const needed = Math.max(0, 15000 - points); // 15k is the SILVER unlock threshold
    return {
        tierName: 'STANDARD PASS',
        banner: 'STANDARD.png',
        benefits: 'COLLECT POINTS FOR REWARDS',
        nextTierText: points >= 15000
            ? 'You have enough points to buy a SILVER PASS!'
            : `GET ${needed} MORE POINTS TO BUY SILVER PASS`
    };
};

module.exports = { getTierData };
