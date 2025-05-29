// Show/hide sections
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
    window.scrollTo(0, 0);
}

function hideSection(sectionId) {
    document.getElementById(sectionId).classList.add('hidden');
    document.getElementById('home').classList.remove('hidden');
}

// Initialize with home section visible
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('home').classList.remove('hidden');
    initMap();
});

// Booking tabs
function switchTab(tab) {
    document.getElementById('tab-now').classList.remove('tab-active');
    document.getElementById('tab-later').classList.remove('tab-active');
    document.getElementById('tab-' + tab).classList.add('tab-active');

    document.getElementById('now-content').classList.add('hidden');
    document.getElementById('later-content').classList.add('hidden');
    document.getElementById(tab + '-content').classList.remove('hidden');
}

// FAQ toggle
function toggleFAQ(id) {
    const faq = document.getElementById('faq-' + id);
    faq.classList.toggle('hidden');
}

// Initialize map
function initMap() {
    const map = L.map('map').setView([40.7128, -74.0060], 13); // Default to New York

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const marker = L.marker([40.7128, -74.0060]).addTo(map)
        .bindPopup('SwiftRide Headquarters')
        .openPopup();
}

// Get current location
function getCurrentLocation(inputId) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

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
            c.classList.remove('border-blue-500', 'bg-blue-50');
        });
        this.classList.add('border-blue-500', 'bg-blue-50');
    });
});
