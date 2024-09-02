use std::path::Path;

use sqlx::{Pool, Sqlite};
use strum_macros::{Display, EnumString};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Clone)]
pub struct SingleValuePayload<T: Serialize + Clone> {
    pub value: T
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, EnumString, Display, sqlx::Type)]
#[repr(i32)]
pub enum SpeakerType {
    #[strum(to_string="SPEAKER_TYPE_HERO")]
    Hero,
    #[strum(to_string="SPEAKER_TYPE_CREATURE")]
    Creature
}

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct Speaker {
    pub id: String,
    pub name: String,
    pub script_name: String,
    pub color: String,
    pub speaker_type: SpeakerType
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SpeakerFrontendModel {
    pub id: String,
    pub name: String
}

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct DialogDBModel {
    pub id: String,
    pub name: String,
    pub script_name: String,
    pub directory: String,
    pub speakers_ids: String
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Dialog {
    pub id: String,
    pub name: String,
    pub script_name: String,
    pub directory: String,
    pub speakers_ids: Vec<String> 
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DialogFrontendModel {
    pub id: String,
    pub name: String,
    pub speakers_ids: Vec<String>
}

impl From<&DialogDBModel> for Dialog {
    fn from(value: &DialogDBModel) -> Self {
        Dialog {
            id: value.id.clone(),
            name: value.name.clone(),
            script_name: value.script_name.clone(),
            directory: value.directory.clone(),
            speakers_ids: serde_json::from_str(&value.speakers_ids).unwrap()
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DialogStep {
    pub id: String,
    pub inner_counter: u32,
    pub variants: Vec<String>,
    pub dialog_id: String
}


#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct DialogStepDBModel {
    pub id: String,
    pub inner_counter: u32,
    pub variants: String,
    pub dialog_id: String
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DialogStepFrontendModel {
    pub id: String,
    pub variants: Vec<String>
}

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone, Debug)]
pub struct DialogStepVariant {
    pub text: String,
    pub speaker_id: String,
    pub label: String,
    pub step_id: String
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DialogStepVariantFrontendModel {
    pub text: String,
    pub speaker: String
}

pub struct AppManager {
    pub dialogs: Vec<Dialog>,
    pub db_pool: Pool<Sqlite>
}

impl AppManager {

    pub async fn new() -> AppManager {
        let db_path = std::env::current_dir().unwrap().parent().unwrap().join(Path::new("dialogs_database.db"));
        if db_path.exists() == false {
            std::fs::File::create(&db_path).unwrap();      
        }
        AppManager {
            dialogs: vec![],
            db_pool: sqlx::SqlitePool::connect(db_path.to_str().unwrap()).await.unwrap()
        }
    }

    pub async fn init(&self) {
        let pool_cloned = self.db_pool.clone();
        tokio::task::spawn(async move {
            let sql = 
            r#"
                CREATE TABLE IF NOT EXISTS dialogs 
                (
                    id TEXT PRIMARY KEY,
                    name TEXT, 
                    script_name TEXT,
                    directory TEXT,
                    speakers_ids TEXT
                );
                CREATE TABLE IF NOT EXISTS dialog_steps 
                (
                    id TEXT PRIMARY KEY,
                    inner_counter INTEGER,
                    variants TEXT,
                    dialog_id TEXT,
                    FOREIGN KEY(dialog_id) REFERENCES dialogs(id)
                );
                CREATE TABLE IF NOT EXISTS dialog_variants 
                (
                    id INTEGER PRIMARY KEY,
                    label TEXT,
                    speaker_id TEXT,
                    text TEXT,
                    step_id TEXT,
                    UNIQUE(label, step_id),
                    FOREIGN KEY(step_id) REFERENCES dialog_steps(id)
                );
                CREATE TABLE IF NOT EXISTS speakers 
                (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    script_name TEXT,
                    speaker_type INTEGER,
                    color TEXT
                )"#;
            sqlx::query(&sql).execute(&pool_cloned).await.unwrap();      
        });
    }
}