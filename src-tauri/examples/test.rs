use sysinfo::{System};
use std::fs;

fn get_battery_info() -> (f32, String, String, f32) {
    let capacity = fs::read_to_string("/sys/class/power_supply/battery/capacity")
        .or_else(|_| fs::read_to_string("/sys/class/power_supply/BAT0/capacity"))
        .unwrap_or_else(|_| "0".to_string())
        .trim()
        .parse::<f32>()
        .unwrap_or(0.0);
    
    let status = fs::read_to_string("/sys/class/power_supply/battery/status")
        .or_else(|_| fs::read_to_string("/sys/class/power_supply/BAT0/status"))
        .unwrap_or_else(|_| "Unknown".to_string())
        .trim()
        .to_string();

    let voltage = fs::read_to_string("/sys/class/power_supply/battery/voltage_now")
        .or_else(|_| fs::read_to_string("/sys/class/power_supply/BAT0/voltage_now"))
        .unwrap_or_else(|_| "0".to_string())
        .trim()
        .parse::<f32>()
        .unwrap_or(0.0) / 1_000_000.0;

    let current = fs::read_to_string("/sys/class/power_supply/battery/current_now")
        .or_else(|_| fs::read_to_string("/sys/class/power_supply/BAT0/current_now"))
        .unwrap_or_else(|_| "0".to_string())
        .trim()
        .parse::<f32>()
        .unwrap_or(0.0) / 1_000_000.0;

    (capacity, status, "N/A".to_string(), (voltage * current).abs())
}

fn get_temperature() -> f32 {
    for i in 0..15 {
        let path = format!("/sys/class/thermal/thermal_zone{}/temp", i);
        if let Ok(temp_str) = fs::read_to_string(&path) {
            if let Ok(temp) = temp_str.trim().parse::<f32>() {
                if temp > 0.0 {
                    return if temp > 1000.0 { temp / 1000.0 } else { temp };
                }
            }
        }
    }
    0.0
}

fn main() {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let (bat_pct, bat_status, _, bat_w) = get_battery_info();
    
    println!("--- Skooda Mobile Backend Test (Note 14 Pro+ Optimized) ---");
    println!("Battery: {:.1}% ({})", bat_pct, bat_status);
    println!("Power Draw: {:.2} W", bat_w);
    println!("CPU Usage: {:.1}%", sys.global_cpu_usage());
    println!("RAM: {:.1}/{:.1} GB", 
        sys.used_memory() as f32 / (1024.0 * 1024.0 * 1024.0),
        sys.total_memory() as f32 / (1024.0 * 1024.0 * 1024.0)
    );
    println!("Temp: {:.1}°C", get_temperature());
    println!("----------------------------------------------------------");
}
