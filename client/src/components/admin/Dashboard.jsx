import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, Coins, Ticket } from "lucide-react";

const Dashboard = () => {
    const [stats, setStats] = useState({ totalUsers: 0, totalPoints: 0, totalVouchers: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            const apiUrl = import.meta.env.VITE_API_URL;
            const res = await axios.get(`${apiUrl}/api/admin/users`); // We can count from user list for now
            const users = res.data;
            const points = users.reduce((acc, curr) => acc + curr.points_balance, 0);
            setStats({ totalUsers: users.length, totalPoints: points, totalVouchers: 4 });
        };
        fetchStats();
    }, []);

    const cardStyle = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div style={cardStyle}>
                    <Users size={24} color="#666" />
                    <p style={{ color: '#888', fontSize: '12px', marginTop: '10px' }}>TOTAL CUSTOMERS</p>
                    <p style={{ fontSize: '28px', margin: 0 }}>{stats.totalUsers}</p>
                </div>
                <div style={cardStyle}>
                    <Coins size={24} color="#666" />
                    <p style={{ color: '#888', fontSize: '12px', marginTop: '10px' }}>POINTS IN CIRCULATION</p>
                    <p style={{ fontSize: '28px', margin: 0 }}>{stats.totalPoints.toLocaleString()}</p>
                </div>
                <div style={cardStyle}>
                    <Ticket size={24} color="#666" />
                    <p style={{ color: '#888', fontSize: '12px', marginTop: '10px' }}>ACTIVE REWARDS</p>
                    <p style={{ fontSize: '28px', margin: 0 }}>{stats.totalVouchers}</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;