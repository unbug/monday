use tauri_build::generate_context;

fn main() {
    generate_context().expect("error while running tauri context generate");
}
