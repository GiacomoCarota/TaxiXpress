document.addEventListener("DOMContentLoaded", async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      alert("Devi prima effettuare il login.");
      window.location.href = "login.html";
      return;
    }
  
    const selectPartenza = document.getElementById("puntoPartenza");
    const selectArrivo = document.getElementById("puntoArrivo");
  
    // Carica i punti disponibili
    const punti = await fetch("/api/punti").then(res => res.json());
  
    punti.forEach(p => {
      const optionP = new Option(`${p.Via}, ${p.Città}`, p.idPu);
      const optionA = new Option(`${p.Via}, ${p.Città}`, p.idPu);
      selectPartenza.add(optionP);
      selectArrivo.add(optionA.cloneNode(true));
    });
  
    // Gestione invio prenotazione
    document.getElementById("prenotazioneForm").addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const prenotazione = {
        idU: user.idu,
        idPuP: selectPartenza.value,
        idPuA: selectArrivo.value,
        OrarioDiPartenza: document.getElementById("orario").value
      };
  
      const response = await fetch("/api/prenotazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prenotazione)
      });
  
      if (response.ok) {
        alert("Prenotazione effettuata con successo!");
        window.location.href = "home.html";
      } else {
        const err = await response.json();
        alert(err.error || "Errore nella prenotazione");
      }
    });
  });
  