// Rheo Finance — Tauri main entry
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod secure_auth_storage;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: include_str!("../migrations/0001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_default_data",
            sql: include_str!("../migrations/0002_seed.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "sync_metadata_baseline",
            sql: include_str!("../migrations/0003_sync_metadata_baseline.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "plans_coverage",
            sql: include_str!("../migrations/0004_plans_coverage.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "coverage_income_recurring",
            sql: include_str!("../migrations/0005_coverage_income_recurring.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "uuid_seed_ids",
            sql: include_str!("../migrations/0006_uuid_seed_ids.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "coverage_user_scope",
            sql: include_str!("../migrations/0007_coverage_user_scope.sql"),
            kind: MigrationKind::Up,
        },
    ];

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(secure_auth_storage::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:evochia.db", migrations)
                .build(),
        )
        .setup(|_app| {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let app_local_data_dir = _app.path().app_local_data_dir()?;
                std::fs::create_dir_all(&app_local_data_dir)?;
                let stronghold_salt_path = app_local_data_dir.join("stronghold-salt.bin");

                _app.handle().plugin(
                    tauri_plugin_stronghold::Builder::with_argon2(&stronghold_salt_path).build(),
                )?;
            }

            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            _app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        });

    builder
        .invoke_handler(tauri::generate_handler![restart_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
