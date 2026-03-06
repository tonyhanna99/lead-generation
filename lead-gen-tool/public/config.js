// Auto-detects environment — no changes needed when switching between local and prod.
window.API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? ''  // local: relative URLs, same Express server
    : 'https://lead-generation-kr3d.onrender.com';

