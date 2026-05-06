import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";
import styles from "../styles/AdminVouchers.module.css";

const AdminVouchers = () => {
    const [vouchers, setVouchers] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        cost: 0,
        image_url: "",
        is_crew_only: false,
        discount_type: "free_product"
    });

    const apiUrl = import.meta.env.VITE_API_URL;

    // Fetch Vouchers
    useEffect(() => {
        const controller = new AbortController();
        axios.get(`${apiUrl}/api/admin/vouchers`, { signal: controller.signal })
            .then(res => setVouchers(res.data))
            .catch(err => { if (err.name !== 'CanceledError') console.error(err); });
        return () => controller.abort();
    }, [apiUrl, refreshTrigger]);

    // Create or Update
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`${apiUrl}/api/admin/vouchers/${editingId}`, formData);
            } else {
                await axios.post(`${apiUrl}/api/admin/vouchers`, formData);
            }
            resetForm();
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            alert("Failed to save reward item.", err);
        }
    };

    // Delete Voucher
    const deleteV = async (id) => {
        if (!window.confirm("Are you sure you want to delete this reward? This cannot be undone.")) return;
        try {
            await axios.delete(`${apiUrl}/api/admin/vouchers/${id}`);
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            alert("Error: This item might be linked to users and cannot be deleted.", err);
        }
    };

    const startEdit = (v) => {
        setEditingId(v.id);
        setFormData({ ...v });
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ title: "", description: "", cost: 0, image_url: "", is_crew_only: false, discount_type: "free_product" });
    };

    return (
        <div className={styles.container}>
            {/* VOUCHER FORM */}
            <div className={styles.addCard}>
                <h1>{editingId ? "Edit Reward" : "Add New Reward (Shop Item)"}</h1>
                <form onSubmit={handleSubmit} className={styles.formContent}>
                    {/* First Row: Title and Cost */}
                    <div className={styles.inputGroup}>
                        <input
                            placeholder="Reward Title (e.g. FREE COFFEE)"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className={styles.inputMain} required
                        />
                        <input
                            placeholder="Cost" type="number"
                            value={formData.cost}
                            onChange={e => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })}
                            className={styles.inputNumber} required
                        />
                    </div>

                    {/* Second Row: Image and Crew Toggle */}
                    <div className={styles.inputGroup}>
                        <input
                            placeholder="Image URL (Unsplash or internal)"
                            value={formData.image_url}
                            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                            className={styles.inputMain}
                        />
                        <select
                            value={formData.is_crew_only}
                            onChange={e => setFormData({ ...formData, is_crew_only: e.target.value === "true" })}
                            className={styles.inputSelect}
                        >
                            <option value="false">GUEST ITEM</option>
                            <option value="true">CREW ONLY</option>
                        </select>
                    </div>

                    {/* Third Row: Description */}
                    <textarea
                        placeholder="Description (List of products, terms...)"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className={styles.textarea}
                    />

                    <div className={styles.formActions}>
                        <button type="submit" className={styles.submitBtn}>
                            {editingId ? <Save size={20} /> : <Plus size={20} />}
                            <span>{editingId ? "UPDATE" : "CREATE"}</span>
                        </button>
                        {editingId && (
                            <button type="button" onClick={resetForm} className={styles.cancelBtn}>
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* VOUCHER LIST */}
            <div className={styles.vouchersList}>
                {vouchers.map(v => (
                    <div key={v.id} className={styles.voucherCard} style={{ borderLeftColor: v.is_crew_only ? '#FFEA00' : '#e2e8f0' }}>
                        <div className={styles.voucherInfo}>
                            {v.title}
                            <span className={styles.voucherCost}>{v.cost} PTS</span>
                            {v.is_crew_only && <span className={styles.crewTag}>CREW</span>}
                        </div>
                        <div className={styles.actions}>
                            <button onClick={() => startEdit(v)} className={styles.editBtn}><Pencil size={18} /></button>
                            <button onClick={() => deleteV(v.id)} className={styles.deleteBtn}><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminVouchers;