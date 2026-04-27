import re

with open('src/components/cv-builder-pro/registry.tsx', 'r') as f:
    content = f.read()

# Replace any literal indices like "projects.0.date"
def replace_literal_date(match):
    prefix = match.group(1)
    idx = match.group(2)
    return f'<Editable path="{prefix}.{idx}.startDate" nowrap isDate={{true}} /> - <Editable path="{prefix}.{idx}.endDate" nowrap isDate={{true}} />'

content = re.sub(r'<Editable\s+path="([a-zA-Z]+)\.(\d+)\.date"\s*(nowrap\s*/>(?:\s*isDate=\{true\})?)', replace_literal_date, content)

with open('src/components/cv-builder-pro/registry.tsx', 'w') as f:
    f.write(content)

print("Modifications applied 2.")
