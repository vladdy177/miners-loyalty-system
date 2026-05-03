import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./styles/Market.module.css";

const Market = ({ userEmail, userPoints, onPurchaseSuccess, userTier }) => {
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const fetchRewards = async () => {
            try {
                const res = await axios.get(`${apiUrl}/api/loyalty/rewards`);
                setRewards(res.data);
            } catch (err) {
                console.error("Failed to load catalog", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRewards();
    }, [apiUrl]);

    const handlePurchase = async (rewardId, title) => {
        try {
            await axios.post(`${apiUrl}/api/loyalty/purchase`, {
                email: userEmail,
                rewardId: rewardId
            });
            alert(`Successfully unlocked: ${title}!`);
            onPurchaseSuccess(); // This triggers refreshProfile in Profile.jsx
        } catch (err) {
            alert(err.response?.data?.error || "Transaction failed");
        }
    };

    const filteredRewards = rewards.filter(item => {
        // 1. If it's a Crew item, only show if the user is CREW
        if (item.is_crew_only && userTier !== 'CREW') return false;

        // 2. Hide Tier Upgrades that the user already has (Optional UX)
        if (item.title === userTier) return false;

        return true;
    });

    if (loading) return <p className={styles.statusText}>Loading Catalog...</p>;

    return (
        <div className={styles.marketContainer}>
            <header className={styles.header}>
                <h2 className={styles.title}>OUR CATALOG</h2>
                <p className={styles.subtitle}>Choose your reward</p>
            </header>

            <div className={styles.itemsList}>
                {filteredRewards.map((item) => {
                    const progress = Math.min((userPoints / item.cost) * 100, 100);
                    const canAfford = userPoints >= item.cost;

                    return (
                        <div key={item.id} className={styles.rewardCard}>
                            <div className={styles.progressHeader}>
                                <div className={styles.progressInfo}>
                                    <span>{userPoints} / {item.cost} points</span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className={styles.cardContent}>
                                <h3 className={styles.rewardTitle}>{item.title}</h3>
                                <p className={styles.rewardDesc}>{item.description}</p>

                                <button
                                    className={canAfford ? styles.buyBtn : styles.lockedBtn}
                                    disabled={!canAfford}
                                    onClick={() => handlePurchase(item.id, item.title)}
                                >
                                    {canAfford ? "CHOOSE" : "LOCKED"}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Market;