let driverStatus = localStorage.getItem("driverStatus") || "offline"; // Fix: get instead of set
let rideRequests = [];
let activeRides = [];
let currentDriver = JSON.parse(localStorage.getItem("user"))


// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  checkDriverAuth();
  loadDriverData();
  updateStatusDisplay();
  loadRideRequests();
  console.log(currentDriver)

  // Auto refresh every 30 seconds when online
  setInterval(() => {
    if (driverStatus === "online") {
      loadRideRequests();
      loadActiveRides();
    }
  }, 30000);
});

function checkDriverAuth() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.user || user.user.tipo !== "driver") {
    alert("Accesso negato. Solo i driver possono accedere a questa pagina.");
    window.location.href = "/html/home.html";
    return;
  }

  currentDriver = user.user;
  // Update greeting
  const greeting = document.getElementById("userGreeting");
  if (greeting) {
    greeting.textContent = `Ciao, ${currentDriver.nome}`;
  }
}

function toggleDriverStatus() {
  // Toggle status
  driverStatus = driverStatus === "online" ? "offline" : "online";
  
  // Save to localStorage
  localStorage.setItem("driverStatus", driverStatus);
  
  updateStatusDisplay();

  if (driverStatus === "online") {
    loadRideRequests();
    loadActiveRides();
  } else {
    // Clear displays when going offline
    document.getElementById("rideRequestsContainer").innerHTML = "";
    document.getElementById("activeRidesContainer").innerHTML = "";
    document.getElementById("emptyState").classList.remove("hidden");
    document.getElementById("emptyActiveState").classList.remove("hidden");
  }
}

function updateStatusDisplay() {
  const statusToggle = document.getElementById("statusToggle");
  const statusText = document.getElementById("statusText");

  if (driverStatus === "online") {
    statusToggle.className =
      "px-6 py-2 rounded-full font-medium transition duration-300 bg-green-600 text-white";
    statusText.textContent = "Online";
  } else {
    statusToggle.className =
      "px-6 py-2 rounded-full font-medium transition duration-300 bg-gray-600 text-white";
    statusText.textContent = "Offline";
  }
}

async function loadDriverData() {
  try {
    // Carica TUTTE le prenotazioni del driver
    const response = await fetch(`/api/bookings/driver/${currentDriver.idu}`);
    const data = await response.json();

    if (data.success) {
      const allBookings = data.data;
      
      // Filtra solo le corse COMPLETATE
      const completedRides = allBookings.filter(booking => booking.status === 'completed');
      
      const today = new Date().toDateString();

      // Filtra corse completate di oggi
      const todayCompletedRides = completedRides.filter(
        (ride) => new Date(ride.updated_at).toDateString() === today
      );

      // Calcola guadagno di oggi dalle corse completate
      const todayEarnings = todayCompletedRides.reduce(
        (sum, ride) => sum + parseFloat(ride.estimated_fare || 0),
        0
      );

      // Aggiorna statistiche
      document.getElementById("todayRides").textContent = todayCompletedRides.length;
      document.getElementById("todayEarnings").textContent = `€${todayEarnings.toFixed(2)}`;

      // Rating fisso per ora (potresti implementare un sistema di rating)
      document.getElementById("averageRating").textContent = "5.0";

      console.log("Statistiche aggiornate:", {
        totalePrenotazioni: allBookings.length,
        corseCompletate: completedRides.length,
        corseOggi: todayCompletedRides.length,
        guadagnoOggi: todayEarnings
      });
      
    }
  } catch (error) {
    console.error("Errore nel caricamento dati driver:", error);
    // Valori di default in caso di errore
    document.getElementById("todayRides").textContent = "0";
    document.getElementById("todayEarnings").textContent = "€0";
    document.getElementById("averageRating").textContent = "5.0";
  }
}

async function loadRideRequests() {
  if (driverStatus === "offline") {
    document.getElementById("rideRequestsContainer").innerHTML = "";
    document.getElementById("emptyState").classList.remove("hidden");
    document.getElementById("pendingRides").textContent = "0";
    return;
  }

  document.getElementById("loadingSpinner").classList.remove("hidden");

  try {
    const response = await fetch("/api/booking/pending");
    const data = await response.json();
    console.log("Dati richieste:", data);


    if (data.success) {
      rideRequests = data.data.map((booking) => ({
        id: booking.booking_id,
        customer: booking.user_name,
        customerPhone: booking.user_phone,
        pickup: booking.pickup_address,
        destination: booking.dropoff_address,
        distance: booking.distance ? `${booking.distance} km` : "N/A",
        estimatedTime: booking.duration
          ? `${Math.round(booking.duration / 60)} min`
          : "N/A",
        fare: `€${parseFloat(booking.estimated_fare || 0).toFixed(2)}`,
        vehicleType: booking.vehicle_type,
        paymentMethod: booking.payment_method,
        isScheduled: booking.is_scheduled,
        scheduledDateTime: booking.scheduled_datetime,
        requestTime: new Date(booking.created_at).toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        bookingData: booking, // Mantieni i dati originali per riferimento
      }));

      displayRideRequests();
      document.getElementById("pendingRides").textContent = rideRequests.length;
    } else {
      console.error("Errore API:", data.error);
      rideRequests = [];
      displayRideRequests();
    }
  } catch (error) {
    console.error("Errore nel caricamento richieste:", error);
    rideRequests = [];
    displayRideRequests();
  } finally {
    document.getElementById("loadingSpinner").classList.add("hidden");
  }
}

async function loadActiveRides() {
  try {
    const response = await fetch(
      `/api/bookings/driver/${currentDriver.idu}?status=assigned,in_progress`
    );
    const data = await response.json();

    if (data.success) {
      activeRides = data.data.map((booking) => ({
        id: booking.booking_id,
        customer: booking.full_name,
        customerPhone: booking.user_phone,
        pickup: booking.pickup_address,
        destination: booking.dropoff_address,
        distance: booking.distance ? `${booking.distance} km` : "N/A",
        estimatedTime: booking.duration
          ? `${Math.round(booking.duration / 60)} min`
          : "N/A",
        fare: `€${parseFloat(booking.estimated_fare || 0).toFixed(2)}`,
        vehicleType: booking.vehicle_type,
        status: booking.status,
        acceptedTime: new Date(booking.updated_at),
        bookingData: booking,
      }));
      displayActiveRides();
    }
  } catch (error) {
    console.error("Errore nel caricamento corse attive:", error);
    activeRides = [];
    displayActiveRides();
  }
}

function displayRideRequests() {
  const container = document.getElementById("rideRequestsContainer");
  const emptyState = document.getElementById("emptyState");

  if (rideRequests.length === 0) {
    container.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  container.innerHTML = rideRequests
    .map(
      (request) => `
                <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">
                                <i class="fas fa-user mr-2"></i>${
                                  request.customer
                                }
                                ${
                                  request.isScheduled
                                    ? '<span class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Programmata</span>'
                                    : ""
                                }
                            </h3>
                            <div class="space-y-2 text-gray-600">
                                <div class="flex items-start">
                                    <i class="fas fa-map-marker-alt text-green-600 mr-2 mt-1"></i>
                                    <div>
                                        <p class="font-medium">Partenza:</p>
                                        <p>${request.pickup}</p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <i class="fas fa-flag-checkered text-red-600 mr-2 mt-1"></i>
                                    <div>
                                        <p class="font-medium">Destinazione:</p>
                                        <p>${request.destination}</p>
                                    </div>
                                </div>
                                ${
                                  request.isScheduled &&
                                  request.scheduledDateTime
                                    ? `
                                <div class="flex items-start">
                                    <i class="fas fa-calendar text-blue-600 mr-2 mt-1"></i>
                                    <div>
                                        <p class="font-medium">Orario programmato:</p>
                                        <p>${new Date(
                                          request.scheduledDateTime
                                        ).toLocaleString("it-IT")}</p>
                                    </div>
                                </div>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-green-800">${
                              request.fare
                            }</div>
                            <div class="text-sm text-gray-500">Richiesta: ${
                              request.requestTime
                            }</div>
                            <div class="text-xs text-gray-400 mt-1">
                                ${request.vehicleType.toUpperCase()} • ${request.paymentMethod.toUpperCase()}
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center mb-4 text-sm text-gray-600">
                        <span><i class="fas fa-road mr-1"></i>${
                          request.distance
                        }</span>
                        <span><i class="fas fa-clock mr-1"></i>${
                          request.estimatedTime
                        }</span>
                        ${
                          request.customerPhone
                            ? `<span><i class="fas fa-phone mr-1"></i>${request.customerPhone}</span>`
                            : ""
                        }
                    </div>
                    
                    <div class="flex space-x-3">
                        <button onclick="acceptRide('${request.id}')" 
                                class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300">
                            <i class="fas fa-check mr-2"></i>Accetta
                        </button>
                        <button onclick="rejectRide('${request.id}')" 
                                class="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition duration-300">
                            <i class="fas fa-times mr-2"></i>Rifiuta
                        </button>
                    </div>
                </div>
            `
    )
    .join("");
}

async function acceptRide(bookingId) {
  if (confirm("Vuoi accettare questa corsa?")) {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driver_id: currentDriver.idu,
          driver_name: currentDriver.nome,
          driver_phone: currentDriver.phone,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Corsa accettata! Il cliente è stato notificato.");

        // Ricarica le liste
        await loadRideRequests();
        await loadActiveRides();
      } else {
        alert(`Errore nell'accettare la corsa: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore nell'accettare la corsa:", error);
      alert("Errore di connessione. Riprova.");
    }
  }
}

async function rejectRide(bookingId) {
  if (confirm("Sei sicuro di voler rifiutare questa corsa?")) {
    // Per ora rimuoviamo solo localmente la richiesta
    // In futuro potresti implementare un sistema di blacklist temporanea
    rideRequests = rideRequests.filter((r) => r.id !== bookingId);
    displayRideRequests();
    document.getElementById("pendingRides").textContent = rideRequests.length;

    alert("Corsa rifiutata.");
  }
}

function displayActiveRides() {
  const container = document.getElementById("activeRidesContainer");
  const emptyState = document.getElementById("emptyActiveState");

  if (activeRides.length === 0) {
    container.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  container.innerHTML = activeRides
    .map(
      (ride) => `
                <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 ${ride.status === 'in_progress' ? 'border-blue-500' : 'border-green-500'}">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">
                                <i class="fas fa-user mr-2"></i>${ride.customer}
                                <span class="ml-2 px-2 py-1 ${ride.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'} text-xs rounded-full">
                                    ${ride.status === 'in_progress' ? 'In Corso' : 'Assegnata'}
                                </span>
                            </h3>
                            <div class="space-y-2 text-gray-600">
                                <div class="flex items-start">
                                    <i class="fas fa-map-marker-alt text-green-600 mr-2 mt-1"></i>
                                    <div>
                                        <p class="font-medium">Partenza:</p>
                                        <p>${ride.pickup}</p>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <i class="fas fa-flag-checkered text-red-600 mr-2 mt-1"></i>
                                    <div>
                                        <p class="font-medium">Destinazione:</p>
                                        <p>${ride.destination}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-green-800">${
                              ride.fare
                            }</div>
                            ${
                              ride.customerPhone
                                ? `<div class="text-sm text-gray-500"><i class="fas fa-phone mr-1"></i>${ride.customerPhone}</div>`
                                : ""
                            }
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center mb-4 text-sm text-gray-600">
                        <span><i class="fas fa-road mr-1"></i>${
                          ride.distance
                        }</span>
                        <span><i class="fas fa-clock mr-1"></i>${
                          ride.estimatedTime
                        }</span>
                    </div>
                    
                    <div class="flex space-x-3">
                        ${ride.status === 'in_progress' ? 
                            // Se la corsa è in corso, mostra solo il bottone Completa
                            `<button onclick="completeRide('${ride.id}')" 
                                    class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300">
                                <i class="fas fa-check-circle mr-2"></i>Completa Corsa
                            </button>` 
                            :
                            // Se la corsa è solo assegnata, mostra entrambi i bottoni
                            `<button onclick="startRide('${ride.id}')" 
                                    class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">
                                <i class="fas fa-play mr-2"></i>Inizia Corsa
                            </button>
                            <button onclick="completeRide('${ride.id}')" 
                                    class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300">
                                <i class="fas fa-check-circle mr-2"></i>Completa
                            </button>`
                        }
                    </div>
                </div>
            `
    )
    .join("");
}

async function startRide(bookingId) {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "in_progress",
        driver_id: currentDriver.idu,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert("Corsa iniziata! Buon viaggio!");
      await loadActiveRides();
    } else {
      alert(`Errore: ${data.error}`);
    }
  } catch (error) {
    console.error("Errore nell'iniziare la corsa:", error);
    alert("Errore di connessione. Riprova.");
  }
}

async function completeRide(bookingId) {
  if (confirm("Hai completato la corsa?")) {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed",
          driver_id: currentDriver.idu
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Corsa completata! Grazie per il servizio.");

        // Ricarica le liste e le statistiche
        await loadActiveRides();
        await loadDriverData();
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore nel completare la corsa:", error);
      alert("Errore di connessione. Riprova.");
    }
  }
}

function logout() {
  if (confirm("Sei sicuro di voler uscire?")) {
    localStorage.removeItem("user");
    localStorage.removeItem("driverStatus"); // Pulisci anche lo stato del driver
    window.location.href = "/html/home.html";
  }
}