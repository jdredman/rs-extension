<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Chrome Extension: Ramsey Assistant

This project is a Chrome extension that provides a comprehensive AI-powered assistant for Ramsey Solutions users. The extension displays a side panel with multiple features including app switching, AI chat functionality, and personalized content recommendations.

## Key Features:
- **App Switcher**: Quick access to Ramsey Solutions apps (EveryDollar, Financial Peace, Smart Tax)
- **AI Chat Assistant**: OpenAI-powered conversational AI with financial guidance capabilities
- **Page Context Analysis**: Analyzes current web page content to provide contextual advice
- **Purchase Guidance**: Provides warnings and advice for potential purchases based on Ramsey principles
- **Video Recommendations**: Displays personalized Ramsey Solutions video content
- **Conversation History**: Saves and manages chat conversation history
- **Web Search Integration**: Searches trusted domains for relevant financial content

## Key Components:
- `manifest.json`: Chrome extension configuration with Manifest V3 compatibility
- `popup.html`: Side panel HTML structure with app switcher, chat interface, and video carousel
- `popup.js`: Main functionality including OpenAI integration, conversation management, and UI controls
- `style.css`: Comprehensive styling for the side panel interface
- `background.js`: Service worker handling tab context, environment configuration, and side panel management
- `content.js`: Content script for page analysis, context collection, and purchase detection
- `content-styles.css`: Styles for content script overlays and warnings
- `images/`: Extension icons and app switcher logos

## Technical Stack:
- Chrome Extension Manifest V3
- OpenAI API integration for AI chat functionality
- Chrome Storage API for data persistence
- Chrome Tabs API for context awareness
- Google Custom Search API for web search
- YouTube Data API for video recommendations

When suggesting code, focus on:
- Chrome Extension Manifest V3 compatibility
- Modern JavaScript practices (async/await, ES6+)
- Secure API key management through environment variables
- Ramsey Solutions financial principles integration
- Responsive UI design for the side panel
- Error handling and retry mechanisms for API calls
