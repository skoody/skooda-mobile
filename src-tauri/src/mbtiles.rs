use base64::{engine::general_purpose::STANDARD, Engine as _};
use dashmap::DashMap;
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use std::sync::Arc;
use tauri::State;

#[derive(Default)]
pub struct MbtilesCacheState {
    pub connections: DashMap<String, Arc<Mutex<Connection>>>,
}

impl MbtilesCacheState {
    pub fn get_or_open(&self, path: &str) -> Result<Arc<Mutex<Connection>>, String> {
        if let Some(conn) = self.connections.get(path) {
            return Ok(conn.value().clone());
        }

        let conn = Connection::open(path)
            .map_err(|e| format!("Failed to open MBTiles DB at {path}: {e}"))?;
        let shared = Arc::new(Mutex::new(conn));
        self.connections.insert(path.to_string(), shared.clone());
        Ok(shared)
    }
}

#[derive(serde::Serialize)]
pub struct MbtilesInfo {
    pub size_bytes: u64,
    pub min_zoom: Option<u32>,
    pub max_zoom: Option<u32>,
    pub format: Option<String>,
}

#[tauri::command]
pub fn get_mbtiles_tile(
    state: State<'_, MbtilesCacheState>,
    path: String,
    z: u32,
    x: u32,
    y: u32,
) -> Result<String, String> {
    let conn_arc = state.get_or_open(&path)?;
    let conn = conn_arc.lock();

    // Convert slippy map y coordinate to MBTiles tile_row (flipped TMS coordinate)
    let tile_row = (1 << z) - 1 - y;

    let mut stmt = conn
        .prepare("SELECT tile_data FROM tiles WHERE zoom_level = ?1 AND tile_column = ?2 AND tile_row = ?3")
        .map_err(|e| e.to_string())?;

    let tile_data: Vec<u8> = stmt
        .query_row(params![z, x, tile_row], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let base64_data = STANDARD.encode(tile_data);
    Ok(base64_data)
}

#[tauri::command]
pub fn get_mbtiles_info(
    state: State<'_, MbtilesCacheState>,
    path: String,
) -> Result<MbtilesInfo, String> {
    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let size_bytes = metadata.len();

    let conn_arc = state.get_or_open(&path)?;
    let conn = conn_arc.lock();

    let min_zoom: Option<u32> = conn
        .query_row("SELECT MIN(zoom_level) FROM tiles", [], |row| row.get(0))
        .ok();

    let max_zoom: Option<u32> = conn
        .query_row("SELECT MAX(zoom_level) FROM tiles", [], |row| row.get(0))
        .ok();

    let format: Option<String> = conn
        .query_row("SELECT value FROM metadata WHERE name = 'format'", [], |row| {
            row.get(0)
        })
        .ok();

    Ok(MbtilesInfo {
        size_bytes,
        min_zoom,
        max_zoom,
        format,
    })
}
