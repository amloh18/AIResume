# Tasks

- [x] Task 1: Create Local Grammar Analysis Engine
  - [x] SubTask 1.1: Implement dictionary-based checks for complex words (purple), adverbs/weakening phrases (blue), and passive voice patterns (green).
  - [x] SubTask 1.2: Implement logic to score sentence length and density to categorize as lengthy (yellow) or meandering/complex (red).
  - [x] SubTask 1.3: Create an engine module that takes raw text/HTML, identifies matches, and returns an array of issues with offsets/DOM nodes to highlight.

- [x] Task 2: Integrate Grammar Engine into Editor (Step 3)
  - [x] SubTask 2.1: Hook the local grammar engine into the main editor areas (Profile Summary, Work Experience bullets, Education, Projects).
  - [x] SubTask 2.2: Wrap detected issues in spans with appropriate background colors (yellow, red, purple, blue, green).
  - [x] SubTask 2.3: Ensure the highlighting persists during editing, re-scanning when the AI Analysis score is scanned.

- [x] Task 3: Build the Grammar Correction Card
  - [x] SubTask 3.1: Create a floating card component (similar to the AI contextual card) that appears near the cursor/text.
  - [x] SubTask 3.2: Bind `onClick` events to the highlighted spans to open the Grammar Correction Card with the specific rule explanation and suggestion.
  - [x] SubTask 3.3: Allow the user to apply the suggestion directly to the text (replacing the highlighted word/phrase).

- [x] Task 4: Implement Feature Gating for Inline AI Suggest
  - [x] SubTask 4.1: Modify the formatting toolbar's AI Suggest button logic to check the user's active plan tier.
  - [x] SubTask 4.2: If Free tier, prevent the AI API call. Render the suggestion popover with blurred "Lorem ipsum" text.
  - [x] SubTask 4.3: Add an "Upgrade to Pro" overlay/button on top of the blurred text inside the popover.

- [x] Task 5: Restrict AI Analysis Sidebar for Free Users
  - [x] SubTask 5.1: Track AI Analysis Sidebar usage per user (allow exactly 1 free usage).
  - [x] SubTask 5.2: Update the backend API or frontend logic to restrict the analysis output for Free users to only include Grammar and Context issues.
  - [x] SubTask 5.3: Display a clear UI indicator when the Free limit is reached, prompting an upgrade.

# Task Dependencies
- [Task 2] and [Task 3] depend on [Task 1] (Local Grammar Engine).
- [Task 4] and [Task 5] can be done in parallel as they deal with feature gating independently.
