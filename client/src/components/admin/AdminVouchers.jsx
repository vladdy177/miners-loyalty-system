import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";
import styles from "../styles/AdminVouchers.module.css";

const AdminVouchers = () => {
    const [vouchers, setVouchers] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [targetSegment, setTargetSegment] = useState({ gender: 'all', branchId: 'all', tier: 'all' });
    const [selectedTpl, setSelectedTpl] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        cost: "",
        image_url: "",
        is_crew_only: false,
        valid_duration_days: 30,
        discount_type: "free_product",
        discount_value: 0
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

    // Create segmented voucher
    const handleBlast = async () => {
        if (!selectedTpl) return alert("Select a voucher first");
        const res = await axios.post(`${apiUrl}/api/admin/vouchers/assign-bulk`, {
            templateId: selectedTpl,
            segment: targetSegment
        });
        alert(`Success! Voucher sent to ${res.data.count} users.`);
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
        setFormData({
            title: v.title || "",
            description: v.description || "",
            cost: v.cost || 0,
            image_url: v.image_url || "",
            is_crew_only: v.is_crew_only || false,
            valid_duration_days: v.valid_duration_days || 30, // ТЕПЕРЬ ПОДТЯГИВАЕТСЯ
            discount_type: v.discount_type || "free_product",
            discount_value: v.discount_value || 0
        });
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
                    <div className={styles.inputGroup}>
                        <select
                            value={formData.discount_type}
                            onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                            className={styles.inputSelect}
                        >
                            <option value="free_product">FREE PRODUCT (100% OFF)</option>
                            <option value="percentage">PERCENTAGE DISCOUNT (%)</option>
                        </select>

                        <div className={styles.inputWithLabel}>
                            <input
                                type="number"
                                placeholder={formData.discount_type === 'free_product' ? "—" : "Discount % (e.g. 10)"}
                                disabled={formData.discount_type === 'free_product'}
                                value={formData.discount_type === 'free_product' ? '' : formData.discount_value}

                                onChange={e => setFormData({ ...formData, discount_value: parseInt(e.target.value) || 0 })}
                                className={styles.inputNumber}
                            />
                        </div>

                        <input
                            placeholder="Validity (Days)"
                            type="number"
                            value={formData.valid_duration_days}
                            onChange={e => setFormData({ ...formData, valid_duration_days: e.target.value })}
                            className={styles.inputNumber}
                            required
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
                    id="voucherDescription"
                        placeholder="Description (List of products, terms...)"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className={styles.textarea}
                        required
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

            <div className={styles.addCard} style={{ borderTop: '5px solid var(--miners-orange)' }}>
                <h3>Targeted Marketing Campaign</h3>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>Assign a voucher to a specific user segment.</p>

                <div className={styles.formContent}>
                    <select value={selectedTpl} onChange={e => setSelectedTpl(e.target.value)} className={styles.inputMain}>
                        <option value="">-- Select Voucher Template --</option>
                        {vouchers.map(v => <option key={v.id} value={v.id}>{v.title} ({v.cost} pts)</option>)}
                    </select>

                    <div className={styles.inputGroup}>
                        <select onChange={e => setTargetSegment({ ...targetSegment, gender: e.target.value })} className={styles.inputSelect}>
                            <option value="all">All Genders</option>
                            <option value="male">Males</option>
                            <option value="female">Females</option>
                        </select>
                        <select onChange={e => setTargetSegment({ ...targetSegment, tier: e.target.value })} className={styles.inputSelect}>
                            <option value="all">All Tiers</option>
                            <option value="STANDARD">Standard</option>
                            <option value="SILVER">Silver</option>
                            <option value="GOLD">Gold</option>
                        </select>
                        <button onClick={handleBlast} className={styles.submitBtn} style={{ backgroundColor: 'var(--miners-orange)' }}>
                            SEND TO SEGMENT
                        </button>
                    </div>
                </div>
            </div>

            {/* VOUCHER LIST */}
            <div className={styles.vouchersList}>
                {vouchers.map(v => (
                    <div key={v.id} className={styles.voucherCard} style={{ borderLeftColor: v.is_crew_only ? 'var(--miners-red)' : '#e2e8f0' }}>
                        <div className={styles.voucherInfo}>
                            <img src={v.image_url || "/espresso.jpg"} alt={v.title}
                                onError={(e) => { e.target.src = "/espresso.jpg"; }} />
                            <div className={styles.voucherDesc}>
                                {v.is_crew_only && <span className={styles.crewTag}>CREW</span>}
                                <h3>{v.title}</h3>
                                <p>{v.description}</p>
                                <p>Valid for {v.valid_duration_days} days</p>
                                <span className={styles.voucherCost}>{v.cost} points</span>
                            </div>
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