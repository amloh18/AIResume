# Template Layout Fixes and Placeholders Spec

## Why
Users are experiencing inconsistent spacing across CV templates, particularly excessive gaps in two-column layouts and extra padding below items in Education, Projects, Volunteer, and Publication sections. Additionally, the forms lack support for adding bullet points to certain sections, and users need better visual cues (placeholders) when fields are empty in the preview.

## What Changes
- Fix the excessive gap after the header in two-column templates.
- Fix extra padding above/below records in Education, Projects, Volunteer, and Publications sections across templates.
- Add support (UI option) to show/hide bullet points in the Education section.
- Allow adding bullet points (achievements/descriptions) for entries in Projects, Volunteer, Certificates, and Publications sections in the editor.
- Implement placeholder text in template previews for missing fields (e.g., showing a light grey "Company Name" when the company field is empty) so users know what information can be filled.

## Impact
- Affected specs: Editor Forms, Template Renderers
- Affected code:
  - `src/components/forms/EducationSection.tsx`, `ProjectsSection.tsx`, `VolunteerSection.tsx`, `CertificatesSection.tsx`, `PublicationsSection.tsx`
  - `src/lib/templates/custom-renderers/*` or `src/components/cv-preview/*`

## ADDED Requirements
### Requirement: Rich Text/Bullet Points for Additional Sections
The system SHALL allow users to add bulleted descriptions to Projects, Volunteer, Certificates, and Publications.
#### Scenario: Adding bullet points
- **WHEN** a user edits a project, volunteer role, certificate, or publication
- **THEN** they see an option or rich text editor to add bullet points (achievements).

### Requirement: Missing Field Placeholders in Preview
The system SHALL display light grey placeholder text in the CV preview when a section item has empty fields.
#### Scenario: Empty field in preview
- **WHEN** a user adds a new record but leaves a field (e.g., Company Name) blank
- **THEN** the preview displays "Company Name" in a light grey, placeholder style.

## MODIFIED Requirements
### Requirement: Template Spacing & Layout
The system SHALL render templates without excessive gaps.
- **WHEN** rendering two-column layouts, the gap after the header is minimized.
- **WHEN** rendering Education, Projects, Volunteer, and Publications, the padding between and below records is normalized.