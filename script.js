 // Modern vanilla JavaScript
 document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers to cards
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const href = card.dataset.href;
            if (href) {
                window.location.href = href;
            }
        });

        // Add hover effect for touch devices
        card.addEventListener('touchstart', () => {}, {passive: true});
    });

    // Add intersection observer for fade-in animation
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        },
        { threshold: 0.1 }
    );

    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
});