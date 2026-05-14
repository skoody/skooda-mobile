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

export function initChat() {
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
            privateSetup.style.display = 'none';
            if (currentRoom === 'lobby') return;
            currentRoom = 'lobby';
            chatWindow.innerHTML = '';
            sendChatMessage(`System: ${userHandle} joined lobby`, true);
        };
    }

    if (btnPrivate) {
        btnPrivate.onclick = () => {
            btnPrivate.classList.add('active');
            btnLobby.classList.remove('active');
            privateSetup.style.display = 'block';
        };
    }

    if (joinRoomBtn) {
        joinRoomBtn.onclick = () => {
            const newRoom = roomIdInput.value.trim();
            if (!newRoom) return;
            currentRoom = newRoom;
            privateSetup.style.display = 'none';
            chatWindow.innerHTML = '';
            loadHistory();
            sendChatMessage(`System: ${userHandle} joined ${newRoom}`, true);
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
                const base64 = reader.result.split(',')[1];
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
        settingsModal.classList.add('active');
    };

    getEl('settings-save').onclick = () => {
        const newHandle = settingsUser.value.trim();
        if (newHandle) {
            userHandle = newHandle;
            localStorage.setItem('skooda_chat_handle', userHandle);
        }
        localStorage.setItem('skooda_chat_sounds', settingsSounds.checked);
        settingsModal.classList.remove('active');
        appendMsg("System", "Einstellungen gespeichert.", true, true);
    };

    getEl('settings-close').onclick = () => settingsModal.classList.remove('active');
    getEl('settings-notif-btn').onclick = () => sendPushNotification("Test", "Benachrichtigungen funktionieren!");

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

                if (msgData.room === currentRoom) {
                    let text = msgData.text;
                    if (msgData.encrypted) {
                        try {
                            text = await window.__TAURI__.core.invoke("decrypt_message", { 
                                room: msgData.room, 
                                encrypted_json: msgData.encrypted 
                            });
                        } catch(e) { text = "[Decryption Error]"; }
                    }
                    if (msgData.msg_type === 'file') {
                        appendMsg(msgData.sender, `<div class="loading-media">Lade Datei: ${msgData.text}...</div>`, msgData.sender === userHandle);
                    } else {
                        appendMsg(msgData.sender, text, msgData.sender === userHandle);
                    }

                    if (msgData.sender !== userHandle) {
                        playChatSound();
                        sendPushNotification(msgData.sender, text);
                    }
                }
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
        const processed = await window.__TAURI__.core.invoke("process_message", { 
            room: currentRoom, 
            sender: userHandle, 
            text: content, 
            is_system: isSystem 
        });
        
        const msgData = JSON.parse(processed);
        if (msgData.msg_type === 'file' && window.lastFileBase64) {
            await window.__TAURI__.core.invoke("send_chat_message", { message: processed, is_binary: false });
            await window.__TAURI__.core.invoke("send_chat_message", { message: window.lastFileBase64, is_binary: true });
            window.lastFileBase64 = null;
        } else {
            await window.__TAURI__.core.invoke("send_chat_message", { message: processed, is_binary: false });
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
