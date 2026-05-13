import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { LogOut, History, Ticket } from "lucide-react";
import Market from "./Market";
import VoucherRedeem from "./VoucherRedeem";
import getTierData from "../utils/tierLogic.js"
import styles from "./styles/Profile.module.css";

const Profile = ({ email, onLogout }) => {
    const [user, setUser] = useState(null);
    const [googleWalletUrl, setGoogleWalletUrl] = useState(null);
    const [myVouchers, setMyVouchers] = useState([]);
    const [redeemingVoucher, setRedeemingVoucher] = useState(null);
    const [showShop, setShowShop] = useState(false);

    const [activeTimers, setActiveTimers] = useState(() => {
        const saved = localStorage.getItem("miners_timers");
        return saved ? JSON.parse(saved) : {};
    });

    const [now, setNow] = useState(() => Date.now());
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const apiUrl = import.meta.env.VITE_API_URL;

    const triggerRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const formatTimeLeft = (expiry) => {
        const totalSeconds = Math.max(0, Math.floor((expiry - now) / 1000));
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

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
                if (err.name !== 'CanceledError') console.error(err);
            }
        };
        loadData();
        return () => { isMounted = false; controller.abort(); };
    }, [email, refreshTrigger, apiUrl]);

    // tick every second so countdown displays stay in sync
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    // auto-redeem when 3 min timer runs out — barista already scanned it by then
    useEffect(() => {
        const checkExpiry = async () => {
            for (const [id, expiry] of Object.entries(activeTimers)) {
                if (now >= expiry) {
                    try {
                        await axios.post(`${apiUrl}/api/users/redeem-voucher`, { voucherId: id, email });
                        setActiveTimers(prev => {
                            const updated = { ...prev };
                            delete updated[id];
                            return updated;
                        });
                        if (redeemingVoucher?.id === id) setRedeemingVoucher(null);
                        triggerRefresh();
                    } catch (e) { console.error("Auto-redeem failed", e); }
                }
            }
        };
        checkExpiry();
    }, [now, activeTimers, apiUrl, triggerRefresh, redeemingVoucher]);

    // persist timers so a page refresh doesn't reset the countdown
    useEffect(() => {
        localStorage.setItem("miners_timers", JSON.stringify(activeTimers));
    }, [activeTimers]);

    const handleActivate = (voucherId) => {
        const expiry = now + 3 * 60 * 1000;
        setActiveTimers(prev => ({ ...prev, [voucherId]: expiry }));
    };

    const handleDirectRedeem = async (voucherId) => {
        try {
            await axios.post(`${apiUrl}/api/users/redeem-voucher`, { voucherId, email });
            triggerRefresh();
        } catch (e) {
            console.error("Upgrade redeem failed", e);
        }
    };

    const activeRewards = useMemo(() => myVouchers.filter(v => v.status === 'active'), [myVouchers]);
    const usedRewards = useMemo(() => myVouchers.filter(v => v.status === 'used'), [myVouchers]);

    if (!user) return <p className={styles.loading}>Loading card...</p>;

    return (
        <div className={styles.profilePage}>
            <div className={styles.splitLayout}>

                <div className={styles.leftSide}>
                    <div className={styles.cardContainer}>
                        <div className={styles.card}>
                            <p className={styles.title}>Loyalty Member</p>
                            <h1 className={styles.userName}>{user.first_name} {user.last_name}</h1>
                            <p className={styles.branchName}>{user.home_branch}</p>
                            <div className={styles.qrContainer}>
                                <QRCodeSVG value={user.qr_code_token} size={150} />
                                <p className={styles.token}>{user.qr_code_token}</p>
                            </div>
                            <div className={styles.statsGrid}>
                                <div className={styles.statBox}>
                                    <p className={styles.statLabel}>Points</p>
                                    <p className={`${styles.statValue} ${styles.points}`}>
                                        {user.points_balance}
                                    </p>
                                </div>

                                <div className={styles.statBox}>
                                    <p className={styles.statLabel}>Current Tier</p>
                                    <p className={styles.statValue}>
                                        {user.tier}
                                    </p>
                                </div>

                                <div className={`${styles.statBox} ${styles.fullWidth}`}>
                                    <p className={styles.statLabel}>Your Benefits</p>
                                    <p className={styles.benefitsValue}>
                                        {getTierData(user.points_balance, user.tier).benefits}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {googleWalletUrl && (
                            <div className={styles.walletButtonContainer}>
                                <a href={googleWalletUrl} target="_blank" rel="noreferrer">
                                    <img src="/add-to-google-wallet.svg" alt="Wallet" style={{ width: '180px' }} />
                                </a>
                            </div>
                        )}
                        <button onClick={onLogout} className={styles.logoutBtn}><LogOut size={16} /> Log Out</button>
                    </div>
                </div>

                <div className={styles.rightSide}>
                    <div className={styles.tabs}>
                        <button className={!showShop ? styles.activeTab : styles.tab} onClick={() => setShowShop(false)}>Inventory</button>
                        <button className={showShop ? styles.activeTab : styles.tab} onClick={() => setShowShop(true)}>Shop</button>
                    </div>

                    {showShop ? (
                        <Market userEmail={email} userPoints={user.points_balance} userTier={user.tier} onPurchaseSuccess={triggerRefresh} />
                    ) : (
                        <div className={styles.inventoryContainer}>

                            <section className={styles.section}>
                                <h3 className={styles.sectionTitle}><Ticket size={18} /> My active rewards</h3>
                                {activeRewards.length > 0 ? (
                                    <div className={styles.voucherGrid}>
                                        {activeRewards.map(v => {
                                            const isUpgrade = v.title.includes('STATUS');
                                            const expiryTime = activeTimers[v.id];
                                            const isRunning = expiryTime && expiryTime > now;
                                            return (
                                                <div key={v.id} className={styles.vCard}>
                                                    <div className={styles.vImageWrapper}>
                                                        <img src={v.image_url || "/espresso.jpg"} alt="v" />
                                                        {isRunning && !isUpgrade && (
                                                            <div className={styles.timerOverlay}>
                                                                <div className={styles.timerBox}>
                                                                    <span>ACTIVE</span>
                                                                    <h2>{formatTimeLeft(expiryTime)}</h2>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={styles.vContent}>
                                                        <div className={styles.vHeader}>
                                                            <h4>{v.title}</h4>
                                                            <span className={styles.vExpiry}>Exp: {new Date(v.expires_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className={styles.vDescription}>{v.description}</p>
                                                        {isUpgrade ? (
                                                            <button
                                                                className={styles.btnActivate}
                                                                onClick={() => handleDirectRedeem(v.id)}
                                                            >
                                                                APPLY UPGRADE
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className={isRunning ? styles.btnShow : styles.btnActivate}
                                                                onClick={() => isRunning ? setRedeemingVoucher(v) : handleActivate(v.id)}
                                                            >
                                                                {isRunning ? "SHOW QR" : "ACTIVATE (3 MIN)"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <p className={styles.emptyText}>No active vouchers yet.</p>}
                            </section>

                            <section className={styles.section} style={{ marginTop: '40px' }}>
                                <h3 className={styles.sectionTitle}><History size={18} /> Used Vouchers</h3>
                                <div className={styles.historyList}>
                                    {usedRewards.map(v => (
                                        <div key={v.id} className={styles.historyItem}>
                                            <span>{v.title}</span>
                                            <small>{new Date(v.redeemed_at).toLocaleString('cs-CZ', 'short')}</small>
                                        </div>
                                    ))}
                                    {usedRewards.length === 0 && <p className={styles.emptyText}>History is empty.</p>}
                                </div>
                            </section>

                        </div>
                    )}
                </div>
            </div>

            {redeemingVoucher && (
                <VoucherRedeem
                    voucher={redeemingVoucher}
                    expiryTime={activeTimers[redeemingVoucher.id]}

                    onCancel={() => setRedeemingVoucher(null)}
                />
            )}
        </div>
    );
};

export default Profile;