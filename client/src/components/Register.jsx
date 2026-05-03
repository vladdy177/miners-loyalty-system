import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./styles/Register.module.css";

const Register = ({onRegistrationSuccess}) => {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    gender: "unspecified",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    homeBranchId: "",
  });

  const [allBranches, setAllBranches] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await axios.get(`${apiUrl}/api/branches`);
        setAllBranches(res.data);
      } catch (err) {
        console.error("Error fetching branches", err);
      }
    };
    fetchBranches();
  }, []);

  // Standard handler for text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // 1. SPECIFIC HANDLER FOR DATE: Limits the character length
  const handleDateChange = (e) => {
    const { name, value } = e.target;

    if (value !== "" && !/^\d+$/.test(value)) return;

    if (name === "birthDay") {
      if (value.length <= 2) {
        if (value === "" || (Number(value) <= 31)) {
          setFormData({ ...formData, [name]: value });
        }
      }
    }

    else if (name === "birthMonth") {
      if (value.length <= 2) {
        if (value === "" || (Number(value) <= 12)) {
          setFormData({ ...formData, [name]: value });
        }
      }
    }

    else if (name === "birthYear") {
      if (value.length <= 4) {
        if (value === "" || (Number(value) <= new Date().getFullYear())) {
          setFormData({ ...formData, [name]: value });
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL;

      // Ensure single digits become double digits (e.g., "5" -> "05")
      const dd = formData.birthDay.padStart(2, '0');
      const mm = formData.birthMonth.padStart(2, '0');
      const yyyy = formData.birthYear;

      const formattedDate = `${yyyy}-${mm}-${dd}`;

      const dataToSend = {
        ...formData,
        birthDate: formattedDate
      };

      await axios.post(`${apiUrl}/api/users/register`, dataToSend);
      console.log("Регистрация успешна, пытаюсь вызвать onRegistrationSuccess...");

      if (onRegistrationSuccess) {
        onRegistrationSuccess(formData.email);
        console.log("Функция вызвана с email:", formData.email);
      } else {
        console.log("ОШИБКА: Пропс onRegistrationSuccess не найден!");
      }
    } catch (err) {
      setMessage(err.response?.data?.error || "Registration failed");
    }
  };

  const countries = [...new Set(allBranches.map((b) => b.country))].filter(Boolean);
  const cities = [...new Set(allBranches.filter((b) => b.country === selectedCountry).map((b) => b.city))].filter(Boolean);
  const filteredBranches = allBranches.filter((b) => b.city === selectedCity);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Registration form</h2>

      <form onSubmit={handleSubmit} className={styles.formGroup}>
        <input placeholder="First Name" name="firstName" required onChange={handleChange} className={styles.input} />
        <input placeholder="Last Name" name="lastName" onChange={handleChange} className={styles.input} />
        <input placeholder="Email" type="email" name="email" required onChange={handleChange} className={styles.input} />

        <div className={styles.form_data}>
          <p className={styles.label}>Gender:</p>
          <select name="gender" value={formData.gender} onChange={handleChange} className={styles.input}>
            <option value="unspecified">Unspecified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* 2. BIRTH DATE with inputMode and length limits */}
        <div className={styles.form_data}>
          <label className={styles.label}>Birth Date:</label>
          <div className={styles.dateRow}>
            <input
              type="text"
              inputMode="numeric"
              name="birthDay"
              placeholder="DD"
              value={formData.birthDay}
              onChange={handleDateChange}
              className={`${styles.inputDate} ${styles.inputSmall}`}
            />
            <input
              type="text"
              inputMode="numeric"
              name="birthMonth"
              placeholder="MM"
              value={formData.birthMonth}
              onChange={handleDateChange}
              className={`${styles.inputDate} ${styles.inputSmall}`}
            />
            <input
              type="text"
              inputMode="numeric"
              name="birthYear"
              placeholder="YYYY"
              value={formData.birthYear}
              onChange={handleDateChange}
              className={`${styles.inputDate} ${styles.inputMedium}`}
            />
          </div>
        </div>

        <div className={styles.form_data}>
          <p className={styles.label}>Branch location</p>
          <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedCity(""); }} className={styles.input}>
            <option value="">-- Country --</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className={styles.form_data}>
          <select disabled={!selectedCountry} value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className={styles.input}>
            <option value="">-- City --</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className={styles.form_data}>
          <select name="homeBranchId" disabled={!selectedCity} required onChange={handleChange} className={styles.input}>
            <option value="">-- Location --</option>
            {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <button type="submit" className={styles.submitButton}>Finish Registration</button>
      </form>

      {message && <p className={styles.successMessage}>{message}</p>}
    </div>
  );
};

export default Register;