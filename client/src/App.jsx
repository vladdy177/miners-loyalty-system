import React, { useState } from "react";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Admin from "./components/admin/AdminLayout";
import AdminLayout from "./components/admin/AdminLayout";
import { LogOut } from "lucide-react";


function App() {
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem("miners_email") || null;
  });

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

  const isAdmin = new URLSearchParams(window.location.search).get("admin") === "true";

  if (isAdmin) return <AdminLayout />;

  if (userEmail) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Profile email={userEmail} />
        <button
          onClick={handleLogout}
          style={{
            width: '200px',
            background: 'none',
            border:' 1px solid #444',
            color:' #ff4444',
            padding: '10px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      {isRegistering ? (
        <>
          <Register onRegistrationSuccess={(email) => {
            localStorage.setItem("miners_email", email);
            setUserEmail(email);
          }} />
          <p style={{ color: 'white', textAlign: 'center', marginTop: '20px' }}>
            Již máte kartu? <button onClick={() => setIsRegistering(false)}>Přihlásit se</button>
          </p>
        </>
      ) : (
        <div style={{ color: 'white', maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
          <p>Zadejte svůj email</p>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              style={{ padding: '10px', width: '100%', marginBottom: '10px' }}
            />
            <button type="submit" style={{ padding: '10px 20px', background: '#000', color: '#fff', border: 'none' }}>
              Zobrazit kartu
            </button>
          </form>
          <button onClick={() => setIsRegistering(true)} style={{ color: 'white', marginTop: '20px', background: 'none', border: 'none' }}>
            Zpět k registraci
          </button>
        </div>
      )}
    </div>
  );
}

export default App;