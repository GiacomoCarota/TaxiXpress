// Initialize Map
document.addEventListener("DOMContentLoaded", function () {
  var map = L.map("map").setView([45.0447995, 9.6932391], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Add marker for company location
  L.marker([45.0447995, 9.6932391])
    .addTo(map)
    .bindPopup("TaxiXpress HQ<br>Via IV Novembre, 122<br>Piacenza, PC 29121")
    .openPopup();
});

// FAQ Toggle
function toggleFAQ(id) {
  const faqContent = document.getElementById(`faq-${id}`);
  if (faqContent.classList.contains("hidden")) {
    faqContent.classList.remove("hidden");
  } else {
    faqContent.classList.add("hidden");
  }
}
