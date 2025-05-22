const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");
const crypto = require("crypto");
const postgres = require("postgres");

require("dotenv").config();

const app = express();
const port = 3000;

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

async function testDb() {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log("✅ Database connesso:", result);
  } catch (error) {
    console.error("❌ Errore database:", error);
  }
}
testDb();

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
  console.log("🔔 /login ricevuto:", { email, password: "***" }); // Non loggare la password in chiaro

  // Validazione input
  if (!email || !password) {
    console.log("⚠️ Campi mancanti");
    return res.status(400).json({ 
      error: "Email e password sono obbligatori",
      success: false 
    });
  }

  // Validazione formato email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log("⚠️ Formato email non valido");
    return res.status(400).json({ 
      error: "Formato email non valido",
      success: false 
    });
  }

  try {
    // Query per trovare l'utente
    const users = await sql`
      SELECT idu, nome, email, password 
      FROM utente 
      WHERE email = ${email.toLowerCase().trim()}
    `;
    
    const user = users[0];
    console.log("📋 Ricerca utente completata:", user ? "Trovato" : "Non trovato");

    if (!user) {
      console.log("❌ Utente non esistente per email:", email);
      return res.status(401).json({ 
        error: "Credenziali non valide",
        success: false 
      });
    }

    // Verifica password
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("🔐 Verifica password:", passwordMatch ? "OK" : "FALLITA");

    if (!passwordMatch) {
      console.log("❌ Password errata per utente:", user.email);
      return res.status(401).json({ 
        error: "Credenziali non valide",
        success: false 
      });
    }

    console.log("✅ Autenticazione riuscita per utente:", user.email);
    
    // Risposta di successo (senza la password!)
    return res.json({
      success: true,
      message: "Login effettuato con successo",
      user: {
        idu: user.idu,
        nome: user.nome,
        email: user.email
      }
    });

  } catch (error) {
    console.error("💥 Errore interno /login:", error.message);
    console.error("Stack trace:", error.stack);
    
    return res.status(500).json({ 
      error: "Errore interno del server",
      success: false 
    });
  }
});


app.post("/signup", async (req, res) => {
  const { name, surname, email, password, phone } = req.body;
  console.log("Dati Ricevuti");
  console.log(name, surname, email, password, phone);
  if (!name || !surname || !email || !password || !phone) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
  }

  try {
    const tipo = "cliente";
    // Controlla se l'utente esiste già
    const userCheck = await sql`SELECT * FROM utente WHERE email = ${email}`;
    console.log(userCheck);
    if (userCheck.length > 0) {
      return res.status(409).json({ error: "Email già registrata" });
    }
    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserisci il nuovo utente nel database
    await sql`INSERT INTO utente (nome, cognome, email, password, tipo, phone) VALUES (${name}, ${surname}, ${email}, ${hashedPassword},${tipo}, ${phone})`;

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

app.post("/api/prenotazioni-geo", async (req, res) => {
  const { idU, pickup, dropoff, OrarioDiPartenza } = req.body;

  if (!idU || !pickup || !dropoff || !OrarioDiPartenza) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
  }

  try {
    const idPuP = crypto.randomUUID().slice(0, 8);
    const idPuA = crypto.randomUUID().slice(0, 8);
    const idP = crypto.randomUUID().slice(0, 8);

    // Inserisci i punti
    await sql`
      INSERT INTO punto (idPu, Città, Via, Numero_Civico)
      VALUES (${idPuP}, '', ${pickup}, '')
    `;
    await sql`
      INSERT INTO punto (idPu, Città, Via, Numero_Civico)
      VALUES (${idPuA}, '', ${dropoff}, '')
    `;

    // Inserisci la prenotazione
    await sql`
      INSERT INTO prenotazione (idP, OrarioDiPartenza, idPuP, idPuA, idU)
      VALUES (${idP}, ${OrarioDiPartenza}, ${idPuP}, ${idPuA}, ${idU})
    `;

    res.status(201).json({ message: "Prenotazione registrata con successo!" });
  } catch (error) {
    console.error("Errore durante la prenotazione:", error);
    res.status(500).json({ error: "Errore durante la prenotazione" });
  }
});
