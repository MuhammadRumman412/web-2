document.addEventListener('DOMContentLoaded', () => {
  // Remove loading class
  document.body.classList.remove('loading');

  // Hamburger / mobile nav toggle
  const hamburger = document.getElementById('hamburger');
  const mainNav   = document.getElementById('mainNav');

  if (hamburger && mainNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mainNav.classList.toggle('open');
    });

    // Close nav when a link is clicked
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mainNav.classList.remove('open');
      });
    });
  }
});