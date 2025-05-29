function toggleFAQ(id) {
  const faqContent = document.getElementById(id);
  if (faqContent.classList.contains("hidden")) {
    faqContent.classList.remove("hidden");
  } else {
    faqContent.classList.add("hidden");
  }
}
