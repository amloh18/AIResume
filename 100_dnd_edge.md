Here is a comprehensive stress-test catalog of 100 edge cases for your resume builder logic, categorized by system area. Each includes the specific **Logic Solution** to implement.

---

### **Category A: Content Volume & Overflow (The "Container Breakers")**

1. **Zero Content Block:** User adds "Experience" but types nothing.
* *Solution:* `RenderFilter`: If `content.length === 0`, apply `display: none` to the entire block (including header) in Preview Mode.


2. **The "Novelist" (2000 words):** User pastes a massive bio.
* *Solution:* `PaginationEngine`: Detect height > page limit. Force hard split to Page 2. If > 2 pages, truncate with "..." and show "Please shorten" warning.


3. **The "Unbreakable" Word:** A 60-character URL or German compound word.
* *Solution:* CSS Logic: Apply `word-break: break-word` or `overflow-wrap: anywhere` to all text containers.


4. **Single Bullet Point:** A list with only one item.
* *Solution:* `VisualBalance`: Remove standard `margin-bottom` of the list to prevent it from looking floating.


5. **100 Bullet Points:** User lists every single task they ever did.
* *Solution:* `SoftCap`: After 8 bullets, collapse remaining into a "Show More" toggle in Edit Mode; in Render Mode, show warning: "Limit to 6 bullets for ATS."


6. **Empty Bullet Lines:** User presses "Enter" 5 times, creating empty list items.
* *Solution:* `Sanitizer`: On save/blur, strip array items where `text.trim() === ""`.


7. **All Caps Text:** User types everything in CAPS.
* *Solution:* `TextTransform`: Offer a toggle, but default to `text-transform: none`. Do not force capitalization unless it's a Header.


8. **No Whitespace:** User pastes text without line breaks.
* *Solution:* `LineHeight`: Enforce minimum `line-height: 1.4` to ensure readability even in dense blocks.


9. **Header Only:** User drags "Skills" header but adds no skills.
* *Solution:* See Case #1 (Auto-hide).


10. **Rich Text Paste:** User pastes HTML/Images from Word.
* *Solution:* `PasteSanitizer`: Strip all tags except `<b>`, `<i>`, `<ul>`, `<li>`. Remove all inline styles/colors.


11. **Emoji Overload:** User uses 🚀 in every bullet.
* *Solution:* `FontFallback`: Ensure PDF engine supports UTF-8 emojis, or regex strip them if strictly professional mode is on.


12. **RTL Text:** User types in Hebrew/Arabic.
* *Solution:* `DirectionLogic`: Detect character set. If RTL, switch text-align to Right for that specific block only.



---

### **Category B: Two-Column Layout (The "Balancing Act")**

13. **Left Column Empty:** User drags everything to the Right.
* *Solution:* `LayoutCollapse`: Set Left Column width to 0%, Right to 100%. (Switch to Single Column Layout).


14. **Right Column Empty:** User drags everything to the Left (Sidebar).
* *Solution:* `VisualWarning`: "Main body is empty." Prevent export or suggest switching templates.


15. **Left Column Overflows Page 1:** Sidebar is longer than Main body.
* *Solution:* `IndependentFlow`: Allow Left Column to flow to Page 2 Left Column independently of Right Column.


16. **Uneven Bottoms:** Left ends 50px higher than Right.
* *Solution:* `VerticalAlign`: Acceptable. Do nothing.


17. **Massive Gap (Left Short, Right Long):** Left has 1 item, Right has 10.
* *Solution:* `StickyContent`: (Optional) Vertically center the Left content relative to the Right content's height, or leave white space.


18. **Wide Element in Narrow Column:** Long "University Name" in 30% width sidebar.
* *Solution:* `ResponsiveMorph`: Switch element to `StackView` (Date below Title) instead of `InlineView` (Date next to Title).


19. **Drastic Column Resize:** User changes Left Col width from 30% to 70%.
* *Solution:* `ReflowTrigger`: Re-calculate all text wraps and heights immediately. Check for new page overflows.


20. **Section Span:** User wants "Summary" to span both columns at the top.
* *Solution:* `ZoneException`: Create a "Header_FullWidth" zone above the "Body_Columns" zone. Allow drops there.


21. **Sidebar Color Mismatch:** Left column background color doesn't stretch to full page height if content is short.
* *Solution:* `MinHeight`: CSS `min-height: 100vh` (or 100% of PDF page height) on the sidebar container background, regardless of content.


22. **Text Bleed:** Text in Left col touches the Right col text.
* *Solution:* `GutterLogic`: Enforce a fixed `gap` (e.g., 24px) in the Grid/Flex container that cannot be removed by user.



---

### **Category C: Drag & Drop Interactions (The "User Chaos")**

23. **Dropping Parent into Child:** Dragging "Experience Section" *inside* a specific "Job Role".
* *Solution:* `NestingGuard`: Reject drop. Sections can only be siblings.


24. **Dropping "Contact" in "Experience":** Putting email inside a job description.
* *Solution:* `TypeLock`: Contact blocks only allowed in `HeaderZone` or `SidebarZone`.


25. **Rapid Reordering:** User drags item A over B, C, D very fast.
* *Solution:* `Debounce`: Update visual DOM instantly, but delay "Save Order" API call by 500ms.


26. **Dropping Outside Canvas:** User drops block on the gray background.
* *Solution:* `RevertAnimation`: Snap block back to original position.


27. **Duplicating Singleton:** User tries to add a second "Contact Info" section.
* *Solution:* `InstanceCheck`: If `SectionType === 'contact'` exists, disable the "Add" button for it.


28. **Max Sections Reached:** User tries to add 15th section.
* *Solution:* `HardCap`: Show toast "Maximum sections reached for this template."


29. **Drag to New Page:** User drags an item from Page 1 bottom to Page 2 top.
* *Solution:* `CrossPageDrop`: Treat Pages as a continuous vertical list. Calculate index based on absolute Y position.


30. **Interrupted Drag:** User releases mouse outside browser window.
* *Solution:* `MouseLeaveEvent`: Cancel drag operation, revert to start.



---

### **Category D: Pagination & Breaks (The "PDF Nightmares")**

31. **Orphan Header:** "Work Experience" header at bottom of Pg 1, jobs on Pg 2.
* *Solution:* `KeepWithNext`: If `Space_Remaining < Header + 40px`, push Header to Pg 2.


32. **Widow Line:** Last line of a paragraph falls alone on Pg 2.
* *Solution:* `WidowControl`: CSS `orphans: 2; widows: 2;` (if supported) or JavaScript check to push last 2 lines together.


33. **Split Bullet List:** 2 bullets on Pg 1, 3 bullets on Pg 2.
* *Solution:* `Allowed`: This is standard. Ensure the list container styles (margins) replicate on Pg 2.


34. **Split Job Entry:** Job Title on Pg 1, Description on Pg 2.
* *Solution:* `AtomicBlock`: Prefer keeping Title + 1st line together. If not possible, push whole block.


35. **Footer Collision:** Text overlaps with page number/footer.
* *Solution:* `PaddingBottom`: Reserve fixed 50px padding at bottom of every page container.


36. **Graphic Split:** A vertical timeline line breaks between pages.
* *Solution:* `DecoratorRepeat`: Render the start of the line on Pg 2 so it looks continuous.


37. **Date Range Split:** "2019 -" on line 1, "2020" on line 2.
* *Solution:* `NoWrap`: Apply `white-space: nowrap` to date strings.


38. **Infinite Loop:** An item is taller than the page itself.
* *Solution:* `ForceCut`: Stop trying to move it. Slice it visually at the pixel limit and render overflow on next page (ugly but necessary prevention of crash).



---

### **Category E: Data Specifics (The "Formatter")**

39. **Missing End Date:** "Jan 2020 - " (User is still working).
* *Solution:* `LogicSubstitution`: If `endDate` is null, render "Present" or "Current".


40. **Future Date:** User selects "Jan 2030".
* *Solution:* `ValidationWarning`: Highlight in red "Check date accuracy".


41. **End Date before Start Date:** "Jan 2022 - Jan 2020".
* *Solution:* `LogicAutoSwap`: Auto-swap them or show error state.


42. **Image: Non-Square:** User uploads 16:9 portrait.
* *Solution:* `ObjectFit`: CSS `object-fit: cover` inside a circle/square container. Center focus.


43. **Image: Transparent PNG:** User uploads logo with no background.
* *Solution:* `BackgroundFill`: Force a neutral background color (white/light gray) behind the image container if the resume theme is dark.


44. **Image: 10MB File:** User uploads raw photo.
* *Solution:* `ClientCompress`: Resize to max 500x500px on client before upload/render.


45. **Phone Number Formats:** +1, 001, (555).
* *Solution:* `AsIs`: Do not auto-format phone numbers internationally; it's too risky. Display string as typed.


46. **Long Email:** firstname.lastname.verylongdomain@company.com.
* *Solution:* `TextOverflow`: Force wrap or reduce font size for that specific line.


47. **No HTTPS:** User types "[github.com/user](https://github.com/user)".
* *Solution:* `AutoLink`: Prepend `https://` to href attribute automatically.



---

### **Category F: Design & Theming (The "Visuals")**

48. **White Text on White BG:** User customizes colors poorly.
* *Solution:* `ContrastCheck`: Calculate Hex contrast ratio. If < 3:1, show warning or auto-darken/lighten text.


49. **Font Missing:** Custom font fails to load.
* *Solution:* `FallbackStack`: Always define `font-family: 'Custom', Arial, sans-serif`.


50. **1px Font Size:** User accidentally sets font to 1px.
* *Solution:* `MinClamp`: Enforce `min-font-size: 8pt` in the editor.


51. **Theme Change with Content:** Switching from "Single Col" to "Two Col" theme with data.
* *Solution:* `MappingLogic`: Map `Header`->`Header`, `Summary`->`Main`, `Contact`->`Sidebar`.


52. **Transparent Backgrounds in PDF:** PDF engine renders transparent as black.
* *Solution:* `Flatten`: Flatten layers or enforce solid white background on the base container.


53. **Border Bleed:** Borders get cut off at print margins.
* *Solution:* `SafeZone`: Inset all borders 5mm from edge.



---

### **Category G: User Actions (The "Stress Test")**

54. **Double Click Save:** User mashes "Download PDF".
* *Solution:* `ButtonState`: Disable button immediately `onClick`, show spinner, re-enable on success/fail.


55. **Tab Switching:** User edits in Tab A, deletes section in Tab B.
* *Solution:* `StateSync`: Use `localStorage` listener or WebSocket to sync state, or warn "Version conflict" on save.


56. **Undo/Redo Spam:** User hits Ctrl+Z 50 times.
* *Solution:* `StackLimit`: Limit undo stack to last 20 changes.


57. **Browser Zoom:** User is at 150% zoom level.
* *Solution:* `REM units`: Use `rem` or `em` for scaling, but PDF generation must use fixed `pt` or `px` independent of browser zoom.


58. **Mobile Editing:** User tries to drag-drop on phone.
* *Solution:* `TouchSupport`: Ensure drag library supports Touch Events or provide "Move Up/Down" arrows as fallback.


59. **Session Timeout:** User edits for 3 hours, token expires.
* *Solution:* `AutoSave`: Save to `localStorage` constantly. If API fails (401), prompt re-login without losing data.



---

### **Category H: PDF Generation (The "Final Output")**

60. **Hyperlinks not clickable:** PDF renders links as text.
* *Solution:* `AnnotationLayer`: Ensure PDF renderer (e.g., `react-pdf`) explicitly creates a Link Annotation layer.


61. **Text Not Selectable:** Text renders as image/vectors.
* *Solution:* `TextLayer`: Ensure text is rendered as actual font glyphs for ATS parsing.


62. **File Size > 5MB:** PDF is too big for job portals.
* *Solution:* `ImageDownsample`: Compress internal images in the PDF stream.


63. **Margins Cut Off:** Printer cuts off content.
* *Solution:* `PrintMargins`: Enforce standard 0.5 inch margins in the PDF definition.


64. **Color Accuracy:** Screen RGB vs Print CMYK.
* *Solution:* `GamutWarning`: (Advanced) Warn if neon colors are used (they won't print bright).



---

### **Category I: Sections Specifics**

65. **Skills (Bubble/Bar):** 100% skill level looks arrogant?
* *Solution:* Visual logic only. No edge case, just style.


66. **Skills (Text):** Long comma-separated list wraps poorly.
* *Solution:* `ChipLayout`: Use "Chips" (tags) that wrap naturally instead of a text string.


67. **Languages:** "English (Native), Spanish (Basic)".
* *Solution:* `Align`: Ensure proficiency levels align if using a tabular layout.


68. **References:** "Upon Request" vs Actual details.
* *Solution:* `Toggle`: Checkbox "Available on request" hides the fields but keeps the header.


69. **Certificates:** No Expiry Date.
* *Solution:* `OptionalField`: Allow Expiry Date to be null/hidden.



---

### **Category J: System & Security**

70. **XSS Attack:** User names a skill `<script>alert(1)</script>`.
* *Solution:* `Escaping`: React does this by default, but verify PDF generator also escapes text.


71. **JSON Injection:** Corrupted JSON loaded from save.
* *Solution:* `SchemaValidate`: Validate loaded JSON against schema. If invalid, load "Safe Mode" (empty).


72. **Slow Network:** Image fails to upload.
* *Solution:* `OptimisticUI`: Show local preview immediately. Retry upload in background.


73. **Local Storage Full:** Quota exceeded.
* *Solution:* `GracefulFail`: Alert user "Browser storage full", disable auto-save, prompt for Cloud Save.


74. **Concurrent API Calls:** Save request 1 finishes *after* Save request 2.
* *Solution:* `Timestamping`: Server rejects updates with older timestamps than current DB version.



---

### **Category K: The "User is Confused" Cases**

75. **User looks for "Save" button:** (It's auto-save).
* *Solution:* `VisualFeedback`: Show "Saved..." indicator top right.


76. **User deletes "Education" by mistake:**
* *Solution:* `SoftDelete`: Show "Undo" toast for 5 seconds after deletion.


77. **User prints the web page instead of downloading PDF:**
* *Solution:* `PrintCSS`: Add `@media print` CSS that hides UI buttons (nav, sidebars) and shows only the resume paper.


78. **User changes template, expects layout to stay identical:**
* *Solution:* `DataMapping`: Explain "Layout reset" but "Data preserved".


79. **User inputs standard date (01/02/2023) but system thinks MM/DD vs DD/MM:**
* *Solution:* `DatePicker`: Always use a UI picker or strict format (YYYY-MM-DD) internally.


80. **User drags "Header" to bottom:**
* *Solution:* `ZoneLock`: Pin Header to top.



---

### **Category L: Advanced Edge Cases (90-100)**

81. **Nested Lists:** Bullet inside a bullet.
* *Solution:* Indent logic must handle depth limit (max 2 levels).


82. **Custom Section Name:** User renames "Experience" to "Adventures".
* *Solution:* Allow text override of Header title variable.


83. **Icon Selection:** User wants "Guitar" icon for Hobbies.
* *Solution:* Icon picker search logic.


84. **Profile Picture Rotation:** Image uploaded sideways (EXIF data).
* *Solution:* Server-side or Canvas rotation based on EXIF orientation.


85. **Dark Mode OS:** User's OS is Dark Mode.
* *Solution:* Ensure Resume Preview forces Light Mode (paper is white), regardless of OS theme.


86. **Browser Translation:** Chrome auto-translates the page.
* *Solution:* Add `<html translate="no">` or `class="notranslate"` to the preview area to prevent layout breaking translation.


87. **Ad Blockers:** Blocked font CDN or analytics.
* *Solution:* Self-host essential fonts.


88. **Double-Barreled Surnames:** "Smith-Jones".
* *Solution:* Ensure line breaking doesn't occur at the hyphen if possible.


89. **Honorifics:** "Dr.", "PhD".
* *Solution:* Optional prefix/suffix fields.


90. **Mononyms:** User has only one name (e.g., "Cher").
* *Solution:* Make "Last Name" field optional validation-wise.


91. **Negative Dates:** Database error.
* *Solution:* Validation > 1950.


92. **Lorem Ipsum Leftover:** User forgets to delete placeholder.
* *Solution:* Warning on export "Placeholder text detected".


93. **Variable Width Characters:** "WWWWW" vs "iiiii".
* *Solution:* Use width-based calculation for overflow, not character count.


94. **Circular Reference:** (Tech specific) A component imports itself.
* *Solution:* Code linting.


95. **Undefined State:** User opens app with broken URL query params.
* *Solution:* Redirect to default clean state.


96. **Zero Width Space:** User copies text with hidden characters.
* *Solution:* Regex strip `\u200B`.


97. **Very Small Page Size:** User tries to print on A5.
* *Solution:* Lock PDF generation to A4/Letter only.


98. **Gradient Text:** User wants gradient text.
* *Solution:* Disable for ATS readability (mostly).


99. **Watermark:** Free tier watermark overlaps content.
* *Solution:* make watermark semi-transparent overlay.


100. **The "Everything" Case:** Maximum content in every section, max sections, all expanded.
* *Solution:* Performance Check. Ensure render time < 2000ms.