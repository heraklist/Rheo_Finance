use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[cfg(target_os = "android")]
use tauri::{plugin::PluginHandle, Manager};

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "app.rheo.finance";

#[cfg(target_os = "android")]
struct SecureAuthStorage<R: Runtime> {
    mobile_plugin_handle: PluginHandle<R>,
}

#[cfg(target_os = "android")]
#[derive(Serialize)]
struct StorageKeyArgs {
    key: String,
}

#[cfg(target_os = "android")]
#[derive(Serialize)]
struct StorageSetArgs {
    key: String,
    value: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct StorageValue {
    value: Option<String>,
}

#[tauri::command]
async fn get_item<R: Runtime>(
    app: tauri::AppHandle<R>,
    key: String,
) -> Result<StorageValue, String> {
    #[cfg(target_os = "android")]
    {
        let storage = app.state::<SecureAuthStorage<R>>();
        storage
            .mobile_plugin_handle
            .run_mobile_plugin("getItem", StorageKeyArgs { key })
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        let _ = key;
        Err("Android secure auth storage is unavailable on this platform.".to_string())
    }
}

#[tauri::command]
async fn set_item<R: Runtime>(
    app: tauri::AppHandle<R>,
    key: String,
    value: String,
) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let storage = app.state::<SecureAuthStorage<R>>();
        storage
            .mobile_plugin_handle
            .run_mobile_plugin::<()>("setItem", StorageSetArgs { key, value })
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        let _ = key;
        let _ = value;
        Err("Android secure auth storage is unavailable on this platform.".to_string())
    }
}

#[tauri::command]
async fn remove_item<R: Runtime>(app: tauri::AppHandle<R>, key: String) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let storage = app.state::<SecureAuthStorage<R>>();
        storage
            .mobile_plugin_handle
            .run_mobile_plugin::<()>("removeItem", StorageKeyArgs { key })
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        let _ = key;
        Err("Android secure auth storage is unavailable on this platform.".to_string())
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("secure_auth_storage")
        .invoke_handler(tauri::generate_handler![get_item, set_item, remove_item])
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            {
                let handle =
                    _api.register_android_plugin(PLUGIN_IDENTIFIER, "SecureAuthStoragePlugin")?;
                _app.manage(SecureAuthStorage {
                    mobile_plugin_handle: handle,
                });
            }

            Ok(())
        })
        .build()
}
