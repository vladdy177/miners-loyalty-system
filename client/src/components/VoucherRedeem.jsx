import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Timer } from "lucide-react";
import styles from "./styles/VoucherRedeem.module.css";

const VoucherRedeem = ({ voucher, expiryTime, onCancel }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        const calculate = () => {
            const diff = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
            setTimeLeft(diff);
        };

        calculate();
        const timer = setInterval(calculate, 1000);
        return () => clearInterval(timer);
    }, [expiryTime]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <button className={styles.closeBtn} onClick={onCancel}><X /></button>

                <p className={styles.topLabel}>Voucher Activation</p>
                <h2 className={styles.title}>{voucher.title}</h2>

                <div className={styles.qrBox}>
                    <QRCodeSVG value={`REDEEM:${voucher.id}`} size={200} level="H" />
                    <p className={styles.qrSub}>{voucher.id.substring(0, 8).toUpperCase()}</p>
                </div>

                <div className={styles.timerContainer}>
                    <Timer size={20} className={styles.timerIcon} />
                    <span className={styles.timeText}>{formatTime(timeLeft)}</span>
                </div>

                <p className={styles.warning}>
                    Show this screen to the barista. <br />
                    The code will expire automatically.
                </p>
            </div>
        </div>
    );
};

export default VoucherRedeem;