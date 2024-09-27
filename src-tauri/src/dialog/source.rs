use sqlx::{Pool, Sqlite};

use super::types::DialogStepVariant;

/// Creates new variant of 
/// * `step_id`
/// with
/// * `label`
pub async fn create_variant(
    pool: &Pool<Sqlite>,
    dialog_id: String,
    inner_counter: u32,
    label: String,
) -> Option<DialogStepVariant> {
    println!("Trying to create variant of dialog {} with counter {} and label {}", &dialog_id, inner_counter, &label);
    let variant = DialogStepVariant {
        speaker_id: String::new(),
        text: String::new(),
        label: label,
        counter: inner_counter,
        dialog_id: dialog_id
    };
    let sql = r#"
        INSERT INTO dialog_variants (label, speaker_id, text, dialog_id, counter) VALUES (?, ?, ?, ?, ?)
    "#;

    let res = sqlx::query(sql)
        .bind(&variant.label)
        .bind(&variant.speaker_id)
        .bind(&variant.text)
        .bind(&variant.dialog_id)
        .bind(&variant.counter)
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