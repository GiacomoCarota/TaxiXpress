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

app.use("/html", express.static(path.join(__dirname, "html")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use(express.json());

function generateRandomId() {
  return crypto.randomBytes(8).toString("hex").substring(0, 8); // Usa "length" per limitare i caratteri
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "html", "home.html"));
});

app.post("/login", async (req, res) => {
const { email, password } = req.body;

if (!email || !password) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
}

try {
    const users = await sql`SELECT * FROM utente WHERE email = ${email}`;
    const user = users[0];

    if (!user) {
        return res.status(401).json({ error: "Email o password errati" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passhash);
    if (!passwordMatch) {
        return res.status(401).json({ error: "Email o password errati" });
    }

    res.status(200).json({
        idu: user.idu,
        nome: user.name,
        email: user.email,
    });
    } catch (error) {
    console.error("Errore durante il login:", error.message);
    res.status(500).json({ error: "Errore del server, riprova più tardi" });
    }
});

app.post("/signup", async (req, res) => {
    const { name, surname, email, password } = req.body;
    console.log("Dati Ricevuti");
    console.log(name,surname,email,password);
    if (!name || !surname || !email || !password) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
}

try {
    
    // Controlla se l'utente esiste già
    const userCheck = await sql`SELECT * FROM utente WHERE email = ${email}`
    console.log(userCheck)
    if (userCheck.length > 0) {
        return res.status(409).json({ error: "Email già registrata" });
    }

    const idCliente = generateRandomId(8); // Lunghezza 8 caratteri
    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserisci il nuovo utente nel database
    await sql`INSERT INTO utente (nome, cognome, email, password, tipo) VALUES (${name}, ${surname}, ${email}, ${hashedPassword},${tipo})`

    res.status(201).json({ message: "Registrazione effettuata con successo" });
    } catch (error) {
    console.error("Errore durante la registrazione:", error);
    res.status(500).json({ error: error.message });
    }
});


// Avvia il server
app.listen(port, () => {
    console.log(`Server avviato su http://localhost:${port}`);
});