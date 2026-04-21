# Tasks
- [x] Task 1: Add bullet point support in Forms
  - Update `ProjectsSection.tsx`, `VolunteerSection.tsx`, `CertificatesSection.tsx`, and `PublicationsSection.tsx` to include an achievements/description array or rich text editor for each entry.
  - Update `EducationSection.tsx` to include an option to toggle bullet points visibility.

- [x] Task 2: Implement Placeholders in Template Renderers
  - Update template rendering components (e.g., in `src/lib/templates/custom-renderers/*` or shared layout components) to display placeholder text (e.g., `<span className="text-gray-400">Company Name</span>`) when key fields like `company`, `title`, `institution`, etc., are empty.
  
- [x] Task 3: Fix Template Layout Spacing
  - Identify and fix the excessive margin/padding after the header in two-column templates.
  - Fix the extra padding below/above records in Education, Projects, Volunteer, and Publication sections across all relevant template renderers.
  
- [x] Task 4: Ensure Templates Render Bullet Points
  - Update the template renderers for Projects, Volunteer, Certificates, and Publications to actually display the newly added bullet points if they exist.
  - Apply the show/hide bullet points toggle logic to the Education section renderer.

# Task Dependencies
- Task 4 depends on Task 1.
- Task 2 and Task 3 can be done in parallel.
