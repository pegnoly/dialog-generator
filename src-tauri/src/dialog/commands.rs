use std::io::Write;

use itertools::Itertools;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_dialog::DialogExt;

use super::{source::create_variant, types::{
    AppManager, 
    Dialog, 
    DialogDBModel, 
    DialogFrontendModel, 
    DialogStepVariant, 
    DialogStepVariantFrontendModel,
    Speaker, 
    SpeakerFrontendModel, 
    SpeakerType
}};

#[tauri::command]
pub async fn load_dialogs(
    app_manager: State<'_, AppManager>
) -> Result<Vec<Dialog>, ()> {
    let res: Result<Vec<DialogDBModel>, sqlx::Error> = sqlx::query_as("SELECT * FROM dialogs").fetch_all(&app_manager.db_pool).await;
    match res {
        Ok(query_result) => {
            Ok(query_result.iter()
                .map(|d| {
                    let dc: Dialog = From::from(d);
                    dc
                }).collect())
        },
        Err(query_error) => {
            println!("Error fetching existing dialogs: {:?}", &query_error.to_string());
            Err(())
        }
    }
}

#[tauri::command]
pub async fn load_speakers(
    app_manager: State<'_, AppManager>
) -> Result<Vec<Speaker>, ()> {
    let res: Result<Vec<Speaker>, sqlx::Error> = sqlx::query_as("SELECT * FROM speakers").fetch_all(&app_manager.db_pool).await;
    match res {
        Ok(query_result) => {
            Ok(query_result)
        },
        Err(query_error) => {
            println!("Error fetching existing speakers: {:?}", &query_error.to_string());
            Err(())
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
        (id, name, script_name, directory, speakers_ids, labels)
        VALUES (?, ?, ?, ?, ?, ?);"#;
    let dialog = Dialog {
        id: uuid::Uuid::new_v4().to_string(),
        name: name,
        script_name: script_name,
        directory: directory,
        speakers_ids: speakers,
        labels: vec!["main".to_string()]
    };
    let res = sqlx::query(sql)
        .bind(&dialog.id)
        .bind(&dialog.name)
        .bind(&dialog.script_name)
        .bind(&dialog.directory)
        .bind(serde_json::to_string(&dialog.speakers_ids).unwrap())
        .bind(serde_json::to_string(&dialog.labels).unwrap())
        .execute(&app_manager.db_pool).await;
    match res {
        Ok(_) => {
            Ok(DialogFrontendModel {
                id: dialog.id,
                name: dialog.name,
                speakers_ids: dialog.speakers_ids,
                labels: dialog.labels
            })
        },
        Err(query_failure) => {
            println!("Failed to create new dialog: {:?}", &query_failure);
            Err("Failed to create new dialog".to_string())
        }
    }
}

#[tauri::command]
pub async fn select_dialog(
    app_manager: State<'_, AppManager>,
    dialog_id: String
) -> Result<Dialog, ()> {
    let selected_dialog: DialogDBModel = sqlx::query_as("SELECT * FROM dialogs WHERE id=?;")
        .bind(&dialog_id)
        .fetch_one(&app_manager.db_pool)
        .await
        .unwrap();

    Ok(Dialog::from(&selected_dialog))
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


#[tauri::command]
pub async fn update_labels(
    app_manager: State<'_, AppManager>,
    dialog_id: String,
    labels: Vec<String>
) -> Result<(), ()> {
    sqlx::query(r#"
            UPDATE dialogs
            SET labels=?
            WHERE id=?; 
        "#)
        .bind(&serde_json::to_string(&labels).unwrap())
        .bind(&dialog_id)
        .execute(&app_manager.db_pool)
        .await
        .unwrap();
    Ok(())
}

/// Executed when frontend tries to switch to existing variant or create new one.
/// If variant is not exists in database - creates it.
/// Anyway sends variant information to frontend.
/// * `step_id` - Id of dialog step that is now active on frontend 
/// * `label` - Label of variant to load
#[tauri::command]
pub async fn try_load_variant(
    app_manager: State<'_, AppManager>,
    dialog_id: String,
    inner_counter: u32,
    label: String
) -> Result<DialogStepVariantFrontendModel, String> {
    let sql = "SELECT * FROM dialog_variants WHERE dialog_id=? AND label=? AND counter=?";
    let res: Result<Option<DialogStepVariant>, sqlx::Error> = sqlx::query_as(sql)
        .bind(&dialog_id)
        .bind(&label)
        .bind(inner_counter)
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
                    let new_variant = create_variant(&app_manager.db_pool, dialog_id, inner_counter, label).await.unwrap();
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

/// Writes variant of step 
/// * `step_id`
/// with label
/// * `label`
/// into database.
#[tauri::command]
pub async fn save_variant(
    app_manager: State<'_, AppManager>,
    dialog_id: String,
    counter: u32,
    label: String,
    speaker: String,
    text: String
) -> Result<(), ()> {
    let sql = r#"
        UPDATE dialog_variants 
        SET speaker_id=?, text=?
        WHERE dialog_id=? AND counter=? AND label=?;
    "#;
    let res = sqlx::query(&sql)
        .bind(&speaker)
        .bind(&text)
        .bind(&dialog_id)
        .bind(&counter)
        .bind(&label)
        .execute(&app_manager.db_pool).await;
    match res {
        Ok(_) => {
            let dialog: DialogDBModel = sqlx::query_as(r#"SELECT * FROM dialogs WHERE id = ?"#)
                .bind(&dialog_id)
                .fetch_one(&app_manager.db_pool)
                .await
                .unwrap();
            let speaker: Speaker = sqlx::query_as(r#"SELECT * FROM speakers WHERE id = ?"#)
                .bind(&speaker)
                .fetch_one(&app_manager.db_pool)
                .await
                .unwrap();
            let final_text = format!("<color={}>{}<color=white>: {}", &speaker.color, &speaker.name, &text);
            let mut file = std::fs::File::create(format!("{}\\{}_{}.txt", dialog.directory, counter, label)).unwrap();
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

    let actual_dialog = Dialog::from(&dialog);

    let speakers: Vec<Speaker> = sqlx::query_as("SELECT * FROM speakers;")
        .fetch_all(&app_manager.db_pool)
        .await
        .unwrap();

    let actual_speakers: Vec<Speaker> = speakers.into_iter()
        .filter(|s| actual_dialog.speakers_ids.contains(&s.id))
        .collect();

    let mut file = std::fs::File::create(format!("{}\\script.lua", dialog.directory)).unwrap();
    let mut script = format!("MiniDialog.Sets[\"{}\"] = {{\n", dialog.script_name);

    let variants: Vec<DialogStepVariant> = sqlx::query_as("SELECT * FROM dialog_variants WHERE dialog_id=?;")
        .bind(&dialog_id)
        .fetch_all(&app_manager.db_pool)
        .await
        .unwrap();
    let steps: Vec<u32> = variants.iter()
        .map(|v| {
            v.counter
        })
        .unique()
        .collect();
    for step in steps {
        script += &format!("\t[{}] = {{\n", step);
        variants.iter()
            .filter(|v| v.counter == step )
            .for_each(|v| {
                if let Some(speaker) = actual_speakers.iter().find(|s| s.id == v.speaker_id) {
                    let speaker_script = if speaker.speaker_type == SpeakerType::Hero {
                        format!("\"{}\"", speaker.script_name)
                    }
                    else {
                        format!("{}", speaker.script_name)
                    };
                    script += &format!("\t\t[\"{}\"] = {{speaker = {}, speaker_type = {}}},\n", &v.label, speaker_script, speaker.speaker_type.to_string());
                }
            });
        script += "\t},\n";
    }
    script += "}";
    file.write_all(&mut script.as_bytes()).unwrap();
    Ok(())
}