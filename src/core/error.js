// =============================================================================
// Skooda Mobile — Global ErrorBoundary & Exception Trap
// Catches unhandled rejections and runtime exceptions without crashing the UI.
// =============================================================================

import { showToast } from './toast.js';
import { events } from './eventbus.js';

export function initErrorBoundary() {
    window.addEventListener('error', (event) => {
        console.error('[Global Error]', event.error || event.message);
        events.emit('app:error', {
            type: 'runtime',
            message: event.message,
            filename: event.filename,
            lineno: event.lineno
        });
        // Non-intrusive toast for critical errors
        if (event.message && !event.message.includes('ResizeObserver')) {
            showToast(`System-Hinweis: ${event.message.substring(0, 60)}`, 'warn');
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason ? (event.reason.message || event.reason.toString()) : 'Unbekannter Fehler';
        console.warn('[Unhandled Rejection]', reason);
        events.emit('app:error', {
            type: 'promise',
            reason
        });
    });

    // Offline / Online state listeners
    window.addEventListener('offline', () => {
        showToast('Keine Internetverbindung — Offline-Modus aktiv', 'warn');
        events.emit('network:status', false);
    });

    window.addEventListener('online', () => {
        showToast('Internetverbindung wiederhergestellt', 'success');
        events.emit('network:status', true);
    });
}
