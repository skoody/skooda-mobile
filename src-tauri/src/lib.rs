use tauri::{AppHandle, Emitter, State, Manager};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::tungstenite::protocol::Message;
use futures_util::{StreamExt, SinkExt};
use std::sync::Arc;
use serde::{Serialize, Deserialize};
use ed25519_dalek::{SigningKey, Signer};
use x25519_dalek::StaticSecret;
use chacha20poly1305::{aead::{Aead, KeyInit}, XChaCha20Poly1305, XNonce};
use base64::{prelude::BASE64_STANDARD, Engine};
use rand::RngCore;
use rand::rngs::OsRng;
use std::fs;
use rusqlite::{params, Connection};

#[derive(Serialize, Deserialize, Clone, Debug)]
struct ChatMessage {
    #[serde(default)]
    msg_type: String,
    sender: String,
    room: String,
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    encrypted: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    signature: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pubkey: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
struct ChatEvent {
    message: String,
}

pub struct ChatState {
    tx: Arc<Mutex<Option<mpsc::UnboundedSender<String>>>>,
    current_url: Arc<Mutex<String>>,
    signing_key: SigningKey,
    encryption_secret: StaticSecret,
    db: Arc<Mutex<Connection>>,
}

#[tauri::command]
async fn get_identity(state: State<'_, ChatState>) -> Result<String, String> {
    Ok(BASE64_STANDARD.encode(state.signing_key.verifying_key().to_bytes()))
}

#[tauri::command]
async fn connect_chat(url: String, app: AppHandle, state: State<'_, ChatState>) -> Result<(), String> {
    {
        let mut url_lock = state.current_url.lock().await;
        *url_lock = url;
    }

    let mut tx_lock = state.tx.lock().await;
    if tx_lock.is_some() {
        return Ok(());
    }

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    *tx_lock = Some(tx);
    
    let app_clone = app.clone();
    let url_shared = state.current_url.clone();

    tokio::spawn(async move {
        loop {
            let url = {
                let lock = url_shared.lock().await;
                lock.clone()
            };

            if url.is_empty() {
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                continue;
            }

            let native_connector = match native_tls::TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .build() {
                    Ok(c) => c,
                    Err(_) => {
                        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                        continue;
                    }
                };

            let connector = tokio_tungstenite::Connector::NativeTls(native_connector);

            match tokio_tungstenite::connect_async_tls_with_config(&url, None, false, Some(connector)).await {
                Ok((ws_stream, _)) => {
                    let (mut sink, mut stream) = ws_stream.split();
                    let _ = app_clone.emit("chat-status", "Connected");

                    loop {
                        tokio::select! {
                            Some(Ok(msg)) = stream.next() => {
                                if let Message::Text(text) = msg {
                                    let _ = app_clone.emit("chat-msg", ChatEvent { message: text.to_string() });
                                }
                            }
                            Some(msg_text) = rx.recv() => {
                                if sink.send(Message::Text(msg_text.into())).await.is_err() {
                                    break;
                                }
                            }
                            else => break,
                        }
                    }
                }
                Err(_) => {
                    let _ = app_clone.emit("chat-status", "Reconnecting...");
                    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn send_chat_message(message: String, state: State<'_, ChatState>) -> Result<(), String> {
    let tx_lock = state.tx.lock().await;
    if let Some(tx) = tx_lock.as_ref() {
        tx.send(message).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Not connected".into())
    }
}

// --- NEW E2EE COMMANDS ---

#[tauri::command]
async fn process_message(
    room: String,
    sender: String,
    text: String,
    is_system: bool,
    state: State<'_, ChatState>
) -> Result<String, String> {
    let mut msg = ChatMessage {
        msg_type: "chat".to_string(),
        sender,
        room: room.clone(),
        text: text.clone(),
        encrypted: None,
        signature: None,
        pubkey: Some(BASE64_STANDARD.encode(state.signing_key.verifying_key().to_bytes())),
    };

    if !is_system {
        // Simple E2EE: Key derived from room name
        let mut key = [0u8; 32];
        let room_bytes = room.as_bytes();
        for (i, &b) in room_bytes.iter().enumerate().take(32) { key[i] = b; }
        
        let cipher = XChaCha20Poly1305::new(&key.into());
        let mut nonce_bytes = [0u8; 24];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = XNonce::from_slice(&nonce_bytes);

        let ciphertext = cipher.encrypt(nonce, text.as_bytes()).map_err(|e| e.to_string())?;
        
        msg.encrypted = Some(serde_json::json!({
            "data": BASE64_STANDARD.encode(ciphertext),
            "nonce": BASE64_STANDARD.encode(nonce_bytes),
        }));
        msg.text = "[Encrypted Content]".to_string();
    }

    // Sign original text
    let signature = state.signing_key.sign(text.as_bytes());
    msg.signature = Some(BASE64_STANDARD.encode(signature.to_bytes()));

    Ok(serde_json::to_string(&msg).unwrap())
}

#[tauri::command]
async fn decrypt_message(
    room: String,
    encrypted_json: serde_json::Value,
    _state: State<'_, ChatState>
) -> Result<String, String> {
    let data_b64 = encrypted_json.get("data").and_then(|v| v.as_str()).ok_or("No data")?;
    let nonce_b64 = encrypted_json.get("nonce").and_then(|v| v.as_str()).ok_or("No nonce")?;
    
    let ciphertext = BASE64_STANDARD.decode(data_b64).map_err(|e| e.to_string())?;
    let nonce_bytes = BASE64_STANDARD.decode(nonce_b64).map_err(|e| e.to_string())?;
    
    let mut key = [0u8; 32];
    let room_bytes = room.as_bytes();
    for (i, &b) in room_bytes.iter().enumerate().take(32) { key[i] = b; }
    
    let cipher = XChaCha20Poly1305::new(&key.into());
    let nonce = XNonce::from_slice(&nonce_bytes);
    
    let plaintext = cipher.decrypt(nonce, ciphertext.as_slice()).map_err(|e| e.to_string())?;
    Ok(String::from_utf8(plaintext).map_err(|e| e.to_string())?)
}

// --- DB COMMANDS ---

#[tauri::command]
async fn save_to_history(
    room: String, 
    sender: String, 
    text: String, 
    is_me: bool,
    state: State<'_, ChatState>
) -> Result<(), String> {
    let db = state.db.lock().await;
    db.execute(
        "INSERT INTO history (room, sender, content, is_me, timestamp) VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
        params![room, sender, text, if is_me { 1 } else { 0 }],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_chat_history(room: String, state: State<'_, ChatState>) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db.lock().await;
    let mut stmt = db.prepare("SELECT sender, content, is_me, timestamp FROM history WHERE room = ?1 ORDER BY timestamp ASC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![room], |row| {
        Ok(serde_json::json!({
            "sender": row.get::<_, String>(0)?,
            "text": row.get::<_, String>(1)?,
            "isMe": row.get::<_, i32>(2)? == 1,
            "time": row.get::<_, String>(3)?,
        }))
    }).map_err(|e| e.to_string())?;

    let mut history = Vec::new();
    for row in rows {
        history.push(row.map_err(|e| e.to_string())?);
    }
    Ok(history)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir().unwrap();
            if !data_dir.exists() { fs::create_dir_all(&data_dir).unwrap(); }

            // 1. Identity Persistence
            let seed_path = data_dir.join("identity.seed");
            let seed = if seed_path.exists() {
                fs::read(&seed_path).unwrap().try_into().unwrap()
            } else {
                let mut s = [0u8; 32];
                OsRng.fill_bytes(&mut s);
                fs::write(&seed_path, &s).unwrap();
                s
            };

            let signing_key = SigningKey::from_bytes(&seed);
            let encryption_secret = StaticSecret::from(seed);

            // 2. Database Initialization
            let db_path = data_dir.join("chat_v1.db");
            let conn = Connection::open(db_path).unwrap();
            conn.execute(
                "CREATE TABLE IF NOT EXISTS history (
                    id INTEGER PRIMARY KEY,
                    room TEXT,
                    sender TEXT,
                    content TEXT,
                    is_me INTEGER,
                    timestamp DATETIME
                )",
                [],
            ).unwrap();

            app.manage(ChatState {
                tx: Arc::new(Mutex::new(None)),
                current_url: Arc::new(Mutex::new(String::new())),
                signing_key,
                encryption_secret,
                db: Arc::new(Mutex::new(conn)),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            connect_chat, 
            send_chat_message,
            get_identity,
            process_message,
            decrypt_message,
            save_to_history,
            get_chat_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
