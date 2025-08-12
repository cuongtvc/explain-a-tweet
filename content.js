// Content script to inject explain buttons on X.com tweets
(function () {
  "use strict";

  // Create explain button
  function createExplainButton() {
    const button = document.createElement("button");
    button.className = "explain-tweet-btn";
    button.innerHTML = "🧠 Explain";
    button.title = "Explain this tweet in simple English";
    return button;
  }

  // Create reply suggestion button
  function createReplyButton() {
    const button = document.createElement("button");
    button.className = "reply-tweet-btn";
    button.innerHTML = "💬 Reply";
    button.title = "Get reply suggestions for this tweet";
    return button;
  }

  // Get tweet text from tweet element
  function getTweetText(tweetElement) {
    // Try different selectors for tweet text
    const textSelectors = [
      '[data-testid="tweetText"]',
      "[lang]",
      ".css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0",
    ];

    for (const selector of textSelectors) {
      const textElement = tweetElement.querySelector(selector);
      if (textElement) {
        return textElement.textContent.trim();
      }
    }

    return null;
  }

  // Get tweet author from tweet element
  function getTweetAuthor(tweetElement) {
    // Try different selectors for tweet author
    const authorSelectors = [
      '[data-testid="User-Name"] [dir="ltr"]:first-child',
      '[data-testid="User-Names"] [dir="ltr"]:first-child',
      'a[role="link"] span:first-child'
    ];

    for (const selector of authorSelectors) {
      const authorElement = tweetElement.querySelector(selector);
      if (authorElement && authorElement.textContent.trim()) {
        return authorElement.textContent.trim();
      }
    }

    return "User";
  }

  // Check if tweet is part of a thread
  function isPartOfThread(tweetElement) {
    // Look for thread indicators
    const threadIndicators = [
      'a[href*="/status/"][aria-label*="conversation"]',
      '[data-testid="reply"]',
      'a[href$="/conversation"]',
      '[aria-label*="Show this thread"]',
      '[data-testid="conversation-line"]'
    ];

    for (const selector of threadIndicators) {
      if (tweetElement.querySelector(selector) || 
          document.querySelector(selector)) {
        return true;
      }
    }

    // Check if we're on a tweet detail page (likely part of conversation)
    return window.location.pathname.includes('/status/');
  }

  // Extract thread context by finding all tweets in the conversation
  function getThreadContext(currentTweetElement) {
    const threadTweets = [];
    
    // Find all tweet elements on the page
    const allTweetSelectors = [
      '[data-testid="tweet"]',
      'article[data-testid="tweet"]'
    ];

    let allTweets = [];
    for (const selector of allTweetSelectors) {
      allTweets = allTweets.concat(Array.from(document.querySelectorAll(selector)));
    }

    // Filter and collect tweets that appear to be part of the conversation
    allTweets.forEach((tweetElement, index) => {
      const tweetText = getTweetText(tweetElement);
      const author = getTweetAuthor(tweetElement);
      
      if (tweetText && tweetText.length > 0) {
        // Determine if this tweet comes before the current one in the thread
        // On Twitter/X, tweets in a thread typically appear in chronological order
        const currentTweetIndex = allTweets.indexOf(currentTweetElement);
        
        if (index <= currentTweetIndex) {
          threadTweets.push({
            author: author,
            text: tweetText,
            order: index
          });
        }
      }
    });

    // Sort by order to ensure chronological sequence
    threadTweets.sort((a, b) => a.order - b.order);
    
    return threadTweets;
  }

  // Format thread context for AI
  function formatThreadContext(threadTweets, currentTweetText) {
    if (!threadTweets || threadTweets.length <= 1) {
      return null;
    }

    let context = "CONVERSATION THREAD:\n\n";
    
    threadTweets.forEach((tweet, index) => {
      const isCurrentTweet = tweet.text === currentTweetText;
      const marker = isCurrentTweet ? "[CURRENT TWEET]" : `[TWEET ${index + 1}]`;
      context += `${marker} ${tweet.author}: ${tweet.text}\n\n`;
    });

    return context.trim();
  }

  // Handle explain button click
  function handleExplainClick(event, tweetText) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.target;
    const originalText = button.textContent;

    // Show loading state
    button.textContent = "Explaining...";
    button.disabled = true;

    // Send message to background script to get explanation
    chrome.runtime.sendMessage(
      {
        action: "explainTweet",
        tweetText: tweetText,
      },
      (response) => {
        // Reset button state
        button.textContent = originalText;
        button.disabled = false;

        if (response && response.success) {
          showExplanation(tweetText, response.explanation);
        } else {
          alert("Error: " + (response?.error || "Failed to explain tweet"));
        }
      }
    );
  }

  // Handle reply button click
  function handleReplyClick(event, tweetText, tweetElement) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.target;
    const originalText = button.textContent;

    // Show loading state
    button.textContent = "Getting replies...";
    button.disabled = true;

    // Collect thread context if available
    let threadContext = null;
    let hasThreadContext = false;
    
    if (isPartOfThread(tweetElement)) {
      const threadTweets = getThreadContext(tweetElement);
      threadContext = formatThreadContext(threadTweets, tweetText);
      hasThreadContext = threadContext !== null;
    }

    // Send message to background script to get reply suggestions
    chrome.runtime.sendMessage(
      {
        action: "suggestReply",
        tweetText: tweetText,
        threadContext: threadContext,
        hasThreadContext: hasThreadContext,
      },
      (response) => {
        // Reset button state
        button.textContent = originalText;
        button.disabled = false;

        if (response && response.success) {
          showReplySuggestions(tweetText, response.suggestions, hasThreadContext);
        } else {
          alert("Error: " + (response?.error || "Failed to generate reply suggestions"));
        }
      }
    );
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Parse JSON explanation from AI response
  function parseExplanation(explanation) {
    try {
      // Try to parse as JSON
      const data = JSON.parse(explanation);

      // Build formatted HTML from JSON structure
      let html = "";

      if (data.summary && data.summary.trim()) {
        html += `
          <div class="explanation-section summary">
            <h4>📝 Summary</h4>
            <p>${escapeHtml(data.summary.trim())}</p>
          </div>
        `;
      }

      if (data.paraphrase && data.paraphrase.trim()) {
        html += `
          <div class="explanation-section paraphrase">
            <h4>💬 In Simple English</h4>
            <p>${escapeHtml(data.paraphrase.trim())}</p>
          </div>
        `;
      }

      if (data.slang && Array.isArray(data.slang) && data.slang.length > 0) {
        const slangList = data.slang
          .map(
            (item) =>
              `<li><strong>${escapeHtml(item.term)}:</strong> ${escapeHtml(
                item.definition
              )}</li>`
          )
          .join("");
        html += `
          <div class="explanation-section slang">
            <h4>🔤 Slang & Hard Words</h4>
            <ul>${slangList}</ul>
          </div>
        `;
      }

      if (data.context && data.context.trim()) {
        html += `
          <div class="explanation-section context">
            <h4>ℹ️ Extra Context</h4>
            <p>${escapeHtml(data.context.trim())}</p>
          </div>
        `;
      }

      // Return formatted HTML if we have content
      if (html) {
        return html;
      }
    } catch (error) {
      console.warn(
        "Failed to parse JSON explanation, falling back to text:",
        error
      );
    }

    // Fallback for non-JSON responses or parsing errors
    return `
      <div class="explanation-section paraphrase">
        <h4>💬 Simplified</h4>
        <p>${escapeHtml(explanation)}</p>
      </div>
    `;
  }

  // Show explanation in modal
  function showExplanation(originalText, explanation) {
    // Remove existing modal if any
    const existingModal = document.getElementById("explain-tweet-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Parse structured explanation
    const formattedExplanation = parseExplanation(explanation);

    // Create modal
    const modal = document.createElement("div");
    modal.id = "explain-tweet-modal";
    modal.className = "explain-tweet-modal";

    modal.innerHTML = `
      <div class="explain-tweet-modal-content">
        <div class="explain-tweet-modal-header">
          <h3>Tweet Explanation</h3>
          <button class="explain-tweet-modal-close">&times;</button>
        </div>
        <div class="explain-tweet-modal-body">
          <div class="original-tweet">
            <h4>Original Tweet:</h4>
            <p>${escapeHtml(originalText)}</p>
          </div>
          ${formattedExplanation}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal handlers
    const closeBtn = modal.querySelector(".explain-tweet-modal-close");

    closeBtn.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    // Close on escape key
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        modal.remove();
        document.removeEventListener("keydown", escHandler);
      }
    });
  }

  // Copy text to clipboard
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      // Show temporary feedback
      const toast = document.createElement("div");
      toast.className = "copy-toast";
      toast.textContent = "Copied to clipboard!";
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard');
    });
  }

  // Parse reply suggestions from AI response
  function parseReplySuggestions(suggestions) {
    try {
      const data = JSON.parse(suggestions);
      let html = "";

      if (data.thoughtful && data.thoughtful.trim()) {
        html += `
          <div class="reply-suggestion">
            <h4>💡 Thoughtful Response</h4>
            <p class="reply-text">${escapeHtml(data.thoughtful.trim())}</p>
            <button class="copy-reply-btn" data-reply="${escapeHtml(data.thoughtful.trim())}">Copy</button>
          </div>
        `;
      }

      if (data.question && data.question.trim()) {
        html += `
          <div class="reply-suggestion">
            <h4>❓ Engaging Question</h4>
            <p class="reply-text">${escapeHtml(data.question.trim())}</p>
            <button class="copy-reply-btn" data-reply="${escapeHtml(data.question.trim())}">Copy</button>
          </div>
        `;
      }

      if (data.supportive && data.supportive.trim()) {
        html += `
          <div class="reply-suggestion">
            <h4>👍 Supportive Response</h4>
            <p class="reply-text">${escapeHtml(data.supportive.trim())}</p>
            <button class="copy-reply-btn" data-reply="${escapeHtml(data.supportive.trim())}">Copy</button>
          </div>
        `;
      }

      return html;
    } catch (error) {
      console.warn("Failed to parse reply suggestions JSON:", error);
      return `
        <div class="reply-suggestion">
          <h4>💬 Suggested Reply</h4>
          <p class="reply-text">${escapeHtml(suggestions)}</p>
          <button class="copy-reply-btn" data-reply="${escapeHtml(suggestions)}">Copy</button>
        </div>
      `;
    }
  }

  // Show reply suggestions in modal
  function showReplySuggestions(originalText, suggestions, hasThreadContext = false) {
    // Remove existing modal if any
    const existingModal = document.getElementById("reply-suggestions-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Parse reply suggestions
    const formattedSuggestions = parseReplySuggestions(suggestions);

    // Add thread context indicator
    const threadIndicator = hasThreadContext 
      ? '<div class="thread-context-indicator">🧵 Thread context analyzed for better replies</div>'
      : '';

    // Create modal
    const modal = document.createElement("div");
    modal.id = "reply-suggestions-modal";
    modal.className = "explain-tweet-modal";

    modal.innerHTML = `
      <div class="explain-tweet-modal-content">
        <div class="explain-tweet-modal-header">
          <h3>Reply Suggestions</h3>
          <button class="explain-tweet-modal-close">&times;</button>
        </div>
        <div class="explain-tweet-modal-body">
          ${threadIndicator}
          <div class="original-tweet">
            <h4>Original Tweet:</h4>
            <p>${escapeHtml(originalText)}</p>
          </div>
          <div class="reply-suggestions-container">
            ${formattedSuggestions}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add copy button event listeners
    const copyButtons = modal.querySelectorAll(".copy-reply-btn");
    copyButtons.forEach(button => {
      button.addEventListener("click", () => {
        const replyText = button.getAttribute("data-reply");
        copyToClipboard(replyText);
      });
    });

    // Close modal handlers
    const closeBtn = modal.querySelector(".explain-tweet-modal-close");

    closeBtn.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    // Close on escape key
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        modal.remove();
        document.removeEventListener("keydown", escHandler);
      }
    });
  }

  // Add explain and reply buttons to tweet
  function addButtonsToTweet(tweetElement) {
    // Check if buttons already exist
    if (tweetElement.querySelector(".explain-tweet-btn") || tweetElement.querySelector(".reply-tweet-btn")) {
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

    // Create explain button
    const explainBtn = createExplainButton();
    explainBtn.addEventListener("click", (e) =>
      handleExplainClick(e, tweetText)
    );

    // Create reply button
    const replyBtn = createReplyButton();
    replyBtn.addEventListener("click", (e) =>
      handleReplyClick(e, tweetText, tweetElement)
    );

    // Add buttons to action buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "tweet-extension-btns-container";
    buttonContainer.appendChild(explainBtn);
    buttonContainer.appendChild(replyBtn);

    actionButtons.appendChild(buttonContainer);
  }

  // Find and process tweets
  function processTweets() {
    // X.com tweet selectors
    const tweetSelectors = [
      '[data-testid="tweet"]',
      'article[data-testid="tweet"]',
    ];

    for (const selector of tweetSelectors) {
      const tweets = document.querySelectorAll(selector);
      tweets.forEach(addButtonsToTweet);
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
      subtree: true,
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  // Also try after a short delay in case of dynamic loading
  setTimeout(initialize, 1000);
})();
