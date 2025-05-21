
// Funzione per il login
async function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
try {
    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
        const user = await response.json();
        SessionStorage.setItem("user", JSON.stringify(user));

        alert("Login effettuato con successo!");
      // Redirigi al Team Management o Dashboard
        window.location.href = "/html/home.html";
    }
    } catch (error) {
    console.error("Errore durante il login:", error);
    alert("Errore durante il login. Riprova.");
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
    if(password!=confirmpassword)
        alert("Le due password non coincidono");
    else{
        try {
        const response = await fetch("/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, surname, email, password,phone }),
        });

        if (response.ok) {
            alert("Registrazione effettuata con successo! Ora effettua il login.");
            window.location.href = "../html/login.html";
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
