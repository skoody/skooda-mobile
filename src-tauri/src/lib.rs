use tauri::{AppHandle, Emitter, State};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::tungstenite::protocol::Message;
use futures_util::{StreamExt, SinkExt};
use std::sync::Arc;
use serde::{Serialize, Deserialize};
use ed25519_dalek::{SigningKey, Signer};
use base64::{prelude::BASE64_STANDARD, Engine};
use rand::RngCore;
use rand::rngs::OsRng;
use tauri_plugin_notification::NotificationExt;

#[derive(Serialize, Deserialize, Clone)]
struct ChatEvent {
    message: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct SecureMessage {
    payload: String,
    signature: String,
    pubkey: String,
}

pub struct ChatState {
    tx: Arc<Mutex<Option<mpsc::UnboundedSender<String>>>>,
    current_url: Arc<Mutex<String>>,
    signing_key: SigningKey,
}

#[tauri::command]
async fn get_identity(state: State<'_, ChatState>) -> Result<String, String> {
    Ok(BASE64_STANDARD.encode(state.signing_key.verifying_key().to_bytes()))
}

#[tauri::command]
async fn sign_and_encrypt(
    text: String, 
    _room_id: String,
    state: State<'_, ChatState>
) -> Result<String, String> {
    let signature = state.signing_key.sign(text.as_bytes());
    let signature_b64 = BASE64_STANDARD.encode(signature.to_bytes());
    let pubkey_b64 = BASE64_STANDARD.encode(state.signing_key.verifying_key().to_bytes());

    Ok(serde_json::to_string(&SecureMessage {
        payload: text, 
        signature: signature_b64,
        pubkey: pubkey_b64,
    }).unwrap())
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

            match tokio_tungstenite::connect_async(&url).await {
                Ok((ws_stream, _)) => {
                    let (mut sink, mut stream) = ws_stream.split();
                    let _ = app_clone.emit("chat-status", "Connected");

                    loop {
                        tokio::select! {
                            _ = tokio::time::sleep(tokio::time::Duration::from_secs(30)) => {
                                if sink.send(Message::Ping(vec![])).await.is_err() {
                                    break;
                                }
                            }
                            Some(Ok(msg)) = stream.next() => {
                                match msg {
                                    Message::Text(text) => {
                                        if text.contains("\"msg_type\":\"chat\"") {
                                            let _ = app_clone.notification()
                                                .builder()
                                                .title("Skooda Chat")
                                                .body("Neue Nachricht empfangen")
                                                .show();
                                        }
                                        let _ = app_clone.emit("chat-msg", ChatEvent { message: text.to_string() });
                                    }
                                    Message::Pong(_) => { }
                                    _ => {}
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut seed = [0u8; 32];
    OsRng.fill_bytes(&mut seed);
    let signing_key = SigningKey::from_bytes(&seed);

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(ChatState { 
            tx: Arc::new(Mutex::new(None)),
            current_url: Arc::new(Mutex::new(String::new())),
            signing_key,
        })
        .invoke_handler(tauri::generate_handler![
            connect_chat, 
            send_chat_message,
            get_identity,
            sign_and_encrypt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
