use serde::{Deserialize, Serialize};
use std::collections::{BinaryHeap, HashMap};
use std::cmp::Ordering;

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct Node {
    pub id: u64,
    pub lat: f64,
    pub lon: f64,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct Edge {
    pub from: u64,
    pub to: u64,
    pub weight: f64,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct GraphData {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

#[derive(Copy, Clone, PartialEq)]
struct State {
    cost: f64,
    node_id: u64,
}

impl Eq for State {}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        other.cost.partial_cmp(&self.cost).unwrap_or(Ordering::Equal)
    }
}

impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 6371000.0; // Earth radius in meters
    let phi1 = lat1.to_radians();
    let phi2 = lat2.to_radians();
    let delta_phi = (lat2 - lat1).to_radians();
    let delta_lambda = (lon2 - lon1).to_radians();

    let a = (delta_phi / 2.0).sin().powi(2)
        + phi1.cos() * phi2.cos() * (delta_lambda / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    r * c
}

#[tauri::command]
pub fn find_shortest_path(
    graph_json: String,
    start_lat: f64,
    start_lon: f64,
    end_lat: f64,
    end_lon: f64,
) -> Result<Vec<(f64, f64)>, String> {
    let graph: GraphData = if graph_json.trim().is_empty() {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();
        
        let min_lat = start_lat.min(end_lat);
        let max_lat = start_lat.max(end_lat);
        let min_lon = start_lon.min(end_lon);
        let max_lon = start_lon.max(end_lon);
        
        let lat_diff = max_lat - min_lat;
        let lon_diff = max_lon - min_lon;
        
        let lat_padding = (lat_diff * 0.2).max(0.005);
        let lon_padding = (lon_diff * 0.2).max(0.005);
        
        let pad_min_lat = min_lat - lat_padding;
        let pad_max_lat = max_lat + lat_padding;
        let pad_min_lon = min_lon - lon_padding;
        let pad_max_lon = max_lon + lon_padding;
        
        let steps = 12;
        let lat_step = (pad_max_lat - pad_min_lat) / (steps - 1) as f64;
        let lon_step = (pad_max_lon - pad_min_lon) / (steps - 1) as f64;
        
        for r in 0..steps {
            for c in 0..steps {
                let id = (r * steps + c) as u64;
                let lat = pad_min_lat + r as f64 * lat_step;
                let lon = pad_min_lon + c as f64 * lon_step;
                nodes.push(Node { id, lat, lon });
            }
        }
        
        for r in 0..steps {
            for c in 0..steps {
                let id = (r * steps + c) as u64;
                let offsets = [
                    (-1, 0), (1, 0), (0, -1), (0, 1),
                    (-1, -1), (-1, 1), (1, -1), (1, 1),
                ];
                
                for &(dr, dc) in &offsets {
                    let nr = r as i32 + dr;
                    let nc = c as i32 + dc;
                    if nr >= 0 && nr < steps as i32 && nc >= 0 && nc < steps as i32 {
                        let neighbor_id = (nr * steps as i32 + nc) as u64;
                        let w = haversine_distance(
                            nodes[id as usize].lat,
                            nodes[id as usize].lon,
                            nodes[neighbor_id as usize].lat,
                            nodes[neighbor_id as usize].lon,
                        );
                        edges.push(Edge { from: id, to: neighbor_id, weight: w });
                    }
                }
            }
        }
        
        let start_node_id = (steps * steps) as u64;
        let end_node_id = (steps * steps + 1) as u64;
        
        nodes.push(Node { id: start_node_id, lat: start_lat, lon: start_lon });
        nodes.push(Node { id: end_node_id, lat: end_lat, lon: end_lon });
        
        for &injected_id in &[start_node_id, end_node_id] {
            let inj_node = &nodes[injected_id as usize];
            let mut distances: Vec<(u64, f64)> = (0..(steps * steps) as u64)
                .map(|grid_id| {
                    let gn = &nodes[grid_id as usize];
                    let d = haversine_distance(inj_node.lat, inj_node.lon, gn.lat, gn.lon);
                    (grid_id, d)
                })
                .collect();
            distances.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
            
            for &(grid_id, w) in distances.iter().take(4) {
                edges.push(Edge { from: injected_id, to: grid_id, weight: w });
                edges.push(Edge { from: grid_id, to: injected_id, weight: w });
            }
        }
        
        GraphData { nodes, edges }
    } else {
        serde_json::from_str(&graph_json).map_err(|e| e.to_string())?
    };

    if graph.nodes.is_empty() {
        return Err("Empty graph nodes".to_string());
    }

    // Find nearest start and end nodes
    let start_node = graph.nodes
        .iter()
        .min_by(|a, b| {
            let dist_a = haversine_distance(a.lat, a.lon, start_lat, start_lon);
            let dist_b = haversine_distance(b.lat, b.lon, start_lat, start_lon);
            dist_a.partial_cmp(&dist_b).unwrap_or(Ordering::Equal)
        })
        .ok_or("Cannot find start node")?;

    let end_node = graph.nodes
        .iter()
        .min_by(|a, b| {
            let dist_a = haversine_distance(a.lat, a.lon, end_lat, end_lon);
            let dist_b = haversine_distance(b.lat, b.lon, end_lat, end_lon);
            dist_a.partial_cmp(&dist_b).unwrap_or(Ordering::Equal)
        })
        .ok_or("Cannot find end node")?;

    let mut adjacency_list: HashMap<u64, Vec<(u64, f64)>> = HashMap::new();
    for edge in &graph.edges {
        adjacency_list.entry(edge.from).or_default().push((edge.to, edge.weight));
    }

    let mut dist: HashMap<u64, f64> = HashMap::new();
    let mut parent: HashMap<u64, u64> = HashMap::new();
    let mut heap = BinaryHeap::new();

    dist.insert(start_node.id, 0.0);
    heap.push(State { cost: 0.0, node_id: start_node.id });

    let node_map: HashMap<u64, &Node> = graph.nodes.iter().map(|n| (n.id, n)).collect();

    while let Some(State { cost, node_id }) = heap.pop() {
        if node_id == end_node.id {
            break;
        }

        if let Some(&current_dist) = dist.get(&node_id) {
            if cost > current_dist {
                continue;
            }
        }

        if let Some(neighbors) = adjacency_list.get(&node_id) {
            for &(next_node, weight) in neighbors {
                let next_cost = cost + weight;
                if next_cost < *dist.get(&next_node).unwrap_or(&f64::INFINITY) {
                    dist.insert(next_node, next_cost);
                    parent.insert(next_node, node_id);
                    
                    let end_coords = node_map.get(&end_node.id).unwrap();
                    let next_coords = node_map.get(&next_node).unwrap();
                    let h = haversine_distance(next_coords.lat, next_coords.lon, end_coords.lat, end_coords.lon);
                    
                    heap.push(State { cost: next_cost + h, node_id: next_node });
                }
            }
        }
    }

    if !dist.contains_key(&end_node.id) {
        return Err("No path found".to_string());
    }

    let mut path = Vec::new();
    let mut curr = end_node.id;
    while curr != start_node.id {
        if let Some(coords) = node_map.get(&curr) {
            path.push((coords.lat, coords.lon));
        }
        if let Some(&p) = parent.get(&curr) {
            curr = p;
        } else {
            break;
        }
    }
    if let Some(coords) = node_map.get(&start_node.id) {
        path.push((coords.lat, coords.lon));
    }
    path.reverse();

    Ok(path)
}
