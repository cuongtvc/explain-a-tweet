// Content script to inject explain buttons on X.com tweets
(function() {
  'use strict';

  // Create explain button
  function createExplainButton() {
    const button = document.createElement('button');
    button.className = 'explain-tweet-btn';
    button.innerHTML = '🧠 Explain';
    button.title = 'Explain this tweet in simple English';
    return button;
  }

  // Get tweet text from tweet element
  function getTweetText(tweetElement) {
    // Try different selectors for tweet text
    const textSelectors = [
      '[data-testid="tweetText"]',
      '[lang]',
      '.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0'
    ];

    for (const selector of textSelectors) {
      const textElement = tweetElement.querySelector(selector);
      if (textElement) {
        return textElement.textContent.trim();
      }
    }

    return null;
  }

  // Handle explain button click
  function handleExplainClick(event, tweetText) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.target;
    const originalText = button.textContent;
    
    // Show loading state
    button.textContent = 'Explaining...';
    button.disabled = true;

    // Send message to background script to get explanation
    chrome.runtime.sendMessage({
      action: 'explainTweet',
      tweetText: tweetText
    }, (response) => {
      // Reset button state
      button.textContent = originalText;
      button.disabled = false;

      if (response && response.success) {
        showExplanation(tweetText, response.explanation);
      } else {
        alert('Error: ' + (response?.error || 'Failed to explain tweet'));
      }
    });
  }

  // Show explanation in modal
  function showExplanation(originalText, explanation) {
    // Remove existing modal if any
    const existingModal = document.getElementById('explain-tweet-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'explain-tweet-modal';
    modal.className = 'explain-tweet-modal';
    
    modal.innerHTML = `
      <div class="explain-tweet-modal-content">
        <div class="explain-tweet-modal-header">
          <h3>Tweet Explanation</h3>
          <button class="explain-tweet-modal-close">&times;</button>
        </div>
        <div class="explain-tweet-modal-body">
          <div class="original-tweet">
            <h4>Original:</h4>
            <p>${originalText}</p>
          </div>
          <div class="explanation">
            <h4>Simplified:</h4>
            <p>${explanation}</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal handlers
    const closeBtn = modal.querySelector('.explain-tweet-modal-close');
    const modalContent = modal.querySelector('.explain-tweet-modal-content');

    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Close on escape key
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escHandler);
      }
    });
  }

  // Add explain button to tweet
  function addExplainButtonToTweet(tweetElement) {
    // Check if button already exists
    if (tweetElement.querySelector('.explain-tweet-btn')) {
      return;
    }

    // Find the action buttons container
    const actionButtons = tweetElement.querySelector('[role="group"]');
    if (!actionButtons) {
      return;
    }

    const tweetText = getTweetText(tweetElement);
    if (!tweetText) {
      return;
    }

    const explainBtn = createExplainButton();
    explainBtn.addEventListener('click', (e) => handleExplainClick(e, tweetText));

    // Add button to action buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'explain-tweet-btn-container';
    buttonContainer.appendChild(explainBtn);
    
    actionButtons.appendChild(buttonContainer);
  }

  // Find and process tweets
  function processTweets() {
    // X.com tweet selectors
    const tweetSelectors = [
      '[data-testid="tweet"]',
      'article[data-testid="tweet"]'
    ];

    for (const selector of tweetSelectors) {
      const tweets = document.querySelectorAll(selector);
      tweets.forEach(addExplainButtonToTweet);
    }
  }

  // Initialize observer for dynamic content
  function initializeObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // Process new tweets
          processTweets();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initialize when page loads
  function initialize() {
    // Process existing tweets
    processTweets();
    
    // Watch for new tweets
    initializeObserver();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Also try after a short delay in case of dynamic loading
  setTimeout(initialize, 1000);
})();