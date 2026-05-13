import React, { useState } from "react";
import styles from "../styles/AdminLayout.module.css";
import { LayoutDashboard, Users, Ticket, BarChart3, LogOut, MapPinPen, Menu, X } from "lucide-react";

import Dashboard from "./Dashboard.jsx";
import AdminUsers from "./AdminUsers.jsx";
import AdminVouchers from "./AdminVouchers.jsx";
import Stats from "./Stats.jsx";
import AdminBranches from "./AdminBranches.jsx";

const AdminLayout = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const renderContent = () => {
        switch (activeTab) {
            case "dashboard": return <Dashboard />;
            case "users": return <AdminUsers />;
            case "vouchers": return <AdminVouchers />;
            case "stats": return <Stats />;
            case "locations": return <AdminBranches />;
            default: return <Dashboard />;
        }
    };

    const menuItems = [
        { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
        { id: "users", label: "Customers", icon: <Users size={20} /> },
        { id: "vouchers", label: "Vouchers", icon: <Ticket size={20} /> },
        { id: "locations", label: "Locations", icon: <MapPinPen size={20} /> },
        { id: "stats", label: "Statistics", icon: <BarChart3 size={20} /> },
    ];

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleTabClick = (id) => {
        setActiveTab(id);
        setIsMenuOpen(false); // close the menu when a tab is selected on mobile
    };

    return (
        <div className={styles.adminWrapper}>
            {/* HAMBURGER BUTTON (MOBILE ONLY) */}
            <button className={styles.mobileMenuBtn} onClick={toggleMenu}>
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <aside className={`${styles.sidebar} ${isMenuOpen ? styles.sidebarOpen : ""}`}>
                <div className={styles.brand}>THE MINERS <span>ADMIN</span></div>
                <nav className={styles.nav}>
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            className={activeTab === item.id ? styles.navItemActive : styles.navItem}
                            onClick={() => handleTabClick(item.id)}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </nav>
                <button className={styles.exitBtn} onClick={onLogout}>
                    <LogOut size={18} /> Exit Admin
                </button>
            </aside>

            {/* OVERLAY */}
            {isMenuOpen && <div className={styles.overlay} onClick={toggleMenu}></div>}    

            <main className={styles.mainContent}>
                <header className={styles.mobileHeader}>
                    <h1>{menuItems.find(m => m.id === activeTab)?.label}</h1>
                </header>
                <div className={styles.contentWrapper}>
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;