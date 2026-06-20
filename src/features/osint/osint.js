import { getEl } from '../../core/ui.js';

const invoke = window.__TAURI__.core.invoke;

const PLATFORMS = [
    { name: 'GitHub', url: 'https://github.com/{}' },
    { name: 'GitLab', url: 'https://gitlab.com/{}' },
    { name: 'Reddit', url: 'https://www.reddit.com/user/{}/about.json' },
    { name: 'Twitter/X', url: 'https://x.com/{}' },
    { name: 'Instagram', url: 'https://www.instagram.com/{}/' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@{}' },
    { name: 'YouTube', url: 'https://www.youtube.com/@{}' },
    { name: 'Twitch', url: 'https://www.twitch.tv/{}' },
    { name: 'Pinterest', url: 'https://www.pinterest.com/{}/' },
    { name: 'Telegram', url: 'https://t.me/{}' },
    { name: 'Steam', url: 'https://steamcommunity.com/id/{}' },
    { name: 'SoundCloud', url: 'https://soundcloud.com/{}' },
    { name: 'Spotify', url: 'https://open.spotify.com/user/{}' },
    { name: 'Medium', url: 'https://medium.com/@{}' },
    { name: 'Keybase', url: 'https://keybase.io/{}' },
    { name: 'HackerOne', url: 'https://hackerone.com/{}' },
    { name: 'Gravatar', url: 'https://en.gravatar.com/{}.json' },
    { name: 'About.me', url: 'https://about.me/{}' },
    { name: 'Flickr', url: 'https://www.flickr.com/people/{}/' },
    { name: 'DeviantArt', url: 'https://www.deviantart.com/{}' },
    { name: 'Patreon', url: 'https://www.patreon.com/{}' },
    { name: 'Bitbucket', url: 'https://bitbucket.org/{}/workspace/overview' },
    { name: 'DockerHub', url: 'https://hub.docker.com/u/{}' },
    { name: 'npm', url: 'https://www.npmjs.com/~{}' },
    { name: 'PyPI', url: 'https://pypi.org/user/{}/' },
    { name: 'Mastodon', url: 'https://mastodon.social/@{}' },
    { name: 'Lichess', url: 'https://lichess.org/api/user/{}' },
    { name: 'Chess.com', url: 'https://api.chess.com/pub/player/{}' },
    { name: 'Replit', url: 'https://replit.com/@{}' },
    { name: 'Codepen', url: 'https://codepen.io/{}' },
    { name: 'HackerRank', url: 'https://www.hackerrank.com/{}' },
    { name: 'LeetCode', url: 'https://leetcode.com/{}/' },
    { name: 'Roblox', url: 'https://www.roblox.com/user.aspx?username={}' },
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

async function runUsernameScan(username, resultsContainer, statsContainer) {
    resultsContainer.innerHTML = '';
    const total = PLATFORMS.length;

    statsContainer.innerHTML = `<span class="osint-stats-text">🔍 Scanning: 0/${total} via Rust Backend...</span>`;

    const placeholders = PLATFORMS.map(p => {
        const card = createResultCard(p.name, 'pending', '');
        resultsContainer.appendChild(card);
        return card;
    });

    const urls = PLATFORMS.map(p => p.url.replace('{}', encodeURIComponent(username)));
    const profileUrls = PLATFORMS.map(p => p.url.replace('{}', username));

    try {
        const results = await invoke('probe_urls', { urls });

        let foundCount = 0;
        let errorCount = 0;
        let notFoundCount = 0;

        results.forEach((result, index) => {
            const platform = PLATFORMS[index];
            const profileUrl = profileUrls[index];

            if (result.status === 'found') foundCount++;
            else if (result.status === 'not_found') notFoundCount++;
            else errorCount++;

            const newCard = createResultCard(platform.name, result.status, profileUrl);
            resultsContainer.replaceChild(newCard, placeholders[index]);
        });

        statsContainer.innerHTML = `
            <span class="osint-stats-text">
                ✅ ${foundCount} gefunden | ❌ ${notFoundCount} nicht gefunden | ⚠️ ${errorCount} blockiert/fehler
            </span>
        `;
    } catch (err) {
        statsContainer.innerHTML = `<span class="osint-stats-text">❌ Fehler: ${err}</span>`;
    }
}

async function runEmailLookup(email, resultsContainer) {
    resultsContainer.innerHTML = '';

    const loadCard = document.createElement('div');
    loadCard.className = 'osint-result-card pending';
    loadCard.innerHTML = `<div class="osint-result-header"><span class="osint-platform-name">E-Mail OSINT</span><span class="osint-status-badge pending">🔄 Prüfe...</span></div>`;
    resultsContainer.appendChild(loadCard);

    const checkUrls = [
        `https://en.gravatar.com/${email}.json`,
        `https://api.github.com/search/users?q=${encodeURIComponent(email)}+in:email`,
    ];

    try {
        const probeResults = await invoke('probe_urls', { urls: checkUrls });
        resultsContainer.innerHTML = '';

        if (probeResults[0] && probeResults[0].status === 'found') {
            const card = document.createElement('div');
            card.className = 'osint-result-card found';
            card.innerHTML = `
                <div class="osint-result-header">
                    <span class="osint-platform-name">Gravatar</span>
                    <span class="osint-status-badge found">✅ Gefunden</span>
                </div>
                <a href="https://en.gravatar.com/${encodeURIComponent(email)}" target="_blank" rel="noopener" class="osint-profile-link">Gravatar Profil →</a>
            `;
            resultsContainer.appendChild(card);
        }

        if (probeResults[1] && probeResults[1].status === 'found') {
            const card = document.createElement('div');
            card.className = 'osint-result-card found';
            card.innerHTML = `
                <div class="osint-result-header">
                    <span class="osint-platform-name">GitHub (E-Mail)</span>
                    <span class="osint-status-badge found">✅ Treffer</span>
                </div>
                <a href="https://github.com/search?q=${encodeURIComponent(email)}&type=users" target="_blank" rel="noopener" class="osint-profile-link">GitHub Suche öffnen →</a>
            `;
            resultsContainer.appendChild(card);
        }
    } catch {
        resultsContainer.innerHTML = '';
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
    resultsContainer.appendChild(havIBeenPwnedCard);

    if (resultsContainer.children.length <= 1) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'osint-result-card not-found';
        emptyCard.innerHTML = `<div class="osint-result-header"><span class="osint-platform-name">E-Mail Probes</span><span class="osint-status-badge not-found">❌ Keine direkten Treffer</span></div>`;
        resultsContainer.prepend(emptyCard);
    }
}

function runPhoneLookup(phone, resultsContainer) {
    resultsContainer.innerHTML = '';

    const formatted = phone.replace(/\s+/g, '').replace(/^00/, '+');

    const countryMap = {
        '+49': '🇩🇪 Deutschland', '+43': '🇦🇹 Österreich', '+41': '🇨🇭 Schweiz',
        '+1': '🇺🇸 USA / 🇨🇦 Kanada', '+44': '🇬🇧 Großbritannien', '+33': '🇫🇷 Frankreich',
        '+39': '🇮🇹 Italien', '+34': '🇪🇸 Spanien', '+31': '🇳🇱 Niederlande',
        '+48': '🇵🇱 Polen', '+90': '🇹🇷 Türkei', '+7': '🇷🇺 Russland',
        '+86': '🇨🇳 China', '+91': '🇮🇳 Indien', '+81': '🇯🇵 Japan',
        '+82': '🇰🇷 Südkorea', '+55': '🇧🇷 Brasilien',
    };

    let countryHint = '🌍 International';
    let typeHint = 'Unbekannt';

    for (const [prefix, country] of Object.entries(countryMap).sort((a, b) => b[0].length - a[0].length)) {
        if (formatted.startsWith(prefix)) {
            countryHint = country;
            if (prefix === '+49') {
                typeHint = (formatted.startsWith('+491') || formatted.startsWith('01')) ? 'Mobilnummer' : 'Festnetz';
            }
            break;
        }
    }

    const analysisCard = document.createElement('div');
    analysisCard.className = 'osint-result-card found';
    analysisCard.innerHTML = `
        <div class="osint-result-header">
            <span class="osint-platform-name">📊 Nummern-Analyse</span>
            <span class="osint-status-badge found">✅ Info</span>
        </div>
        <div class="osint-detail">Nummer: ${formatted}<br>Land: ${countryHint}<br>Typ: ${typeHint}</div>
    `;
    resultsContainer.appendChild(analysisCard);

    const links = [
        { name: 'Telegram', url: `https://t.me/${formatted}`, icon: '✈️' },
        { name: 'WhatsApp', url: `https://wa.me/${formatted.replace('+', '')}`, icon: '💬' },
        { name: 'Sync.ME / CallerID', url: `https://sync.me/search/?number=${encodeURIComponent(formatted)}`, icon: '📱' },
    ];

    links.forEach(link => {
        const card = document.createElement('div');
        card.className = 'osint-result-card found';
        card.innerHTML = `
            <div class="osint-result-header">
                <span class="osint-platform-name">${link.icon} ${link.name}</span>
                <span class="osint-status-badge found">🔗 Extern</span>
            </div>
            <a href="${link.url}" target="_blank" rel="noopener" class="osint-profile-link">${link.name} prüfen →</a>
        `;
        resultsContainer.appendChild(card);
    });
}

function runFullNameSearch(name, resultsContainer) {
    resultsContainer.innerHTML = '';

    const encoded = encodeURIComponent(name);
    const dorkEngines = [
        { name: 'Google', url: `https://www.google.com/search?q="${encoded}"`, icon: '🔍' },
        { name: 'Google (Social)', url: `https://www.google.com/search?q="${encoded}"+site:linkedin.com+OR+site:facebook.com+OR+site:instagram.com+OR+site:twitter.com`, icon: '👤' },
        { name: 'Google (Dokumente)', url: `https://www.google.com/search?q="${encoded}"+filetype:pdf+OR+filetype:doc+OR+filetype:xlsx`, icon: '📄' },
        { name: 'DuckDuckGo', url: `https://duckduckgo.com/?q="${encoded}"`, icon: '🦆' },
        { name: 'Yandex', url: `https://yandex.com/search/?text="${encoded}"`, icon: '🌐' },
        { name: 'Bing', url: `https://www.bing.com/search?q="${encoded}"`, icon: '🔎' },
        { name: 'Webarchive', url: `https://web.archive.org/web/*/${encoded}`, icon: '📚' },
    ];

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

    const usernameGuesses = name.toLowerCase()
        .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
        .split(/\s+/)
        .filter(Boolean);

    const guesses = [];
    if (usernameGuesses.length >= 2) {
        const [first, ...rest] = usernameGuesses;
        const last = rest[rest.length - 1];
        guesses.push(first + last, first + '.' + last, first + '_' + last, first[0] + last, last + first);
    } else if (usernameGuesses.length === 1) {
        guesses.push(usernameGuesses[0]);
    }

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
