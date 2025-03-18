// Define loadProblemData at the top of the file
async function loadProblemData() {
  try {
    const { currentProblem } = await chrome.storage.local.get('currentProblem');

    if (!currentProblem) {
      document.getElementById('noDetection').classList.remove('hidden');
      document.getElementById('hintsContainer').classList.add('hidden');
      document.getElementById('problemInfo').classList.add('hidden');
      return;
    }

    // Update problem info in the UI
    document.getElementById('problemTitle').textContent = currentProblem.title || 'Unknown Problem';
    document.getElementById('problemDifficulty').textContent = `Difficulty: ${currentProblem.difficulty || 'Unknown'}`;

    // Load existing hints for the problem
    await loadExistingHints(currentProblem.id);

    // Show the hints container
    document.getElementById('hintsContainer').classList.remove('hidden');
    document.getElementById('problemInfo').classList.remove('hidden');
    document.getElementById('noDetection').classList.add('hidden');
  } catch (error) {
    console.error('Error loading problem data:', error);
    alert('Failed to load problem data. Please try again.');
  }
}

// Function to load existing hints for a problem
async function loadExistingHints(problemId) {
  const { hintsUsed } = await chrome.storage.local.get('hintsUsed');
  const problemHints = hintsUsed[problemId] || [];

  const hintsList = document.getElementById('hintsList');
  hintsList.innerHTML = '';

  // Display existing hints
  problemHints.forEach((hint, index) => {
    const hintElement = document.createElement('div');
    hintElement.className = 'hint';
    hintElement.textContent = `Hint ${index + 1}: ${hint}`;
    hintsList.appendChild(hintElement);
  });

  // Enable/disable solution button based on hint count
  const solutionBtn = document.getElementById('getSolutionBtn');
  if (problemHints.length >= 4) {
    solutionBtn.disabled = false;
  } else {
    solutionBtn.disabled = true;
  }
}

// Function to save the API key
async function saveApiKey() {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  console.log('API key entered:', apiKey); // Log the entered API key

  if (!apiKey) {
    alert('Please enter a valid API key');
    return;
  }

  // Test if the API key is valid before saving
  try {
    const response = await fetch('https://lcbackendhost-production.up.railway.app/api/verify-key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      console.log('API key is valid'); // Log successful verification
      // Save the API key
      await chrome.storage.local.set({ apiKey });
      console.log('API key saved to chrome.storage.local'); // Log successful save

      // Hide API key prompt
      document.getElementById('apiKeyPrompt').classList.add('hidden');

      // Load problem data
      loadProblemData();
    } else {
      const errorText = await response.text();
      console.error('API key verification failed:', errorText); // Log the error
      alert('Invalid API key. Please check and try again.');
    }
  } catch (error) {
    console.error('Error verifying API key:', error);
    alert('Could not verify API key. Please check your connection and try again.');
  }
}

// Function to get the next hint
async function getNextHint() {
  try {
    const { currentProblem } = await chrome.storage.local.get('currentProblem');

    if (!currentProblem || !currentProblem.id) {
      alert('No problem detected. Please navigate to a LeetCode problem first.');
      return;
    }

    const { apiKey, hintsUsed } = await chrome.storage.local.get(['apiKey', 'hintsUsed']);

    if (!apiKey) {
      alert('API key not set. Please set your API key first.');
      document.getElementById('apiKeyPrompt').classList.remove('hidden');
      return;
    }

    const problemId = currentProblem.id;
    const problemHints = hintsUsed[problemId] || [];
    const nextHintIndex = problemHints.length;

    const response = await fetch(`https://lcbackendhost-production.up.railway.app/api/hints/${problemId}?index=${nextHintIndex}&title=${encodeURIComponent(currentProblem.title)}&difficulty=${encodeURIComponent(currentProblem.difficulty)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status} - ${errorText}`);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const newHint = data.hint;

    // Save the new hint
    problemHints.push(newHint);
    if (!hintsUsed[problemId]) {
      hintsUsed[problemId] = [];
    }
    hintsUsed[problemId] = problemHints;
    await chrome.storage.local.set({ hintsUsed });

    // Refresh the UI
    await loadExistingHints(problemId);
  } catch (error) {
    console.error('Error getting hint:', error);
    alert(`Failed to get hint: ${error.message}`);
  }
}

// Function to get the solution
async function getSolution() {
  try {
    const { currentProblem } = await chrome.storage.local.get('currentProblem');
    const problemId = currentProblem.id;

    // Fetch solution from API
    const response = await fetch(`https://lcbackendhost-production.up.railway.app/api/solutions/${problemId}`, {
      headers: {
        'Authorization': `Bearer ${await chrome.storage.local.get('apiKey').then(data => data.apiKey)}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch solution');
    }

    const data = await response.json();

    // Create solution modal
    const solutionModal = document.createElement('div');
    solutionModal.className = 'solution-modal';
    solutionModal.innerHTML = `
        <div class="solution-content">
          <h3>Solution for ${currentProblem.title}</h3>
          <pre>${data.solution}</pre>
          <button id="closeSolution">Close</button>
        </div>
      `;

    document.body.appendChild(solutionModal);
    document.getElementById('closeSolution').addEventListener('click', () => {
      solutionModal.remove();
    });
  } catch (error) {
    console.error('Error getting solution:', error);
    alert('Failed to get solution. Please try again later.');
  }
}

// Function to toggle dark mode
async function toggleDarkMode() {
  const { darkMode } = await chrome.storage.local.get('darkMode');
  const newDarkMode = !darkMode;

  document.body.classList.toggle('dark-mode', newDarkMode);
  await chrome.storage.local.set({ darkMode: newDarkMode });
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check if the extension context is still valid
    if (!chrome.runtime?.id) {
      throw new Error('Extension context invalidated');
    }

    // Check if API key is set
    const { apiKey, darkMode } = await chrome.storage.local.get(['apiKey', 'darkMode']);

    // Apply dark mode if enabled
    if (darkMode) {
      document.body.classList.add('dark-mode');
    }

    // Show API key prompt if not set
    if (!apiKey) {
      document.getElementById('apiKeyPrompt').classList.remove('hidden');
      document.getElementById('hintsContainer').classList.add('hidden');
      document.getElementById('problemInfo').classList.add('hidden');
    } else {
      loadProblemData(); // Load problem data if API key is set
    }

    // Set up event listeners
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    document.getElementById('getHintBtn').addEventListener('click', getNextHint);
    document.getElementById('getSolutionBtn').addEventListener('click', getSolution);
    document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
  } catch (error) {
    console.error('Extension error:', error);
    alert('Extension context invalidated. Please reload the extension.');
  }
});