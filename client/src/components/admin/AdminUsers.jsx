import React, { useState, useEffect } from "react";
import axios from "axios";
import { Pencil, Save, X } from "lucide-react";
import styles from "../styles/AdminUsers.module.css";

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ points: 0, tier: "" });
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger for re-fetching

    const apiUrl = import.meta.env.VITE_API_URL;

    // 1. Fetch effect
    useEffect(() => {
        const controller = new AbortController();

        const fetchUsers = async () => {
            try {
                const res = await axios.get(`${apiUrl}/api/admin/users`, {
                    signal: controller.signal
                });
                setUsers(res.data);
            } catch (err) {
                if (err.name !== 'CanceledError') console.error("Fetch error", err);
            }
        };

        fetchUsers();
        return () => controller.abort();
    }, [apiUrl, refreshTrigger]); // Only re-runs when URL changes or we manually trigger it

    // 2. Actions
    const handleSave = async (userId) => {
        try {
            await axios.post(`${apiUrl}/api/admin/update-user`, {
                userId,
                points: editData.points,
                tier: editData.tier
            });
            setEditingId(null);
            setRefreshTrigger(prev => prev + 1); // Increment to trigger re-fetch
        } catch (err) {
            alert("Update failed", err);
        }
    };

    const startEdit = (user) => {
        setEditingId(user.id);
        setEditData({ points: user.points_balance, tier: user.tier });
    };

    return (
        <div className={styles.listContainer}>
            {users.map(user => (
                <div key={user.id} className={styles.userCard}>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>{user.first_name} {user.last_name}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                    </div>

                    {editingId === user.id ? (
                        <div className={styles.editActions}>
                            <input
                                type="number"
                                value={editData.points}
                                onChange={(e) => setEditData({ ...editData, points: parseInt(e.target.value) || 0 })}
                                className={styles.inputPoints}
                            />
                            <select
                                value={editData.tier}
                                onChange={(e) => setEditData({ ...editData, tier: e.target.value })}
                                className={styles.selectTier}
                            >
                                <option value="STANDARD">STANDARD</option>
                                <option value="SILVER">SILVER</option>
                                <option value="GOLD">GOLD</option>
                                <option value="CREW">CREW</option>
                            </select>
                            <button onClick={() => handleSave(user.id)} className={styles.saveBtn}><Save size={16} /></button>
                            <button onClick={() => setEditingId(null)} className={styles.cancelBtn}><X size={16} /></button>
                        </div>
                    ) : (
                        <div className={styles.displayInfo}>
                            <div className={styles.pointsBlock}>
                                <span className={styles.label}>POINTS</span>
                                <span className={styles.value}>{user.points_balance}</span>
                            </div>
                            <div
                                className={styles.tierBadge}
                                style={{ background: user.tier === 'CREW' ? '#FFEA00' : '#eee' }}
                            >
                                {user.tier}
                            </div>
                            <button onClick={() => startEdit(user)} className={styles.editBtn}>
                                <Pencil size={18} />
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default AdminUsers;