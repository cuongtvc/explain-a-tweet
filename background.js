// Background script to handle OpenAI API calls

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "explainTweet") {
    handleExplainTweet(request.tweetText, sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleExplainTweet(tweetText, sendResponse) {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(["openaiApiKey"]);
    const apiKey = result.openaiApiKey;

    if (!apiKey) {
      sendResponse({
        success: false,
        error: "No OpenAI API key found. Please set it in the extension popup.",
      });
      return;
    }

    // Call OpenAI API
    const explanation = await callOpenAI(tweetText, apiKey);

    sendResponse({
      success: true,
      explanation: explanation,
    });
  } catch (error) {
    console.error("Error explaining tweet:", error);
    sendResponse({
      success: false,
      error: error.message || "Failed to explain tweet",
    });
  }
}

async function callOpenAI(tweetText, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: `You are "Explain-a-Tweet" an assistant who rewrites tweets in simple, clear English for people who are not fluent in the language.

When the user sends you a tweet, you must respond with valid JSON in exactly this format:

{
  "summary": "One-sentence summary – a very short description of what the tweet is about.",
  "paraphrase": "Plain-English paraphrase – restate the tweet in basic, easy words (CEFR A2–B1 level), no slang or idioms.",
  "slang": [
    {"term": "slang word or phrase", "definition": "brief explanation"},
    {"term": "another hard word", "definition": "simple definition"}
  ],
  "context": "Optional background information the reader might need to fully understand the tweet (e.g., who a person is, what event is being referenced, why something is funny)."
}

Content requirements:
• Keep sentences short and direct.
• Do not assume the reader knows U.S. pop-culture or internet memes unless you explain them.
• Avoid advanced vocabulary in your explanations.
• Include every slang term, idiom, cultural reference, or uncommon word from the tweet and give a brief definition for each.
• If no slang/hard words exist, use empty array: "slang": []
• If no extra context needed, use empty string: "context": ""
• Ensure all JSON values are properly escaped strings`,
        },
        {
          role: "user",
          content: tweetText,
        },
      ],
      temperature: 1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `API request failed: ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error("No explanation generated");
  }
  const result = data.choices[0].message.content.trim();
  return result;
}
