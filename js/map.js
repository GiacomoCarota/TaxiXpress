// Inizializza la mappa
const map = L.map('map').setView([41.9028, 12.4964], 13); // Coordinate di Roma (esempio)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Aggiunge un marker
const marker = L.marker([41.9028, 12.4964]).addTo(map);
marker.bindPopup('<b>TaxiXpress</b><br>Sede centrale.').openPopup();
