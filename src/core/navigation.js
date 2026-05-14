import { getEl } from './ui.js';

const toolCategories = getEl('tool-categories');
const subToolContainers = document.querySelectorAll('.sub-tool-container');

export function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const targetEl = getEl(target);
            if (targetEl) targetEl.classList.add('active');
            if (target === 'tools-tab') showCategories();
        });
    });

    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const subId = card.getAttribute('data-sub');
            if (toolCategories) toolCategories.style.display = 'none';
            const target = getEl(subId);
            if (target) target.style.display = 'block';

            // Special case for map
            if (subId === 'map-toolset' && window.skoodaMap) {
                setTimeout(() => window.skoodaMap.initMap(), 100);
            }
        });
    });

    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showCategories();
        });
    });
}

export function showCategories() {
    if (toolCategories) toolCategories.style.display = 'grid';
    subToolContainers.forEach(c => c.style.display = 'none');
    
    // Stop special features
    if (window.skoodaVision && typeof window.skoodaVision.stopESP === 'function') {
        window.skoodaVision.stopESP();
    }
    if (window.skoodaQR && typeof window.skoodaQR.stopScanner === 'function') {
        window.skoodaQR.stopScanner();
    }
}
