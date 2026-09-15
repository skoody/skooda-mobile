// =============================================================================
// Skooda Mobile — Navigation & View Manager with Android Backstack
// Handles tab switching, sub-tool views, modals, and hardware back button.
// =============================================================================

import { getEl } from './ui.js';
import { events } from './eventbus.js';
import { navStore } from './store.js';
import { showToast } from './toast.js';

let toolCategories;
let subToolContainers;

let lastBackPressTime = 0;

export function initNavigation() {
    toolCategories = getEl('tool-categories');
    subToolContainers = document.querySelectorAll('.sub-tool-container');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            switchTab(target);
        });
    });

    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const subId = card.getAttribute('data-sub');
            openSubTool(subId);
        });
    });

    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showCategories();
        });
    });

    setupAndroidBackstack();
}

function setupAndroidBackstack() {
    // Push initial history state for webview back trap
    if (window.history && window.history.pushState) {
        window.history.pushState({ page: 'home' }, '');
        window.addEventListener('popstate', (e) => {
            window.history.pushState({ page: 'home' }, '');
            handleBackAction();
        });
    }

    // Tauri native Android back-button listener
    if (window.__TAURI__ && window.__TAURI__.event) {
        window.__TAURI__.event.listen('tauri://back-button', () => {
            handleBackAction();
        });
    }
}

export function handleBackAction() {
    // 1. Level 1: Close active custom modals
    const openModals = [
        getEl('poi-modal'),
        getEl('elevation-modal'),
        getEl('device-modal')
    ].filter(m => m && m.style.display !== 'none' && m.style.display !== '');

    if (openModals.length > 0) {
        openModals.forEach(m => m.style.display = 'none');
        return true;
    }

    // 2. Level 2: Close active drawers
    const openDrawers = [
        getEl('poi-drawer'),
        getEl('map-directions-drawer')
    ].filter(d => d && d.style.display !== 'none' && d.style.display !== '');

    if (openDrawers.length > 0) {
        openDrawers.forEach(d => d.style.display = 'none');
        return true;
    }

    // 3. Level 3: Close active sub-tool (Cyber, Rechner, Map, QR, etc.)
    const state = navStore.get();
    if (state.activeSubtool) {
        showCategories();
        return true;
    }

    // 4. Level 4: Return from secondary tabs (Chat, Tools, Update) to Monitor
    if (state.activeTab !== 'monitor-tab') {
        switchTab('monitor-tab');
        return true;
    }

    // 5. Level 5: Double-tap on Home / Monitor to exit
    const now = Date.now();
    if (now - lastBackPressTime < 2000) {
        if (window.__TAURI__ && window.__TAURI__.process) {
            window.__TAURI__.process.exit(0);
        }
    } else {
        lastBackPressTime = now;
        showToast('Nochmal drücken zum Beenden', 'info');
    }
    return false;
}

export function switchTab(target) {
    if (!target) return;

    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(b => {
        if (b.getAttribute('data-tab') === target) b.classList.add('active');
        else b.classList.remove('active');
    });

    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const targetEl = getEl(target);
    if (targetEl) targetEl.classList.add('active');

    navStore.set(s => ({
        activeTab: target,
        history: [...s.history, target]
    }));
    events.emit('nav:tab_changed', target);

    if (target === 'tools-tab') {
        showCategories();
    }
}

export function openSubTool(subId) {
    if (!subId) return;

    if (toolCategories) toolCategories.style.display = 'none';
    subToolContainers.forEach(c => c.style.display = 'none');
    const target = getEl(subId);
    if (target) target.style.display = 'block';

    navStore.set({ activeSubtool: subId });
    events.emit('nav:subtool_opened', subId);

    // Map refresh
    if (subId === 'map-toolset' && window.skoodaMap && typeof window.skoodaMap.initMap === 'function') {
        setTimeout(() => {
            window.skoodaMap.initMap();
        }, 100);
    }
}

export function showCategories() {
    if (toolCategories) toolCategories.style.display = 'grid';
    subToolContainers.forEach(c => c.style.display = 'none');

    navStore.set({ activeSubtool: null });
    events.emit('nav:subtool_closed');

    // Conserve resources when leaving sub-tools
    if (window.skoodaVision && typeof window.skoodaVision.stopESP === 'function') {
        window.skoodaVision.stopESP();
    }
    if (window.skoodaQR && typeof window.skoodaQR.stopScanner === 'function') {
        window.skoodaQR.stopScanner();
    }
}
