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
  console.log("🔔 /login ricevuto:", { email, password });

  if (!email || !password) {
    console.log("⚠️ campi mancanti");
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
  }

  try {
    const users = await sql`SELECT * FROM utente WHERE email = ${email}`;
    const user = users[0];
    console.log("📋 utente trovato:", user);

    if (!user) {
      console.log("❌ utente non esiste");
      return res.status(401).json({ error: "Email o password errati" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("🔐 passwordMatch:", passwordMatch);

    if (!passwordMatch) {
      console.log("❌ password sbagliata");
      return res.status(401).json({ error: "Email o password errati" });
    }

    console.log("✅ autenticazione OK, invio 200");
    // Nota: restituiamo i campi che hai in tabella (se la colonna si chiama `nome`, usala!)
    return res
      .status(200)
      .json({ idu: user.idu, nome: user.nome /* non user.name! */, email: user.email });
  } catch (error) {
    console.error("💥 Errore interno /login:", error);
    return res.status(500).json({ error: "Errore del server, riprova più tardi" });
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

    const idCliente = generateRandomId(8); // Lunghezza 8 caratteri
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
