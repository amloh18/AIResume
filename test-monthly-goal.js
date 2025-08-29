// Test script for monthly goal functionality
const testMonthlyGoal = async () => {
  console.log('🧪 Testing Monthly Goal Functionality...\n');

  // Test 1: Update monthly goal
  console.log('1. Testing monthly goal update...');
  try {
    const response = await fetch('/api/user/update-monthly-goal', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ monthlyGoal: 25 }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Monthly goal updated successfully:', data.data.monthlyGoal);
    } else {
      console.log('❌ Failed to update monthly goal');
    }
  } catch (error) {
    console.log('❌ Error updating monthly goal:', error.message);
  }

  // Test 2: Check analytics with updated goal
  console.log('\n2. Testing analytics with updated goal...');
  try {
    const response = await fetch('/api/analytics?userId=test&period=month');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Analytics data:', {
        monthlyGoal: data.data.predictions?.monthlyGoal,
        monthlyGoalProgress: data.data.predictions?.monthlyGoalProgress,
        jobsThisMonth: data.data.predictions?.jobsThisMonth
      });
    } else {
      console.log('❌ Failed to get analytics data');
    }
  } catch (error) {
    console.log('❌ Error getting analytics:', error.message);
  }

  // Test 3: Check vault counts (should exclude rejected jobs)
  console.log('\n3. Testing vault counts (should exclude rejected jobs)...');
  try {
    const response = await fetch('/api/analytics?userId=test&period=month');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Vault counts:', data.data.vaultCounts);
    } else {
      console.log('❌ Failed to get vault counts');
    }
  } catch (error) {
    console.log('❌ Error getting vault counts:', error.message);
  }

  console.log('\n🎉 Monthly goal functionality test completed!');
};

// Run the test
testMonthlyGoal();
