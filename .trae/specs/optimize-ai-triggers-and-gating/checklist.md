# Checklist

- [x] AI Service uses Gemini Flash Lite exclusively for all AI requests (suggestions, ATS calculations, and full analysis) to ensure maximum speed and cost-efficiency.
- [x] AI responses are cached based on the section's content state to prevent redundant API calls.
- [x] Prompts use the actual user CV context dynamically instead of displaying hardcoded results.
- [x] Users receive a monthly refreshing quota based on their join date (e.g., 3 Free Analysis credits).
- [x] When a user exhausts their AI quota, a clear, locked UI with a conversion message is shown directly within the component (not as a modal).
- [x] AI contextual suggestions render exclusively on the right side of the active section.
- [x] WYSIWYG toolbar reliably appears when a record is clicked.
- [x] No AI analysis runs automatically in the background without explicit user clicks (Minimum Trigger Principle).
