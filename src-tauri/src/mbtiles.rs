use rusqlite::{params, Connection};
use base64::{Engine as _, engine::general_purpose::STANDARD};

#[tauri::command]
pub fn get_mbtiles_tile(path: String, z: u32, x: u32, y: u32) -> Result<String, String> {
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    
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
