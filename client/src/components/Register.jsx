import React, { useState, useEffect } from "react";
import axios from "axios";

const Register = () => {
  // 1. Local state for form data
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    gender: "unspecified",
    birthDate: "",
    homeBranchId: "",
  });

  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState("");

  // 2. Fetch branches from Backend when component loads
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/branches");
        setBranches(res.data);
      } catch (err) {
        console.error(err, "Chyba při načítání poboček");
      }
    };
    fetchBranches();
  }, []);

  // 3. Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 4. Submit form to Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:5000/api/register",
        formData,
      );
      setMessage("Registrace proběhla úspěšně! Vítejte v The Miners.");
      console.log(res.data);
    } catch (err) {
      setMessage(err.response?.data?.error || "Chyba při registraci");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Jméno</label>
        <input
          type="text"
          name="firstName"
          required
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Příjmení
        </label>
        <input
          type="text"
          name="lastName"
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          name="email"
          required
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Pohlaví
          </label>
          <select
            name="gender"
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white"
          >
            <option value="unspecified">Neuvedeno</option>
            <option value="male">Muž</option>
            <option value="female">Žena</option>
            <option value="other">Jiné</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Datum narození
          </label>
          <input
            type="date"
            name="birthDate"
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Domovská kavárna
        </label>
        <select
          name="homeBranchId"
          required
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white"
        >
          <option value="">Vyberte pobočku</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="w-full bg-black text-white font-bold py-3 rounded-md hover:bg-gray-800 transition duration-300"
      >
        Zaregistrovat se
      </button>

      {message && (
        <p className="mt-4 text-center text-sm font-semibold text-blue-600">
          {message}
        </p>
      )}
    </form>
  );
};

export default Register;
