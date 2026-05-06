import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import Market from "./Market";
import VoucherRedeem from "./VoucherRedeem";
import styles from "./styles/Profile.module.css";
import googleWalletBtn from "../assets/add-to-goole-wallet.svg";

const Profile = ({ email }) => {
    const [user, setUser] = useState(null);
    const [googleWalletUrl, setGoogleWalletUrl] = useState(null);
    const [myVouchers, setMyVouchers] = useState([]); // Initialize as empty array
    const [redeemingVoucher, setRedeemingVoucher] = useState(null);
    const [showShop, setShowShop] = useState(false);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const apiUrl = import.meta.env.VITE_API_URL;

    const triggerRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    // 2. Initial load
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadData = async () => {
            try {
                const [pRes, wRes, vRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/users/profile/${email}`, { signal: controller.signal }),
                    axios.get(`${apiUrl}/api/users/wallet/google/${email}`, { signal: controller.signal }),
                    axios.get(`${apiUrl}/api/users/my-vouchers/${email}`, { signal: controller.signal })
                ]);

                if (isMounted) {
                    setUser(pRes.data);
                    setGoogleWalletUrl(wRes.data.saveUrl);
                    setMyVouchers(vRes.data);
                }
            } catch (err) {
                if (err.name !== 'CanceledError') {
                    console.error("Failed to fetch user data", err);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [email, refreshTrigger, apiUrl]); // Dependencies are now simple values, not functions

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
                <Market
                    userEmail={email}
                    userPoints={user.points_balance}
                    userTier={user.tier}
                    onPurchaseSuccess={triggerRefresh} // Now refreshes vouchers too!
                />
            ) : (
                <div className={styles.container}>
                    {/* THE CARD */}
                    <div className={styles.card}>
                        <p className={styles.title}>Loyalty Member</p>
                        <h1 className={styles.userName}>
                            {user.first_name} {user.last_name}
                        </h1>
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

                    {/* VOUCHERS SECTION */}
                    <div className={styles.vouchersSection}>
                        <h3 className={styles.inventoryTitle}>MY VOUCHERS</h3>
                        {myVouchers.length > 0 ? (
                            <div className={styles.voucherList}>
                                {myVouchers.map(v => (
                                    <button
                                        key={v.id}
                                        className={styles.voucherButton}
                                        onClick={() => setRedeemingVoucher(v)}
                                    >
                                        <div className={styles.vButtonContent}>
                                            <span>{v.title}</span>
                                            <small>TAP TO USE</small>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.emptyText}>No active vouchers yet.</p>
                        )}
                    </div>

                    {/* GOOGLE WALLET BUTTON */}
                    {googleWalletUrl && (
                        <div className={styles.walletButtonContainer}>
                            <a href={googleWalletUrl} target="_blank" rel="noreferrer">
                                <img
                                    src={googleWalletBtn}
                                    alt="Save to Google Wallet"
                                    style={{ width: '200px' }}
                                />
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL POPUP */}
            {redeemingVoucher && (
                <VoucherRedeem
                    voucher={redeemingVoucher}
                    onCancel={() => setRedeemingVoucher(null)}
                />
            )}
        </div>
    );
};

export default Profile;