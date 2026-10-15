#[cfg(windows)]
use std::sync::Mutex;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::State;

pub struct VisualPower {
    saving: Arc<AtomicBool>,
    #[cfg(windows)]
    registration: Mutex<Option<Registration>>,
}

impl VisualPower {
    pub fn new(app: tauri::AppHandle) -> Self {
        let saving = Arc::new(AtomicBool::new(true));
        #[cfg(windows)]
        let registration = register(app, saving.clone());
        #[cfg(not(windows))]
        let _ = app;
        Self {
            saving,
            #[cfg(windows)]
            registration: Mutex::new(registration),
        }
    }

    pub fn shutdown(&self) {
        #[cfg(windows)]
        if let Ok(mut registration) = self.registration.lock() {
            registration.take();
        }
    }
}

#[tauri::command]
pub fn get_visual_power_save(state: State<'_, VisualPower>) -> bool {
    state.saving.load(Ordering::Acquire)
}

#[cfg(windows)]
struct CallbackContext {
    app: tauri::AppHandle,
    saving: Arc<AtomicBool>,
}

#[cfg(windows)]
struct Registration {
    handle: usize,
    context: usize,
    parameters: usize,
}

#[cfg(windows)]
impl Drop for Registration {
    fn drop(&mut self) {
        use windows_sys::Win32::System::Power::PowerSettingUnregisterNotification;
        // The native registration owns this Arc until callbacks have been unregistered.
        let result = unsafe { PowerSettingUnregisterNotification(self.handle as isize) };
        if result == 0 {
            unsafe {
                drop(Box::from_raw(self.parameters as *mut windows_sys::Win32::System::Power::DEVICE_NOTIFY_SUBSCRIBE_PARAMETERS));
                drop(Arc::from_raw(self.context as *const CallbackContext));
            }
        } else {
            // Keep the one callback context valid if Windows still owns the registration.
            tracing::warn!(
                result,
                "Visual power notification could not be unregistered"
            );
        }
    }
}

#[cfg(windows)]
fn register(app: tauri::AppHandle, saving: Arc<AtomicBool>) -> Option<Registration> {
    use windows_sys::Win32::{
        System::{
            Power::{
                GetSystemPowerStatus, PowerSettingRegisterNotification,
                DEVICE_NOTIFY_SUBSCRIBE_PARAMETERS, SYSTEM_POWER_STATUS,
            },
            SystemServices::GUID_POWER_SAVING_STATUS,
        },
        UI::WindowsAndMessaging::DEVICE_NOTIFY_CALLBACK,
    };
    let mut status = SYSTEM_POWER_STATUS::default();
    let available = unsafe { GetSystemPowerStatus(&mut status) } != 0;
    saving.store(
        !available || status.SystemStatusFlag != 0,
        Ordering::Release,
    );
    let context = Arc::into_raw(Arc::new(CallbackContext {
        app,
        saving: saving.clone(),
    }));
    let parameters = Box::into_raw(Box::new(DEVICE_NOTIFY_SUBSCRIBE_PARAMETERS {
        Callback: Some(power_changed),
        Context: context as *mut _,
    }));
    let mut handle = std::ptr::null_mut();
    let result = unsafe {
        PowerSettingRegisterNotification(
            &GUID_POWER_SAVING_STATUS,
            DEVICE_NOTIFY_CALLBACK,
            parameters as *mut _,
            &mut handle,
        )
    };
    if result != 0 {
        saving.store(true, Ordering::Release);
        unsafe {
            drop(Box::from_raw(parameters));
            drop(Arc::from_raw(context));
        }
        tracing::warn!(
            result,
            "Visual power notification unavailable; decorative motion disabled"
        );
        None
    } else {
        Some(Registration {
            handle: handle as usize,
            context: context as usize,
            parameters: parameters as usize,
        })
    }
}

#[cfg(windows)]
unsafe extern "system" fn power_changed(
    context: *const std::ffi::c_void,
    kind: u32,
    setting: *const std::ffi::c_void,
) -> u32 {
    use tauri::Emitter;
    use windows_sys::Win32::{
        System::Power::POWERBROADCAST_SETTING, UI::WindowsAndMessaging::PBT_POWERSETTINGCHANGE,
    };
    if kind == PBT_POWERSETTINGCHANGE && !context.is_null() && !setting.is_null() {
        let setting = &*(setting as *const POWERBROADCAST_SETTING);
        if setting.DataLength == 4 {
            let saving = std::ptr::read_unaligned(setting.Data.as_ptr() as *const u32) != 0;
            let context = &*(context as *const CallbackContext);
            context.saving.store(saving, Ordering::Release);
            let _ = context.app.emit("visual-power-save", saving);
        }
    }
    0
}
