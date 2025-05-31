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

// Utilità per generare ID casuali
function generateRandomId() {
  return crypto.randomBytes(8).toString("hex").substring(0, 8);
}

// Validazione dati prenotazione
const validateBookingData = (data) => {
    const requiredFields = [
        'pickup_address',
        'dropoff_address',
        'vehicle_type',
        'payment_method',
        'user_id',
        'user_email',
        'user_name'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        return `Campi obbligatori mancanti: ${missingFields.join(', ')}`;
    }

    // Validare vehicle_type
    const validVehicleTypes = ['standard', 'premium', 'xl'];
    if (!validVehicleTypes.includes(data.vehicle_type)) {
        return 'Tipo di veicolo non valido';
    }

    // Validare payment_method
    const validPaymentMethods = ['card', 'cash', 'paypal'];
    if (!validPaymentMethods.includes(data.payment_method)) {
        return 'Metodo di pagamento non valido';
    }

    // Validare scheduled booking
    if (data.is_scheduled) {
        if (!data.scheduled_date || !data.scheduled_time) {
            return 'Data e ora sono obbligatorie per prenotazioni programmate';
        }

        // Verificare che la data sia nel futuro
        const scheduledDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}`);
        if (scheduledDateTime <= new Date()) {
            return 'Data e ora devono essere nel futuro';
        }
    }

    // Validare dati numerici
    if (data.distance && (isNaN(data.distance) || data.distance < 0)) {
        return 'Distanza non valida';
    }

    if (data.duration && (isNaN(data.duration) || data.duration < 0)) {
        return 'Durata non valida';
    }

    if (data.estimated_fare && (isNaN(data.estimated_fare) || data.estimated_fare < 0)) {
        return 'Tariffa stimata non valida';
    }

    return null;
};

// Route per homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "home.html"));
});

// API per login utente
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("🔔 /login ricevuto:", { email, password: "***" });

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
      SELECT * 
      FROM users 
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
        email: user.email,
        phone: user.phone,
        tipo: user.tipo
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

// API per registrazione utente
app.post("/signup", async (req, res) => {
  const { name, surname, email, password, phone, tipo } = req.body;
  console.log("Dati Ricevuti");
  console.log(name, surname, email, password, phone);
  
  if (!name || !surname || !email || !password || !phone) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
  }

  try {
    
    // Controlla se l'utente esiste già
    const userCheck = await sql`SELECT * FROM users WHERE email = ${email}`;
    console.log(userCheck);
    if (userCheck.length > 0) {
      return res.status(409).json({ error: "Email già registrata" });
    }
    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserisci il nuovo utente nel database
    await sql`INSERT INTO users (nome, cognome, email, password, tipo, phone) VALUES (${name}, ${surname}, ${email}, ${hashedPassword},${tipo}, ${phone})`;

    res.status(201).json({ message: "Registrazione effettuata con successo" });
  } catch (error) {
    console.error("Errore durante la registrazione:", error);
    res.status(500).json({ error: error.message });
  }
});

// API per creare nuova prenotazione (basata su book.js)
app.post("/api/bookings", async (req, res) => {
    console.log("🚗 Nuova richiesta prenotazione ricevuta:", req.body);

    try {
        // Validazione dati
        const validationError = validateBookingData(req.body);
        if (validationError) {
            console.log("❌ Validazione fallita:", validationError);
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }

        const {
            pickup_address,
            dropoff_address,
            vehicle_type,
            payment_method,
            user_id,
            user_email,
            user_name,
            user_phone,
            is_scheduled = false,
            scheduled_date,
            scheduled_time,
            scheduled_datetime,
            distance = 0,
            duration = 0,
            estimated_fare = 0,
            booking_time
        } = req.body;

        // Verificare che l'utente esista
        const userCheck = await sql`
            SELECT idu, nome, email, phone 
            FROM users 
            WHERE idu = ${user_id} AND email = ${user_email}
        `;

        if (userCheck.length === 0) {
            console.log("❌ Utente non trovato:", { user_id, user_email });
            return res.status(401).json({
                success: false,
                error: "Utente non autorizzato"
            });
        }

        // Generare ID per la prenotazione
        const booking_id = generateRandomId();
        const current_timestamp = new Date().toISOString();

        // Preparare i dati per l'inserimento
        const bookingData = {
            booking_id,
            user_id,
            user_email,
            user_name,
            user_phone: user_phone || userCheck[0].phone,
            pickup_address,
            dropoff_address,
            vehicle_type,
            payment_method,
            distance: parseFloat(distance) || 0,
            duration: parseInt(duration) || 0,
            estimated_fare: parseFloat(estimated_fare) || 0,
            is_scheduled,
            status: 'pending',
            created_at: current_timestamp,
            updated_at: current_timestamp
        };

        // Aggiungere campi per prenotazioni programmate
        if (is_scheduled && scheduled_datetime) {
            bookingData.scheduled_datetime = scheduled_datetime;
            bookingData.scheduled_date = scheduled_date;
            bookingData.scheduled_time = scheduled_time;
        }

        // Inserire la prenotazione nel database
        await sql`
            INSERT INTO bookings (
                booking_id,
                user_id,
                pickup_address,
                dropoff_address,
                vehicle_type,
                payment_method,
                distance,
                duration,
                estimated_fare,
                is_scheduled,
                scheduled_datetime,
                scheduled_date,
                scheduled_time,
                status,
                created_at,
                updated_at
            ) VALUES (
                ${bookingData.booking_id},
                ${bookingData.user_id},
                ${bookingData.pickup_address},
                ${bookingData.dropoff_address},
                ${bookingData.vehicle_type},
                ${bookingData.payment_method},
                ${bookingData.distance},
                ${bookingData.duration},
                ${bookingData.estimated_fare},
                ${bookingData.is_scheduled},
                ${bookingData.scheduled_datetime || null},
                ${bookingData.scheduled_date || null},
                ${bookingData.scheduled_time || null},
                ${bookingData.status},
                ${bookingData.created_at},
                ${bookingData.updated_at}
            )
        `;

        console.log("✅ Prenotazione salvata con successo:", booking_id);

        // Risposta di successo
        res.status(201).json({
            success: true,
            message: "Prenotazione creata con successo",
            booking_id: booking_id,
            data: {
                booking_id,
                pickup_address,
                dropoff_address,
                vehicle_type,
                estimated_fare,
                is_scheduled,
                scheduled_datetime: is_scheduled ? scheduled_datetime : null,
                status: 'pending',
                created_at: current_timestamp
            }
        });

    } catch (error) {
        console.error("💥 Errore durante il salvataggio della prenotazione:", error);
        
        // Gestire errori specifici del database
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({
                success: false,
                error: "ID prenotazione già esistente"
            });
        }

        if (error.code === '23503') { // Foreign key constraint violation
            return res.status(400).json({
                success: false,
                error: "Dati di riferimento non validi"
            });
        }

        res.status(500).json({
            success: false,
            error: "Errore interno del server durante il salvataggio della prenotazione"
        });
    }
});

// API per ottenere le prenotazioni di un utente
app.get("/api/bookings/user/:userId", async (req, res) => {
    const { userId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    console.log("📋 Richiesta prenotazioni per utente:", userId);

    try {
        let query = sql`
            SELECT 
                booking_id,
                pickup_address,
                dropoff_address,
                vehicle_type,
                payment_method,
                distance,
                duration,
                estimated_fare,
                is_scheduled,
                scheduled_datetime,
                scheduled_date,
                scheduled_time,
                status,
                created_at,
                updated_at
            FROM bookings 
            WHERE user_id = ${userId}
        `;

        // Filtrare per status se specificato
        if (status) {
            query = sql`
                SELECT 
                    booking_id,
                    pickup_address,
                    dropoff_address,
                    vehicle_type,
                    payment_method,
                    distance,
                    duration,
                    estimated_fare,
                    is_scheduled,
                    scheduled_datetime,
                    scheduled_date,
                    scheduled_time,
                    status,
                    created_at,
                    updated_at
                FROM bookings 
                WHERE user_id = ${userId} AND status = ${status}
                ORDER BY created_at DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
        } else {
            query = sql`
                SELECT 
                    booking_id,
                    pickup_address,
                    dropoff_address,
                    vehicle_type,
                    payment_method,
                    distance,
                    duration,
                    estimated_fare,
                    is_scheduled,
                    scheduled_datetime,
                    scheduled_date,
                    scheduled_time,
                    status,
                    created_at,
                    updated_at
                FROM bookings 
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
        }

        const bookings = await query;

        console.log(`✅ Trovate ${bookings.length} prenotazioni per utente ${userId}`);

        res.json({
            success: true,
            data: bookings,
            count: bookings.length
        });

    } catch (error) {
        console.error("💥 Errore nel recupero prenotazioni:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per ottenere una singola prenotazione
app.get("/api/bookings/:bookingId", async (req, res) => {
    const { bookingId } = req.params;

    console.log("🔍 Richiesta dettagli prenotazione:", bookingId);

    try {
        const bookings = await sql`
            SELECT 
                *
            FROM bookings 
            WHERE booking_id = ${bookingId}
        `;

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Prenotazione non trovata"
            });
        }

        console.log("✅ Prenotazione trovata:", bookingId);

        res.json({
            success: true,
            data: bookings[0]
        });

    } catch (error) {
        console.error("💥 Errore nel recupero prenotazione:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per aggiornare lo stato di una prenotazione
app.put("/api/bookings/:bookingId/status", async (req, res) => {
    const { bookingId } = req.params;
    const { status, driver_id } = req.body;

    console.log("🔄 Aggiornamento status prenotazione:", { bookingId, status, driver_id });

    const validStatuses = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            error: "Status non valido"
        });
    }

    try {
        // Verificare che la prenotazione esista
        const existingBooking = await sql`
            SELECT booking_id, status, driver_id FROM bookings WHERE booking_id = ${bookingId}
        `;

        if (existingBooking.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Prenotazione non trovata"
            });
        }

        // Preparare i dati per l'aggiornamento
        const updateData = {
            status,
            updated_at: new Date().toISOString(),
        };

        // Aggiungere dati del driver se forniti
        if (driver_id) {
            updateData.driver_id = driver_id;
        }

        // Aggiornare la prenotazione
        await sql`
            UPDATE bookings 
            SET 
                status = ${updateData.status},
                driver_id = ${updateData.driver_id},
                updated_at = ${updateData.updated_at}
            WHERE booking_id = ${bookingId}
        `;

        console.log("✅ Status prenotazione aggiornato:", { bookingId, status, driver_id });

        res.json({
            success: true,
            message: "Status prenotazione aggiornato con successo",
            data: {
                booking_id: bookingId,
                old_status: existingBooking[0].status,
                new_status: status,
                updated_at: updateData.updated_at
            }
        });

    } catch (error) {
        console.error("💥 Errore aggiornamento status:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per cancellare una prenotazione
app.delete("/api/bookings/:bookingId", async (req, res) => {
    const { bookingId } = req.params;
    const { user_id } = req.body;

    console.log("🗑️ Richiesta cancellazione prenotazione:", { bookingId, user_id });

    try {
        // Verificare che la prenotazione appartenga all'utente
        const bookings = await sql`
            SELECT booking_id, user_id, status 
            FROM bookings 
            WHERE booking_id = ${bookingId} AND user_id = ${user_id}
        `;

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Prenotazione non trovata o non autorizzata"
            });
        }

        const booking = bookings[0];

        // Verificare che la prenotazione possa essere cancellata
        if (booking.status === 'completed') {
            return res.status(400).json({
                success: false,
                error: "Non è possibile cancellare una prenotazione completata"
            });
        }

        // Aggiornare lo status a 'cancelled' invece di eliminare
        await sql`
            UPDATE bookings 
            SET 
                status = 'cancelled',
                updated_at = ${new Date().toISOString()}
            WHERE booking_id = ${bookingId}
        `;

        console.log("✅ Prenotazione cancellata:", bookingId);

        res.json({
            success: true,
            message: "Prenotazione cancellata con successo",
            booking_id: bookingId
        });

    } catch (error) {
        console.error("💥 Errore cancellazione prenotazione:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per ottenere tutte le prenotazioni pending (per i driver)
app.get("/api/booking/pending", async (req, res) => {
    console.log("🚗 Richiesta prenotazioni pending per dashboard driver");

    try {
        const pendingBookings = await sql`
            SELECT 
                *
            FROM bookings 
            WHERE status = 'pending'
            ORDER BY created_at ASC
        `;
        const nome = await sql`SELECT nome FROM users`;
        const cognome = await sql`SELECT cognome FROM users`;

        const user_name = nome + " " + cognome;

        pendingBookings.push(user_name);
        console.log(`✅ Trovate ${pendingBookings.length} prenotazioni pending`);

        res.json({
            success: true,
            data: pendingBookings,
            count: pendingBookings.length
        });

    } catch (error) {
        console.error("💥 Errore nel recupero prenotazioni pending:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per assegnare una prenotazione a un driver
app.put("/api/bookings/:bookingId/assign", async (req, res) => {
    const { bookingId } = req.params;
    const { driver_id, driver_name, driver_phone } = req.body;

    console.log("👨‍💼 Assegnazione prenotazione a driver:", { bookingId, driver_id, driver_name });

    if (!driver_id || !driver_name) {
        return res.status(400).json({
            success: false,
            error: "ID driver e nome driver sono obbligatori"
        });
    }

    try {
        // Verificare che la prenotazione esista e sia in stato pending
        const existingBooking = await sql`
            SELECT booking_id, status
            FROM bookings 
            WHERE booking_id = ${bookingId}
        `;

        if (existingBooking.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Prenotazione non trovata"
            });
        }

        if (existingBooking[0].status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: "La prenotazione non è più disponibile"
            });
        }

        // Assegnare il driver e cambiare lo status
        await sql`
            UPDATE bookings 
            SET 
                status = 'assigned',
                driver_id = ${driver_id},
                updated_at = ${new Date().toISOString()}
            WHERE booking_id = ${bookingId}
        `;

        console.log("✅ Prenotazione assegnata al driver:", { bookingId, driver_name });

        res.json({
            success: true,
            message: "Prenotazione assegnata con successo",
            data: {
                booking_id: bookingId,
                driver_id,
                driver_name,
                customer: existingBooking[0].user_name,
                status: 'assigned'
            }
        });

    } catch (error) {
        console.error("💥 Errore assegnazione prenotazione:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per ottenere le prenotazioni assegnate a un driver specifico
app.get("/api/bookings/driver/:driverId", async (req, res) => {
    const { driverId } = req.params;
    const { status } = req.query;

    console.log("👨‍💼 Richiesta prenotazioni per driver:", driverId);

    try {
        let query;       
            query = sql`
                SELECT 
                    *
                FROM bookings 
                WHERE driver_id = ${driverId}
                ORDER BY updated_at DESC
            `;
        

        const driverBookings = await query;

        console.log(`✅ Trovate ${driverBookings.length} prenotazioni per driver ${driverId}`);

        res.json({
            success: true,
            data: driverBookings,
            count: driverBookings.length
        });

    } catch (error) {
        console.error("💥 Errore nel recupero prenotazioni driver:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per ottenere tutti gli utenti
app.get("/api/users", async (req, res) => {
    console.log("📋 Richiesta lista utenti");

    try {
        const users = await sql`
            SELECT 
                idu as id,
                nome as firstName,
                cognome as lastName,
                email,
                phone,
                tipo as role,
                created_at as registrationDate,
                updated_at as lastLogin
            FROM users 
            ORDER BY created_at DESC
        `;

        console.log(`✅ Trovati ${users.length} utenti`);

        res.json(users);

    } catch (error) {
        console.error("💥 Errore nel recupero utenti:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per ottenere un singolo utente
app.get("/api/users/:userId", async (req, res) => {
    const { userId } = req.params;

    console.log("🔍 Richiesta dettagli utente:", userId);

    try {
        const users = await sql`
            SELECT 
                idu as id,
                nome as firstName,
                cognome as lastName,
                email,
                phone,
                tipo as role,
                created_at as registrationDate,
                updated_at as lastLogin
            FROM users 
            WHERE idu = ${userId}
        `;

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Utente non trovato"
            });
        }

        console.log("✅ Utente trovato:", userId);

        res.json({
            success: true,
            data: users[0]
        });

    } catch (error) {
        console.error("💥 Errore nel recupero utente:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per aggiornare un utente
app.put("/api/users/:userId", async (req, res) => {
    const { userId } = req.params;
    const { firstName, lastName, email, phone, role } = req.body;

    console.log("🔄 Aggiornamento utente:", { userId, firstName, lastName, email, role });

    // Validazione input
    if (!firstName || !lastName || !email || !phone || !role) {
        return res.status(400).json({
            success: false,
            error: "Tutti i campi sono obbligatori"
        });
    }

    // Validazione formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            error: "Formato email non valido"
        });
    }

    // Validazione ruolo
    const validRoles = ['user', 'driver', 'admin'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({
            success: false,
            error: "Ruolo non valido"
        });
    }

    try {
        // Verificare che l'utente esista
        const existingUser = await sql`
            SELECT idu FROM users WHERE idu = ${userId}
        `;

        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Utente non trovato"
            });
        }

        // Verificare che l'email non sia già in uso da un altro utente
        const emailCheck = await sql`
            SELECT idu FROM users 
            WHERE email = ${email.toLowerCase().trim()} AND idu != ${userId}
        `;

        if (emailCheck.length > 0) {
            return res.status(409).json({
                success: false,
                error: "Email già in uso da un altro utente"
            });
        }

        // Aggiornare l'utente
        await sql`
            UPDATE users 
            SET 
                nome = ${firstName},
                cognome = ${lastName},
                email = ${email.toLowerCase().trim()},
                phone = ${phone},
                tipo = ${role},
                updated_at = ${new Date().toISOString()}
            WHERE idu = ${userId}
        `;

        console.log("✅ Utente aggiornato con successo:", userId);

        // Recuperare i dati aggiornati
        const updatedUser = await sql`
            SELECT 
                idu as id,
                nome as firstName,
                cognome as lastName,
                email,
                phone,
                tipo as role,
                created_at as registrationDate,
                updated_at as lastLogin
            FROM users 
            WHERE idu = ${userId}
        `;

        res.json({
            success: true,
            message: "Utente aggiornato con successo",
            data: updatedUser[0]
        });

    } catch (error) {
        console.error("💥 Errore aggiornamento utente:", error);
        
        // Gestire errori specifici del database
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({
                success: false,
                error: "Email già in uso"
            });
        }

        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per eliminare un utente
app.delete("/api/users/:userId", async (req, res) => {
    const { userId } = req.params;

    console.log("🗑️ Richiesta eliminazione utente:", userId);

    try {
        // Verificare che l'utente esista
        const existingUser = await sql`
            SELECT idu, email FROM users WHERE idu = ${userId}
        `;

        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Utente non trovato"
            });
        }

        // Verificare se l'utente ha prenotazioni attive
        const activeBookings = await sql`
            SELECT booking_id FROM bookings 
            WHERE user_id = ${userId} AND status IN ('pending', 'confirmed', 'assigned', 'in_progress')
        `;

        if (activeBookings.length > 0) {
            return res.status(400).json({
                success: false,
                error: "Impossibile eliminare l'utente: ha prenotazioni attive"
            });
        }

        // Eliminare l'utente
        await sql`
            DELETE FROM users WHERE idu = ${userId}
        `;

        console.log("✅ Utente eliminato:", existingUser[0].email);

        res.json({
            success: true,
            message: "Utente eliminato con successo",
            user_id: userId
        });

    } catch (error) {
        console.error("💥 Errore eliminazione utente:", error);
        
        // Gestire errori di foreign key constraint
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: "Impossibile eliminare l'utente: esistono dati collegati"
            });
        }

        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per cercare utenti con filtri
app.get("/api/users/search", async (req, res) => {
    const { search, role, limit = 50, offset = 0 } = req.query;

    console.log("🔍 Ricerca utenti con filtri:", { search, role, limit, offset });

    try {
        let query = `
            SELECT 
                idu as id,
                nome as firstName,
                cognome as lastName,
                email,
                phone,
                tipo as role,
                created_at as registrationDate,
                updated_at as lastLogin
            FROM users 
            WHERE 1=1
        `;
        
        const params = [];

        // Aggiungere filtro di ricerca
        if (search) {
            query += ` AND (
                LOWER(nome) LIKE LOWER($${params.length + 1}) OR 
                LOWER(cognome) LIKE LOWER($${params.length + 1}) OR 
                LOWER(email) LIKE LOWER($${params.length + 1}) OR 
                phone LIKE $${params.length + 1}
            )`;
            params.push(`%${search}%`);
        }

        // Aggiungere filtro ruolo
        if (role) {
            query += ` AND tipo = $${params.length + 1}`;
            params.push(role);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const users = await sql.unsafe(query, params);

        console.log(`✅ Trovati ${users.length} utenti con i filtri applicati`);

        res.json({
            success: true,
            data: users,
            count: users.length
        });

    } catch (error) {
        console.error("💥 Errore ricerca utenti:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per ottenere tutte le promozioni
app.get("/api/promotions", async (req, res) => {
    console.log("🎯 Richiesta lista promozioni");
    
    try {
        const promotions = await sql`
            SELECT 
                id,
                codice,
                descrizione,
                sconto_percentuale,
                sconto_fisso,
                attiva,
                data_inizio,
                data_scadenza,
                utilizzi_massimi,
                utilizzi_correnti,
                created_at,
                updated_at
            FROM promos 
            ORDER BY created_at DESC
        `;

        // Trasforma i dati per compatibilità con il frontend
        const formattedPromotions = promotions.map(promo => ({
            id: promo.id,
            name: promo.descrizione || `Promo ${promo.codice}`,
            description: promo.descrizione,
            code: promo.codice,
            type: promo.sconto_percentuale ? 'percentage' : 'fixed',
            value: promo.sconto_percentuale || promo.sconto_fisso,
            startDate: promo.data_inizio,
            endDate: promo.data_scadenza,
            maxUses: promo.utilizzi_massimi,
            usedCount: promo.utilizzi_correnti || 0,
            isActive: promo.attiva,
            createdAt: promo.created_at,
            updatedAt: promo.updated_at
        }));

        console.log(`✅ Trovate ${promotions.length} promozioni`);

        res.json(formattedPromotions);

    } catch (error) {
        console.error("💥 Errore nel recupero promozioni:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per creare una nuova promozione
app.post("/api/promotions", async (req, res) => {
    console.log("🎯 Creazione nuova promozione");
    
    try {
        const {
            name,
            description,
            code,
            type,
            value,
            startDate,
            endDate,
            maxUses,
            maxUsesPerUser,
            minOrderAmount,
            isActive
        } = req.body;

        // Validazione input
        if (!code || !maxUsesPerUser|| !value || !startDate || !endDate || !minOrderAmount) {
            return res.status(400).json({
                success: false,
                error: "Campi obbligatori mancanti"
            });
        }

        // Verifica che il codice non esista già
        const existingPromo = await sql`
            SELECT id FROM promos WHERE codice = ${code}
        `;

        if (existingPromo.length > 0) {
            return res.status(400).json({
                success: false,
                error: "Codice promozione già esistente"
            });
        }

        // Inserisci la nuova promozione
        const newPromotion = await sql`
            INSERT INTO promos (
                codice,
                descrizione,
                sconto_percentuale,
                sconto_fisso,
                attiva,
                data_inizio,
                data_scadenza,
                utilizzi_massimi,
                utilizzi_correnti,
                created_at,
                updated_at
            ) VALUES (
                ${code},
                ${description || name},
                ${value},
                ${null},
                ${isActive || false},
                ${startDate},
                ${endDate},
                ${maxUses || null},
                0,
                NOW(),
                NOW()
            )
            RETURNING *
        `;

        console.log(`✅ Promozione creata con ID: ${newPromotion[0].id}`);

        res.status(201).json({
            success: true,
            data: newPromotion[0],
            message: "Promozione creata con successo"
        });

    } catch (error) {
        console.error("💥 Errore nella creazione promozione:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per aggiornare una promozione esistente
app.put("/api/promotions/:id", async (req, res) => {
    console.log(`🎯 Aggiornamento promozione ID: ${req.params.id}`);
    
    try {
        const promoId = parseInt(req.params.id);
        const {
            name,
            description,
            code,
            type,
            value,
            startDate,
            endDate,
            maxUses,
            maxUsesPerUser,
            minOrderAmount,
            isActive
        } = req.body;

        // Verifica che la promozione esista
        const existingPromo = await sql`
            SELECT id FROM promos WHERE id = ${promoId}
        `;

        if (existingPromo.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Promozione non trovata"
            });
        }

        // Verifica che il codice non sia già utilizzato da un'altra promozione
        if (code) {
            const codeCheck = await sql`
                SELECT id FROM promos WHERE codice = ${code} AND id != ${promoId}
            `;

            if (codeCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: "Codice promozione già utilizzato"
                });
            }
        }

        // Aggiorna la promozione
        const updatedPromotion = await sql`
            UPDATE promos SET
                codice = COALESCE(${code}, codice),
                descrizione = COALESCE(${description || name}, descrizione),
                sconto_percentuale = ${type === 'percentage' ? value : null},
                sconto_fisso = ${type === 'fixed' ? value : null},
                attiva = COALESCE(${isActive}, attiva),
                data_inizio = COALESCE(${startDate}, data_inizio),
                data_scadenza = COALESCE(${endDate}, data_scadenza),
                utilizzi_massimi = ${maxUses || null},
                updated_at = NOW()
            WHERE id = ${promoId}
            RETURNING *
        `;

        console.log(`✅ Promozione aggiornata: ${promoId}`);

        res.json({
            success: true,
            data: updatedPromotion[0],
            message: "Promozione aggiornata con successo"
        });

    } catch (error) {
        console.error("💥 Errore nell'aggiornamento promozione:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per eliminare una promozione
app.delete("/api/promotions/:id", async (req, res) => {
    console.log(`🎯 Eliminazione promozione ID: ${req.params.id}`);
    
    try {
        const promoId = parseInt(req.params.id);

        // Verifica che la promozione esista
        const existingPromo = await sql`
            SELECT id, utilizzi_correnti FROM promos WHERE id = ${promoId}
        `;

        if (existingPromo.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Promozione non trovata"
            });
        }

        // Verifica se la promozione è stata utilizzata
        if (existingPromo[0].utilizzi_correnti > 0) {
            return res.status(400).json({
                success: false,
                error: "Impossibile eliminare una promozione già utilizzata"
            });
        }

        // Elimina la promozione
        await sql`
            DELETE FROM promos WHERE id = ${promoId}
        `;

        console.log(`✅ Promozione eliminata: ${promoId}`);

        res.json({
            success: true,
            message: "Promozione eliminata con successo"
        });

    } catch (error) {
        console.error("💥 Errore nell'eliminazione promozione:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per attivare/disattivare una promozione
app.patch("/api/promotions/:id/toggle", async (req, res) => {
    console.log(`🎯 Toggle stato promozione ID: ${req.params.id}`);
    
    try {
        const promoId = parseInt(req.params.id);
        const { isActive } = req.body;

        // Verifica che la promozione esista
        const existingPromo = await sql`
            SELECT id FROM promos WHERE id = ${promoId}
        `;

        if (existingPromo.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Promozione non trovata"
            });
        }

        // Aggiorna lo stato
        const updatedPromotion = await sql`
            UPDATE promos SET
                attiva = ${isActive},
                updated_at = NOW()
            WHERE id = ${promoId}
            RETURNING *
        `;

        console.log(`✅ Stato promozione aggiornato: ${promoId} -> ${isActive}`);

        res.json({
            success: true,
            data: updatedPromotion[0],
            message: `Promozione ${isActive ? 'attivata' : 'disattivata'} con successo`
        });

    } catch (error) {
        console.error("💥 Errore nel toggle promozione:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per ottenere le statistiche delle promozioni
app.get("/api/promotions/stats", async (req, res) => {
    console.log("🎯 Richiesta statistiche promozioni");
    
    try {
        // Conta promozioni attive
        const activePromosResult = await sql`
            SELECT COUNT(*) as count 
            FROM promos 
            WHERE attiva = true 
            AND data_inizio <= NOW() 
            AND data_scadenza >= NOW()
        `;

        // Somma utilizzi totali
        const totalUsedResult = await sql`
            SELECT COALESCE(SUM(utilizzi_correnti), 0) as total 
            FROM promos
        `;

        // Calcola risparmi totali (approssimativo)
        const totalSavingsResult = await sql`
            SELECT 
                COALESCE(SUM(
                    CASE 
                        WHEN sconto_percentuale IS NOT NULL THEN utilizzi_correnti * 10 -- Stima media
                        WHEN sconto_fisso IS NOT NULL THEN utilizzi_correnti * sconto_fisso
                        ELSE 0
                    END
                ), 0) as total
            FROM promos
        `;

        // Conta promozioni in scadenza (prossimi 7 giorni)
        const expiringPromosResult = await sql`
            SELECT COUNT(*) as count 
            FROM promos 
            WHERE attiva = true 
            AND data_scadenza BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        `;

        const stats = {
            activeCount: parseInt(activePromosResult[0].count),
            totalUsed: parseInt(totalUsedResult[0].total),
            totalSavings: parseFloat(totalSavingsResult[0].total).toFixed(2),
            expiringCount: parseInt(expiringPromosResult[0].count)
        };

        console.log("✅ Statistiche calcolate:", stats);

        res.json(stats);

    } catch (error) {
        console.error("💥 Errore nel calcolo statistiche:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per validare e applicare una promozione (per l'app utente)
app.post("/api/promotions/validate", async (req, res) => {
    console.log("🎯 Validazione codice promozione");
    
    try {
        const { code, orderAmount, userId } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: "Codice promozione richiesto"
            });
        }

        // Trova la promozione
        const promo = await sql`
            SELECT * FROM promos 
            WHERE codice = ${code} 
            AND attiva = true
        `;

        if (promo.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Codice promozione non valido o scaduto"
            });
        }

        const promotion = promo[0];
        const now = new Date();
        const startDate = new Date(promotion.data_inizio);
        const endDate = new Date(promotion.data_scadenza);

        // Verifica date
        if (now < startDate || now > endDate) {
            return res.status(400).json({
                success: false,
                error: "Promozione non ancora attiva o scaduta"
            });
        }

        // Verifica utilizzi massimi
        if (promotion.utilizzi_massimi && promotion.utilizzi_correnti >= promotion.utilizzi_massimi) {
            return res.status(400).json({
                success: false,
                error: "Promozione esaurita"
            });
        }

        // Calcola sconto
        let discountAmount = 0;
        if (promotion.sconto_percentuale) {
            discountAmount = (orderAmount * promotion.sconto_percentuale) / 100;
        } else if (promotion.sconto_fisso) {
            discountAmount = promotion.sconto_fisso;
        }

        console.log(`✅ Promozione valida: ${code}, sconto: €${discountAmount}`);

        res.json({
            success: true,
            data: {
                id: promotion.id,
                code: promotion.codice,
                description: promotion.descrizione,
                discountAmount: discountAmount,
                type: promotion.sconto_percentuale ? 'percentage' : 'fixed',
                value: promotion.sconto_percentuale || promotion.sconto_fisso
            }
        });

    } catch (error) {
        console.error("💥 Errore nella validazione promozione:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// API per applicare una promozione (incrementa utilizzi)
app.post("/api/promotions/:id/use", async (req, res) => {
    console.log(`🎯 Applicazione promozione ID: ${req.params.id}`);
    
    try {
        const promoId = parseInt(req.params.id);
        const { userId, orderId } = req.body;

        // Incrementa il contatore utilizzi
        const updatedPromo = await sql`
            UPDATE promos SET
                utilizzi_correnti = utilizzi_correnti + 1,
                updated_at = NOW()
            WHERE id = ${promoId}
            AND attiva = true
            AND (utilizzi_massimi IS NULL OR utilizzi_correnti < utilizzi_massimi)
            RETURNING *
        `;

        if (updatedPromo.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Impossibile applicare la promozione"
            });
        }

        console.log(`✅ Promozione applicata: ${promoId}, utilizzi: ${updatedPromo[0].utilizzi_correnti}`);

        res.json({
            success: true,
            data: updatedPromo[0],
            message: "Promozione applicata con successo"
        });

    } catch (error) {
        console.error("💥 Errore nell'applicazione promozione:", error);
        res.status(500).json({
            success: false,
            error: "Errore interno del server"
        });
    }
});

// Avvia il server
app.listen(port, () => {
    console.log(`Server avviato su http://localhost:${port}`); 
});