const base = window.location.origin;
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

//funzione signup
async function Signup() {
  const name = document.getElementById("first-name").value;
  const surname = document.getElementById("last-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const confirmpassword = document.getElementById("confirm-password").value;
  const phone = document.getElementById("phone").value;
  if (password != confirmpassword) alert("Le due password non coincidono");
  else {
    try {
      const response = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, surname, email, password, phone }),
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
}
