import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, Coins, Ticket, MapPin, TrendingUp, UserCheck } from "lucide-react";
import styles from "../styles/Dashboard.module.css";

const Dashboard = () => {
    const [data, setData] = useState(null);
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        axios.get(`${apiUrl}/api/admin/stats-summary`).then(res => setData(res.data));
    }, [apiUrl]);

    if (!data) return <p>Loading Dashboard...</p>;

    const kpis = [
        {
            title: "Total Members",
            value: data.totalUsers,
            icon: <Users color="white" />,
            bg: "var(--miners-red)"
        },
        {
            title: "Points in Wallet",
            value: data.economy.earned - data.economy.burned,
            icon: <Coins color="black" />,
            bg: "var(--miners-gold)"
        },
        {
            title: "Avg. Points/User",
            value: data.avgPoints,
            icon: <TrendingUp color="white" />,
            bg: "var(--miners-orange)"
        },
        {
            title: "Top Location",
            value: data.topBranch,
            icon: <MapPin color="white" />,
            bg: "var(--miners-blue-cyan)"
        },
        {
            title: "Active Vouchers",
            value: data.vouchers.active,
            icon: <Ticket color="white" />,
            bg: "var(--miners-magenta)"
        },
        {
            title: "Avg. Customer Age", // Bonus card!
            value: `${data.avgAge} YRS`,
            icon: <UserCheck color="white" />,
            bg: "var(--miners-pink-light)"
        },
        {
            title: "Redemption Rate",
            value: `${((data.vouchers.used / data.vouchers.total || 0) * 100).toFixed(1)}%`,
            icon: <UserCheck color="white" />,
            bg: "var(--miners-green)"
        },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.grid}>
                {kpis.map((kpi, index) => (
                    <div key={index} className={styles.card} style={{ backgroundColor: kpi.bg }}>
                        <div className={styles.iconWrapper}>{kpi.icon}</div>
                        <div className={styles.cardInfo}>
                            <p className={styles.cardTitle}>{kpi.title}</p>
                            <h2 className={styles.cardValue}>{kpi.value}</h2>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick action or message */}
            <div className={styles.welcomeBox}>
                <h3>System Status: Online</h3>
                <p>Google Wallet API is synced. All systems operational.</p>
            </div>
        </div>
    );
};

export default Dashboard;