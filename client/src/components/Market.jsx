import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./styles/Market.module.css";
import Popup from "./Popup.jsx"
import { Lock } from "lucide-react";

const Market = ({ userEmail, userPoints, onPurchaseSuccess, userTier }) => {
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const apiUrl = import.meta.env.VITE_API_URL;
    const [popup, setPopup] = useState({ isOpen: false, type: 'info', title: '', message: '' });

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

    const showMessage = (type, title, message) => {
        setPopup({ isOpen: true, type, title, message });
    };

    const handlePurchase = async (rewardId, title) => {
        try {
            await axios.post(`${apiUrl}/api/loyalty/purchase`, {
                email: userEmail,
                rewardId: rewardId
            });
            showMessage('success', 'Success!', `You have unlocked ${title}. Check your wallet!`);
            screen.width < 700 ? window.scrollTo({ top: 743, behavior: "smooth" }) : window.scrollTo({ top: 0, behavior: "smooth" });
            onPurchaseSuccess();
        } catch (err) {
            showMessage('error', 'Purchase Failed', err.response?.data?.error || "Transaction failed");
            screen.width < 700 ? window.scrollTo({ top: 743, behavior: "smooth" }) : window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const filteredRewards = rewards.filter(item => {
        if (item.discount_type !== 'percentage' && !item.title.includes('STATUS')) {
            return true;
        }

        const itemTier = item.title.replace(' STATUS', '');
        if (userTier === itemTier) return false;
        if (userTier === 'SILVER' && itemTier === 'SILVER') return false;
        if (userTier === 'GOLD') return false;
        if (userTier === 'CREW') return false;

        return true;
    });

    const getLockStatus = (item) => {
        if (item.discount_type !== 'percentage' && !item.title.includes('STATUS')) {
            return { isLocked: false };
        }

        const itemTier = item.title.replace(' STATUS', '');

        if (userTier === 'STANDARD' && itemTier === 'GOLD') {
            return {
                isLocked: true,
                reason: "SILVER STATUS REQUIRED"
            };
        }

        return { isLocked: false };
    };

    if (loading) return <p className={styles.statusText}>Loading Catalog...</p>;

    return (
        <div className={styles.marketContainer}>
            <header className={styles.header}>
                <h2 className={styles.title}>OUR CATALOG</h2>
                <p className={styles.subtitle}>Choose your reward</p>
            </header>

            <div className={styles.itemsList}>
                {filteredRewards.map((item) => {
                    const { isLocked, reason } = getLockStatus(item);
                    const progress = Math.min((userPoints / item.cost) * 100, 100);
                    const canAfford = userPoints >= item.cost && !isLocked;

                    return (
                        <div
                            key={item.id}
                            className={`${styles.rewardCard} ${isLocked ? styles.lockedCard : ''}`}
                        >
                            <div className={styles.imageWrapper}>
                                <img
                                    src={item.image_url || "/espresso.jpg"}
                                    alt={item.title}
                                    onError={(e) => { e.target.src = "/espresso.jpg"; }}
                                />

                                {isLocked && (
                                    <div className={styles.tierLockOverlay}>
                                        <div className={styles.lockContent}>
                                            <Lock size={32} />
                                            <span>{reason}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`${styles.progressHeader} ${isLocked ? styles.dimmed : ''}`}>
                                <div className={styles.progressInfo}>
                                    <span>
                                        {isLocked ? "?? / ?? points" :
                                            (userPoints >= item.cost && item.cost != 0 ? `${item.cost} / ${item.cost} points` :
                                                item.cost == 0 ? "FREE" : `${userPoints} / ${item.cost} points`)}
                                    </span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: isLocked ? '0%' : `${progress}%` }}
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
                                    {isLocked ? "LOCKED" : canAfford ? "CHOOSE" : "INSUFFICIENT POINTS"}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <Popup
                isOpen={popup.isOpen}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onClose={() => setPopup({ ...popup, isOpen: false })}
            />
        </div>
    );
};

export default Market;