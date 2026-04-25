import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./Register.module.css"

const Register = () => {
  // 1. STATE: This is the "memory" of your component.
  // We store the values the user types here.
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    gender: "unspecified",
    birthDate: "",
    homeBranchId: "",
  });

  // 2. STATE: This stores the list of cafes fetched from the database.
  const [branches, setBranches] = useState([]);
  
  // 3. STATE: This stores the success or error message to show the user.
  const [message, setMessage] = useState("");

  // 4. USEEFFECT: This code runs only ONCE when the page first loads.
  // It asks the Backend for the list of coffee shops (Letná, etc.).
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await axios.get(`${apiUrl}/api/branches`);
        setBranches(res.data); // Put the list into the "branches" state
      } catch (err) {
        console.error("Error fetching branches from DB", err);
      }
    };
    fetchBranches();
  }, []);

  // 5. EVENT HANDLER: This runs every time the user types a letter.
  // It updates the "formData" memory.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ 
        ...formData, // Keep all existing data
        [name]: value // Update only the field that changed (e.g., email)
    });
  };

  // 6. SUBMIT HANDLER: This runs when the user clicks the button.
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents the browser from refreshing the page
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      
      // We only care that the request completes successfully.
      await axios.post(`${apiUrl}/api/register`, formData);
      
      setMessage("Registration successful!");
    } catch (err) {
      // If the server returns an error (like 400 or 500), this code runs.
      setMessage(err.response?.data?.error || "Registration failed");
    }
  };

  // 7. THE UI: Plain HTML structure without styles.
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Register</h2>
      
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>First Name:</label>
          <input type="text" name="firstName" required onChange={handleChange} className={styles.input}/>
        </div>

        <div>
          <label className={styles.label}>Last Name:</label>
          <input type="text" name="lastName" onChange={handleChange} className={styles.input}/>
        </div>

        <div>
          <label className={styles.label}>Email:</label>
          <input type="email" name="email" required onChange={handleChange} className={styles.input}/>
        </div>

        <div>
          <label className={styles.label}>Gender:</label>
          <select name="gender" onChange={handleChange}>
            <option value="unspecified">Unspecified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className={styles.label}>Birth Date:</label>
          <input type="date" name="birthDate" onChange={handleChange} className={styles.input}/>
        </div>

        <div>
          <label className={styles.label}>Favorite Cafe (Branch):</label>
          <select name="homeBranchId" required onChange={handleChange}>
            <option value="">Select a branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className={styles.submitButton}>Register</button>
      </form>

      {/* Show message if it exists */}
      {message && <p className={styles.successMessage}>{message}</p>}
    </div>
  );
};

export default Register;