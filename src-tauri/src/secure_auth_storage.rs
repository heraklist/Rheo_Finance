use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[cfg(target_os = "android")]
use tauri::{plugin::PluginHandle, Manager};

#[cfg(windows)]
use tauri::Manager;

#[cfg(windows)]
use windows_sys::Win32::{
    Foundation::LocalFree,
    Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    },
};

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "app.rheo.finance";

#[cfg(windows)]
const WINDOWS_STORAGE_DIR: &str = "secure-auth-storage";

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

#[cfg(windows)]
fn hex_key(key: &str) -> String {
    key.as_bytes()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

#[cfg(windows)]
fn protected_item_path<R: Runtime>(
    app: &tauri::AppHandle<R>,
    key: &str,
) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join(WINDOWS_STORAGE_DIR);
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join(format!("{}.bin", hex_key(key))))
}

#[cfg(windows)]
fn dpapi_error(operation: &str) -> String {
    format!("{operation} failed: {}", std::io::Error::last_os_error())
}

#[cfg(windows)]
fn dpapi_protect(value: &[u8]) -> Result<Vec<u8>, String> {
    let mut input = CRYPT_INTEGER_BLOB {
        cbData: value
            .len()
            .try_into()
            .map_err(|_| "Secure auth storage value is too large.".to_string())?,
        pbData: value.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB::default();

    let ok = unsafe {
        CryptProtectData(
            &mut input,
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };

    if ok == 0 {
        return Err(dpapi_error("Windows secure auth storage encryption"));
    }

    if output.pbData.is_null() {
        return Err("Windows secure auth storage encryption returned null output.".to_string());
    }

    let encrypted =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        LocalFree(output.pbData.cast());
    }

    Ok(encrypted)
}

#[cfg(windows)]
fn dpapi_unprotect(value: &[u8]) -> Result<Vec<u8>, String> {
    let mut input = CRYPT_INTEGER_BLOB {
        cbData: value
            .len()
            .try_into()
            .map_err(|_| "Secure auth storage value is too large.".to_string())?,
        pbData: value.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB::default();

    let ok = unsafe {
        CryptUnprotectData(
            &mut input,
            std::ptr::null_mut(),
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };

    if ok == 0 {
        return Err(dpapi_error("Windows secure auth storage decryption"));
    }

    if output.pbData.is_null() {
        return Err("Windows secure auth storage decryption returned null output.".to_string());
    }

    let decrypted =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        LocalFree(output.pbData.cast());
    }

    Ok(decrypted)
}

#[cfg(windows)]
fn get_windows_item<R: Runtime>(
    app: tauri::AppHandle<R>,
    key: String,
) -> Result<StorageValue, String> {
    let path = protected_item_path(&app, &key)?;
    if !path.exists() {
        return Ok(StorageValue { value: None });
    }

    let encrypted = std::fs::read(path).map_err(|error| error.to_string())?;
    let decrypted = dpapi_unprotect(&encrypted)?;
    let value = String::from_utf8(decrypted).map_err(|error| error.to_string())?;
    Ok(StorageValue { value: Some(value) })
}

#[cfg(windows)]
fn set_windows_item<R: Runtime>(
    app: tauri::AppHandle<R>,
    key: String,
    value: String,
) -> Result<(), String> {
    let path = protected_item_path(&app, &key)?;
    let encrypted = dpapi_protect(value.as_bytes())?;
    std::fs::write(path, encrypted).map_err(|error| error.to_string())
}

#[cfg(windows)]
fn remove_windows_item<R: Runtime>(app: tauri::AppHandle<R>, key: String) -> Result<(), String> {
    let path = protected_item_path(&app, &key)?;
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
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

    #[cfg(all(windows, not(target_os = "android")))]
    {
        get_windows_item(app, key)
    }

    #[cfg(not(any(target_os = "android", windows)))]
    {
        let _ = app;
        let _ = key;
        Err("Native secure auth storage is unavailable on this platform.".to_string())
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

    #[cfg(all(windows, not(target_os = "android")))]
    {
        set_windows_item(app, key, value)
    }

    #[cfg(not(any(target_os = "android", windows)))]
    {
        let _ = app;
        let _ = key;
        let _ = value;
        Err("Native secure auth storage is unavailable on this platform.".to_string())
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

    #[cfg(all(windows, not(target_os = "android")))]
    {
        remove_windows_item(app, key)
    }

    #[cfg(not(any(target_os = "android", windows)))]
    {
        let _ = app;
        let _ = key;
        Err("Native secure auth storage is unavailable on this platform.".to_string())
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
