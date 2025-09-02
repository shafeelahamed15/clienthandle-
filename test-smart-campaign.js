// Test Smart Campaign Creation and Auto-Sending
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001';

async function testSmartCampaign() {
  console.log('🧪 Testing Smart Campaign creation and auto-sending...');
  
  try {
    // First, let's check if there are clients available
    console.log('📋 Checking available clients...');
    
    // Create a test campaign with immediate scheduling
    const campaignConfig = {
      name: "Test Smart Campaign - Quick Send",
      clientId: "mock-client-1", // Using mock client for testing
      clientContext: "John runs a marketing agency, always busy with client deadlines, prefers direct communication, very results-oriented. He values efficiency and quick responses.",
      frequency: "daily",
      interval: 1,
      timeOfDay: new Date(Date.now() + 2 * 60 * 1000).toTimeString().slice(0, 5), // 2 minutes from now
      tone: "professional",
      maxMessages: 3,
      pauseOnReply: true,
      enabled: true
    };

    console.log('🚀 Creating Smart Campaign with config:', {
      name: campaignConfig.name,
      timeOfDay: campaignConfig.timeOfDay,
      clientContext: campaignConfig.clientContext.substring(0, 50) + '...'
    });

    const response = await fetch(`${API_BASE}/api/campaigns`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': 'sb-access-token=mock-token' // Mock authentication
      },
      body: JSON.stringify(campaignConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Campaign creation failed:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Smart Campaign created successfully:', result);

    console.log('\n🕐 Campaign scheduled to send in ~2 minutes');
    console.log('📊 Monitor the server logs to see:');
    console.log('   - 🤖 Processing recurring campaigns...');
    console.log('   - 📧 AI email generation and sending');
    console.log('   - ✅ Campaign email sent successfully');
    
    console.log('\n🔄 The auto-scheduler runs every ~2 minutes, so you should see activity soon!');
    console.log('   Watch the console output for Smart Campaign processing...');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSmartCampaign();