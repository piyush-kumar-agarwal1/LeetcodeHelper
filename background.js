chrome.runtime.onInstalled.addListener(() => {
  // Initialize settings with default API key
  chrome.storage.local.set({
    apiKey: 'leetcode_helper_default_key_2025', // Use your default key
    darkMode: false,
    hintsUsed: {}
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'problemDetected') {
    // Store current problem
    chrome.storage.local.set({ currentProblem: message.problem });
  }

  return true; // Indicates asynchronous response
});

// Helper function to fetch hints from API
async function fetchHints(problemId) {
  try {
    const { apiKey } = await chrome.storage.local.get('apiKey');
    // Update any fetch calls
    const response = await fetch(`https://lcbackendhost-production.up.railway.app/api/hints/${problemId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch hints');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching hints:', error);
    return { error: error.message };
  }
}