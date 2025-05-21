document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    alert("Devi prima effettuare il login.");
    window.location.href = "login.html";
    return;
  }

  document.getElementById("prenotazioneForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const prenotazione = {
      idU: user.idu,
      latPartenza: parseFloat(document.getElementById("latPartenza").value),
      lngPartenza: parseFloat(document.getElementById("lngPartenza").value),
      latArrivo: parseFloat(document.getElementById("latArrivo").value),
      lngArrivo: parseFloat(document.getElementById("lngArrivo").value),
      OrarioDiPartenza: document.getElementById("orario").value
    };

    const response = await fetch("/api/prenotazioni-coord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prenotazione)
    });

    if (response.ok) {
      alert("Prenotazione effettuata con successo!");
      window.location.href = "home.html";
    } else {
      const err = await response.json();
      alert(err.error || "Errore durante la prenotazione");
    }
  });
});
