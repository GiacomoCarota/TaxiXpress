document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("user"));
    // if (!user) {
    //   alert("Devi prima effettuare il login.");
    //   window.location.href = "/html/login.html";
    //   return;
    // }
  
    const confirmButton = document.querySelector("button.w-full");
  
    confirmButton.addEventListener("click", async (e) => {
      e.preventDefault();
  
      const pickup = document.querySelector("#pickup-now").value.trim();
      const dropoff = document.querySelector("#dropoff-now").value.trim();
      const orario = new Date().toISOString();
  
      if (!pickup || !dropoff) {
        alert("Inserisci sia punto di partenza che arrivo.");
        return;
      }
  
      const payload = {
        idU: user.idu,
        pickup,
        dropoff,
        OrarioDiPartenza: orario,
      };
  
      try {
        const res = await fetch("/api/prenotazioni-geo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
  
        const data = await res.json();
        if (res.ok) {
          alert("Prenotazione effettuata con successo!");
          window.location.href = "/html/home.html";
        } else {
          alert(data.error || "Errore durante la prenotazione");
        }
      } catch (err) {
        console.error(err);
        alert("Errore di rete durante la prenotazione.");
      }
    });
  });
  