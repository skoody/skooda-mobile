use tauri::{AppHandle, Emitter, State, Manager};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::tungstenite::protocol::Message;
use futures_util::{StreamExt, SinkExt};
use std::sync::Arc;
use serde::{Serialize, Deserialize};
use ed25519_dalek::{SigningKey, Signer, Signature, Verifier, VerifyingKey};
use x25519_dalek::{StaticSecret, PublicKey};
use chacha20poly1305::{aead::{Aead, KeyInit}, XChaCha20Poly1305, XNonce};
use base64::{prelude::BASE64_STANDARD, Engine};
use rand::RngCore;
use rand::rngs::OsRng;
use std::fs;
use rusqlite::{params, Connection};
use sha2::{Sha256, Digest};

mod mbtiles;
mod routing;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct ChatEvent {
    message: String,
}

pub struct ChatState {
    tx: Arc<Mutex<Option<mpsc::UnboundedSender<Message>>>>,
    current_url: Arc<Mutex<String>>,
    signing_key: SigningKey,
    encryption_secret: StaticSecret,
    db: Arc<Mutex<Option<Connection>>>,
}

fn kdf(chain_key: &[u8; 32], label: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(chain_key);
    hasher.update(label);
    hasher.finalize().into()
}

#[tauri::command]
async fn get_identity(state: State<'_, ChatState>) -> Result<String, String> {
    Ok(BASE64_STANDARD.encode(state.signing_key.verifying_key().to_bytes()))
}

#[tauri::command]
async fn sign_payload(state: State<'_, ChatState>, msg: String) -> Result<String, String> {
    let signature = state.signing_key.sign(msg.as_bytes());
    Ok(BASE64_STANDARD.encode(signature.to_bytes()))
}

#[tauri::command]
async fn verify_payload(msg: String, signature_b64: String, pubkey_b64: String) -> Result<bool, String> {
    let pubkey_bytes = BASE64_STANDARD.decode(pubkey_b64).map_err(|e| e.to_string())?;
    let pubkey = VerifyingKey::from_bytes(&pubkey_bytes.try_into().map_err(|_| "Invalid public key bytes length".to_string())?).map_err(|e| e.to_string())?;
    
    let signature_bytes = BASE64_STANDARD.decode(signature_b64).map_err(|e| e.to_string())?;
    let signature = Signature::from_slice(&signature_bytes).map_err(|e| e.to_string())?;
    
    Ok(pubkey.verify(msg.as_bytes(), &signature).is_ok())
}

#[tauri::command]
async fn get_my_x25519_pubkey(state: State<'_, ChatState>) -> Result<String, String> {
    let pubkey = PublicKey::from(&state.encryption_secret);
    Ok(BASE64_STANDARD.encode(pubkey.to_bytes()))
}

#[tauri::command]
async fn derive_shared_secret(peer_pubkey_b64: String, state: State<'_, ChatState>) -> Result<String, String> {
    let peer_bytes: [u8; 32] = BASE64_STANDARD.decode(peer_pubkey_b64)
        .map_err(|e| e.to_string())?
        .try_into()
        .map_err(|_| "Invalid public key length".to_string())?;
    
    let peer_pub = PublicKey::from(peer_bytes);
    let shared = state.encryption_secret.diffie_hellman(&peer_pub);
    Ok(BASE64_STANDARD.encode(shared.to_bytes()))
}

#[tauri::command]
async fn encrypt_pairwise(shared_secret_b64: String, plaintext: String) -> Result<serde_json::Value, String> {
    let key_bytes: [u8; 32] = BASE64_STANDARD.decode(shared_secret_b64)
        .map_err(|e| e.to_string())?
        .try_into()
        .map_err(|_| "Invalid key length".to_string())?;

    let cipher = XChaCha20Poly1305::new(chacha20poly1305::Key::from_slice(&key_bytes));
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);
    
    let ciphertext = cipher.encrypt(XNonce::from_slice(&nonce), plaintext.as_bytes())
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "ciphertext": BASE64_STANDARD.encode(ciphertext),
        "nonce": BASE64_STANDARD.encode(nonce)
    }))
}

#[tauri::command]
async fn decrypt_pairwise(shared_secret_b64: String, encrypted_json: serde_json::Value) -> Result<String, String> {
    let key_bytes: [u8; 32] = BASE64_STANDARD.decode(shared_secret_b64)
        .map_err(|e| e.to_string())?
        .try_into()
        .map_err(|_| "Invalid key length".to_string())?;

    let ciphertext_b64 = encrypted_json.get("ciphertext").ok_or("Missing ciphertext")?
        .as_str().ok_or("Invalid ciphertext type")?;
    let nonce_b64 = encrypted_json.get("nonce").ok_or("Missing nonce")?
        .as_str().ok_or("Invalid nonce type")?;

    let ciphertext = BASE64_STANDARD.decode(ciphertext_b64).map_err(|e| e.to_string())?;
    let nonce = BASE64_STANDARD.decode(nonce_b64).map_err(|e| e.to_string())?;

    let cipher = XChaCha20Poly1305::new(chacha20poly1305::Key::from_slice(&key_bytes));
    let decrypted = cipher.decrypt(XNonce::from_slice(&nonce), ciphertext.as_slice())
        .map_err(|e| e.to_string())?;

    String::from_utf8(decrypted).map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_secure_database(passphrase: String, state: State<'_, ChatState>, app: AppHandle) -> Result<(), String> {
    let mut db_lock = state.db.lock().await;
    if db_lock.is_some() {
        return Ok(());
    }

    let data_dir = app.path().app_data_dir().unwrap();
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).unwrap();
    }
    let db_path = data_dir.join("chat_secure_v2.db");

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // Set SQLCipher encryption key
    conn.execute(&format!("PRAGMA key = '{}';", passphrase.replace("'", "''")), [])
        .map_err(|e| e.to_string())?;

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
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS my_sender_keys (
            room TEXT PRIMARY KEY,
            chain_key BLOB,
            signing_key_seed BLOB
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS peer_sender_keys (
            room TEXT,
            peer_id TEXT,
            chain_key BLOB,
            verify_key BLOB,
            PRIMARY KEY(room, peer_id)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    *db_lock = Some(conn);
    Ok(())
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

    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
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
                                } else if let Message::Binary(bin) = msg {
                                    let _ = app_clone.emit("chat-binary", bin);
                                }
                            }
                            Some(msg) = rx.recv() => {
                                if sink.send(msg).await.is_err() {
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
async fn send_chat_message(message: String, is_binary: bool, state: State<'_, ChatState>) -> Result<(), String> {
    let tx_lock = state.tx.lock().await;
    if let Some(tx) = tx_lock.as_ref() {
        if is_binary {
            let data = BASE64_STANDARD.decode(message).map_err(|e| e.to_string())?;
            tx.send(Message::Binary(data.into())).map_err(|e| e.to_string())?;
        } else {
            tx.send(Message::Text(message.into())).map_err(|e| e.to_string())?;
        }
        Ok(())
    } else {
        Err("Not connected".into())
    }
}

// --- UPGRADED SENDER KEY E2EE COMMANDS ---

#[tauri::command]
async fn generate_and_store_sender_key(room: String, state: State<'_, ChatState>) -> Result<serde_json::Value, String> {
    let db_lock = state.db.lock().await;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;

    let mut chain_key = [0u8; 32];
    OsRng.fill_bytes(&mut chain_key);

    let mut seed = [0u8; 32];
    OsRng.fill_bytes(&mut seed);

    let signing_key = SigningKey::from_bytes(&seed);
    let verify_key = signing_key.verifying_key().to_bytes();

    db.execute(
        "INSERT OR REPLACE INTO my_sender_keys (room, chain_key, signing_key_seed) VALUES (?1, ?2, ?3)",
        params![room, chain_key.to_vec(), seed.to_vec()],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "chain_key": BASE64_STANDARD.encode(chain_key),
        "verify_key": BASE64_STANDARD.encode(verify_key)
    }))
}

#[tauri::command]
async fn store_peer_sender_key(
    room: String,
    peer_id: String,
    chain_key_b64: String,
    verify_key_b64: String,
    state: State<'_, ChatState>
) -> Result<(), String> {
    let db_lock = state.db.lock().await;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;

    let chain_key = BASE64_STANDARD.decode(chain_key_b64).map_err(|e| e.to_string())?;
    let verify_key = BASE64_STANDARD.decode(verify_key_b64).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT OR REPLACE INTO peer_sender_keys (room, peer_id, chain_key, verify_key) VALUES (?1, ?2, ?3, ?4)",
        params![room, peer_id, chain_key, verify_key],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_my_sender_key(room: String, state: State<'_, ChatState>) -> Result<serde_json::Value, String> {
    let db_lock = state.db.lock().await;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;

    let row = db.query_row(
        "SELECT chain_key, signing_key_seed FROM my_sender_keys WHERE room = ?1",
        params![room],
        |r| Ok((r.get::<_, Vec<u8>>(0)?, r.get::<_, Vec<u8>>(1)?))
    );

    let (chain_key, seed) = match row {
        Ok(data) => (data.0, data.1),
        Err(_) => {
            let mut ck = [0u8; 32];
            OsRng.fill_bytes(&mut ck);
            let mut sd = [0u8; 32];
            OsRng.fill_bytes(&mut sd);
            db.execute(
                "INSERT INTO my_sender_keys (room, chain_key, signing_key_seed) VALUES (?1, ?2, ?3)",
                params![room, ck.to_vec(), sd.to_vec()],
            ).map_err(|e| e.to_string())?;
            (ck.to_vec(), sd.to_vec())
        }
    };

    let signing_key = SigningKey::from_bytes(&seed.try_into().unwrap());
    let verify_key = signing_key.verifying_key().to_bytes().to_vec();

    Ok(serde_json::json!({
        "chain_key": BASE64_STANDARD.encode(chain_key),
        "verify_key": BASE64_STANDARD.encode(verify_key)
    }))
}

#[tauri::command]
async fn encrypt_group_message(room: String, text: String, state: State<'_, ChatState>) -> Result<serde_json::Value, String> {
    let db_lock = state.db.lock().await;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;

    let row = db.query_row(
        "SELECT chain_key, signing_key_seed FROM my_sender_keys WHERE room = ?1",
        params![room],
        |r| Ok((r.get::<_, Vec<u8>>(0)?, r.get::<_, Vec<u8>>(1)?))
    );

    let (chain_key, seed) = match row {
        Ok(data) => (
            data.0.try_into().map_err(|_| "Invalid key size").unwrap(),
            data.1.try_into().map_err(|_| "Invalid seed size").unwrap()
        ),
        Err(_) => {
            // Generate keys automatically if they don't exist
            let mut ck = [0u8; 32];
            OsRng.fill_bytes(&mut ck);
            let mut sd = [0u8; 32];
            OsRng.fill_bytes(&mut sd);
            db.execute(
                "INSERT INTO my_sender_keys (room, chain_key, signing_key_seed) VALUES (?1, ?2, ?3)",
                params![room, ck.to_vec(), sd.to_vec()],
            ).map_err(|e| e.to_string())?;
            (ck, sd)
        }
    };

    // 1. Derive message key: SHA256(chain_key + b"msg")
    let msg_key = kdf(&chain_key, b"msg");

    // 2. Ratchet chain key: SHA256(chain_key + b"next")
    let next_chain_key = kdf(&chain_key, b"next");

    // Save ratcheted chain key
    db.execute(
        "UPDATE my_sender_keys SET chain_key = ?1 WHERE room = ?2",
        params![next_chain_key.to_vec(), room],
    ).map_err(|e| e.to_string())?;

    // 3. Encrypt message
    let cipher = XChaCha20Poly1305::new(&msg_key.into());
    let mut nonce_bytes = [0u8; 24];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, text.as_bytes()).map_err(|e| e.to_string())?;

    // 4. Sign payload using Ed25519 key derived from seed
    let signing_key = SigningKey::from_bytes(&seed);
    let signature = signing_key.sign(&ciphertext);

    Ok(serde_json::json!({
        "ciphertext": BASE64_STANDARD.encode(ciphertext),
        "nonce": BASE64_STANDARD.encode(nonce_bytes),
        "signature": BASE64_STANDARD.encode(signature.to_bytes())
    }))
}

#[tauri::command]
async fn decrypt_group_message(
    room: String,
    sender_id: String,
    payload: serde_json::Value,
    state: State<'_, ChatState>
) -> Result<String, String> {
    let db_lock = state.db.lock().await;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;

    let (chain_key, verify_key_bytes) = db.query_row(
        "SELECT chain_key, verify_key FROM peer_sender_keys WHERE room = ?1 AND peer_id = ?2",
        params![room, sender_id],
        |r| Ok((r.get::<_, Vec<u8>>(0)?, r.get::<_, Vec<u8>>(1)?))
    ).map_err(|_| "No sender key stored for this peer".to_string())?;

    let chain_key_arr: [u8; 32] = chain_key.try_into().map_err(|_| "Invalid key size")?;
    let verify_key = VerifyingKey::from_bytes(
        &verify_key_bytes.try_into().map_err(|_| "Invalid verify key size")?
    ).map_err(|e| e.to_string())?;

    let ciphertext_b64 = payload.get("ciphertext").and_then(|v| v.as_str()).ok_or("Missing ciphertext")?;
    let nonce_b64 = payload.get("nonce").and_then(|v| v.as_str()).ok_or("Missing nonce")?;
    let signature_b64 = payload.get("signature").and_then(|v| v.as_str()).ok_or("Missing signature")?;

    let ciphertext = BASE64_STANDARD.decode(ciphertext_b64).map_err(|e| e.to_string())?;
    let nonce_bytes = BASE64_STANDARD.decode(nonce_b64).map_err(|e| e.to_string())?;
    let signature_bytes = BASE64_STANDARD.decode(signature_b64).map_err(|e| e.to_string())?;

    // 1. Verify signature
    let signature = Signature::from_slice(&signature_bytes).map_err(|e| e.to_string())?;
    verify_key.verify(&ciphertext, &signature).map_err(|e| e.to_string())?;

    // 2. Derive message key
    let msg_key = kdf(&chain_key_arr, b"msg");

    // 3. Ratchet and save chain key
    let next_chain_key = kdf(&chain_key_arr, b"next");
    db.execute(
        "UPDATE peer_sender_keys SET chain_key = ?1 WHERE room = ?2 AND peer_id = ?3",
        params![next_chain_key.to_vec(), room, sender_id],
    ).map_err(|e| e.to_string())?;

    // 4. Decrypt
    let cipher = XChaCha20Poly1305::new(&msg_key.into());
    let nonce = XNonce::from_slice(&nonce_bytes);
    let plaintext = cipher.decrypt(nonce, ciphertext.as_slice()).map_err(|e| e.to_string())?;

    Ok(String::from_utf8(plaintext).map_err(|e| e.to_string())?)
}

// --- DB HISTORY COMMANDS ---

#[tauri::command]
async fn save_to_history(
    room: String, 
    sender: String, 
    text: String, 
    is_me: bool,
    state: State<'_, ChatState>
) -> Result<(), String> {
    let db_lock = state.db.lock().await;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    db.execute(
        "INSERT INTO history (room, sender, content, is_me, timestamp) VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
        params![room, sender, text, if is_me { 1 } else { 0 }],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_chat_history(room: String, state: State<'_, ChatState>) -> Result<Vec<serde_json::Value>, String> {
    let db_lock = state.db.lock().await;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    let mut stmt = db.prepare("SELECT sender, content, is_me, timestamp FROM history WHERE room = ?1 ORDER BY id ASC").map_err(|e| e.to_string())?;
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

fn strip_exif_jpeg(input: &[u8]) -> Vec<u8> {
    if input.len() < 4 || input[0] != 0xFF || input[1] != 0xD8 {
        return input.to_vec();
    }
    let mut output = Vec::with_capacity(input.len());
    output.push(0xFF);
    output.push(0xD8);
    let mut i = 2;
    while i < input.len() - 1 {
        if input[i] == 0xFF {
            let marker = input[i + 1];
            if marker == 0xD8 {
                i += 2;
                continue;
            }
            if marker == 0xD9 || marker == 0xDA {
                output.extend_from_slice(&input[i..]);
                break;
            }
            if i + 3 < input.len() {
                let len = ((input[i + 2] as usize) << 8) | (input[i + 3] as usize);
                if marker == 0xE1 {
                    i += 2 + len;
                } else {
                    if i + 2 + len <= input.len() {
                        output.extend_from_slice(&input[i..i + 2 + len]);
                    }
                    i += 2 + len;
                }
            } else {
                output.extend_from_slice(&input[i..]);
                break;
            }
        } else {
            output.push(input[i]);
            i += 1;
        }
    }
    output
}

#[tauri::command]
async fn strip_image_metadata(base64_in: String) -> Result<String, String> {
    let bytes = BASE64_STANDARD.decode(base64_in).map_err(|e| e.to_string())?;
    let clean_bytes = strip_exif_jpeg(&bytes);
    Ok(BASE64_STANDARD.encode(clean_bytes))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().unwrap();
            if !data_dir.exists() { fs::create_dir_all(&data_dir).unwrap(); }

            // Identity Persistence
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

            app.manage(ChatState {
                tx: Arc::new(Mutex::new(None)),
                current_url: Arc::new(Mutex::new(String::new())),
                signing_key,
                encryption_secret,
                db: Arc::new(Mutex::new(None)),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            connect_chat, 
            send_chat_message,
            get_identity,
            sign_payload,
            verify_payload,
            get_my_x25519_pubkey,
            derive_shared_secret,
            encrypt_pairwise,
            decrypt_pairwise,
            open_secure_database,
            get_my_sender_key,
            generate_and_store_sender_key,
            store_peer_sender_key,
            encrypt_group_message,
            decrypt_group_message,
            save_to_history,
            get_chat_history,
            mbtiles::get_mbtiles_tile,
            mbtiles::get_mbtiles_info,
            routing::find_shortest_path,
            strip_image_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
