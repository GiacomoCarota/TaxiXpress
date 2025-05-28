let driverStatus = "offline";
let rideRequests = [];
let activeRides = [];

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  checkDriverAuth();
  loadDriverData();
  updateStatusDisplay();
  loadRideRequests();

  // Auto refresh every 30 seconds
  setInterval(loadRideRequests, 30000);
});

function checkDriverAuth() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.user || user.user.tipo !== "driver") {
    alert("Accesso negato. Solo i driver possono accedere a questa pagina.");
    window.location.href = "/html/home.html";
    return;
  }

  // Update greeting
  const greeting = document.getElementById("userGreeting");
  if (greeting) {
    greeting.textContent = `Ciao, ${user.user.nome || user.user.full_name}`;
  }
}

function toggleDriverStatus() {
  driverStatus = driverStatus === "online" ? "offline" : "online";
  updateStatusDisplay();

  if (driverStatus === "online") {
    loadRideRequests();
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

function loadDriverData() {
  // Simulate loading driver statistics
  document.getElementById("todayRides").textContent = Math.floor(
    Math.random() * 10
  );
  document.getElementById("todayEarnings").textContent =
    "€" + Math.floor(Math.random() * 200);
  document.getElementById("averageRating").textContent = (
    4.5 +
    Math.random() * 0.5
  ).toFixed(1);
}

function loadRideRequests() {
  if (driverStatus === "offline") {
    document.getElementById("rideRequestsContainer").innerHTML = "";
    document.getElementById("emptyState").classList.remove("hidden");
    return;
  }

  document.getElementById("loadingSpinner").classList.remove("hidden");

  // Simulate API call
  setTimeout(() => {
    // Mock data for demonstration
    rideRequests = [
      {
        id: 1,
        customer: "Mario Rossi",
        pickup: "Via Roma 123, Milano",
        destination: "Aeroporto Malpensa",
        distance: "45 km",
        estimatedTime: "35 min",
        fare: "€65",
        requestTime: new Date(Date.now() - 5 * 60000).toLocaleTimeString(),
      },
      {
        id: 2,
        customer: "Giulia Bianchi",
        pickup: "Stazione Centrale",
        destination: "Via Montenapoleone 8",
        distance: "8 km",
        estimatedTime: "15 min",
        fare: "€18",
        requestTime: new Date(Date.now() - 2 * 60000).toLocaleTimeString(),
      },
    ];

    displayRideRequests();
    document.getElementById("loadingSpinner").classList.add("hidden");
    document.getElementById("pendingRides").textContent = rideRequests.length;
  }, 1000);
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
                                <i class="fas fa-user mr-2"></i>${request.customer}
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
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-green-800">${request.fare}</div>
                            <div class="text-sm text-gray-500">Richiesta: ${request.requestTime}</div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center mb-4 text-sm text-gray-600">
                        <span><i class="fas fa-road mr-1"></i>${request.distance}</span>
                        <span><i class="fas fa-clock mr-1"></i>${request.estimatedTime}</span>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button onclick="acceptRide(${request.id})" 
                                class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300">
                            <i class="fas fa-check mr-2"></i>Accetta
                        </button>
                        <button onclick="rejectRide(${request.id})" 
                                class="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition duration-300">
                            <i class="fas fa-times mr-2"></i>Rifiuta
                        </button>
                    </div>
                </div>
            `
    )
    .join("");
}

function acceptRide(rideId) {
  if (confirm("Vuoi accettare questa corsa?")) {
    const ride = rideRequests.find((r) => r.id === rideId);
    if (ride) {
      // Move to active rides
      activeRides.push({
        ...ride,
        status: "accepted",
        acceptedTime: new Date(),
      });
      rideRequests = rideRequests.filter((r) => r.id !== rideId);

      displayRideRequests();
      displayActiveRides();

      alert("Corsa accettata! Il cliente è stato notificato.");
    }
  }
}

function rejectRide(rideId) {
  if (confirm("Sei sicuro di voler rifiutare questa corsa?")) {
    rideRequests = rideRequests.filter((r) => r.id !== rideId);
    displayRideRequests();

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
                <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">
                                <i class="fas fa-user mr-2"></i>${ride.customer}
                                <span class="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Attiva</span>
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
                            <div class="text-2xl font-bold text-green-800">${ride.fare}</div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center mb-4 text-sm text-gray-600">
                        <span><i class="fas fa-road mr-1"></i>${ride.distance}</span>
                        <span><i class="fas fa-clock mr-1"></i>${ride.estimatedTime}</span>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button onclick="startRide(${ride.id})" 
                                class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">
                            <i class="fas fa-play mr-2"></i>Inizia Corsa
                        </button>
                        <button onclick="completeRide(${ride.id})" 
                                class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300">
                            <i class="fas fa-check-circle mr-2"></i>Completa
                        </button>
                    </div>
                </div>
            `
    )
    .join("");
}

function startRide(rideId) {
  alert("Corsa iniziata! Buon viaggio!");
}

function completeRide(rideId) {
  if (confirm("Hai completato la corsa?")) {
    activeRides = activeRides.filter((r) => r.id !== rideId);
    displayActiveRides();

    // Update statistics
    const todayRides = document.getElementById("todayRides");
    todayRides.textContent = parseInt(todayRides.textContent) + 1;

    alert("Corsa completata! Grazie per il servizio.");
  }
}

function logout() {
  if (confirm("Sei sicuro di voler uscire?")) {
    localStorage.removeItem("user");
    window.location.href = "/html/home.html";
  }
}
