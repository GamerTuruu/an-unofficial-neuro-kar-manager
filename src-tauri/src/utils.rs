/// Extract JSON content from text, finding the first '{' and last '}'
pub fn extract_json(text: &str) -> Option<String> {
    let start = text.find('{')?;
    let end = text.rfind('}')?;
    if start <= end {
        Some(text[start..=end].to_string())
    } else {
        None
    }
}
