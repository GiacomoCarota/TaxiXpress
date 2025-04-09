const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");
const crypto = require("crypto");
const postgres = require('postgres');


require("dotenv").config();

const app = express();
const port = 3000;

const connectionString = process.env.DATABASE_URL
const sql = postgres(connectionString)


// Configura CORS
app.use(cors());

app.use(express.static(path.join(__dirname, "html")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use(express.json());

// Avvia il server
app.listen(port, () => {
    console.log(`Server avviato su http://localhost:${port}`);
});