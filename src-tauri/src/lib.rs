use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt, stream::SplitSink};
use std::sync::Arc;
use serde::{Serialize, Deserialize};

type WsSink = SplitSink<tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>, Message>;

pub struct ChatState {
    sink: Arc<Mutex<Option<WsSink>>>,
}

#[derive(Serialize, Deserialize, Clone)]
struct ChatEvent {
    message: String,
}

#[tauri::command]
async fn connect_chat(url: String, app: AppHandle, state: State<'_, ChatState>) -> Result<(), String> {
    let mut last_err = String::new();
    
    for _ in 0..3 {
        match connect_async(&url).await {
            Ok((ws_stream, _)) => {
                let (sink, mut stream) = ws_stream.split();
                let mut sink_lock = state.sink.lock().await;
                *sink_lock = Some(sink);
                
                tokio::spawn(async move {
                    while let Some(Ok(msg)) = stream.next().await {
                        if let Message::Text(text) = msg {
                            let _ = app.emit("chat-msg", ChatEvent { message: text });
                        }
                    }
                });
                return Ok(());
            }
            Err(e) => {
                last_err = e.to_string();
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            }
        }
    }
    Err(format!("Native Connection Failed: {}", last_err))
}

#[tauri::command]
async fn send_chat_message(message: String, state: State<'_, ChatState>) -> Result<(), String> {
    let mut sink_lock = state.sink.lock().await;
    if let Some(sink) = sink_lock.as_mut() {
        sink.send(Message::Text(message)).await.map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Not connected".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ChatState { sink: Arc::new(Mutex::new(None)) })
        .invoke_handler(tauri::generate_handler![connect_chat, send_chat_message])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
