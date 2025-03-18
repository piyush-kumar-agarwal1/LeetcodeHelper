// Main function to extract problem data
function extractProblemData() {
  return new Promise((resolve) => {
    // Function to extract data once elements are available
    const extractData = () => {
      console.log("Extracting data...");
      
      // Extract problem ID and title from the URL and heading
      const problemPath = window.location.pathname;
      const problemId = problemPath.split('/problems/')[1]?.split('/')[0];
      
      // Use the proper selector for the title based on the LeetCode structure
      const titleElement = document.querySelector('div.text-title-large a[href^="/problems/"]');
      const problemTitle = titleElement ? titleElement.textContent.trim() : 'Unknown Problem';
      console.log("Problem Title:", problemTitle);
      
      // Extract difficulty - looking for elements with difficulty classes
      const difficultyElement = document.querySelector('div[class*="text-difficulty-"]');
      const problemDifficulty = difficultyElement ? difficultyElement.textContent.trim() : 'Unknown';
      console.log("Problem Difficulty:", problemDifficulty);
      
      // Extract problem description - try multiple possible selectors
      const descriptionSelectors = [
        'div[data-track-load="description_content"]',
        'div[data-cy="question-content"]',
        '.question-content',
        'div._1l1MA'
      ];
      
      let descriptionElement = null;
      for (const selector of descriptionSelectors) {
        descriptionElement = document.querySelector(selector);
        if (descriptionElement) break;
      }
      
      const problemDescription = descriptionElement ? descriptionElement.textContent.trim() : 'No description available';
      console.log("Problem Description length:", problemDescription.length);
      
      // Create problem data object
      const problemData = {
        id: problemId,
        title: problemTitle,
        difficulty: problemDifficulty,
        description: problemDescription,
        url: window.location.href
      };
      
      // Send data to background script
      chrome.runtime.sendMessage({
        action: 'problemDetected',
        problem: problemData
      });
      
      // Also resolve the promise with the data
      resolve(problemData);
    };
    
    // Function to check if necessary elements are loaded
    const checkElements = () => {
      return document.querySelector('div.text-title-large') !== null;
    };
    
    // Check if elements are already available
    if (checkElements()) {
      extractData();
    } else {
      console.log("Waiting for elements to load...");
      
      // Use MutationObserver to wait for elements to be added to the DOM
      const observer = new MutationObserver((mutations, obs) => {
        if (checkElements()) {
          console.log("Elements found, extracting data...");
          extractData();
          obs.disconnect(); // Stop observing once elements are found
        }
      });
      
      // Start observing the document body for changes
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Set a timeout to attempt extraction after 3 seconds even if elements not detected
      setTimeout(() => {
        if (!checkElements()) {
          console.log("Timeout reached, attempting extraction anyway...");
          extractData();
          observer.disconnect();
        }
      }, 3000);
    }
  });
}

// Initialize - run when content script loads
(function() {
  console.log("LeetCode Helper content script initialized");
  
  // Extract problem data when page loads
  setTimeout(() => {
    extractProblemData().then(data => {
      console.log("Extracted Data:", data);
    });
  }, 1500); // Short delay to ensure page has loaded
  
  // Listen for URL changes (SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log("URL changed, extracting new problem data");
      setTimeout(() => {
        extractProblemData().then(data => {
          console.log("New Problem Data:", data);
        });
      }, 1500); // Allow time for new page content to load
    }
  }).observe(document, { subtree: true, childList: true });
})();