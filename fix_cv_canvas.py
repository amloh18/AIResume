import re

with open('src/components/cv-builder-pro/CVCanvasEngine.tsx', 'r') as f:
    content = f.read()

# Replace <div className="flex h-max gap-8"
content = content.replace('className="flex h-max gap-8"', 'className="flex h-max gap-8 items-start"')

# Replace <div className="flex h-max gap-8 relative z-10"
content = content.replace('className="flex h-max gap-8 relative z-10"', 'className="flex h-max gap-8 relative z-10 items-start"')

with open('src/components/cv-builder-pro/CVCanvasEngine.tsx', 'w') as f:
    f.write(content)

print("Modifications applied 3.")
