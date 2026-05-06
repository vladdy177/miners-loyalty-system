import React, { useState } from "react";
import styles from "../styles/AdminLayout.module.css";
import { LayoutDashboard, Users, Ticket, BarChart3, LogOut } from "lucide-react";

import Dashboard from "./Dashboard.jsx";
import AdminUsers from "./AdminUsers.jsx";
import AdminVouchers from "./AdminVouchers.jsx";
import Stats from "./Stats.jsx";

const AdminLayout = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState("dashboard");

    const renderContent = () => {
        switch (activeTab) {
            case "dashboard": return <Dashboard />;
            case "users": return <AdminUsers />;
            case "vouchers": return <AdminVouchers />;
            case "stats": return <Stats />;
            default: return <Dashboard />;
        }
    };

    return (
        <div className={styles.adminWrapper}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>THE MINERS <span>ADMIN</span></div>
                <nav className={styles.nav}>
                    <button className={activeTab === "dashboard" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("dashboard")}>
                        <LayoutDashboard size={20} /> Dashboard
                    </button>
                    <button className={activeTab === "users" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("users")}>
                        <Users size={20} /> Customers
                    </button>
                    <button className={activeTab === "vouchers" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("vouchers")}>
                        <Ticket size={20} /> Voucher Shop
                    </button>
                    <button className={activeTab === "stats" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("stats")}>
                        <BarChart3 size={20} /> Statistics
                    </button>
                </nav>
                <button className={styles.exitBtn} onClick={onLogout}>
                    <LogOut size={18} /> Exit Admin
                </button>
            </aside>
            <main className={styles.mainContent}>{renderContent()}</main>
        </div>
    );
};

export default AdminLayout;