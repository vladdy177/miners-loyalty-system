import React, { useState } from "react";
import axios from "axios";

const AdminLogin = ({ onLoginSuccess }) => {
    const [creds, setCreds] = useState({ username: "", password: "" });
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const res = await axios.post(`${apiUrl}/api/admin/login`, creds);
            localStorage.setItem("admin_token", res.data.token);
            onLoginSuccess();
        } catch (err) {
            setError("Wrong username or password", err);
        }
    };

    return (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
            <form onSubmit={handleLogin} style={{ background: "#fff", padding: "40px", borderRadius: "8px", width: "300px" }}>
                <h2 style={{ textAlign: "center", marginBottom: "20px" }}>MINERS ADMIN</h2>
                <input
                    type="text" placeholder="Username"
                    onChange={e => setCreds({ ...creds, username: e.target.value })}
                    style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
                />
                <input
                    type="password" placeholder="Password"
                    onChange={e => setCreds({ ...creds, password: e.target.value })}
                    style={{ width: "100%", padding: "10px", marginBottom: "20px" }}
                />
                <button type="submit" style={{ width: "100%", padding: "10px", background: "#FFEA00", border: "none", fontWeight: "bold" }}>LOG IN</button>
                {error && <p style={{ color: "red", fontSize: "12px", marginTop: "10px" }}>{error}</p>}
            </form>
        </div>
    );
};

export default AdminLogin;