import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, Pencil, Save, X, MapPin } from "lucide-react";
import styles from "../styles/AdminBranches.module.css"; // Используем те же стили

const AdminBranches = () => {
    const [branches, setBranches] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [formData, setFormData] = useState({
        name: "",
        address: "",
        city: "",
        country: ""
    });

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const controller = new AbortController();
        axios.get(`${apiUrl}/api/admin/branches-full`, { signal: controller.signal })
            .then(res => setBranches(res.data))
            .catch(err => { if (err.name !== 'CanceledError') console.error(err); });
        return () => controller.abort();
    }, [apiUrl, refreshTrigger]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${apiUrl}/api/admin/branches/save`, {
                ...formData,
                id: editingId
            });
            resetForm();
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            alert("Failed to save location.", err);
        }
    };

    const deleteBranch = async (id) => {
        if (!window.confirm("Delete this location? This will fail if customers are assigned to it.")) return;
        try {
            await axios.delete(`${apiUrl}/api/admin/branches/${id}`);
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            alert(err.response?.data?.error || "Error deleting branch");
        }
    };

    const startEdit = (b) => {
        setEditingId(b.id);
        setFormData({ name: b.name, address: b.address, city: b.city, country: b.country });
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: "", address: "", city: "", country: "" });
    };

    return (
        <div className={styles.container}>
            {/* BRANCH FORM */}
            <div className={styles.addCard}>
                <h1>{editingId ? "Edit Location" : "Add New Location"}</h1>
                <form onSubmit={handleSubmit} className={styles.formContent}>
                    <div className={styles.inputGroup}>
                        <input
                            placeholder="Country (e.g. Czech Republic)"
                            value={formData.country}
                            onChange={e => setFormData({ ...formData, country: e.target.value })}
                            className={styles.inputMain} required
                        />
                        <input
                            placeholder="City (e.g. Prague)"
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            className={styles.inputMain} required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <input
                            placeholder="Branch Name (e.g. The Miners Letná)"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className={styles.inputMain} required
                        />
                    </div>

                    <textarea
                        placeholder="Full Address..."
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className={styles.textarea} required
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

            {/* BRANCH LIST */}
            <div className={styles.list}>
                {branches.map(b => (
                    <div key={b.id} className={styles.branchCard}>
                        <div className={styles.branchInfo}>
                            <div className={styles.locationPath}>
                                {b.country} <span className={styles.arrow}>→</span> {b.city}
                            </div>
                            <div className={styles.branchTitle}>{b.name}</div>
                            <div className={styles.addressText}><MapPin size={12} /> {b.address}</div>
                        </div>
                        <div className={styles.actions}>
                            <button onClick={() => startEdit(b)} className={styles.editBtn}><Pencil size={18} /></button>
                            <button onClick={() => deleteBranch(b.id)} className={styles.deleteBtn}><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminBranches;