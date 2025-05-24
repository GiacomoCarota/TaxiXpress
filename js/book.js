document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    alert("Devi prima effettuare il login.");
    window.location.href = "/html/login.html";
    return;
  }

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

// Booking tabs
function switchTab(tab) {
  document.getElementById('tab-now').classList.remove('tab-active', 'text-green-800', 'border-b-2', 'border-green-600');
  document.getElementById('tab-later').classList.remove('tab-active', 'text-green-800', 'border-b-2', 'border-green-600');
  document.getElementById('tab-' + tab).classList.add('tab-active');

  document.getElementById('now-content').classList.add('hidden');
  document.getElementById('later-content').classList.add('hidden');
  document.getElementById(tab + '-content').classList.remove('hidden');

  // Add some style for tab active state
  document.querySelector('.tab-active').classList.add('text-green-800', 'border-b-2', 'border-green-600');
}

// Initialize with map
document.addEventListener('DOMContentLoaded', function () {
  initMap();
});



// Initialize map
function initMap() {
  const map = L.map('map').setView([40.7128, -74.0060], 13); // Default to New York

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Add a marker
  const marker = L.marker([40.7128, -74.0060]).addTo(map)
    .bindPopup('TaxiXpress Headquarters')
    .openPopup();
}

// Get current location
function getCurrentLocation(inputId) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      // In a real app, you would reverse geocode these coordinates to get an address
      const address = "Current Location (" + latitude.toFixed(4) + ", " + longitude.toFixed(4) + ")";

      document.getElementById(inputId).value = address;
    }, function (error) {
      alert("Unable to get your location: " + error.message);
    });
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

// Vehicle selection
document.querySelectorAll('.vehicle-card').forEach(card => {
  card.addEventListener('click', function () {
    document.querySelectorAll('.vehicle-card').forEach(c => {
      c.classList.remove('border-green-500', 'bg-green-50');
    });
    this.classList.add('border-green-500', 'bg-green-50');
  });
});

document.querySelector('.tab-active').classList.add('text-green-800', 'border-b-2', 'border-green-600');