# Ramsey Solutions Chrome Extension Prototype

A Chrome extension for quick access to Ramsey Solutions apps and services with AI-powered search functionality.

## Features

- **App Switcher**: Quick access to Ramsey Solutions tools (EveryDollar, Financial Peace University, SmartTax)
- **AI Chat Assistant**: Get personalized financial advice aligned with Ramsey principles
- **Intelligent Web Search**: Automatically searches trusted Ramsey resources using OpenAI function calling
- **Conversation History**: Save and review past conversations
- **Page Context Awareness**: Get advice based on the current webpage you're viewing

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" by toggling the switch in the top right corner
3. Click "Load unpacked" and select this folder

## Configuration

### Required API Keys

1. **OpenAI API Key** (Required for AI chat):
   - Get an API key from [OpenAI's platform](https://platform.openai.com/api-keys)
   - Store it in the extension's storage via the popup interface

2. **Google Custom Search API** (Optional for enhanced search):
   - Create a project in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Custom Search API
   - Create an API key and Custom Search Engine ID
   - Configure to search only trusted Ramsey domains

### Search Configuration

The extension searches these trusted domains:
- `ramseysolutions.com`
- `labs.ramseysolutions.com/rp1/community`
- YouTube (for Ramsey content)

If Google Custom Search API is not configured, the extension falls back to curated sample results.

## How to Use

1. **Open the Extension**: Click the extension icon in Chrome toolbar
2. **Chat Interface**: Ask financial questions and get Ramsey-aligned advice
3. **Automatic Search**: The AI will automatically search for relevant resources when helpful
4. **View History**: Click the history button to see past conversations
5. **Page Context**: The assistant can reference content from the current webpage

### Example Queries

- "How do I start an emergency fund?"
- "What's the debt snowball method?"
- "Help me create a budget"
- "What are the 7 Baby Steps?"

## Project Structure

- `manifest.json`: Chrome extension configuration with Manifest V3
- `popup.html`: Sidebar HTML content
- `popup.js`: Main JavaScript with OpenAI integration and search functionality
- `style.css`: Comprehensive styling with responsive design
- `content.js`: Content script for page context extraction
- `background.js`: Service worker for extension lifecycle
- `images/`: Extension icons and app switcher assets
- `test-search.html`: Test page for search functionality