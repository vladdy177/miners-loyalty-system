import React, { useState } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LogOut, ArrowLeft } from "lucide-react";
import Register from "./components/Register";
import Profile from "./components/Profile";
import AdminLayout from "./components/admin/AdminLayout";
import AdminLogin from "./components/admin/AdminLogin";
import styles from "./App.module.css";

function App() {
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("miners_email") || null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(!!localStorage.getItem("admin_token"));

  const handleAdminLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAdminAuthenticated(false);
    window.location.href = "/admin";
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CustomerFlow userEmail={userEmail} setUserEmail={setUserEmail} />} />
        <Route path="/admin" element={isAdminAuthenticated ? <AdminLayout onLogout={handleAdminLogout} /> : <AdminLogin onLoginSuccess={() => setIsAdminAuthenticated(true)} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

function CustomerFlow({ userEmail, setUserEmail }) {
  const [isRegistering, setIsRegistering] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); 
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      
      await axios.get(`${apiUrl}/api/users/profile/${loginEmail}`);

      localStorage.setItem("miners_email", loginEmail);
      setUserEmail(loginEmail);
    } catch (err) {
      setError("We couldn't find a member with this email address.", err);
    }
  };

  if (userEmail) {
    return (
      <div className={styles.customerWrapper}>
        <Profile email={userEmail} 
          onLogout={() => {
            localStorage.removeItem("miners_email");
            setUserEmail(null);
          }} />
      </div>
    );
  }

  return (
    <div className={styles.mainWrapper}>
      {/* LEFT SIDE: IMAGE (Hidden on Mobile) */}
      <div className={styles.imageSide}>
        <div className={styles.imageOverlay}>
          <h1>Where Coffee <br /> Meets Data</h1>
          <p>The Miners Coffee Club</p>
        </div>
      </div>

      {/* RIGHT SIDE: FORMS */}
      <div className={styles.formSide}>
        <div className={styles.formContent}>

          {isRegistering ? (
            <div>
              <h2 className={styles.formTitle}>Create your account</h2>
              <p className={styles.formSubtitle}>Enter your details to join our loyalty program.</p>
              <Register onRegistrationSuccess={(email) => {
                localStorage.setItem("miners_email", email);
                setUserEmail(email);
              }} />
              <p className={styles.toggleText}>
                Already have a card? <button onClick={() => setIsRegistering(false)} className={styles.linkBtn}>Log in</button>
              </p>
            </div>
          ) : (
            <div>
              <button onClick={() => setIsRegistering(true)} className={styles.backBtn}>
                <ArrowLeft size={16} /> Back
              </button>
              <h2 className={styles.formTitle}>Member Login</h2>
              <p className={styles.formSubtitle}>Enter your email to access your card.</p>
              <form onSubmit={handleLogin}>
                {error && <div className={styles.errorBox}>{error}</div>}
                <input
                  name="email"
                  type="email"
                  placeholder="Email Address"
                  required
                  value={loginEmail}
                    onChange={(e) => {setLoginEmail(e.target.value); setError("")}}
                  className={styles.inputField}
                />
                <button type="submit" className={styles.submitBtn}>Show my card</button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;