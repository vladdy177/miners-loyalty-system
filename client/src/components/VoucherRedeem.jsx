import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Timer, X } from "lucide-react";

const VoucherRedeem = ({ voucher, onCancel }) => {
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds

    useEffect(() => {
        if (timeLeft <= 0) return onCancel();
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <button onClick={onCancel} style={closeBtn}><X /></button>
                <h2 style={{ fontWeight: 900 }}>{voucher.title}</h2>
                <p>Show this to the barista</p>

                <div style={qrBox}>
                    {/* The QR code is a secure combination of Voucher ID and User ID */}
                    <QRCodeSVG value={`REDEEM:${voucher.id}`} size={200} />
                </div>

                <div style={timerStyle}>
                    <Timer size={16} />
                    <span>Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                </div>
            </div>
        </div>
    );
};

const overlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { background: '#FFEA00', padding: '30px', borderRadius: '10px', textAlign: 'center', color: '#000', width: '300px' };
const qrBox = { background: '#fff', padding: '15px', borderRadius: '8px', margin: '20px 0' };
const timerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' };
const closeBtn = { position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' };

export default VoucherRedeem;