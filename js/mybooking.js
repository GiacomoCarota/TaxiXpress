let allBookings = [];
let currentFilter = "all";

// Controlla se l'utente è loggato
function checkAuth() {
  const userData = localStorage.getItem("user");
  if (!userData) {
    window.location.href = "/html/login.html";
    return false;
  }

  const user = JSON.parse(userData);
  document.getElementById("userGreeting").textContent = `Ciao, ${user.user.nome}`;
  return user;
}

// Logout function
function logout() {
  localStorage.removeItem("userData");
  window.location.href = "/html/home.html";
}

// Carica le prenotazioni dall'API
async function loadBookings() {
  const user = checkAuth();
  if (!user) return;

  const loadingSpinner = document.getElementById("loadingSpinner");
  const bookingsContainer = document.getElementById("bookingsContainer");
  const emptyState = document.getElementById("emptyState");

  try {
    loadingSpinner.classList.remove("hidden");
    bookingsContainer.innerHTML = "";
    emptyState.classList.add("hidden");

    const response = await fetch(`/api/bookings/user/${user.user.idu}`);
    const data = await response.json();

    if (data.success && data.data.length > 0) {
      allBookings = data.data;
      displayBookings(allBookings);
    } else {
      emptyState.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Errore nel caricamento delle prenotazioni:", error);
    bookingsContainer.innerHTML = `
                    <div class="p-8 text-center">
                        <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Errore nel caricamento</h3>
                        <p class="text-gray-600">Si è verificato un errore nel caricamento delle prenotazioni.</p>
                        <button onclick="loadBookings()" class="mt-4 px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 transition duration-300">
                            Riprova
                        </button>
                    </div>
                `;
  } finally {
    loadingSpinner.classList.add("hidden");
  }
}

// Mostra le prenotazioni nella tabella
function displayBookings(bookings) {
  const container = document.getElementById("bookingsContainer");
  const emptyState = document.getElementById("emptyState");

  if (bookings.length === 0) {
    emptyState.classList.remove("hidden");
    container.innerHTML = "";
    return;
  }

  emptyState.classList.add("hidden");

  const tableHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partenza</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destinazione</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veicolo</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prezzo</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${bookings
                              .map((booking) => createBookingRow(booking))
                              .join("")}
                        </tbody>
                    </table>
                </div>
            `;

  container.innerHTML = tableHTML;
}

// Crea una riga della tabella per una prenotazione
function createBookingRow(booking) {
  const statusInfo = getStatusInfo(booking.status);
  const date = new Date(booking.created_at).toLocaleDateString("it-IT");
  const time = new Date(booking.created_at).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const scheduledInfo =
    booking.is_scheduled && booking.scheduled_datetime
      ? `<div class="text-xs text-blue-600"><i class="fas fa-clock mr-1"></i>Programmata per ${new Date(
          booking.scheduled_datetime
        ).toLocaleString("it-IT")}</div>`
      : "";

  return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">#${
                          booking.booking_id
                        }</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900 max-w-xs truncate" title="${
                          booking.pickup_address
                        }">
                            <i class="fas fa-map-marker-alt text-green-600 mr-1"></i>
                            ${booking.pickup_address}
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900 max-w-xs truncate" title="${
                          booking.dropoff_address
                        }">
                            <i class="fas fa-flag-checkered text-red-600 mr-1"></i>
                            ${booking.dropoff_address}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900 capitalize">
                            <i class="fas fa-car mr-1"></i>
                            ${getVehicleTypeLabel(booking.vehicle_type)}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">
                            €${parseFloat(booking.estimated_fare).toFixed(2)}
                        </div>
                        <div class="text-xs text-gray-500">
                            <i class="fas fa-credit-card mr-1"></i>
                            ${getPaymentMethodLabel(booking.payment_method)}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${date}</div>
                        <div class="text-xs text-gray-500">${time}</div>
                        ${scheduledInfo}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusInfo.class
                        }">
                            <i class="${statusInfo.icon} mr-1"></i>
                            ${statusInfo.label}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="flex space-x-2">
                            <button onclick="viewBookingDetails('${
                              booking.booking_id
                            }')" class="text-blue-600 hover:text-blue-900 transition duration-300" title="Visualizza dettagli">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${
                              booking.status === "pending"
                                ? `
                                <button onclick="cancelBooking('${booking.booking_id}')" class="text-red-600 hover:text-red-900 transition duration-300" title="Cancella prenotazione">
                                    <i class="fas fa-times"></i>
                                </button>
                            `
                                : ""
                            }
                        </div>
                    </td>
                </tr>
            `;
}

// Ottieni informazioni sullo stato
function getStatusInfo(status) {
  const statusMap = {
    pending: {
      label: "In Attesa",
      class: "bg-yellow-100 text-yellow-800",
      icon: "fas fa-clock",
    },
    confirmed: {
      label: "Confermata",
      class: "bg-blue-100 text-blue-800",
      icon: "fas fa-check",
    },
    assigned: {
      label: "Assegnata",
      class: "bg-purple-100 text-purple-800",
      icon: "fas fa-user-check",
    },
    in_progress: {
      label: "In Corso",
      class: "bg-indigo-100 text-indigo-800",
      icon: "fas fa-car",
    },
    completed: {
      label: "Completata",
      class: "bg-green-100 text-green-800",
      icon: "fas fa-check-circle",
    },
    cancelled: {
      label: "Cancellata",
      class: "bg-red-100 text-red-800",
      icon: "fas fa-times-circle",
    },
  };
  return (
    statusMap[status] || {
      label: status,
      class: "bg-gray-100 text-gray-800",
      icon: "fas fa-question",
    }
  );
}

// Ottieni etichetta del tipo di veicolo
function getVehicleTypeLabel(type) {
  const typeMap = {
    standard: "Standard",
    premium: "Premium",
    xl: "XL",
  };
  return typeMap[type] || type;
}

// Ottieni etichetta del metodo di pagamento
function getPaymentMethodLabel(method) {
  const methodMap = {
    card: "Carta",
    cash: "Contanti",
    paypal: "PayPal",
  };
  return methodMap[method] || method;
}

// Filtra prenotazioni
function filterBookings(status) {
  currentFilter = status;

  // Aggiorna i pulsanti dei filtri
  document.querySelectorAll('[id^="filter-"]').forEach((btn) => {
    btn.className =
      "px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-300";
  });
  document.getElementById(`filter-${status}`).className =
    "px-4 py-2 bg-green-800 text-white rounded-lg transition duration-300";

  // Filtra e mostra prenotazioni
  const filteredBookings =
    status === "all"
      ? allBookings
      : allBookings.filter((booking) => booking.status === status);
  displayBookings(filteredBookings);
}

// Visualizza dettagli prenotazione
function viewBookingDetails(bookingId) {
  const booking = allBookings.find((b) => b.booking_id === bookingId);
  if (!booking) return;

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
  modal.innerHTML = `
                <div class="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold text-gray-800">Dettagli Prenotazione #${
                              booking.booking_id
                            }</h3>
                            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 class="font-semibold text-gray-800 mb-2">Informazioni Viaggio</h4>
                                <div class="space-y-2 text-sm">
                                    <p><strong>Partenza:</strong> ${
                                      booking.pickup_address
                                    }</p>
                                    <p><strong>Destinazione:</strong> ${
                                      booking.dropoff_address
                                    }</p>
                                    <p><strong>Veicolo:</strong> ${getVehicleTypeLabel(
                                      booking.vehicle_type
                                    )}</p>
                                    <p><strong>Distanza:</strong> ${
                                      booking.distance
                                        ? `${booking.distance} km`
                                        : "N/A"
                                    }</p>
                                    <p><strong>Durata stimata:</strong> ${
                                      booking.duration
                                        ? `${booking.duration} min`
                                        : "N/A"
                                    }</p>
                                </div>
                            </div>
                            
                            <div>
                                <h4 class="font-semibold text-gray-800 mb-2">Dettagli Pagamento</h4>
                                <div class="space-y-2 text-sm">
                                    <p><strong>Prezzo:</strong> €${parseFloat(
                                      booking.estimated_fare
                                    ).toFixed(2)}</p>
                                    <p><strong>Pagamento:</strong> ${getPaymentMethodLabel(
                                      booking.payment_method
                                    )}</p>
                                    <p><strong>Stato:</strong> <span class="px-2 py-1 rounded-full text-xs ${
                                      getStatusInfo(booking.status).class
                                    }">${
    getStatusInfo(booking.status).label
  }</span></p>
                                </div>
                            </div>
                            
                            <div class="md:col-span-2">
                                <h4 class="font-semibold text-gray-800 mb-2">Date e Orari</h4>
                                <div class="space-y-2 text-sm">
                                    <p><strong>Prenotazione creata:</strong> ${new Date(
                                      booking.created_at
                                    ).toLocaleString("it-IT")}</p>
                                    ${
                                      booking.is_scheduled &&
                                      booking.scheduled_datetime
                                        ? `<p><strong>Viaggio programmato:</strong> ${new Date(
                                            booking.scheduled_datetime
                                          ).toLocaleString("it-IT")}</p>`
                                        : ""
                                    }
                                    <p><strong>Ultimo aggiornamento:</strong> ${new Date(
                                      booking.updated_at
                                    ).toLocaleString("it-IT")}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-6 flex justify-end space-x-4">
                            ${
                              booking.status === "pending"
                                ? `
                                <button onclick="cancelBooking('${booking.booking_id}'); this.closest('.fixed').remove();" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300">
                                    Cancella Prenotazione
                                </button>
                            `
                                : ""
                            }
                            <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-300">
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            `;

  document.body.appendChild(modal);
}

// Cancella prenotazione
async function cancelBooking(bookingId) {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!confirm("Sei sicuro di voler cancellare questa prenotazione?")) {
    return;
  }

  try {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: user.user.idu }),
    });

    const data = await response.json();

    if (data.success) {
      alert("Prenotazione cancellata con successo");
      loadBookings(); // Ricarica le prenotazioni
    } else {
      alert("Errore nella cancellazione: " + data.error);
    }
  } catch (error) {
    console.error("Errore nella cancellazione:", error);
    alert("Si è verificato un errore durante la cancellazione");
  }
}

// Inizializza la pagina
document.addEventListener("DOMContentLoaded", function () {
  if (checkAuth()) {
    loadBookings();
  }
});
