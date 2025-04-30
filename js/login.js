// Funzione per il login
async function login() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
try {
    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
        const user = await response.json();
        localStorage.setItem("user", JSON.stringify(user));

      // Recupera l'ID del team
        const teamResponse = await fetch(`/getUserTeam/${user.idu}`);
        if (teamResponse.ok) {
        const { teamId } = await teamResponse.json();
        localStorage.setItem("teamId", JSON.stringify(teamId));
        } else {
        console.warn("Nessun team trovato per l'utente.");
        localStorage.removeItem("teamId");
        }

        alert("Login effettuato con successo!");
      // Redirigi al Team Management o Dashboard
        window.location.href = "home.html";
    }
    } catch (error) {
    console.error("Errore durante il login:", error);
    alert("Errore durante il login. Riprova.");
    }
}

//funzione signup
async function Signup() {
    const name = document.getElementById("signupName").value;
    const surname = document.getElementById("signupSurname").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    try {
    const response = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, surname, email, password }),
    });

    if (response.ok) {
        alert("Registrazione effettuata con successo! Ora effettua il login.");
        window.location.href = "login.html";
    } else {
        const errorData = await response.json();
        alert(errorData.error || "Errore durante la registrazione");
    }
    } catch (error) {
    console.error("Errore durante la registrazione:", error.message);
    alert("Errore del server");
    }
}
