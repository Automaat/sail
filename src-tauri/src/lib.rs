use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{mpsc, Mutex};
use std::time::Duration;
use tauri::State;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeInfo {
    url: String,
    password: String,
}

struct OwnedRuntime {
    child: Child,
    info: RuntimeInfo,
}

impl Drop for OwnedRuntime {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[derive(Default)]
struct RuntimeManager(Mutex<Option<OwnedRuntime>>);

#[tauri::command]
fn start_runtime(manager: State<'_, RuntimeManager>) -> Result<RuntimeInfo, String> {
    let mut runtime = manager.0.lock().map_err(|error| error.to_string())?;
    if let Some(existing) = runtime.as_ref() {
        return Ok(existing.info.clone());
    }

    let binary = std::env::var_os("SAI_OPENCODE_BIN").unwrap_or_else(|| "opencode".into());
    let mut child = Command::new(binary)
        .args([
            "serve",
            "--hostname",
            "127.0.0.1",
            "--port",
            "0",
            "--cors",
            "http://localhost:1420",
            "--cors",
            "http://127.0.0.1:1420",
            "--cors",
            "tauri://localhost",
            "--cors",
            "http://tauri.localhost",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Could not start OpenCode: {error}"))?;

    let stdout = child
        .stdout
        .take()
        .ok_or("OpenCode did not provide startup output")?;
    let (sender, receiver) = mpsc::sync_channel(1);
    std::thread::spawn(move || {
        let mut url = None;
        let mut password = None;
        let mut sender = Some(sender);
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if let Some(value) = line.strip_prefix("server listening on ") {
                url = Some(value.trim().to_string());
            }
            if let Some(value) = line.strip_prefix("server password ") {
                password = Some(value.trim().to_string());
            }
            if let (Some(url), Some(password)) = (url.as_ref(), password.as_ref()) {
                if let Some(sender) = sender.take() {
                    let _ = sender.send(RuntimeInfo {
                        url: url.clone(),
                        password: password.clone(),
                    });
                }
            }
        }
    });

    let info = match receiver.recv_timeout(Duration::from_secs(15)) {
        Ok(info) => info,
        Err(_) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err("OpenCode did not become ready within 15 seconds".to_string());
        }
    };
    *runtime = Some(OwnedRuntime {
        child,
        info: info.clone(),
    });
    Ok(info)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(RuntimeManager::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![start_runtime])
        .run(tauri::generate_context!())
        .expect("failed to run SAI Harness");
}
