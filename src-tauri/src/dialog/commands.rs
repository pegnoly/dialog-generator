use std::io::Write;

use sqlx::{Pool, Sqlite};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_dialog::DialogExt;

use super::types::{
    AppManager, 
    Dialog, 
    DialogDBModel, 
    DialogFrontendModel, 
    DialogStep, 
    DialogStepDBModel, 
    DialogStepFrontendModel,
    DialogStepVariant, 
    DialogStepVariantFrontendModel,
    Speaker, 
    SpeakerFrontendModel, 
    SpeakerType
};

#[tauri::command]
pub async fn load_existing_data(app: AppHandle, app_manager: State<'_, AppManager>) -> Result<(), ()> {
    let pool_cloned = app_manager.db_pool.clone();
    load_dialogs(&app, &pool_cloned).await;
    load_speakers(&app, &pool_cloned).await;
    Ok(())
}

async fn load_dialogs(app: &AppHandle, pool: &Pool<Sqlite>) {
    let res: Result<Vec<DialogDBModel>, sqlx::Error> = sqlx::query_as("SELECT * FROM dialogs").fetch_all(pool).await;
    match res {
        Ok(query_result) => {
            let dialogs_converted: Vec<Dialog> = query_result.iter()
                .map(|d| {
                    let dc: Dialog = From::from(d);
                    dc
                }).collect();
            app.emit("existing_dialogs_loaded", &dialogs_converted).unwrap();
        },
        Err(query_error) => {
            println!("Error fetching existing dialogs: {:?}", &query_error.to_string());
        }
    }
}

async fn load_speakers(app: &AppHandle, pool: &Pool<Sqlite>) {
    let res: Result<Vec<Speaker>, sqlx::Error> = sqlx::query_as("SELECT * FROM speakers").fetch_all(pool).await;
    match res {
        Ok(query_result) => {
            app.emit("existing_speakers_loaded", &query_result).unwrap();
        },
        Err(query_error) => {
            println!("Error fetching existing speakers: {:?}", &query_error.to_string());
        }
    }
}

#[tauri::command]
pub async fn pick_directory(app: AppHandle) -> Result<(), ()> {
    app.dialog().file()
        .set_can_create_directories(true)
        .pick_folder(move |f| {
            app.emit("directory_picked", f.unwrap().to_str().unwrap()).unwrap();
        });
    Ok(())
}

/// Creates new dialog.
/// * `name` - name, displayable on frontend
/// * `script_name` - name that will be used by lua scripts
/// * `directory` - folder where dialog files must be stored
/// * `speakers` - ids of characters can be selected in this dialog
#[tauri::command]
pub async fn create_dialog(
    app_manager: State<'_, AppManager>,
    name: String,
    script_name: String,
    directory: String,
    speakers: Vec<String>
) -> Result<DialogFrontendModel, String> {  
    let sql = r#"
        INSERT INTO dialogs 
        (id, name, script_name, directory, speakers_ids)
        VALUES (?, ?, ?, ?, ?);"#;
    let dialog = Dialog {
        id: uuid::Uuid::new_v4().to_string(),
        name: name,
        script_name: script_name,
        directory: directory,
        speakers_ids: speakers
    };
    let res = sqlx::query(sql)
        .bind(&dialog.id)
        .bind(&dialog.name)
        .bind(&dialog.script_name)
        .bind(&dialog.directory)
        .bind(serde_json::to_string(&dialog.speakers_ids).unwrap())
        .execute(&app_manager.db_pool).await;
    match res {
        Ok(_) => {
            Ok(DialogFrontendModel {
                id: dialog.id,
                name: dialog.name,
                speakers_ids: dialog.speakers_ids
            })
        },
        Err(query_failure) => {
            println!("Failed to create new dialog: {:?}", &query_failure);
            Err("Failed to create new dialog".to_string())
        }
    }
}

/// Creates new character that can be used as speaker in dialogs
/// * `name` - name displayable on frontend
/// * `script_name` - character id in lua
/// * `color` - color used to display name of character in dialogs
/// * `speaker_type` - type of speaker generation of lua script depends on
#[tauri::command]
pub async fn create_speaker(
    app_manager: State<'_, AppManager>, 
    name: String,
    script_name: String,
    color: String,
    speaker_type: SpeakerType
) -> Result<SpeakerFrontendModel, String> {
    let sql = r#"
        INSERT INTO speakers
        (id, name, script_name, color, speaker_type)
        VALUES (?, ?, ?, ?, ?)"#;
    let speaker = Speaker {
        id: uuid::Uuid::new_v4().to_string(),
        name: name,
        script_name: script_name,
        color: color,
        speaker_type: speaker_type
    };
    let res = sqlx::query(sql)
        .bind(&speaker.id)
        .bind(&speaker.name)
        .bind(&speaker.script_name)
        .bind(&speaker.color)
        .bind(&speaker.speaker_type)
        .execute(&app_manager.db_pool).await;
    match res {
        Ok(_) => {
            Ok(SpeakerFrontendModel {
                id: speaker.id.clone(),
                name: speaker.name.clone()
            })
        },
        Err(query_failure) => {
            println!("Failed to create dialog: {:?}", &query_failure);
            Err("failed to create dialog".to_string())
        }
    }
}

/// Executed when frontend tries to switch to existing step or create new one.
/// If step isn't exist in database - creates it.
/// Anyway sends step information to frontend.
/// * `dialog_id` - Id of dialog that is now active on frontend 
/// * `inner_counter` - Count of step to load
#[tauri::command]
pub async fn try_load_step(
    app_manager: State<'_, AppManager>, 
    dialog_id: String, 
    inner_counter: u32
) -> Result<DialogStepFrontendModel, String> {
    let sql = "SELECT * FROM dialog_steps WHERE dialog_id = ? AND inner_counter = ?";
    let res: Result<Option<DialogStepDBModel>, sqlx::Error> = sqlx::query_as(sql)
        .bind(&dialog_id)
        .bind(inner_counter)
        .fetch_optional(&app_manager.db_pool).await;
    match res {
        Ok(query_success) => {
            match query_success {
                Some(step) => {
                    Ok(DialogStepFrontendModel {
                        id: step.id,
                        variants: serde_json::from_str(&step.variants).unwrap()
                    })
                }
                None => {
                    let new_step = create_step(&app_manager.db_pool, dialog_id, inner_counter).await.unwrap();
                    Ok(DialogStepFrontendModel {
                        id: new_step.id,
                        variants: new_step.variants
                    })
                }
            }
        }
        Err(query_failure) => {
            println!("Failed to fetch existing step: {:?}", query_failure);
            Err("Failed to fetch existing step".to_string())
        }
    }
}

/// Creates new step of dialog with 
/// * `dialog_id`
/// 
/// Created step will have count of
/// * `inner_counter`
async fn create_step(
    pool: &Pool<Sqlite>, 
    dialog_id: String, 
    inner_counter: u32,
) -> Option<DialogStep> {
    let step = DialogStep {
        dialog_id: dialog_id,
        inner_counter: inner_counter,
        variants: vec!["main".to_string()],
        id: uuid::Uuid::new_v4().to_string()
    };
    let sql = r#"
        INSERT INTO dialog_steps 
        (id, inner_counter, variants, dialog_id)
        VALUES(?, ?, ?, ?)
    "#;
    let res = sqlx::query(sql)
        .bind(&step.id)
        .bind(&step.inner_counter)
        .bind(&serde_json::to_string(&step.variants).unwrap())
        .bind(&step.dialog_id)
        .execute(pool).await;
    match res {
        Ok(_query_success) => {
            Some(step)
        },
        Err(query_failure) => {
            println!("Failed create new dialog step: {:?}", &query_failure);
            None
        }
    }
}

/// Executed when frontend tries to switch to existing variant or create new one.
/// If variant is not exists in database - creates it.
/// Anyway sends variant information to frontend.
/// * `step_id` - Id of dialog step that is now active on frontend 
/// * `label` - Label of variant to load
#[tauri::command]
pub async fn try_load_variant(
    app_manager: State<'_, AppManager>,
    step_id: String,
    label: String
) -> Result<DialogStepVariantFrontendModel, String> {
    let sql = "SELECT * FROM dialog_variants WHERE label = ? AND step_id = ?";
    let res: Result<Option<DialogStepVariant>, sqlx::Error> = sqlx::query_as(sql)
        .bind(&label)
        .bind(&step_id)
        .fetch_optional(&app_manager.db_pool).await;
    match res {
        Ok(fetch_success) => {
            match fetch_success {
                Some(variant) => {
                    Ok(DialogStepVariantFrontendModel {
                        text: variant.text,
                        speaker: variant.speaker_id
                    })
                },
                None => {
                    let new_variant = create_variant(&app_manager.db_pool, label, step_id).await.unwrap();
                    Ok(DialogStepVariantFrontendModel {
                        text: new_variant.text,
                        speaker: new_variant.speaker_id
                    })
                }
            }
        },
        Err(fetch_failure) => {
            println!("Error fetching existing dialog variant: {:?}", fetch_failure);
            Err("Error fetching existing dialog variant".to_string())
        }
    }
}

/// Creates new variant of 
/// * `step_id`
/// with
/// * `label`
async fn create_variant(
    pool: &Pool<Sqlite>,
    label: String,
    step_id: String
) -> Option<DialogStepVariant> {
    println!("Trying to create variant of step {} with label {}", &step_id, &label);
    let variant = DialogStepVariant {
        speaker_id: String::new(),
        text: String::new(),
        label: label,
        step_id: step_id
    };
    let sql = r#"
        INSERT INTO dialog_variants (label, speaker_id, text, step_id) VALUES (?, ?, ?, ?)
    "#;

    let res = sqlx::query(sql)
        .bind(&variant.label)
        .bind(&variant.speaker_id)
        .bind(&variant.text)
        .bind(&variant.step_id)
        .execute(pool).await;
    match res {
        Ok(_query_success) => {
            Some(variant)
        }
        Err(query_failure) => {
            println!("Failed to create dialog variant: {:?}", query_failure);
            None
        }
    }
}

/// Writes variant of step 
/// * `step_id`
/// with label
/// * `label`
/// into database.
#[tauri::command]
pub async fn save_variant(
    app_manager: State<'_, AppManager>,
    step_id: String,
    label: String,
    speaker: String,
    text: String
) -> Result<(), ()> {
    let sql = r#"
        INSERT INTO dialog_variants 
        (step_id, label, speaker_id, text)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (step_id, label) DO
        UPDATE
        SET speaker_id = ?, text = ?
        WHERE step_id = ? AND label = ?
    "#;
    let res = sqlx::query(&sql)
        .bind(&step_id)
        .bind(&label)
        .bind(&speaker)
        .bind(&text)
        .bind(&speaker)
        .bind(&text)
        .bind(&step_id)
        .bind(&label)
        .execute(&app_manager.db_pool).await;
    match res {
        Ok(_) => {
            let step: DialogStepDBModel = sqlx::query_as("SELECT * FROM dialog_steps WHERE id = ?")
                .bind(&step_id)
                .fetch_one(&app_manager.db_pool)
                .await
                .unwrap();
            let dialog: DialogDBModel = sqlx::query_as(r#"SELECT * FROM dialogs WHERE id = ?"#)
                .bind(&step.dialog_id)
                .fetch_one(&app_manager.db_pool)
                .await
                .unwrap();
            let speaker: Speaker = sqlx::query_as(r#"SELECT * FROM speakers WHERE id = ?"#)
                .bind(&speaker)
                .fetch_one(&app_manager.db_pool)
                .await
                .unwrap();
            let final_text = format!("<color={}>{}<color=white>: {}", &speaker.color, &speaker.name, &text);
            let mut file = std::fs::File::create(format!("{}\\{}_{}.txt", dialog.directory, step.inner_counter, label)).unwrap();
            file.write(&[255, 254]).unwrap();
            for utf16 in final_text.encode_utf16() {
                file.write(&(bincode::serialize(&utf16).unwrap())).unwrap();
            }
        },
        Err(query_failure) => {
            println!("Failed to save variant: {:?}", query_failure);
        }
    }
    Ok(())
}   

#[tauri::command]
pub async fn generate_lua_code(
    app_manager: State<'_, AppManager>,
    dialog_id: String
) -> Result<(), ()> {
    let sql = "SELECT * FROM dialogs WHERE id = ?";
    let dialog: DialogDBModel = sqlx::query_as(sql)
        .bind(&dialog_id)
        .fetch_one(&app_manager.db_pool)
        .await
        .unwrap();

    let mut file = std::fs::File::create(format!("{}\\script.lua", dialog.directory)).unwrap();
    let mut script = format!("MiniDialog.Sets[\"{}\"] = {{\n", dialog.script_name);

    let steps: Vec<DialogStepDBModel> = sqlx::query_as("SELECT * FROM dialog_steps WHERE dialog_id = ?")
        .bind(&dialog_id)
        .fetch_all(&app_manager.db_pool)
        .await
        .unwrap();

    for step in steps {
        let variants: Vec<DialogStepVariant> = sqlx::query_as("SELECT * FROM dialog_variants WHERE step_id = ?")
            .bind(&step.id)
            .fetch_all(&app_manager.db_pool)
            .await
            .unwrap();
        script += &format!("\t[{}] = {{\n", &step.inner_counter.to_string());
        for variant in variants {
            let speaker: Speaker = sqlx::query_as("SELECT * FROM speakers WHERE id = ?")
                .bind(&variant.speaker_id)
                .fetch_one(&app_manager.db_pool)
                .await
                .unwrap();
            let speaker_script = if speaker.speaker_type == SpeakerType::Hero {
                format!("\"{}\"", speaker.script_name)
            }
            else {
                format!("{}", speaker.script_name)
            };
            script += &format!("\t\t[\"{}\"] = {{speaker = {}, speaker_type = {}}},\n", &variant.label, speaker_script, speaker.speaker_type.to_string());
        }
        script += "\t},\n";
    }
    script += "}";
    file.write_all(&mut script.as_bytes()).unwrap();
    Ok(())
}