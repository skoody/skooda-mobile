use tauri::{AppHandle, Emitter, State, Manager};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use std::sync::Arc;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
struct ChatEvent {
    message: String,
}

pub struct ChatState {
    tx: Arc<Mutex<Option<mpsc::UnboundedSender<String>>>>,
    current_url: Arc<Mutex<String>>,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ChatState { 
            tx: Arc::new(Mutex::new(None)),
            current_url: Arc::new(Mutex::new(String::new())),
        })
        .invoke_handler(tauri::generate_handler![connect_chat, send_chat_message])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
