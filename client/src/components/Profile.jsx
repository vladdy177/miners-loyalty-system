import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import Market from "./Market";
import styles from "./styles/Profile.module.css";

const Profile = ({ email }) => {
    const [user, setUser] = useState(null);
    const [googleWalletUrl, setGoogleWalletUrl] = useState(null);
    const [showShop, setShowShop] = useState(false);
    const apiUrl = import.meta.env.VITE_API_URL;

    const refreshProfile = useCallback(async () => {
        try {
            const res = await axios.get(`${apiUrl}/api/users/profile/${email}`);
            setUser(res.data);
        } catch (err) {
            console.error("Manual refresh failed", err);
        }
    }, [email, apiUrl]);

    useEffect(() => {
        let isMounted = true; // Safety flag to prevent memory leaks

        const loadInitialData = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;

                // Fetch everything at once
                const [profileRes, walletRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/users/profile/${email}`),
                    axios.get(`${apiUrl}/api/users/wallet/google/${email}`)
                ]);

                if (isMounted) {
                    setUser(profileRes.data);
                    setGoogleWalletUrl(walletRes.data.saveUrl);
                }
            } catch (err) {
                console.error("Initial load failed", err);
            }
        };

        loadInitialData();

        return () => { isMounted = false; }; // Cleanup
    }, [email]);

    if (!user) return <p className={styles.loading}>Loading card...</p>;

    return (
        <div className={styles.profilePage}>
            <div className={styles.tabs}>
                <button
                    className={!showShop ? styles.activeTab : styles.tab}
                    onClick={() => setShowShop(false)}
                >
                    MY CARD
                </button>
                <button
                    className={showShop ? styles.activeTab : styles.tab}
                    onClick={() => setShowShop(true)}
                >
                    SHOP
                </button>
            </div>

            {showShop ? (
                // THE MARKET
                <Market
                    userEmail={email}
                    userPoints={user.points_balance}
                    onPurchaseSuccess={refreshProfile}
                    userTier={user.tier}
                />
            ) : (
                //THE CARD
                <div className={styles.container}>
                    <div className={styles.card}>
                        <p className={styles.title}>Loyalty Member</p>

                        <h1 className={styles.userName}>{user.first_name} {user.last_name}</h1>
                        <p className={styles.branchName}>{user.home_branch}</p>

                        <div className={styles.qrContainer}>
                            <QRCodeSVG value={user.qr_code_token} size={160} />
                        </div>

                        <div className={styles.statsGrid}>
                            <div>
                                <p className={styles.statLabel}>Points</p>
                                <p className={`${styles.statValue} ${styles.points}`}>
                                    {user.points_balance}
                                </p>
                            </div>
                            <div>
                                <p className={styles.statLabel}>Tier</p>
                                <p className={styles.statValue}>{user.tier}</p>
                            </div>
                        </div>
                    </div>

                    {googleWalletUrl && (
                        <div className={styles.walletButtonContainer}>
                            <a href={googleWalletUrl} target="_blank" rel="noreferrer">
                                <img
                                    src="./src/assets/add-to-goole-wallet.svg"
                                    alt="Save to Google Wallet"
                                    style={{ width: '200px' }}
                                />
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Profile;