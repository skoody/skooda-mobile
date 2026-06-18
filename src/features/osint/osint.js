import { getEl } from '../../core/ui.js';

const PLATFORMS = [
    { name: 'GitHub', url: 'https://github.com/{}', errorType: 'status' },
    { name: 'GitLab', url: 'https://gitlab.com/{}', errorType: 'status' },
    { name: 'Reddit', url: 'https://www.reddit.com/user/{}/about.json', errorType: 'status' },
    { name: 'Twitter/X', url: 'https://x.com/{}', errorType: 'status' },
    { name: 'Instagram', url: 'https://www.instagram.com/{}/', errorType: 'status' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@{}', errorType: 'status' },
    { name: 'YouTube', url: 'https://www.youtube.com/@{}', errorType: 'status' },
    { name: 'Twitch', url: 'https://www.twitch.tv/{}', errorType: 'status' },
    { name: 'Pinterest', url: 'https://www.pinterest.com/{}/', errorType: 'status' },
    { name: 'Telegram', url: 'https://t.me/{}', errorType: 'status' },
    { name: 'Steam', url: 'https://steamcommunity.com/id/{}', errorType: 'status' },
    { name: 'Roblox (Forum)', url: 'https://www.roblox.com/user.aspx?username={}', errorType: 'status' },
    { name: 'SoundCloud', url: 'https://soundcloud.com/{}', errorType: 'status' },
    { name: 'Spotify', url: 'https://open.spotify.com/user/{}', errorType: 'status' },
    { name: 'Medium', url: 'https://medium.com/@{}', errorType: 'status' },
    { name: 'Keybase', url: 'https://keybase.io/{}', errorType: 'status' },
    { name: 'HackerOne', url: 'https://hackerone.com/{}', errorType: 'status' },
    { name: 'Gravatar', url: 'https://en.gravatar.com/{}', errorType: 'status' },
    { name: 'About.me', url: 'https://about.me/{}', errorType: 'status' },
    { name: 'Flickr', url: 'https://www.flickr.com/people/{}/', errorType: 'status' },
    { name: 'DeviantArt', url: 'https://www.deviantart.com/{}', errorType: 'status' },
    { name: 'Patreon', url: 'https://www.patreon.com/{}', errorType: 'status' },
    { name: 'Bitbucket', url: 'https://bitbucket.org/{}/workspace/overview', errorType: 'status' },
    { name: 'DockerHub', url: 'https://hub.docker.com/u/{}', errorType: 'status' },
    { name: 'npm', url: 'https://www.npmjs.com/~{}', errorType: 'status' },
    { name: 'PyPI', url: 'https://pypi.org/user/{}/', errorType: 'status' },
    { name: 'Mastodon (social)', url: 'https://mastodon.social/@{}', errorType: 'status' },
    { name: 'Lichess', url: 'https://lichess.org/api/user/{}', errorType: 'status' },
    { name: 'Chess.com', url: 'https://api.chess.com/pub/player/{}', errorType: 'status' },
    { name: 'Replit', url: 'https://replit.com/@{}', errorType: 'status' },
    { name: 'Codepen', url: 'https://codepen.io/{}', errorType: 'status' },
    { name: 'HackerRank', url: 'https://www.hackerrank.com/{}', errorType: 'status' },
    { name: 'LeetCode', url: 'https://leetcode.com/{}/', errorType: 'status' },
];

function createResultCard(platform, status, url) {
    const card = document.createElement('div');
    card.className = 'osint-result-card';

    let statusClass, statusIcon, statusText;
    switch (status) {
        case 'found':
            statusClass = 'found';
            statusIcon = '✅';
            statusText = 'Gefunden';
            break;
        case 'not_found':
            statusClass = 'not-found';
            statusIcon = '❌';
            statusText = 'Nicht gefunden';
            break;
        case 'error':
            statusClass = 'error';
            statusIcon = '⚠️';
            statusText = 'Fehler/Blockiert';
            break;
        default:
            statusClass = 'pending';
            statusIcon = '🔄';
            statusText = 'Prüfe...';
    }

    card.classList.add(statusClass);
    card.innerHTML = `
        <div class="osint-result-header">
            <span class="osint-platform-name">${platform}</span>
            <span class="osint-status-badge ${statusClass}">${statusIcon} ${statusText}</span>
        </div>
        ${status === 'found' ? `<a href="${url}" class="osint-profile-link" target="_blank" rel="noopener">${url}</a>` : ''}
    `;
    return card;
}

async function probeUsername(platform, username) {
    const url = platform.url.replace('{}', encodeURIComponent(username));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal,
            redirect: 'follow',
        });
        clearTimeout(timeout);

        if (response.type === 'opaque') {
            return { platform: platform.name, status: 'found', url: platform.url.replace('{}', username) };
        }

        if (response.ok || response.status === 200) {
            return { platform: platform.name, status: 'found', url: platform.url.replace('{}', username) };
        }

        if (response.status === 404) {
            return { platform: platform.name, status: 'not_found', url };
        }

        return { platform: platform.name, status: 'error', url };
    } catch {
        clearTimeout(timeout);
        return { platform: platform.name, status: 'error', url };
    }
}

async function probeCorsApi(platform, username) {
    const directUrl = platform.url.replace('{}', encodeURIComponent(username));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(directUrl, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'follow',
        });
        clearTimeout(timeout);

        if (response.ok) {
            return { platform: platform.name, status: 'found', url: platform.url.replace('{}', username) };
        }
        if (response.status === 404) {
            return { platform: platform.name, status: 'not_found', url: directUrl };
        }
        return { platform: platform.name, status: 'error', url: directUrl };
    } catch {
        clearTimeout(timeout);
        return probeUsername(platform, username);
    }
}

const API_PLATFORMS = ['Reddit', 'Lichess', 'Chess.com'];

async function runUsernameScan(username, resultsContainer, statsContainer) {
    resultsContainer.innerHTML = '';
    const foundResults = [];
    const allResults = [];
    let completed = 0;
    const total = PLATFORMS.length;

    statsContainer.innerHTML = `<span class="osint-stats-text">🔍 Scanning: 0/${total} | Gefunden: 0</span>`;

    const placeholders = PLATFORMS.map(p => {
        const card = createResultCard(p.name, 'pending', '');
        resultsContainer.appendChild(card);
        return card;
    });

    const promises = PLATFORMS.map(async (platform, index) => {
        let result;
        if (API_PLATFORMS.includes(platform.name)) {
            result = await probeCorsApi(platform, username);
        } else {
            result = await probeUsername(platform, username);
        }

        completed++;
        if (result.status === 'found') foundResults.push(result);
        allResults.push(result);

        const newCard = createResultCard(result.platform, result.status, result.url);
        resultsContainer.replaceChild(newCard, placeholders[index]);

        statsContainer.innerHTML = `<span class="osint-stats-text">🔍 Scanning: ${completed}/${total} | Gefunden: ${foundResults.length}</span>`;
    });

    await Promise.allSettled(promises);

    const foundCount = allResults.filter(r => r.status === 'found').length;
    const errorCount = allResults.filter(r => r.status === 'error').length;
    const notFoundCount = allResults.filter(r => r.status === 'not_found').length;

    statsContainer.innerHTML = `
        <span class="osint-stats-text">
            ✅ ${foundCount} gefunden | ❌ ${notFoundCount} nicht gefunden | ⚠️ ${errorCount} blockiert/fehler
        </span>
    `;
}

async function runEmailLookup(email, resultsContainer) {
    resultsContainer.innerHTML = '';

    const infoCard = document.createElement('div');
    infoCard.className = 'osint-result-card pending';
    infoCard.innerHTML = `<div class="osint-result-header"><span class="osint-platform-name">E-Mail OSINT</span><span class="osint-status-badge pending">🔄 Prüfe...</span></div>`;
    resultsContainer.appendChild(infoCard);

    const checks = [
        { name: 'Gravatar', url: `https://en.gravatar.com/${email}.json` },
        { name: 'GitHub (Email)', url: `https://api.github.com/search/users?q=${encodeURIComponent(email)}+in:email` },
    ];

    const results = [];

    for (const check of checks) {
        try {
            const resp = await fetch(check.url, { method: 'GET', redirect: 'follow' });
            if (resp.ok) {
                const data = await resp.json().catch(() => null);
                let detail = '';
                if (check.name === 'GitHub (Email)' && data?.total_count > 0) {
                    detail = data.items.map(u => `<a href="${u.html_url}" target="_blank" rel="noopener" class="osint-profile-link">${u.login}</a>`).join(', ');
                } else if (check.name === 'Gravatar' && data?.entry) {
                    const g = data.entry[0];
                    detail = `Display: ${g.displayName || 'N/A'} | Location: ${g.currentLocation || 'N/A'}`;
                } else {
                    continue;
                }
                results.push({ name: check.name, detail, status: 'found' });
            }
        } catch {
            results.push({ name: check.name, detail: 'Blockiert oder Fehler', status: 'error' });
        }
    }

    const havIBeenPwnedCard = document.createElement('div');
    havIBeenPwnedCard.className = 'osint-result-card found';
    havIBeenPwnedCard.innerHTML = `
        <div class="osint-result-header">
            <span class="osint-platform-name">Have I Been Pwned</span>
            <span class="osint-status-badge found">🔗 Extern</span>
        </div>
        <a href="https://haveibeenpwned.com/unifiedsearch/${encodeURIComponent(email)}" target="_blank" rel="noopener" class="osint-profile-link">Auf Breaches prüfen →</a>
    `;

    resultsContainer.innerHTML = '';
    results.forEach(r => {
        const card = document.createElement('div');
        card.className = `osint-result-card ${r.status}`;
        card.innerHTML = `
            <div class="osint-result-header">
                <span class="osint-platform-name">${r.name}</span>
                <span class="osint-status-badge ${r.status}">${r.status === 'found' ? '✅' : '⚠️'} ${r.status === 'found' ? 'Gefunden' : 'Fehler'}</span>
            </div>
            <div class="osint-detail">${r.detail}</div>
        `;
        resultsContainer.appendChild(card);
    });
    resultsContainer.appendChild(havIBeenPwnedCard);

    if (results.length === 0) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'osint-result-card not-found';
        emptyCard.innerHTML = `<div class="osint-result-header"><span class="osint-platform-name">E-Mail OSINT</span><span class="osint-status-badge not-found">❌ Keine Ergebnisse</span></div>`;
        resultsContainer.prepend(emptyCard);
    }
}

async function runPhoneLookup(phone, resultsContainer) {
    resultsContainer.innerHTML = '';

    const formatted = phone.replace(/\s+/g, '').replace(/^00/, '+');
    const results = [];

    const numverifyCard = document.createElement('div');
    numverifyCard.className = 'osint-result-card found';

    let countryHint = 'Unbekannt';
    let typeHint = 'Unbekannt';
    if (formatted.startsWith('+49') || formatted.startsWith('049')) {
        countryHint = '🇩🇪 Deutschland';
        if (formatted.startsWith('+491') || formatted.startsWith('01')) typeHint = 'Mobilnummer';
        else typeHint = 'Festnetz';
    } else if (formatted.startsWith('+43')) {
        countryHint = '🇦🇹 Österreich';
    } else if (formatted.startsWith('+41')) {
        countryHint = '🇨🇭 Schweiz';
    } else if (formatted.startsWith('+1')) {
        countryHint = '🇺🇸 USA / 🇨🇦 Kanada';
    } else if (formatted.startsWith('+44')) {
        countryHint = '🇬🇧 Großbritannien';
    } else if (formatted.startsWith('+33')) {
        countryHint = '🇫🇷 Frankreich';
    } else if (formatted.startsWith('+39')) {
        countryHint = '🇮🇹 Italien';
    } else if (formatted.startsWith('+34')) {
        countryHint = '🇪🇸 Spanien';
    } else if (formatted.startsWith('+31')) {
        countryHint = '🇳🇱 Niederlande';
    } else if (formatted.startsWith('+48')) {
        countryHint = '🇵🇱 Polen';
    } else if (formatted.startsWith('+90')) {
        countryHint = '🇹🇷 Türkei';
    } else if (formatted.startsWith('+7')) {
        countryHint = '🇷🇺 Russland';
    } else if (formatted.startsWith('+86')) {
        countryHint = '🇨🇳 China';
    } else if (formatted.startsWith('+91')) {
        countryHint = '🇮🇳 Indien';
    } else if (formatted.startsWith('+81')) {
        countryHint = '🇯🇵 Japan';
    } else if (formatted.startsWith('+82')) {
        countryHint = '🇰🇷 Südkorea';
    } else if (formatted.startsWith('+55')) {
        countryHint = '🇧🇷 Brasilien';
    } else if (formatted.startsWith('+')) {
        countryHint = '🌍 International';
    }

    results.push({
        name: 'Nummern-Analyse',
        detail: `Nummer: ${formatted}<br>Land: ${countryHint}<br>Typ: ${typeHint}`,
        status: 'found'
    });

    const telegramCheck = document.createElement('div');
    telegramCheck.className = 'osint-result-card found';
    telegramCheck.innerHTML = `
        <div class="osint-result-header">
            <span class="osint-platform-name">Telegram</span>
            <span class="osint-status-badge found">🔗 Extern</span>
        </div>
        <a href="https://t.me/${formatted}" target="_blank" rel="noopener" class="osint-profile-link">Telegram-Profil prüfen →</a>
    `;

    const whatsappCheck = document.createElement('div');
    whatsappCheck.className = 'osint-result-card found';
    whatsappCheck.innerHTML = `
        <div class="osint-result-header">
            <span class="osint-platform-name">WhatsApp</span>
            <span class="osint-status-badge found">🔗 Extern</span>
        </div>
        <a href="https://wa.me/${formatted.replace('+', '')}" target="_blank" rel="noopener" class="osint-profile-link">WhatsApp-Profil prüfen →</a>
    `;

    const callerIdCheck = document.createElement('div');
    callerIdCheck.className = 'osint-result-card found';
    callerIdCheck.innerHTML = `
        <div class="osint-result-header">
            <span class="osint-platform-name">Sync.ME / CallerID</span>
            <span class="osint-status-badge found">🔗 Extern</span>
        </div>
        <a href="https://sync.me/search/?number=${encodeURIComponent(formatted)}" target="_blank" rel="noopener" class="osint-profile-link">Nummer suchen →</a>
    `;

    results.forEach(r => {
        const card = document.createElement('div');
        card.className = `osint-result-card ${r.status}`;
        card.innerHTML = `
            <div class="osint-result-header">
                <span class="osint-platform-name">${r.name}</span>
                <span class="osint-status-badge ${r.status}">✅ Info</span>
            </div>
            <div class="osint-detail">${r.detail}</div>
        `;
        resultsContainer.appendChild(card);
    });

    resultsContainer.appendChild(telegramCheck);
    resultsContainer.appendChild(whatsappCheck);
    resultsContainer.appendChild(callerIdCheck);
}

async function runFullNameSearch(name, resultsContainer) {
    resultsContainer.innerHTML = '';

    const encoded = encodeURIComponent(name);
    const dorkEngines = [
        { name: 'Google', url: `https://www.google.com/search?q="${encoded}"`, icon: '🔍' },
        { name: 'Google (Social)', url: `https://www.google.com/search?q="${encoded}"+site:linkedin.com+OR+site:facebook.com+OR+site:instagram.com+OR+site:twitter.com`, icon: '👤' },
        { name: 'Google (Dokumente)', url: `https://www.google.com/search?q="${encoded}"+filetype:pdf+OR+filetype:doc+OR+filetype:xlsx`, icon: '📄' },
        { name: 'DuckDuckGo', url: `https://duckduckgo.com/?q="${encoded}"`, icon: '🦆' },
        { name: 'Yandex', url: `https://yandex.com/search/?text="${encoded}"`, icon: '🌐' },
        { name: 'Bing', url: `https://www.bing.com/search?q="${encoded}"`, icon: '🔎' },
        { name: 'Pipl (alt)', url: `https://www.google.com/search?q=site:pipl.com+"${encoded}"`, icon: '🕵️' },
        { name: 'Webarchive', url: `https://web.archive.org/web/*/${encoded}`, icon: '📚' },
    ];

    const usernameGuesses = name.toLowerCase()
        .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
        .split(/\s+/)
        .filter(Boolean);

    const guesses = [];
    if (usernameGuesses.length >= 2) {
        const [first, ...rest] = usernameGuesses;
        const last = rest[rest.length - 1];
        guesses.push(first + last);
        guesses.push(first + '.' + last);
        guesses.push(first + '_' + last);
        guesses.push(first[0] + last);
        guesses.push(last + first);
    } else if (usernameGuesses.length === 1) {
        guesses.push(usernameGuesses[0]);
    }

    dorkEngines.forEach(engine => {
        const card = document.createElement('div');
        card.className = 'osint-result-card found';
        card.innerHTML = `
            <div class="osint-result-header">
                <span class="osint-platform-name">${engine.icon} ${engine.name}</span>
                <span class="osint-status-badge found">🔗 Extern</span>
            </div>
            <a href="${engine.url}" target="_blank" rel="noopener" class="osint-profile-link">Suche öffnen →</a>
        `;
        resultsContainer.appendChild(card);
    });

    if (guesses.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'osint-divider';
        divider.innerHTML = '<span>Mögliche Benutzernamen</span>';
        resultsContainer.appendChild(divider);

        guesses.forEach(guess => {
            const card = document.createElement('div');
            card.className = 'osint-result-card';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="osint-result-header">
                    <span class="osint-platform-name">👤 ${guess}</span>
                    <span class="osint-status-badge" style="color: var(--neon-cyan);">Klick → Scan</span>
                </div>
            `;
            card.addEventListener('click', () => {
                const usernameInput = getEl('osint-username');
                if (usernameInput) {
                    usernameInput.value = guess;
                    const tabBtns = document.querySelectorAll('.osint-tab-btn');
                    const tabContents = document.querySelectorAll('.osint-tab-content');
                    tabBtns.forEach(b => b.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));
                    tabBtns[0].classList.add('active');
                    document.getElementById('osint-tab-username')?.classList.add('active');
                }
            });
            resultsContainer.appendChild(card);
        });
    }
}

export function initOsint() {
    const tabBtns = document.querySelectorAll('.osint-tab-btn');
    const tabContents = document.querySelectorAll('.osint-tab-content');
    const usernameInput = getEl('osint-username');
    const emailInput = getEl('osint-email');
    const phoneInput = getEl('osint-phone');
    const nameInput = getEl('osint-fullname');
    const scanUsernameBtn = getEl('osint-scan-username');
    const scanEmailBtn = getEl('osint-scan-email');
    const scanPhoneBtn = getEl('osint-scan-phone');
    const scanNameBtn = getEl('osint-scan-name');
    const usernameResults = getEl('osint-username-results');
    const usernameStats = getEl('osint-username-stats');
    const emailResults = getEl('osint-email-results');
    const phoneResults = getEl('osint-phone-results');
    const nameResults = getEl('osint-name-results');

    if (!usernameInput) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.tab);
            if (target) target.classList.add('active');
        });
    });

    if (scanUsernameBtn) {
        scanUsernameBtn.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            if (!username) return;
            scanUsernameBtn.disabled = true;
            scanUsernameBtn.textContent = 'Scanning...';
            runUsernameScan(username, usernameResults, usernameStats).finally(() => {
                scanUsernameBtn.disabled = false;
                scanUsernameBtn.textContent = '🔍 Scan starten';
            });
        });
    }

    if (scanEmailBtn) {
        scanEmailBtn.addEventListener('click', () => {
            const email = emailInput.value.trim();
            if (!email) return;
            scanEmailBtn.disabled = true;
            scanEmailBtn.textContent = 'Prüfe...';
            runEmailLookup(email, emailResults).finally(() => {
                scanEmailBtn.disabled = false;
                scanEmailBtn.textContent = '📧 E-Mail prüfen';
            });
        });
    }

    if (scanPhoneBtn) {
        scanPhoneBtn.addEventListener('click', () => {
            const phone = phoneInput.value.trim();
            if (!phone) return;
            runPhoneLookup(phone, phoneResults);
        });
    }

    if (scanNameBtn) {
        scanNameBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (!name) return;
            runFullNameSearch(name, nameResults);
        });
    }
}
