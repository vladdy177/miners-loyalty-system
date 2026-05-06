import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LogOut } from "lucide-react";

// Components
import Register from "./components/Register";
import Profile from "./components/Profile";
import AdminLayout from "./components/admin/AdminLayout";
import AdminLogin from "./components/admin/AdminLogin";

function App() {
  // --- STATE ---
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("miners_email") || null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(!!localStorage.getItem("admin_token"));

  const handleAdminLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAdminAuthenticated(false);
    // Optional: redirect to home
    window.location.href = "/";
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* CUSTOMER SIDE */}
        <Route
          path="/"
          element={
            <CustomerFlow
              userEmail={userEmail}
              setUserEmail={setUserEmail}
            />
          }
        />

        {/* ADMIN SIDE */}
        <Route
          path="/admin"
          element={
            isAdminAuthenticated ? (
              <AdminLayout onLogout={handleAdminLogout} />
            ) : (
              <AdminLogin onLoginSuccess={() => setIsAdminAuthenticated(true)} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * sub-component for the Customer experience (Login / Registration / Profile)
 * This keeps the main App component clean and easy to read.
 */
function CustomerFlow({ userEmail, setUserEmail }) {
  const [isRegistering, setIsRegistering] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    localStorage.setItem("miners_email", loginEmail);
    setUserEmail(loginEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem("miners_email");
    setUserEmail(null);
  };

  // 1. If user is logged in, show their Card
  if (userEmail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Profile email={userEmail} />
        <button onClick={handleLogout} style={logoutButtonStyle}>
          <LogOut size={18} /> Log Out
        </button>
      </div>
    );
  }

  // 2. If not logged in, show Register or Login form
  return (
    <div className="App">
      {isRegistering ? (
        <>
          <Register onRegistrationSuccess={(email) => {
            localStorage.setItem("miners_email", email);
            setUserEmail(email);
          }} />
          <p style={{ color: 'white', textAlign: 'center', marginTop: '20px' }}>
            Already have a card? <button onClick={() => setIsRegistering(false)} style={linkButtonStyle}>Login here</button>
          </p>
        </>
      ) : (
        <div style={{ color: 'white', maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
          <h2>Member Login</h2>
          <p style={{ marginBottom: '20px', opacity: 0.8 }}>Enter your email to see your card</p>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" style={submitButtonStyle}>Show card</button>
          </form>
          <button onClick={() => setIsRegistering(true)} style={linkButtonStyle}>
            Back to registration
          </button>
        </div>
      )}
    </div>
  );
}

// --- SHARED STYLES ---
const logoutButtonStyle = {
  width: '200px', background: 'none', border: '1px solid #444', color: '#ff4444',
  padding: '10px', borderRadius: '6px', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '20px'
};

const inputStyle = {
  padding: '12px', width: '100%', marginBottom: '15px', borderRadius: '4px', border: '1px solid #333', background: '#fff'
};

const submitButtonStyle = {
  padding: '12px 20px', background: '#FFEA00', color: '#000', border: 'none', width: '100%', fontWeight: 'bold', cursor: 'pointer'
};

const linkButtonStyle = {
  background: 'none', border: 'none', color: '#FFEA00', textDecoration: 'underline', cursor: 'pointer', marginTop: '10px'
};

export default App;