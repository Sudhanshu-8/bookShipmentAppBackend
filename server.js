const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Ensure JSON parsing

// ✅ MySQL Connection (Using Railway Database)
const db = mysql.createConnection({
  host:yamabiko.proxy.rlwy.net,
  user:root,
  password:ddrBcfCtHuESrHlYtUGbDepigbAGrxpu,
  database:railway,
  port:23513
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }
  console.log('✅ Connected to Railway MySQL Database');

  // ✅ Create Table if not exists
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS shipping_rates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      courier_name VARCHAR(50),
      pickup_pincode VARCHAR(10),
      delivery_pincode VARCHAR(10),
      price DECIMAL(10,2)
    )
  `;
  db.query(createTableQuery, (err) => {
    if (err) {
      console.error("❌ Error creating table:", err);
      return;
    }
    console.log('✅ Table "shipping_rates" is ready');

    // ✅ Check if table is empty before inserting data
    checkAndLoadData();
  });
});

// ✅ Function to Check & Insert Data from data.txt
const checkAndLoadData = () => {
  const dataFilePath = path.join(__dirname, 'data.txt');

  db.query("SELECT COUNT(*) AS count FROM shipping_rates", (err, results) => {
    if (err) {
      console.error("❌ Error checking table data:", err);
      return;
    }

    if (results[0].count > 0) {
      console.log("✅ Data already exists in 'shipping_rates'. Skipping file insertion.");
      return;
    }

    // 🔄 Read data from file and insert into database
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error("❌ Error Reading data.txt:", err);
        return;
      }

      console.log("✅ Successfully read data.txt");
      const lines = data.split('\n').map(line => line.trim()).filter(line => line);

      if (lines.length === 0) {
        console.log("⚠️ No data found in data.txt");
        return;
      }

      const insertQuery = `
        INSERT INTO shipping_rates (courier_name, pickup_pincode, delivery_pincode, price)
        VALUES ?
      `;

      const values = lines.map(line => {
        const parts = line.split(',');
        return parts.map(p => p.trim());
      });

      db.query(insertQuery, [values], (err) => {
        if (err) {
          console.error("❌ Error inserting data:", err);
        } else {
          console.log(`✅ Inserted ${values.length} records into 'shipping_rates'`);
        }
      });
    });
  });
};

// ✅ API to Fetch Shipping Rates
app.post('/getShippingRate', (req, res) => {
  console.log("📩 Received Request:", req.body);

  const { courier, pickup, delivery } = req.body;

  if (!courier || !pickup || !delivery) {
    console.log("❌ Missing Fields:", { courier, pickup, delivery });
    return res.status(400).json({ error: "All fields are required" });
  }

  const query = `
      SELECT price FROM shipping_rates
      WHERE courier_name = ? AND pickup_pincode = ? AND delivery_pincode = ?
  `;

  db.query(query, [courier, pickup, delivery], (err, results) => {
    if (err) {
      console.error("❌ Database Error:", err);
      return res.status(500).json({ error: err.message });
    }

    console.log("📜 SQL Query Executed:", query);
    console.log("📊 Query Parameters:", [courier, pickup, delivery]);
    console.log("📈 Query Results:", results);

    if (results.length > 0) {
      console.log("✅ Price Found:", results[0].price);
      res.json({ price: results[0].price });
    } else {
      console.log("⚠️ No Price Found for given inputs");
      res.json({ price: 0 });
    }
  });
});

// ✅ Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
