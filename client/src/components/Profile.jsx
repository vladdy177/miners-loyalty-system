import React, { useState, useEffect } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import styles from "./Profile.module.css";

const Profile = ({ email }) => {
    const [user, setUser] = useState(null);
    const [googleWalletUrl, setGoogleWalletUrl] = useState(null);

    useEffect(() => {
        const fetchProfileAndWallet = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;

                const res = await axios.get(`${apiUrl}/api/user/${email}`);
                setUser(res.data);

                const walletRes = await axios.get(`${apiUrl}/api/wallet/google/${email}`);
                setGoogleWalletUrl(walletRes.data.saveUrl);

            } catch (err) {
                console.error("Error loading profile", err);
            }
        };
        fetchProfileAndWallet();
    }, [email]);

    if (!user) return <p>Loading card...</p>;

    return (
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
                        <p className={`${styles.statValue} ${styles.points}`}>{user.points_balance}</p>
                    </div>
                    <div>
                        <p className={styles.statLabel}>Tier</p>
                        <p className={styles.statValue}>{user.tier}</p>
                    </div>
                </div>
            </div>

            {googleWalletUrl && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <a href={googleWalletUrl} target="_blank" rel="noreferrer">
                        <img
                            src="https://pay.google.com/gp/v/save/images/en_US/save_to_google_wallet.svg"
                            alt="Save to Google Wallet"
                            style={{ width: '200px' }}
                        />
                    </a>
                </div>
            )}

        </div>
    );
};

export default Profile;