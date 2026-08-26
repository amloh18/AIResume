import re

with open('/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/jobs/AutoApplyPanel.tsx', 'r') as f:
    content = f.read()

# Find the start of the return statement
return_start = content.find('  return (')
return_end = content.rfind('  );') + 4

before_return = content[:return_start]
after_return = content[return_end:]

return_content = content[return_start:return_end]

# Extract blocks
def extract_block(start_marker, end_marker):
    start = return_content.find(start_marker)
    if end_marker:
        end = return_content.find(end_marker)
        return return_content[start:end]
    else:
        return return_content[start:]

b1 = extract_block('{/* 1. Application Automation */}', '{/* 2. Connected Job Accounts */}')
b2 = extract_block('{/* 2. Connected Job Accounts */}', '{/* 3. Roles You\'re Targeting */}')
b3 = extract_block('{/* 3. Roles You\'re Targeting */}', '{/* 4. Where Do You Want to Work? */}')
b4 = extract_block('{/* 4. Where Do You Want to Work? */}', '{/* 5. What Salary Are You Targeting? */}')
b5 = extract_block('{/* 5. What Salary Are You Targeting? */}', '{/* 6. Experience Level */}')
b6 = extract_block('{/* 6. Experience Level */}', '{/* 7. Availability */}')
b7 = extract_block('{/* 7. Availability */}', '{/* Auto-Apply Profile Summary */}')
b8 = extract_block('{/* Auto-Apply Profile Summary */}', '{/* Save Button */}')
b9 = extract_block('{/* Save Button */}', '{/* Portal Connect Modal */}')
modals = extract_block('{/* Portal Connect Modal */}', None)

# Find the last closing div of the return content before modals
modals_start = modals.rfind('</div>\n  );')
if modals_start != -1:
    modals = modals[:modals_start]

new_return = f"""  return (
    <div className="w-full pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {{/* Left Column */}}
        <div className="space-y-8 flex flex-col">
{b1}
{b3}
{b4}
{b5}
        </div>

        {{/* Right Column */}}
        <div className="space-y-8 flex flex-col">
{b2}
{b6}
{b7}
{b8}
{b9}
        </div>
      </div>

{modals}
    </div>
  );"""

with open('/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/jobs/AutoApplyPanel.tsx', 'w') as f:
    f.write(before_return + new_return + after_return)

