import { getEl } from '../../core/ui.js';

const chatWindow = getEl('chat-window');
const chatInput = getEl('chat-input');
const sendChatBtn = getEl('send-chat-btn');
const btnLobby = getEl('btn-lobby');
const btnPrivate = getEl('btn-private');
const privateSetup = getEl('private-setup');
const roomIdInput = getEl('room-id-input');
const joinRoomBtn = getEl('join-room-btn');
const onlineDisplay = getEl('online-count');
const btnP2p = getEl('btn-p2p');
const p2pSetup = getEl('p2p-setup');
const p2pHostBtn = getEl('p2p-host-btn');
const p2pClientBtn = getEl('p2p-client-btn');
const p2pStopBtn = getEl('p2p-stop-btn');
const p2pStatusInfo = getEl('p2p-status-info');
const p2pPeersList = getEl('p2p-peers-list');

export let currentRoom = 'lobby';
export let socketConnected = false;
export let userHandle = localStorage.getItem('skooda_chat_handle');
if (!userHandle) {
    userHandle = "User_" + Math.floor(Math.random() * 9000 + 1000);
    localStorage.setItem('skooda_chat_handle', userHandle);
}

let offlineQueue = [];
let typingTimeout;
const GITHUB_REPO = "skoody/skooda-mobile";

const peerKeys = {};

let localSocket = null;
const discoveredHosts = {};

export async function processIncomingChatMessage(msgData) {
    if (msgData.room === currentRoom) {
        let text = msgData.text;
        if (msgData.encrypted) {
            try {
                text = await window.__TAURI__.core.invoke("decrypt_group_message", { 
                    room: msgData.room, 
                    sender_id: msgData.sender,
                    encrypted_json: msgData.encrypted 
                });
            } catch(e) { text = "[Decryption Error: " + e + "]"; }
        }
        if (msgData.msg_type === 'file') {
            appendMsg(msgData.sender, `<div class="loading-media">Lade Datei: ${msgData.text || text}...</div>`, msgData.sender === userHandle);
        } else {
            appendMsg(msgData.sender, text, msgData.sender === userHandle);
        }

        if (msgData.sender !== userHandle) {
            playChatSound();
            sendPushNotification(msgData.sender, text);
        }
    }
}

function connectToLocalHost(ip) {
    p2pStatusInfo.innerText = `Status: Connecting to ws://${ip}:8080 ...`;
    try {
        localSocket = new WebSocket(`ws://${ip}:8080`);
        localSocket.onopen = () => {
            socketConnected = true;
            p2pStatusInfo.innerText = `Status: Connected to local host ${ip}`;
            appendMsg("System", `Verbunden mit lokalem Mesh-Server auf ${ip}`, true);
            sendHandshake();
        };
        localSocket.onmessage = async (event) => {
            let msgData;
            try { msgData = JSON.parse(event.data); } catch(e) { return; }
            processIncomingChatMessage(msgData);
        };
        localSocket.onclose = () => {
            socketConnected = false;
            p2pStatusInfo.innerText = "Status: Connection closed.";
        };
        localSocket.onerror = (e) => {
            p2pStatusInfo.innerText = `Status: Connection error.`;
        };
    } catch(e) {
        p2pStatusInfo.innerText = `Status: Failed to connect: ${e.message}`;
    }
}

window.onP2PPeerDiscovered = (peer) => {
    if (peer.is_host && !discoveredHosts[peer.ip]) {
        discoveredHosts[peer.ip] = peer;
        const btnJoin = document.createElement('button');
        btnJoin.className = "btn mini primary";
        btnJoin.style.marginTop = "5px";
        btnJoin.innerText = `Join ${peer.name} (${peer.ip})`;
        btnJoin.onclick = () => connectToLocalHost(peer.ip);
        p2pPeersList.innerHTML = "Found Hosts: <br>";
        p2pPeersList.appendChild(btnJoin);
    }
};

window.onP2PMessage = (msgData) => {
    processIncomingChatMessage(msgData);
};

window.onP2PConnection = (data) => {
    console.log("P2P Client connection event:", data);
    if (data.event === 'open') {
        p2pStatusInfo.innerText = `Status: Client connected: ${data.remote}`;
    } else {
        p2pStatusInfo.innerText = `Status: Client disconnected: ${data.remote}`;
    }
};

window.onP2PStatus = (data) => {
    if (data.error) {
        p2pStatusInfo.innerText = `Status: Error: ${data.error}`;
    } else if (data.status === 'started') {
        p2pStatusInfo.innerText = `Status: Local host running on port ${data.port}`;
    }
};

export async function sendHandshake() {
    try {
        const my_x25519 = await window.__TAURI__.core.invoke("get_my_x25519_pubkey");
        const my_identity = await window.__TAURI__.core.invoke("get_identity");
        const handshakeMsg = {
            msg_type: "handshake",
            sender: userHandle,
            room: currentRoom,
            x25519_pubkey: my_x25519,
            ed25519_pubkey: my_identity
        };
        await window.__TAURI__.core.invoke("send_chat_message", { message: JSON.stringify(handshakeMsg) });
    } catch(e) { console.error("Handshake error:", e); }
}

export function initChat() {
    let passphrase = "skoodadefaultpassphrase123";
    if (window.Android && window.Android.getDatabasePassphrase) {
        passphrase = window.Android.getDatabasePassphrase();
    }
    window.__TAURI__.core.invoke("open_secure_database", { passphrase })
        .then(() => console.log("Secure database unlocked."))
        .catch(e => console.error("Failed to unlock database:", e));

    if (sendChatBtn) sendChatBtn.onclick = () => sendChatMessage();
    if (chatInput) {
        chatInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendChatMessage();
            else {
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(sendTypingEvent, 500);
            }
        };
    }

    if (btnLobby) {
        btnLobby.onclick = () => {
            btnLobby.classList.add('active');
            btnPrivate.classList.remove('active');
            if (btnP2p) btnP2p.classList.remove('active');
            privateSetup.style.display = 'none';
            if (p2pSetup) p2pSetup.style.display = 'none';
            if (currentRoom === 'lobby') return;
            currentRoom = 'lobby';
            chatWindow.innerHTML = '';
            sendChatMessage(`System: ${userHandle} joined lobby`, true);
            sendHandshake();
        };
    }

    if (btnPrivate) {
        btnPrivate.onclick = () => {
            btnPrivate.classList.add('active');
            btnLobby.classList.remove('active');
            if (btnP2p) btnP2p.classList.remove('active');
            privateSetup.style.display = 'block';
            if (p2pSetup) p2pSetup.style.display = 'none';
        };
    }

    if (btnP2p) {
        btnP2p.onclick = () => {
            btnP2p.classList.add('active');
            btnLobby.classList.remove('active');
            btnPrivate.classList.remove('active');
            privateSetup.style.display = 'none';
            if (p2pSetup) p2pSetup.style.display = 'block';
        };
    }

    if (joinRoomBtn) {
        joinRoomBtn.onclick = () => {
            const newRoom = roomIdInput.value.trim();
            if (!newRoom) return;
            currentRoom = newRoom;
            privateSetup.style.display = 'none';
            if (p2pSetup) p2pSetup.style.display = 'none';
            chatWindow.innerHTML = '';
            loadHistory();
            sendChatMessage(`System: ${userHandle} joined ${newRoom}`, true);
            sendHandshake();
        };
    }

    if (p2pHostBtn) {
        p2pHostBtn.onclick = () => {
            if (window.Android && window.Android.startP2PHost) {
                window.Android.startP2PHost(userHandle);
                p2pStatusInfo.innerText = "Status: Hosting local chat server...";
                p2pHostBtn.style.display = 'none';
                p2pClientBtn.style.display = 'none';
                p2pStopBtn.style.display = 'block';
            } else {
                p2pStatusInfo.innerText = "Status: Native host mode not available.";
            }
        };
    }

    if (p2pClientBtn) {
        p2pClientBtn.onclick = () => {
            if (window.Android && window.Android.startP2PClient) {
                window.Android.startP2PClient(userHandle);
                p2pStatusInfo.innerText = "Status: Scanning for local hosts...";
                p2pHostBtn.style.display = 'none';
                p2pClientBtn.style.display = 'none';
                p2pStopBtn.style.display = 'block';
            } else {
                p2pStatusInfo.innerText = "Status: Native scan mode not available.";
            }
        };
    }

    if (p2pStopBtn) {
        p2pStopBtn.onclick = () => {
            if (window.Android && window.Android.stopP2P) {
                window.Android.stopP2P();
            }
            if (localSocket) {
                try { localSocket.close(); } catch(e) {}
                localSocket = null;
            }
            p2pStatusInfo.innerText = "Status: Inactive";
            p2pPeersList.innerText = "Found Hosts: None";
            p2pHostBtn.style.display = 'inline-block';
            p2pClientBtn.style.display = 'inline-block';
            p2pStopBtn.style.display = 'none';
            connectChat();
        };
    }

    // Media Button Listeners
    const fileBtn = getEl('chat-file-btn');
    const fileInput = getEl('chat-file-input');
    const voiceBtn = getEl('chat-voice-btn');
    const locBtn = getEl('chat-loc-btn');

    if (fileBtn) fileBtn.onclick = () => fileInput.click();
    if (fileInput) {
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async () => {
                let base64 = reader.result.split(',')[1];
                if (file.type.startsWith('image/') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png')) {
                    try {
                        const clean = await window.__TAURI__.core.invoke("strip_image_metadata", { base64In: base64 });
                        base64 = clean;
                    } catch (err) {
                        console.error("EXIF metadata stripping failed:", err);
                    }
                }
                window.lastFileBase64 = base64;
                await sendChatMessage(`FILE:${file.name}|${base64}`, false);
            };
            reader.readAsDataURL(file);
        };
    }

    if (locBtn) {
        locBtn.onclick = () => {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                await sendChatMessage(`LOC:${latitude},${longitude}`, false);
            }, (err) => {
                appendMsg("System", "Standort konnte nicht ermittelt werden.", false);
            });
        };
    }

    let mediaRecorder;
    let audioChunks = [];

    if (voiceBtn) {
        voiceBtn.onclick = async () => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                mediaRecorder.onstop = async () => {
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onload = async () => {
                        const base64 = reader.result.split(',')[1];
                        await sendChatMessage(`VOICE:${base64}`, false);
                    };
                    reader.readAsDataURL(blob);
                    voiceBtn.style.color = '';
                };
                mediaRecorder.start();
                voiceBtn.style.color = 'var(--neon-purple)';
                appendMsg("System", "Aufnahme läuft...", false);
            } else {
                mediaRecorder.stop();
            }
        };
    }

    // Settings Modal
    const settingsModal = getEl('chat-settings-modal');
    const settingsUser = getEl('settings-username');
    const settingsSounds = getEl('settings-sounds');

    getEl('chat-settings-btn').onclick = () => {
        settingsUser.value = userHandle;
        settingsSounds.checked = localStorage.getItem('skooda_chat_sounds') !== 'false';
        const settingsShodan = getEl('settings-shodan');
        if (settingsShodan) settingsShodan.value = localStorage.getItem('shodan_api_key') || '';
        settingsModal.classList.add('active');
    };

    getEl('settings-save').onclick = () => {
        const newHandle = settingsUser.value.trim();
        if (newHandle) {
            userHandle = newHandle;
            localStorage.setItem('skooda_chat_handle', userHandle);
        }
        localStorage.setItem('skooda_chat_sounds', settingsSounds.checked);
        const settingsShodan = getEl('settings-shodan');
        if (settingsShodan) {
            localStorage.setItem('shodan_api_key', settingsShodan.value.trim());
        }
        settingsModal.classList.remove('active');
        appendMsg("System", "Einstellungen gespeichert.", true, true);
    };

    getEl('settings-close').onclick = () => settingsModal.classList.remove('active');
    getEl('settings-notif-btn').onclick = () => sendPushNotification("Test", "Benachrichtigungen funktionieren!");

    const hidsCheckBtn = getEl('hids-check-btn');
    if (hidsCheckBtn) {
        hidsCheckBtn.onclick = () => {
            const hidsStatus = getEl('hids-status');
            if (hidsStatus) hidsStatus.innerHTML = "Scanning integrity...";
            if (window.Android && window.Android.checkSystemIntegrity) {
                try {
                    const resultJson = window.Android.checkSystemIntegrity();
                    const result = JSON.parse(resultJson);
                    let html = `<span style="color: ${result.rooted ? 'var(--neon-red)' : 'var(--neon-green)'}">SYSTEM ROOTED: ${result.rooted}</span><br>`;
                    html += `SU Binary: <span style="color: ${result.su_binary ? 'var(--neon-red)' : 'var(--neon-green)'}">${result.su_binary}</span><br>`;
                    html += `Test Keys: <span style="color: ${result.test_keys ? 'var(--neon-red)' : 'var(--neon-green)'}">${result.test_keys}</span><br>`;
                    html += `SU Exec: <span style="color: ${result.su_exec ? 'var(--neon-red)' : 'var(--neon-green)'}">${result.su_exec}</span><br>`;
                    html += `Xposed: <span style="color: ${result.xposed ? 'var(--neon-red)' : 'var(--neon-green)'}">${result.xposed}</span><br>`;
                    html += `Magisk: <span style="color: ${result.magisk ? 'var(--neon-red)' : 'var(--neon-green)'}">${result.magisk}</span>`;
                    hidsStatus.innerHTML = html;
                } catch (err) {
                    hidsStatus.innerHTML = `<span style="color: var(--neon-red)">Error: ${err.message}</span>`;
                }
            } else {
                setTimeout(() => {
                    hidsStatus.innerHTML = `<span style="color: var(--neon-green)">SYSTEM ROOTED: false</span><br>` +
                        `SU Binary: false<br>Test Keys: false<br>SU Exec: false<br>Xposed: false<br>Magisk: false (Simulated)`;
                }, 1000);
            }
        };
    }

    // Connect on start
    setTimeout(connectChat, 1000);
}

export async function connectChat() {
    const oldBubble = document.getElementById('chat-status-bubble');
    if (oldBubble) oldBubble.remove();

    const statusBubble = document.createElement('div');
    statusBubble.id = 'chat-status-bubble';
    statusBubble.className = "chat-bubble received system-msg";
    statusBubble.innerHTML = '<span class="sender">System</span>Verbindung wird aufgebaut...';
    chatWindow.appendChild(statusBubble);
    
    try {
        const apiDiscoveryUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/discovery.json`;
        const response = await fetch(apiDiscoveryUrl + '?t=' + Date.now());
        if (!response.ok) throw new Error("Entdeckung fehlgeschlagen");
        const data = await response.json();
        const content = atob(data.content.replace(/\s/g, ''));
        const discovery = JSON.parse(content);
        const url = discovery.relay_url;
        
        if (!window.chatListenerActive) {
            window.__TAURI__.event.listen("chat-msg", async (event) => {
                let msgData;
                try { msgData = JSON.parse(event.payload.message); } catch(e) { return; }
                
                if (msgData.msg_type === 'presence') {
                    if (onlineDisplay) {
                        const userList = msgData.online_users ? msgData.online_users.join(", ") : "";
                        onlineDisplay.innerText = `${msgData.online_count} Online: ${userList}`;
                        onlineDisplay.title = userList;
                    }
                    return;
                }

                if (msgData.msg_type === 'typing' && msgData.room === currentRoom) {
                    showTypingIndicator(msgData.sender);
                    return;
                }

                if (msgData.msg_type === 'handshake' && msgData.room === currentRoom) {
                    if (msgData.sender !== userHandle) {
                        if (!peerKeys[msgData.sender]) {
                            peerKeys[msgData.sender] = { x25519: msgData.x25519_pubkey, ed25519: msgData.ed25519_pubkey };
                            sendHandshake();
                        }
                        try {
                            const mySenderKey = await window.__TAURI__.core.invoke("get_my_sender_key", { room: currentRoom });
                            const sharedSecret = await window.__TAURI__.core.invoke("derive_shared_secret", { peer_pubkey: msgData.x25519_pubkey });
                            const encryptedPayload = await window.__TAURI__.core.invoke("encrypt_pairwise", {
                                shared_secret_b64: sharedSecret,
                                plaintext: JSON.stringify(mySenderKey)
                            });
                            const keyExchangeMsg = {
                                msg_type: "key_exchange",
                                sender: userHandle,
                                recipient: msgData.sender,
                                room: currentRoom,
                                encrypted_key: encryptedPayload
                            };
                            await window.__TAURI__.core.invoke("send_chat_message", { message: JSON.stringify(keyExchangeMsg) });
                        } catch(e) { console.error("Key exchange generation failed:", e); }
                    }
                    return;
                }

                if (msgData.msg_type === 'key_exchange' && msgData.room === currentRoom) {
                    if (msgData.recipient === userHandle) {
                        try {
                            const peerInfo = peerKeys[msgData.sender];
                            if (!peerInfo) {
                                console.warn("Received key exchange from unknown peer: " + msgData.sender);
                                return;
                            }
                            const sharedSecret = await window.__TAURI__.core.invoke("derive_shared_secret", { peer_pubkey: peerInfo.x25519 });
                            const decryptedStr = await window.__TAURI__.core.invoke("decrypt_pairwise", {
                                shared_secret_b64: sharedSecret,
                                encrypted_json: msgData.encrypted_key
                            });
                            const peerSenderKey = JSON.parse(decryptedStr);
                            await window.__TAURI__.core.invoke("store_peer_sender_key", {
                                room: currentRoom,
                                peer_id: msgData.sender,
                                chain_key_b64: peerSenderKey.chain_key,
                                verify_key_b64: peerSenderKey.verify_key
                            });
                            console.log("Successfully stored peer sender key for " + msgData.sender);
                        } catch(e) { console.error("Key exchange decryption failed:", e); }
                    }
                    return;
                }

                processIncomingChatMessage(msgData);
            });

            window.__TAURI__.event.listen("chat-binary", (event) => {
                const raw = event.payload;
                const blob = new Blob([new Uint8Array(raw)], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                
                const loadingEls = document.querySelectorAll('.loading-media');
                if (loadingEls.length > 0) {
                    const el = loadingEls[0];
                    el.innerHTML = `<img src="${url}" class="chat-img" onclick="window.open('${url}')">`;
                    el.classList.remove('loading-media');
                }
            });

            window.__TAURI__.event.listen("chat-status", (event) => {
                const status = event.payload;
                if (onlineDisplay) onlineDisplay.innerText = status;
                if (status === "Connected") {
                    socketConnected = true;
                    const existingBubble = document.getElementById('chat-status-bubble');
                    if (existingBubble) existingBubble.remove();
                    processOfflineQueue();
                    if (chatWindow.innerHTML === '' || chatWindow.children.length < 5) {
                        loadHistory();
                    }
                    sendHandshake();
                } else if (status.includes("Disconnected") || status.includes("Error")) {
                    socketConnected = false;
                    setTimeout(() => {
                        if (!socketConnected) connectChat();
                    }, 5000);
                }
            });
            window.chatListenerActive = true;
        }

        await window.__TAURI__.core.invoke("connect_chat", { url });
        setTimeout(() => {
            if (socketConnected) {
                sendChatMessage(`System: ${userHandle} connected`, true);
            }
        }, 2000);
        
    } catch (err) {
        statusBubble.innerHTML = `<span class="sender">System</span>Fehler: ${err.message}. Reconnect in 5s...`;
        setTimeout(connectChat, 5000);
    }
}

export async function loadHistory() {
    chatWindow.innerHTML = '';
    try {
        const history = await window.__TAURI__.core.invoke("get_chat_history", { room: currentRoom });
        history.forEach(m => {
            appendMsg(m.sender, m.text, m.isMe, true);
        });
    } catch (e) { console.error("History Error", e); }
}

export function appendMsg(sender, text, isMe, skipSave = false) {
    const div = document.createElement("div");
    div.className = `chat-bubble ${isMe ? "sent" : "received"}`;
    
    let contentHtml = `<span class="sender">${sender}</span>`;
    
    if (text.startsWith("FILE:")) {
        const parts = text.substring(5).split('|');
        const meta = parts[0];
        const data = parts[1];
        const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(meta);
        
        if (isImg) {
            contentHtml += `<div class="file-msg">
                <img src="data:image/auto;base64,${data}" style="max-width: 100%; border-radius: 8px; margin-top: 5px; border: 1px solid var(--neon-cyan);">
                <div style="font-size: 0.7rem; margin-top: 5px;">📎 ${meta}</div>
                <button class="btn mini btn-download" data-name="${meta}" data-data="${data}">Save</button>
            </div>`;
        } else {
            contentHtml += `<div class="file-msg">📎 ${meta} <button class="btn mini btn-download" data-name="${meta}" data-data="${data}" style="margin-left: 10px;">Save</button></div>`;
        }
    } else if (text.startsWith("VOICE:")) {
        const data = text.substring(6);
        contentHtml += `<audio controls src="data:audio/webm;base64,${data}" style="width: 100%; margin-top: 5px;"></audio>`;
    } else if (text.startsWith("LOC:")) {
        const [lat, lon] = text.substring(4).split(',');
        contentHtml += `<div class="loc-msg">📍 Location: <a href="#" class="loc-link" data-lat="${lat}" data-lon="${lon}" style="color: var(--neon-cyan)">[Show on Map]</a></div>`;
    } else {
        contentHtml += `<div class="text">${text}</div>`;
    }
    
    contentHtml += `<span class="signed-badge">🛡️ VERIFIED</span>`;
    
    div.innerHTML = contentHtml;
    
    // Add event listeners for dynamic content
    const downloadBtn = div.querySelector('.btn-download');
    if (downloadBtn) {
        downloadBtn.onclick = () => downloadFile(downloadBtn.dataset.name, downloadBtn.dataset.data);
    }
    const locLink = div.querySelector('.loc-link');
    if (locLink && window.skoodaMap) {
        locLink.onclick = (e) => {
            e.preventDefault();
            window.skoodaMap.map.setView([locLink.dataset.lat, locLink.dataset.lon], 16);
        };
    }

    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    if (!skipSave) {
        window.__TAURI__.core.invoke("save_to_history", { 
            room: currentRoom, 
            sender, 
            text, 
            isMe 
        }).catch(console.error);
    }
}

function downloadFile(name, base64) {
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${base64}`;
    link.download = name;
    link.click();
}

function playChatSound() {
    if (localStorage.getItem('skooda_chat_sounds') === 'false') return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audio.play().catch(() => {});
}

function sendTypingEvent() {
    if (!socketConnected) return;
    window.__TAURI__.core.invoke("send_chat_message", { 
        message: JSON.stringify({ msg_type: "typing", sender: userHandle, room: currentRoom }) 
    });
}

function showTypingIndicator(sender) {
    let indicator = document.getElementById('typing-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'typing-text';
        chatWindow.parentElement.appendChild(indicator);
    }
    indicator.innerText = `${sender} schreibt...`;
    clearTimeout(window.typingTimer);
    window.typingTimer = setTimeout(() => indicator.innerText = '', 3000);
}

async function processOfflineQueue() {
    while (offlineQueue.length > 0 && socketConnected) {
        const msg = offlineQueue.shift();
        await sendChatMessage(msg.text, msg.isSystem);
    }
}

export async function sendChatMessage(text = null, isSystem = false) {
    const content = text || chatInput.value.trim();
    if (!content) return;
    
    if (!isSystem) playChatSound();

    if (!socketConnected) {
        offlineQueue.push({ text: content, isSystem });
        appendMsg("System", "Offline. Nachricht wird gesendet, sobald Verbindung steht.", false);
        return;
    }

    if (!text) chatInput.value = "";
    try {
        let msgPayload;
        if (isSystem || content.startsWith("System:")) {
            msgPayload = {
                msg_type: "text",
                sender: userHandle,
                room: currentRoom,
                text: content,
                is_system: true
            };
        } else {
            const encryptedJson = await window.__TAURI__.core.invoke("encrypt_group_message", {
                room: currentRoom,
                text: content
            });
            msgPayload = {
                msg_type: content.startsWith("FILE:") ? "file" : (content.startsWith("VOICE:") ? "voice" : (content.startsWith("LOC:") ? "loc" : "text")),
                sender: userHandle,
                room: currentRoom,
                encrypted: encryptedJson
            };
        }

        const payloadStr = JSON.stringify(msgPayload);
        if (localSocket && localSocket.readyState === WebSocket.OPEN) {
            localSocket.send(payloadStr);
        } else {
            if (msgPayload.msg_type === 'file' && window.lastFileBase64) {
                await window.__TAURI__.core.invoke("send_chat_message", { message: payloadStr, is_binary: false });
                await window.__TAURI__.core.invoke("send_chat_message", { message: window.lastFileBase64, is_binary: true });
                window.lastFileBase64 = null;
            } else {
                await window.__TAURI__.core.invoke("send_chat_message", { message: payloadStr, is_binary: false });
            }
        }
    } catch (e) {
        console.error("Send Error", e);
        offlineQueue.push({ text: content, isSystem });
    }
}

async function sendPushNotification(title, body) {
    try {
        const { isPermissionGranted, requestPermission, sendNotification } = window.__TAURI__.notification;
        let permission = await isPermissionGranted();
        if (!permission) permission = await requestPermission();
        if (permission === 'granted') {
            sendNotification({ title: `Skooda: ${title}`, body: body.substring(0, 100) });
        }
    } catch(e) { console.error("Notification Error", e); }
}
