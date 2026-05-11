import React, { useState, useEffect } from "react";
import axios from "axios";
import { Pencil, Save, X, Search, Filter, MapPin, Mail } from "lucide-react";
import styles from "../styles/AdminUsers.module.css";

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ points: 0, tier: "" });
    // FILTERING
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCountry, setFilterCountry] = useState("all");
    const [filterCity, setFilterCity] = useState("all");
    const [filterBranch, setFilterBranch] = useState("all");
    // REFRESH TRIGGER
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const controller = new AbortController();
        const fetchData = async () => {
            try {
                const [uRes, bRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/admin/users`, { signal: controller.signal }),
                    axios.get(`${apiUrl}/api/branches`, { signal: controller.signal })
                ]);
                setUsers(uRes.data);
                setBranches(bRes.data);
            } catch (err) { if (err.name !== 'CanceledError') console.error(err); }
        };
        fetchData();
        return () => controller.abort();
    }, [apiUrl, refreshTrigger]);


    // 1. Extract Unique lists for filters
    const countries = [...new Set(branches.map(b => b.country))];
    const cities = [...new Set(branches.filter(b => filterCountry === "all" || b.country === filterCountry).map(b => b.city))];
    const branchList = branches.filter(b => filterCity === "all" || b.city === filterCity);

    // 2. THE FILTERING LOGIC
    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.first_name + " " + user.last_name + user.email).toLowerCase().includes(searchTerm.toLowerCase());

        // Find the branch object for this user to get its city/country
        const userBranchObj = branches.find(b => b.name === user.home_branch);

        const matchesCountry = filterCountry === "all" || userBranchObj?.country === filterCountry;
        const matchesCity = filterCity === "all" || userBranchObj?.city === filterCity;
        const matchesBranch = filterBranch === "all" || user.home_branch === filterBranch;

        return matchesSearch && matchesCountry && matchesCity && matchesBranch;
    });

    // USER POINTS AND TIER EDIT
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
            <div className={styles.toolbar}>
                {/* Search */}
                <input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={styles.searchField} />

                {/* Hierarchical Dropdowns */}
                <select value={filterCountry} onChange={e => { setFilterCountry(e.target.value); setFilterCity("all"); setFilterBranch("all"); }}>
                    <option value="all">All Countries</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select disabled={filterCountry === "all"} value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterBranch("all"); }}>
                    <option value="all">All Cities</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select disabled={filterCity === "all"} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                    <option value="all">All Branches</option>
                    {branchList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
            </div>

            {/* List Header/Stats */}
            <p className={styles.resultsCount}>Showing {filteredUsers.length} customers</p>

            {filteredUsers.map(user => (
                <div key={user.id} className={styles.userCard}>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>{user.first_name} {user.last_name}</div>
                        <div className={styles.userEmail}><Mail size={12} />{user.email}</div>
                        <div className={styles.branchTag}>
                            <MapPin size={12} /> {user.home_branch}
                        </div>
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
                            <button onClick={() => handleSave(user.id)} className={styles.saveBtn}><Save size={18} /></button>
                            <button onClick={() => setEditingId(null)} className={styles.cancelBtn}><X size={18} /></button>
                        </div>
                    ) : (
                        <div className={styles.displayInfo}>
                            <div className={styles.pointsBlock}>
                                <span className={styles.label}>POINTS</span>
                                <span className={styles.value}>{user.points_balance}</span>
                            </div>
                            <div
                                className={styles.tierBadge}
                                style={{ background: user.tier === 'CREW' ? 'var(--miners-yellow)' : 'var(--miners-gray)' }}
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