# Ramsey Solutions Chrome Extension Prototype

A Chrome extension for quick access to Ramsey Solutions apps and services.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" by toggling the switch in the top right corner
3. Click "Load unpacked" and select this folder

## Development Setup

1. Clone this repository
2. Create a `.env` file in the root directory:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
3. Replace `your_api_key_here` with your OpenAI API key
   - You can get an API key from [OpenAI's platform](https://platform.openai.com/api-keys)
   - Keep this key secure and never commit it to the repository
4. The extension will automatically load the API key from the .env file

Note: The `.env` file is gitignored to keep the API key secure.

## How to Use

Click on the extension icon in the Chrome toolbar to open the Ramsey Solutions sidebar.
- Click on any app icon to navigate to that Ramsey Solutions product
- Use the input field to share feedback or ask questions
- Submit with the button or by pressing Ctrl+Enter/Cmd+Enter

## Project Structure

- `manifest.json`: Configuration for the Chrome extension
- `popup.html`: The HTML content of the sidebar
- `popup.js`: JavaScript for the sidebar functionality
- `style.css`: Styling for the sidebar
- `images/`: Contains icons for the extension