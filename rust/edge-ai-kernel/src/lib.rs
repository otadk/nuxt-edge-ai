use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
struct KernelResult {
    text: String,
    intent: String,
    keywords: Vec<String>,
    summary: String,
}

fn keywords_from_prompt(prompt: &str) -> Vec<String> {
    let mut keywords: Vec<String> = prompt
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_alphanumeric() || ch.is_whitespace() { ch } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .filter(|token| token.chars().count() >= 4)
        .take(6)
        .map(String::from)
        .collect();

    keywords.dedup();
    keywords
}

fn detect_intent(prompt: &str) -> &'static str {
    let normalized = prompt.to_lowercase();

    if normalized.contains("architecture") || normalized.contains("架构") {
        return "architecture";
    }
    if normalized.contains("pitch") || normalized.contains("interview") || normalized.contains("简历") {
        return "positioning";
    }
    if normalized.contains("implement") || normalized.contains("build") || normalized.contains("实现") {
        return "implementation";
    }

    "general"
}

#[wasm_bindgen]
pub fn generate_response(prompt: &str, model: &str) -> String {
    let keywords = keywords_from_prompt(prompt);
    let intent = detect_intent(prompt).to_string();
    let summary = format!(
        "Rust WASM kernel picked {} intent with {} keyword signals.",
        intent,
        keywords.len()
    );
    let keyword_text = if keywords.is_empty() {
        "private-ai, nuxt, local-runtime".to_string()
    } else {
        keywords.join(", ")
    };

    let result = KernelResult {
        text: format!(
            "Nuxt Edge AI Rust WASM response for model \"{}\". Intent: {}. Focus keywords: {}. Recommended next step: connect this kernel contract to a real local inference backend.",
            model,
            intent,
            keyword_text
        ),
        intent,
        keywords,
        summary,
    };

    serde_json::to_string(&result).unwrap()
}
