// Configurazione mappa e variabili globali
let map;
let pickupMarker;
let dropoffMarker;
let routeControl;
let currentRoute = null;


// Tariffe per tipo di veicolo
const vehicleRates = {
    standard: { perKm: 2.50, baseFare: 3.50 },
    premium: { perKm: 3.50, baseFare: 5.00 },
    xl: { perKm: 4.00, baseFare: 6.00 }
};

let selectedVehicleType = 'standard';

// Inizializzazione della mappa
function initMap() {
    // Inizializza mappa centrata su Piacenza
    map = L.map('map').setView([45.042236, 9.679320], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Gestione dei tab
function switchTab(tab) {
    const nowTab = document.getElementById('tab-now');
    const laterTab = document.getElementById('tab-later');
    const nowContent = document.getElementById('now-content');
    const laterContent = document.getElementById('later-content');
    
    if (tab === 'now') {
        nowTab.classList.add('tab-active', 'text-green-800', 'border-b-2', 'border-green-800');
        nowTab.classList.remove('text-gray-500');
        laterTab.classList.remove('tab-active', 'text-green-800', 'border-b-2', 'border-green-800');
        laterTab.classList.add('text-gray-500');
        nowContent.classList.remove('hidden');
        laterContent.classList.add('hidden');
    } else {
        laterTab.classList.add('tab-active', 'text-green-800', 'border-b-2', 'border-green-800');
        laterTab.classList.remove('text-gray-500');
        nowTab.classList.remove('tab-active', 'text-green-800', 'border-b-2', 'border-green-800');
        nowTab.classList.add('text-gray-500');
        laterContent.classList.remove('hidden');
        nowContent.classList.add('hidden');
    }
}

// Geocoding per convertire indirizzo in coordinate
async function geocodeAddress(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Errore geocoding:', error);
        return null;
    }
}

// Reverse geocoding per ottenere indirizzo da coordinate
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        return data.display_name || `${lat}, ${lng}`;
    } catch (error) {
        console.error('Errore reverse geocoding:', error);
        return `${lat}, ${lng}`;
    }
}

// Ottenere posizione corrente dell'utente
function getCurrentLocation(inputId) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            const address = await reverseGeocode(lat, lng);
            document.getElementById(inputId).value = address;
            
            // Aggiorna mappa se è il pickup
            if (inputId.includes('pickup')) {
                updatePickupMarker(lat, lng);
            }
            
            calculateRoute();
        }, (error) => {
            alert('Impossibile ottenere la posizione corrente: ' + error.message);
        });
    } else {
        alert('Geolocalizzazione non supportata dal browser');
    }
}

// Aggiornare marker di pickup
function updatePickupMarker(lat, lng) {
    if (pickupMarker) {
        map.removeLayer(pickupMarker);
    }
    
    pickupMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: '<div class="marker-pin pickup-marker"><i class="fas fa-map-marker-alt"></i></div>',
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        })
    }).addTo(map);
}

// Aggiornare marker di dropoff
function updateDropoffMarker(lat, lng) {
    if (dropoffMarker) {
        map.removeLayer(dropoffMarker);
    }
    
    dropoffMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: '<div class="marker-pin dropoff-marker"><i class="fas fa-flag-checkered"></i></div>',
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        })
    }).addTo(map);
}

// Calcolare il percorso tra due punti
async function calculateRoute() {
    const activeTab = document.getElementById('now-content').classList.contains('hidden') ? 'later' : 'now';
    const pickupInput = document.getElementById(`pickup-${activeTab}`);
    const dropoffInput = document.getElementById(`dropoff-${activeTab}`);
    
    const pickupAddress = pickupInput.value.trim();
    const dropoffAddress = dropoffInput.value.trim();
    
    if (!pickupAddress || !dropoffAddress) {
        resetRouteDisplay();
        return;
    }
    
    showLoadingModal();
    
    try {
        // Geocoding degli indirizzi
        const pickupCoords = await geocodeAddress(pickupAddress);
        const dropoffCoords = await geocodeAddress(dropoffAddress);
        
        if (!pickupCoords || !dropoffCoords) {
            hideLoadingModal();
            alert('Impossibile trovare uno o entrambi gli indirizzi');
            return;
        }
        
        // Aggiornare marker
        updatePickupMarker(pickupCoords.lat, pickupCoords.lng);
        updateDropoffMarker(dropoffCoords.lat, dropoffCoords.lng);
        
        // Calcolare percorso con OpenRouteService o routing semplice
        const routeData = await getRoute(pickupCoords, dropoffCoords);
        
        if (routeData) {
            displayRoute(routeData);
            calculateFare(routeData.distance);
        }
        
        // Centrare mappa sui punti
        const group = new L.featureGroup([pickupMarker, dropoffMarker]);
        map.fitBounds(group.getBounds().pad(0.1));
        
    } catch (error) {
        console.error('Errore calcolo percorso:', error);
        alert('Errore nel calcolo del percorso');
    } finally {
        hideLoadingModal();
    }
}

// Ottenere dati del percorso (implementazione semplificata)
async function getRoute(start, end) {
    try {
        // Calcolo distanza euclidea approssimativa (da sostituire con API routing reale)
        const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
        const duration = Math.round(distance * 2); // Stima approssimativa: 2 min per km
        
        return {
            distance: distance,
            duration: duration,
            coordinates: [[start.lat, start.lng], [end.lat, end.lng]]
        };
    } catch (error) {
        console.error('Errore routing:', error);
        return null;
    }
}

// Calcolare distanza tra due punti (formula di Haversine)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Raggio della Terra in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round((R * c) * 100) / 100; // Arrotondato a 2 decimali
}

// Visualizzare il percorso sulla mappa
function displayRoute(routeData) {
    // Rimuovere percorso precedente
    if (routeControl) {
        map.removeLayer(routeControl);
    }
    
    // Aggiungere linea del percorso
    routeControl = L.polyline(routeData.coordinates, {
        color: '#059669',
        weight: 4,
        opacity: 0.8
    }).addTo(map);
    
    currentRoute = routeData;
    
    // Aggiornare info del percorso
    document.getElementById('distance-info').textContent = `Distanza: ${routeData.distance} km`;
    document.getElementById('duration-info').textContent = `Durata: ${routeData.duration} min`;
}

// Calcolare la tariffa
function calculateFare(distance) {
    const rates = vehicleRates[selectedVehicleType];
    const fare = rates.baseFare + (distance * rates.perKm);
    
    document.getElementById('estimated-fare').textContent = `€${fare.toFixed(2)}`;
    document.getElementById('base-fare').textContent = rates.baseFare.toFixed(2);
    document.getElementById('per-km-cost').textContent = (distance * rates.perKm).toFixed(2);
    document.getElementById('route-details').classList.remove('hidden');
}

// Reset visualizzazione percorso
function resetRouteDisplay() {
    document.getElementById('estimated-fare').textContent = '€0,00';
    document.getElementById('distance-info').textContent = 'Distanza: -- km';
    document.getElementById('duration-info').textContent = 'Durata: -- min';
    document.getElementById('route-details').classList.add('hidden');
    
    if (routeControl) {
        map.removeLayer(routeControl);
        routeControl = null;
    }
    currentRoute = null;
}

// Gestione selezione veicolo
function initVehicleSelection() {
    const vehicleCards = document.querySelectorAll('.vehicle-card');
    
    vehicleCards.forEach((card, index) => {
        card.addEventListener('click', () => {
            // Rimuovere selezione precedente
            vehicleCards.forEach(c => c.classList.remove('border-green-500', 'bg-green-50'));
            
            // Aggiungere selezione corrente
            card.classList.add('border-green-500', 'bg-green-50');
            
            // Aggiornare tipo veicolo selezionato
            const types = ['standard', 'premium', 'xl'];
            selectedVehicleType = types[index];
            
            // Ricalcolare tariffa se esiste un percorso
            if (currentRoute) {
                calculateFare(currentRoute.distance);
            }
        });
    });
    
    // Selezionare il primo veicolo di default
    vehicleCards[0].click();
}

// Ottenere dati della prenotazione
function getBookingData() {
    const activeTab = document.getElementById('now-content').classList.contains('hidden') ? 'later' : 'now';
    const isScheduled = activeTab === 'later';
    
    const pickupInput = document.getElementById(`pickup-${activeTab}`);
    const dropoffInput = document.getElementById(`dropoff-${activeTab}`);
    
    const bookingData = {
        pickup_address: pickupInput.value.trim(),
        dropoff_address: dropoffInput.value.trim(),
        vehicle_type: selectedVehicleType,
        payment_method: document.querySelector('input[name="payment"]:checked').id,
        is_scheduled: isScheduled,
        distance: currentRoute ? currentRoute.distance : 0,
        duration: currentRoute ? currentRoute.duration : 0,
        estimated_fare: parseFloat(document.getElementById('estimated-fare').textContent.replace('€', '').replace(',', '.')),
        booking_time: new Date().toISOString()
    };
    
    if (isScheduled) {
        const dateInput = document.querySelector('input[type="date"]');
        const timeInput = document.querySelector('input[type="time"]');
        
        if (dateInput.value && timeInput.value) {
            bookingData.scheduled_date = dateInput.value;
            bookingData.scheduled_time = timeInput.value;
            bookingData.scheduled_datetime = `${dateInput.value}T${timeInput.value}:00`;
        }
    }
    
    return bookingData;
}

// Validare i dati della prenotazione
function validateBookingData(data) {
    const errors = [];
    
    if (!data.pickup_address) errors.push('Inserire indirizzo di partenza');
    if (!data.dropoff_address) errors.push('Inserire indirizzo di destinazione');
    if (!data.vehicle_type) errors.push('Selezionare tipo di veicolo');
    if (!data.payment_method) errors.push('Selezionare metodo di pagamento');
    if (data.distance === 0) errors.push('Calcolare il percorso prima di prenotare');
    
    if (data.is_scheduled) {
        if (!data.scheduled_date) errors.push('Inserire data per prenotazione programmata');
        if (!data.scheduled_time) errors.push('Inserire ora per prenotazione programmata');
        
        // Validare che la data/ora sia nel futuro
        if (data.scheduled_datetime) {
            const scheduledDate = new Date(data.scheduled_datetime);
            const now = new Date();
            if (scheduledDate <= now) {
                errors.push('Data e ora devono essere nel futuro');
            }
        }
    }
    
    return errors;
}

// Salvare prenotazione nel database tramite API
async function saveBooking(bookingData) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        console.error('Errore salvataggio prenotazione:', error);
        throw error;
    }
}

// Verificare se l'utente è autenticato
function checkUserAuthentication() {
    try {
        const user = localStorage.getItem('user');
        

        if (!user) {
            return false;
        }
        
        // Parsare dati utente
        const userData = JSON.parse(user);
        console.log('Controllo autenticazione utente:', userData.user);
        return {
            user: userData.user
        };
        
    } catch (error) {
        console.error('Errore controllo autenticazione:', error);
        // Se ci sono errori nel parsing, pulire il localStorage
        localStorage.removeItem('user');
        return null;
    }
}

// Mostrare modal di login richiesto
function showLoginRequiredModal() {
    // Creare modal dinamicamente se non esiste
    let modal = document.getElementById('login-required-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'login-required-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-md mx-4 relative">
                <div class="text-center">
                    <i class="fas fa-user-lock text-red-500 text-4xl mb-4"></i>
                    <h3 class="text-xl font-bold mb-2">Accesso Richiesto</h3>
                    <p class="text-gray-600 mb-6">Devi effettuare l'accesso per prenotare una corsa.</p>
                    <div class="flex space-x-3 justify-center">
                        <button onclick="redirectToLogin()" class="bg-green-800 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition duration-300">
                            Accedi
                        </button>
                        <button onclick="redirectToRegister()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition duration-300">
                            Registrati
                        </button>
                        <button onclick="closeLoginRequiredModal()" class="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition duration-300">
                            Annulla
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Assicurarsi che il modal sia visibile sopra tutto
    modal.style.zIndex = '9999';
    modal.classList.remove('hidden');
}

// Chiudere modal di login richiesto
function closeLoginRequiredModal() {
    const modal = document.getElementById('login-required-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Reindirizzare alla pagina di login
function redirectToLogin() {
    // Salvare URL corrente per redirect dopo login
    localStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = '/html/login.html';
}

// Reindirizzare alla pagina di registrazione
function redirectToRegister() {
    // Salvare URL corrente per redirect dopo registrazione
    localStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = '/html/register.html';
}

// Gestire conferma prenotazione
async function handleBookingConfirmation() {
    try {
        // Verificare autenticazione PRIMA di tutto
        const authData = checkUserAuthentication();
        console.log('Dati autenticazione utente:', authData.user);
        if (!authData) {
            showLoginRequiredModal();
            return;
        }
        
        showLoadingModal();
        
        // Ottenere e validare dati
        const bookingData = getBookingData();
        const validationErrors = validateBookingData(bookingData);
        
        if (validationErrors.length > 0) {
            hideLoadingModal();
            alert('Errori nella prenotazione:\n' + validationErrors.join('\n'));
            return;
        }
        
        // Aggiungere dati utente alla prenotazione
        bookingData.user_id = authData.user.idu || authData.user.user_id;
        bookingData.user_email = authData.user.email;
        bookingData.user_name = authData.user.nome || authData.user.full_name;
        bookingData.user_phone = authData.user.phone || authData.user.phone_number;
        
        // Salvare nel database
        const result = await saveBooking(bookingData);
        
        hideLoadingModal();
        
        // Mostrare conferma
        showSuccessModal(result, bookingData);
        
        // Reset form
        resetBookingForm();
        
    } catch (error) {
        hideLoadingModal();
        console.error('Errore prenotazione:', error);
        
        // Gestire errori di autenticazione
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            localStorage.removeItem('user');
            showLoginRequiredModal();
        } else {
            alert('Errore durante la prenotazione: ' + error.message);
        }
    }
}

// Reset del form di prenotazione
function resetBookingForm() {
    // Reset input
    document.querySelectorAll('input[type="text"], input[type="date"], input[type="time"]').forEach(input => {
        input.value = '';
    });
    
    // Reset selezione veicolo
    document.querySelectorAll('.vehicle-card').forEach(card => {
        card.classList.remove('border-green-500', 'bg-green-50');
    });
    document.querySelector('.vehicle-card').click(); // Seleziona il primo
    
    // Reset payment method
    document.getElementById('card').checked = true;
    
    // Reset mappa
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    if (routeControl) map.removeLayer(routeControl);
    
    pickupMarker = null;
    dropoffMarker = null;
    routeControl = null;
    currentRoute = null;
    
    resetRouteDisplay();
}

// Mostrare modal di successo
function showSuccessModal(result, bookingData) {
    const modal = document.getElementById('success-modal');
    const summaryDiv = document.getElementById('booking-summary');
    
    const scheduledInfo = bookingData.is_scheduled 
        ? `<div><strong>Data:</strong> ${bookingData.scheduled_date} alle ${bookingData.scheduled_time}</div>`
        : '<div><strong>Tipo:</strong> Corsa immediata</div>';
    
    summaryDiv.innerHTML = `
        <div><strong>ID Prenotazione:</strong> ${result.booking_id || 'N/A'}</div>
        <div><strong>Da:</strong> ${bookingData.pickup_address}</div>
        <div><strong>A:</strong> ${bookingData.dropoff_address}</div>
        <div><strong>Veicolo:</strong> ${bookingData.vehicle_type.charAt(0).toUpperCase() + bookingData.vehicle_type.slice(1)}</div>
        ${scheduledInfo}
        <div><strong>Distanza:</strong> ${bookingData.distance} km</div>
        <div><strong>Tariffa:</strong> €${bookingData.estimated_fare.toFixed(2)}</div>
        <div><strong>Pagamento:</strong> ${bookingData.payment_method}</div>
    `;
    
    modal.classList.remove('hidden');
}

// Chiudere modal di successo
function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
}

// Mostrare/nascondere modal di caricamento
function showLoadingModal() {
    document.getElementById('loading-modal').classList.remove('hidden');
}

function hideLoadingModal() {
    document.getElementById('loading-modal').classList.add('hidden');
}

// Event listeners per input degli indirizzi
function setupAddressInputs() {
    const inputs = ['pickup-now', 'dropoff-now', 'pickup-later', 'dropoff-later'];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            // Debounce per evitare troppe chiamate API
            let timeout;
            input.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    calculateRoute();
                }, 1000); // Aspetta 1 secondo dopo che l'utente smette di digitare
            });
        }
    });
}

// Mostrare informazioni utente se loggato
function displayUserInfo() {
    const authData = checkUserAuthentication();
    
    if (authData) {
        // Creare elemento info utente se non esiste
        let userInfo = document.getElementById('user-info-booking');
        
        if (!userInfo) {
            userInfo = document.createElement('div');
            userInfo.id = 'user-info-booking';
            userInfo.className = 'bg-green-50 border border-green-200 rounded-lg p-4 mb-6';
            
            // Inserire prima del form di prenotazione
            const bookingForm = document.querySelector('.bg-white.p-6.rounded-xl.shadow-lg');
            if (bookingForm) {
                bookingForm.parentNode.insertBefore(userInfo, bookingForm);
            }
        }
        
        userInfo.innerHTML = `
            <div class="flex items-center justify-between w-64">
                <div class="flex items-center">
                    <i class="fas fa-user-check text-green-600 mr-3"></i>
                    <div>
                        <div class="font-medium text-green-800">Benvenuto, ${authData.user.nome || authData.user.full_name || 'Utente'}!</div>
                        <div class="text-sm text-green-600">${authData.user.email}</div>
                        <div class="text-sm text-green-600">${authData.user.phone}</div>
                    </div>
                </div>
                <button onclick="logout()" class="text-sm text-gray-500 hover:text-red-600 transition duration-300">
                    <i class="fas fa-sign-out-alt mr-1"></i> Esci
                </button>
            </div>
        `;
    }
}

// Gestire logout
function logout() {
    if (confirm('Sei sicuro di voler uscire?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('redirectAfterLogin');
        
        // Rimuovere info utente
        const userInfo = document.getElementById('user-info-booking');
        if (userInfo) {
            userInfo.remove();
        }
        
        // Mostrare messaggio e reindirizzare
        alert('Logout effettuato con successo');
        
        // Opzionale: reindirizzare alla home
        window.location.href = '/html/home.html';
    }
}

// Controllare redirect dopo login
function checkPostLoginRedirect() {
    const redirectUrl = localStorage.getItem('redirectAfterLogin');
    if (redirectUrl && redirectUrl === window.location.href) {
        localStorage.removeItem('redirectAfterLogin');
        
        // Mostrare messaggio di benvenuto
        const authData = checkUserAuthentication();
        if (authData) {
            // Creare e mostrare toast di benvenuto
            showWelcomeToast(authData.user.nome || authData.user.full_name || 'Utente');
        }
    }
}

// Mostrare toast di benvenuto
function showWelcomeToast(userName) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>Benvenuto, ${userName}! Ora puoi prenotare.</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animare l'entrata
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Rimuovere dopo 4 secondi
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}
// Fix per il z-index della mappa e altri elementi
function fixMapZIndex() {
    // Trovare il container della mappa
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        // Impostare z-index più basso per la mappa
        mapContainer.style.zIndex = '1';
        mapContainer.style.position = 'relative';
    }
    
    // Trovare tutti gli elementi leaflet e impostare z-index appropriati
    const leafletElements = document.querySelectorAll('.leaflet-container, .leaflet-control-container');
    leafletElements.forEach(element => {
        element.style.zIndex = '1';
    });
    
    // Assicurarsi che i controlli della mappa abbiano z-index appropriato
    setTimeout(() => {
        const leafletControls = document.querySelectorAll('.leaflet-control');
        leafletControls.forEach(control => {
            control.style.zIndex = '10';
        });
    }, 1000);
}

function addZIndexStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Fix z-index per mappa */
        .leaflet-container {
            z-index: 1 !important;
        }
        
        .leaflet-control-container {
            z-index: 10 !important;
        }
        
        .leaflet-control {
            z-index: 10 !important;
        }
        
        /* Header e dropdown */
        header {
            z-index: 1000 !important;
        }
        
        #profile-dropdown {
            z-index: 9999 !important;
        }
        
        /* Modal */
        #login-required-modal {
            z-index: 10000 !important;
        }
        
        #success-modal {
            z-index: 10000 !important;
        }
        
        #loading-modal {
            z-index: 10000 !important;
        }
        
        /* Marker personalizzati */
        .marker-pin {
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            position: relative;
            transform: rotate(-45deg);
            left: 50%;
            top: 50%;
            margin: -15px 0 0 -15px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }
        
        .pickup-marker {
            background: #059669;
            color: white;
        }
        
        .dropoff-marker {
            background: #dc2626;
            color: white;
        }
        
        .marker-pin i {
            transform: rotate(45deg);
        }
        
        .tab-active {
            border-bottom: 2px solid #059669 !important;
            color: #059669 !important;
        }
        
        .input-highlight:focus {
            box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }
    `;
    document.head.appendChild(style);
}
// Inizializzazione quando la pagina è caricata
document.addEventListener('DOMContentLoaded', function() {
    // Aggiungere stili per z-index
    addZIndexStyles();
    // Controllare autenticazione e mostrare info utente
    displayUserInfo();
    
    // Controllare se c'è un redirect dopo login
    checkPostLoginRedirect();
    
    // Inizializzare mappa
    initMap();
    
    // Inizializzare selezione veicoli
    initVehicleSelection();
    
    // Setup input degli indirizzi
    setupAddressInputs();
    
    // Event listener per il pulsante di conferma
    const confirmButton = document.querySelector('button[class*="bg-green-800"]');
    if (confirmButton) {
        confirmButton.addEventListener('click', handleBookingConfirmation);
    }
});

// Funzioni globali per compatibilità con il template HTML
window.switchTab = switchTab;
window.getCurrentLocation = getCurrentLocation;
window.closeSuccessModal = closeSuccessModal;
window.closeLoginRequiredModal = closeLoginRequiredModal;
window.redirectToLogin = redirectToLogin;
window.redirectToRegister = redirectToRegister;
window.logout = logout;
window.fixMapZIndex = fixMapZIndex;
window.addZIndexStyles = addZIndexStyles;