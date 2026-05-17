import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./styles/Register.module.css";

const Register = ({ onRegistrationSuccess }) => {
  const [formData, setFormData] = useState({
    email: "", firstName: "", lastName: "", gender: "unspecified",
    birthDay: "", birthMonth: "", birthYear: "", homeBranchId: "",
  });

  const [allBranches, setAllBranches] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [message, setMessage] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    axios.get(`${apiUrl}/api/branches`)
      .then(res => setAllBranches(res.data))
      .catch(err => console.error("Error fetching branches", err));
  }, [apiUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (value !== "" && !/^\d+$/.test(value)) return;
    const limit = name === "birthYear" ? 4 : 2;
    const currentYear = new Date().getFullYear();
    const maxVal = name === "birthDay" ? 31 : name === "birthMonth" ? 12 : currentYear;

    if (value.length <= limit) {
      if (value === "" || Number(value) <= maxVal) {
        setFormData({ ...formData, [name]: value });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.birthDay || !formData.birthMonth || !formData.birthYear || formData.birthYear.length < 4) {
      setMessage("Please enter a valid birth date.");
      return;
    }
    const currentYear = new Date().getFullYear();
    const birthYear = parseInt(formData.birthYear);
    if (birthYear < currentYear - 90 || birthYear > currentYear) {
      setMessage(`Birth year must be between ${currentYear - 90} and ${currentYear - 10}.`);
      return;
    }
    try {
      const formattedDate = `${formData.birthYear}-${formData.birthMonth.padStart(2, '0')}-${formData.birthDay.padStart(2, '0')}`;
      const dataToSend = { ...formData, birthDate: formattedDate };
      await axios.post(`${apiUrl}/api/users/register`, dataToSend);
      if (onRegistrationSuccess) onRegistrationSuccess(formData.email);
    } catch (err) {
      setMessage(err.response?.data?.error || "Registration failed");
    }
  };

  const countries = [...new Set(allBranches.map(b => b.country))].filter(Boolean);
  const cities = [...new Set(allBranches.filter(b => b.country === selectedCountry).map(b => b.city))].filter(Boolean);
  const filteredBranches = allBranches.filter(b => b.city === selectedCity);

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.formGroup}>
        {/* Personal Details */}
        <input placeholder="First Name" name="firstName" required maxLength={30} onChange={handleChange} className={styles.input} />
        <input placeholder="Last Name" name="lastName" maxLength={30} onChange={handleChange} className={styles.input} />
        <input placeholder="Email Address" type="email" name="email" required onChange={handleChange} className={styles.input} />

        {/* Gender */}
        <div className={styles.form_data}>
          <p className={styles.label}>Gender</p>
          <select name="gender" value={formData.gender} onChange={handleChange} className={styles.input}>
            <option value="unspecified">Unspecified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Birth Date */}
        <div className={styles.form_data}>
          <label className={styles.label}>Birth Date</label>
          <div className={styles.dateRow}>
            <input type="text" inputMode="numeric" name="birthDay" placeholder="DD" value={formData.birthDay} onChange={handleDateChange} className={`${styles.inputDate} ${styles.inputSmall}`} />
            <input type="text" inputMode="numeric" name="birthMonth" placeholder="MM" value={formData.birthMonth} onChange={handleDateChange} className={`${styles.inputDate} ${styles.inputSmall}`} />
            <input type="text" inputMode="numeric" name="birthYear" placeholder="YYYY" value={formData.birthYear} onChange={handleDateChange} className={`${styles.inputDate} ${styles.inputMedium}`} />
          </div>
        </div>

        {/* Location Selection */}
        <div className={styles.form_data}>
          <p className={styles.label}>Branch Location</p>
          <div className={styles.formGroup}>
            <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedCity(""); }} className={styles.input}>
              <option value="">-- Country --</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select disabled={!selectedCountry} value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className={styles.input}>
              <option value="">-- City --</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select name="homeBranchId" disabled={!selectedCity} required onChange={handleChange} className={styles.input}>
              <option value="">-- Specific Location --</option>
              {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" className={styles.submitButton}>Create Account</button>
      </form>

      {message && <p className={styles.successMessage}>{message}</p>}
    </div>
  );
};

export default Register;