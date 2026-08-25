with open('/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/jobs/AutoApplyPanel.tsx', 'r') as f:
    content = f.read()

# I will find the exact positions of each block comment.
def get_block(start_str, end_str):
    start_idx = content.find(start_str)
    end_idx = content.find(end_str) if end_str else content.find('      {/* Portal Connect Modal */}')
    return content[start_idx:end_idx]

b1 = get_block('{/* 1. Application Automation */}', '{/* 2. Connected Job Accounts */}')
b2 = get_block('{/* 2. Connected Job Accounts */}', '{/* 3. Roles You\'re Targeting */}')
b3 = get_block('{/* 3. Roles You\'re Targeting */}', '{/* 4. Where Do You Want to Work? */}')
b4 = get_block('{/* 4. Where Do You Want to Work? */}', '{/* 5. What Salary Are You Targeting? */}')
b5 = get_block('{/* 5. What Salary Are You Targeting? */}', '{/* 6. Experience Level */}')
b6 = get_block('{/* 6. Experience Level */}', '{/* 7. Availability */}')
b7 = get_block('{/* 7. Availability */}', '{/* Auto-Apply Profile Summary */}')
b8 = get_block('{/* Auto-Apply Profile Summary */}', '{/* Save Button */}')
b9 = get_block('{/* Save Button */}', '{/* Portal Connect Modal */}')

start_idx = content.find('  return (\n    <div className="space-y-8 w-full pb-12">\n      {/* 1. Application Automation */}')
end_idx = content.find('      {/* Portal Connect Modal */}')

before = content[:start_idx]
after = content[end_idx:]

new_layout = f"""  return (
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

"""

with open('/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/jobs/AutoApplyPanel.tsx', 'w') as f:
    f.write(before + new_layout + after)
