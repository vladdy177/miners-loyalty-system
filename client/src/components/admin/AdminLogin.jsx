import React, { useState } from "react";
import axios from "axios";
import styles from "../styles/AdminLogin.module.css";

const AdminLogin = ({ onLoginSuccess }) => {
    const [creds, setCreds] = useState({ username: "", password: "" });
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const res = await axios.post(`${apiUrl}/api/admin/login`, creds);
            localStorage.setItem("admin_token", res.data.token);
            onLoginSuccess();
        } catch (err) {
            setError("Wrong username or password. Access denied.", err);
        }
    };

    return (
        <div className={styles.adminWrapper}>
            <div className={styles.loginCard}>
                <h2 className={styles.title}>Miners Admin</h2>
                <p className={styles.subtitle}>Administrative Portal</p>

                <form onSubmit={handleLogin} className={styles.form}>
                    <input
                        name="username"
                        type="text"
                        placeholder="Username"
                        required
                        className={styles.inputField}
                        onChange={e => setCreds({ ...creds, username: e.target.value }, setError(''))}
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        required
                        className={styles.inputField}
                        onChange={e => setCreds({ ...creds, password: e.target.value }, setError(''))}
                    />

                    <button type="submit" className={styles.loginBtn}>
                        Authorise
                    </button>
                </form>

                {error && <div className={styles.errorBox}>{error}</div>}
            </div>
        </div>
    );
};

export default AdminLogin;