// =============================================================================
// Skooda Mobile — Tactical Cyber Toast HUD
// Non-blocking, stackable feedback notifications.
// =============================================================================

let toastContainer = null;

function ensureContainer() {
    if (!toastContainer || !document.body.contains(toastContainer)) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'skooda-toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

/**
 * Display a tactical toast message
 * @param {string} message - Text message
 * @param {'info'|'success'|'warn'|'error'} type - Toast type
 * @param {number} durationMs - Duration in milliseconds (default 3000ms)
 */
export function showToast(message, type = 'info', durationMs = 3200) {
    const container = ensureContainer();

    const toast = document.createElement('div');
    toast.className = `cyber-toast toast-${type}`;

    const iconMap = {
        info: 'ℹ️',
        success: '✅',
        warn: '⚠️',
        error: '❌'
    };

    toast.innerHTML = `
        <span class="toast-icon">${iconMap[type] || 'ℹ️'}</span>
        <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });

    // Auto Dismiss
    setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 300);
    }, durationMs);
}
