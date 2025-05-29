document
  .getElementById("login-form")
  ?.addEventListener("submit", function (event) {
    event.preventDefault();
    login();
  });

document
  .getElementById("register-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    Signup();
  });

// Funzione per il login
async function login() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  console.log("🚀 Invio login con:", { email, password });

  let response;
  try {
    response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    console.error("❌ Fetch fallita:", err);
    alert("Errore di rete");
    return;
  }

  console.log("📶 Response ricevuta:", {
    status: response.status,
    ok: response.ok,
    headers: [...response.headers.entries()],
  });

  const data = await response.json();
  console.log("📦 Body JSON:", data);

  if (response.ok) {
    console.log("🎉 Login OK, salvo user e navigo");
    localStorage.setItem("user", JSON.stringify(data));
    window.location.href = "/html/home.html";
  } else {
    console.log("⚠️ Login KO, mostro errore");
    alert(data.error || `Server ha risposto ${response.status}`);
  }
}

// Funzione signup aggiornata con tipo utente
async function Signup() {
  const name = document.getElementById("first-name").value.trim();
  const surname = document.getElementById("last-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const confirmpassword = document.getElementById("confirm-password").value;
  const phone = document.getElementById("phone").value.trim();
  const userType = document.getElementById("user-type").value;

  // Validazioni
  if (!userType) {
    alert("Seleziona il tipo di account (Cliente o Driver)");
    return;
  }

  if (!name || !surname || !email || !password || !phone) {
    alert("Compila tutti i campi obbligatori");
    return;
  }

  if (password !== confirmpassword) {
    alert("Le due password non coincidono");
    return;
  }

  try {
    const response = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        surname,
        email,
        password,
        phone,
        tipo: userType,
      }),
    });

    if (response.ok) {
      alert("Registrazione effettuata con successo! Ora effettua il login.");
      window.location.href = "/html/login.html";
    } else {
      const errorData = await response.json();
      alert(errorData.error || "Errore durante la registrazione");
    }
  } catch (error) {
    console.error("Errore durante la registrazione:", error.message);
    alert("Errore del server");
  }
}
