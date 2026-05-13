import React from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import styles from "./styles/Popup.module.css";

const Popup = ({ isOpen, onClose, type = "info", title, message, onConfirm }) => {
    if (!isOpen) return null;


    const icons = {
        success: <CheckCircle size={50} color="#8FD16A" />,
        error: <AlertCircle size={50} color="#c8102e" />,
        warning: <AlertTriangle size={50} color="#f2a900" />,
        info: <Info size={50} color="#00b5e2" />
    };
    

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.iconContainer}>{icons[type]}</div>
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.message}>{message}</p>

                <div className={styles.actions}>
                    {onConfirm ? (
                        <>
                            <button className={styles.cancelBtn} onClick={onClose}>
                                CANCEL
                            </button>
                            <button
                                className={styles.confirmBtn}
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                            >
                                DELETE
                            </button>
                        </>
                    ) : (
                        <button className={styles.okBtn} onClick={onClose}>
                            GOT IT
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Popup;