const db = require("./config/db");

const fixCzechData = async () => {
  const branchId = "a4fdd054-9c40-4ae1-97de-711bf19c96d6"; // Your Letná ID
  const newName = "Letná";
  const newAddress = "Milady Horákové 808/38, 170 00 Praha 7";

  try {
    console.log(`Updating branch ${branchId}...`);

    const result = await db.query(
      "UPDATE branches SET name = $1, address = $2 WHERE id = $3 RETURNING *",
      [newName, newAddress, branchId],
    );

    if (result.rows.length > 0) {
      console.log("SUCCESS! Data in DB now:");
      console.log("Name:", result.rows[0].name);
      console.log("Address:", result.rows[0].address);
    } else {
      console.log("Branch not found. Check the ID.");
    }
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    process.exit();
  }
};

fixCzechData();
