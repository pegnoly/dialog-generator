pub mod dialog;

use crate::dialog::types::AppManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async  fn run() {
    let app_manager = AppManager::new().await;
    app_manager.init().await;
    tauri::Builder::default()
        .manage(app_manager)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            dialog::commands::load_dialogs,
            dialog::commands::load_speakers,
            dialog::commands::pick_directory,
            dialog::commands::create_dialog,
            dialog::commands::select_dialog,
            dialog::commands::create_speaker,
            dialog::commands::update_labels,
            dialog::commands::try_load_variant,
            dialog::commands::save_variant,
            dialog::commands::generate_lua_code
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
