# Explain a Tweet - Browser Extension

A Chrome extension that simplifies complex tweets into clear, easy-to-understand English for non-native speakers and language learners.

## Features

- 🧠 **One-click explanations**: Add "Explain" buttons to every tweet
- 🔑 **Bring your own API**: Use your own OpenAI API key
- 🎨 **Clean interface**: Beautiful modal popups with original and simplified text
- 🌙 **Dark mode support**: Automatically adapts to your system preferences
- 📱 **Responsive design**: Works on all screen sizes

## Installation

### For Development/Testing

1. **Clone or download** this repository
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Get an OpenAI API key** from [OpenAI Platform](https://platform.openai.com/api-keys)
6. **Click the extension icon** in Chrome toolbar and enter your API key

### Setup

1. Click the extension icon in your Chrome toolbar
2. Enter your OpenAI API key (starts with `sk-`)
3. Click "Save Settings"
4. Visit [X.com](https://x.com)
5. Look for the purple "🧠 Explain" buttons on tweets

## How to Use

1. **Browse X.com/Twitter** normally
2. **Click "🧠 Explain"** on any tweet you want simplified
3. **Read the explanation** in the popup modal
4. **Close** by clicking the X, clicking outside, or pressing Escape

## What It Explains

- **Complex vocabulary**: Replaces difficult words with simpler alternatives
- **Internet slang**: Explains "fr", "no cap", "based", etc.
- **Abbreviations**: Clarifies shortened words and phrases
- **Cultural references**: Provides context for memes and trending topics
- **Grammar**: Simplifies complex sentence structures
- **Tone**: Explains if something is sarcasm, humor, or serious

## Example

**Original Tweet**: "That new AI model is absolutely fire 🔥 no cap, it's giving main character energy fr fr"

**Simplified**: "The new AI model is really excellent and impressive. I'm being completely honest - it has the confidence and presence of someone who is the most important person in a situation."

## Privacy & Security

- Your API key is stored locally in your browser only
- Tweet text is sent to OpenAI for processing (per their privacy policy)
- No data is collected or stored by this extension
- You control your API usage and costs

## API Costs

- Uses OpenAI gpt-5-nano model (very low cost)
- You only pay for what you use through your OpenAI account

## Files Structure

```
explain-a-tweet/
├── manifest.json      # Extension configuration
├── popup.html         # Settings popup interface
├── popup.js          # Settings popup logic
├── content.js        # Injects explain buttons into X.com
├── background.js     # Handles OpenAI API calls
├── styles.css        # Styling for buttons and modal
└── README.md         # This file
```

## Development

This extension uses:
- **Manifest V3** (latest Chrome extension standard)
- **Vanilla JavaScript** (no frameworks)
- **OpenAI GPT-5-nano API** for explanations
- **Chrome Storage API** for settings persistence

## Troubleshooting

**Extension not working?**
- Make sure you're on x.com or twitter.com
- Check that your API key is saved correctly
- Refresh the page after installing/updating the extension

**No explain buttons showing?**
- Try refreshing the page
- Check browser console for errors (F12 → Console)
- Make sure Developer mode is enabled if testing locally

**API errors?**
- Verify your API key is correct and has credits
- Check your OpenAI account billing status
- Try again in a few seconds (rate limiting)

## Author

Created by [@cuongtvc](https://x.com/cuongtvc) 

## License

MIT License - Feel free to modify and distribute!

## Contributing

This is an MVP. Ideas for future improvements:
- Support for multiple AI providers (Claude, Gemini, etc.)
- Mobile browser support
- Caching to reduce API calls
- Different explanation levels (beginner/advanced)
- Support for other languages
- Batch explanations for multiple tweets