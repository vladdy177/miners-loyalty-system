import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, Pencil, Save, X, Mail } from "lucide-react";
import styles from "../styles/AdminVouchers.module.css";
import Popup from "../Popup";

const AdminVouchers = () => {
    const [vouchers, setVouchers] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [targetSegment, setTargetSegment] = useState({ gender: 'all', branchId: 'all', tier: 'all' });
    const [selectedTpl, setSelectedTpl] = useState("");
    const [popup, setPopup] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        cost: "",
        image_url: "",
        is_crew_only: false,
        valid_duration_days: "",
        discount_type: "free_product",
        discount_value: 0
    });

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const controller = new AbortController();
        axios.get(`${apiUrl}/api/admin/vouchers`, { signal: controller.signal })
            .then(res => setVouchers(res.data))
            .catch(err => { if (err.name !== 'CanceledError') console.error(err); });
        return () => controller.abort();
    }, [apiUrl, refreshTrigger]);

    // Fixed showMessage to handle optional confirmation logic
    const showMessage = (type, title, message, onConfirm = null) => {
        setPopup({ isOpen: true, type, title, message, onConfirm });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`${apiUrl}/api/admin/vouchers/${editingId}`, formData);
                showMessage('success', 'Updated', 'Voucher updated successfully');
            } else {
                await axios.post(`${apiUrl}/api/admin/vouchers`, formData);
                showMessage('success', 'Created', 'New reward added to the shop');
            }
            resetForm();
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            showMessage('error', 'Save Failed', err.response?.data?.error || "Check your database connection");
        }
    };

    const handleBlast = async () => {
        if (!selectedTpl) return showMessage('warning', 'Selection Required', 'Please select a voucher template first');
        try {
            const res = await axios.post(`${apiUrl}/api/admin/vouchers/assign-bulk`, {
                templateId: selectedTpl,
                segment: targetSegment
            });
            showMessage('success', 'Campaign Sent', `Voucher successfully distributed to ${res.data.count} users.`);
        } catch (err) {
            showMessage('error', `Campaign Failed', 'No users found in this segment or server error.(${err})`);
        }
    };

    const executeDelete = async (id) => {
        try {
            await axios.delete(`${apiUrl}/api/admin/vouchers/${id}`);
            setRefreshTrigger(prev => prev + 1);
            showMessage('success', 'Deleted', 'The reward has been removed from the system.');
        } catch (err) {
            showMessage('error', 'Delete Failed', `This item is already linked to users and cannot be deleted.(${err})`);
        }
    };

    const deleteV = (id) => {
        showMessage(
            'warning',
            'DELETE REWARD?',
            'Are you sure? This cannot be undone.',
            () => executeDelete(id)
        );
    };

    const startEdit = (v) => {
        setEditingId(v.id);
        setFormData({
            title: v.title || "",
            description: v.description || "",
            cost: v.cost || 0,
            image_url: v.image_url || "",
            is_crew_only: v.is_crew_only || false,
            valid_duration_days: v.valid_duration_days,
            discount_type: v.discount_type || "free_product",
            discount_value: v.discount_value || 0
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            title: "", description: "", cost: "", image_url: "",
            is_crew_only: false, valid_duration_days: null,
            discount_type: "free_product", discount_value: 0
        });
    };

    return (
        <div className={styles.container}>
            {/* VOUCHER FORM */}
            <div className={styles.addCard}>
                <h2 className={styles.adminSectionTitle}>{editingId ? "EDIT REWARD" : "CREATE NEW REWARD"}</h2>
                <form onSubmit={handleSubmit} className={styles.formContent}>
                    <div className={styles.inputGroup}>
                        <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>Voucher Title</label>
                            <input
                                placeholder="e.g. FREE COFFEE"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className={styles.inputMain} required
                            />
                        </div>
                    </div>
                    <div className={styles.inputGroup}>
                        <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>User Validity (Days)</label>
                            <input
                                type="number"
                                value={formData.valid_duration_days ?? ''}
                                onChange={e => setFormData({
                                    ...formData,
                                    valid_duration_days: e.target.value === '' ? '' : parseInt(e.target.value)
                                })}
                                className={styles.inputNumber}
                                required
                                placeholder="e.g. 30"
                            />
                        </div>
                        <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>Target Group</label>
                            <select
                                value={formData.is_crew_only}
                                onChange={e => setFormData({ ...formData, is_crew_only: e.target.value === "true" })}
                                className={styles.inputSelect}
                            >
                                <option value="false">GUESTS</option>
                                <option value="true">CREW</option>
                            </select>
                        </div>
                        <div className={styles.inputWithLabel} style={{ flex: 0.5 }}>
                            <label className={styles.fieldLabel}>Points Cost</label>
                            <input
                                type="number"
                                placeholder="e.g. 850"
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })}
                                className={styles.inputNumber} required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>Reward Type</label>
                            <select
                                value={formData.discount_type}
                                onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                                className={styles.inputSelect}
                            >
                                <option value="free_product">FREE PRODUCT</option>
                                <option value="percentage">DISCOUNT (%)</option>
                            </select>
                        </div>

                        <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>Value</label>
                            <input
                                type="number"
                                placeholder={formData.discount_type === 'free_product' ? "—" : "e.g. 10"}
                                disabled={formData.discount_type === 'free_product'}
                                value={formData.discount_type === 'free_product' ? '' : formData.discount_value}
                                onChange={e => setFormData({ ...formData, discount_value: parseInt(e.target.value) || 0 })}
                                className={styles.inputNumber}
                            />
                        </div>


                    </div>

                    <div className={styles.inputGroup}>
                        <div className={styles.inputWithLabel}>
                            <label className={styles.fieldLabel}>Image URL</label>
                            <input
                                placeholder="https://unsplash.com/..."
                                value={formData.image_url}
                                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                className={styles.inputMain}
                            />
                        </div>
                    </div>

                    <div className={styles.inputWithLabel}>
                        <label className={styles.fieldLabel}>Description (Barista info)</label>
                        <textarea
                            placeholder="List products included in this voucher..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className={styles.textarea} required
                        />
                    </div>

                    <div className={styles.formActions}>
                        <button type="submit" className={styles.submitBtn}>
                            {editingId ? <Save size={18} /> : <Plus size={18} />}
                            <span>{editingId ? "UPDATE REWARD" : "CREATE REWARD"}</span>
                        </button>
                        {editingId && (
                            <button type="button" onClick={resetForm} className={styles.cancelBtn}>
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* SEGMENTATION CARD */}
            <div className={styles.addCard} style={{ borderTop: '5px solid var(--miners-orange)' }}>
                <h2 className={styles.adminSectionTitle}>TARGETED CAMPAIGN</h2>
                <p className={styles.sectionHint}>Manually assign a voucher to a specific user segment.</p>
                <div className={styles.formContent}>
                    <div className={styles.inputGroup, styles.segment}>
                        <select value={selectedTpl} onChange={e => setSelectedTpl(e.target.value)} className={styles.inputMain}>
                            <option value="">-- Choose Reward Template --</option>
                            {vouchers.map(v => <option key={v.id} value={v.id}>{v.title} ({v.cost} pts)</option>)}
                        </select>

                        <select onChange={e => setTargetSegment({ ...targetSegment, gender: e.target.value })} className={styles.inputSelect}>
                            <option value="all">ALL GENDERS</option>
                            <option value="male">MALES</option>
                            <option value="female">FEMALES</option>
                        </select>
                        <select onChange={e => setTargetSegment({ ...targetSegment, tier: e.target.value })} className={styles.inputSelect}>
                            <option value="all">ALL TIERS</option>
                            <option value="STANDARD">STANDARD</option>
                            <option value="SILVER">SILVER</option>
                            <option value="GOLD">GOLD</option>
                            <option value="CREW">CREW</option>
                        </select>
                        <button onClick={handleBlast} className={styles.blastBtn}>
                            SEND TO SEGMENT
                        </button>
                    </div>
                </div>
            </div>

            {/* VOUCHER LIST */}
            <div className={styles.vouchersList}>
                {vouchers.map(v => (
                    <div key={v.id} className={styles.voucherCard} style={{ borderLeft: v.is_crew_only ? '6px solid var(--miners-orange)' : '6px solid #e2e8f0' }}>
                        <div className={styles.voucherInfo}>
                            <div className={styles.vImgPreview}>
                                <img
                                    src={v.image_url || "/espresso.jpg"}
                                    alt="v"
                                    onError={(e) => { e.target.src = "/espresso.jpg"; }}
                                />
                            </div>
                            <div className={styles.voucherDesc}>
                                <div className={styles.titleRow}>
                                    <h3>{v.title}</h3>
                                    {v.is_crew_only && <span className={styles.crewBadge}>CREW ONLY</span>}
                                </div>
                                <p className={styles.vShortDesc}>{v.description}</p>
                                <div className={styles.vMeta}>
                                    <span><strong>{v.cost}</strong> points</span>
                                    <span className={styles.dot}>/</span>
                                    <span>Valid for {v.valid_duration_days} days</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.actions}>
                            <button onClick={() => startEdit(v)} className={styles.editBtn}><Pencil size={18} /></button>
                            <button onClick={() => deleteV(v.id)} className={styles.deleteBtn}><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>

            <Popup
                isOpen={popup.isOpen}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onConfirm={popup.onConfirm}
                onClose={() => setPopup({ ...popup, isOpen: false })}
            />
        </div>
    );
};

export default AdminVouchers;