# 🛡️ Spinguard: Ulterior Motives Detector

Spinguard is a Chrome extension that analyzes web pages for hidden agendas, bias, and commercial motives. It helps you identify manipulative content and make informed decisions about what you read online.

![Spinguard Screenshot](https://i.imgur.com/example.png) <!-- Placeholder -->

---

## ✨ Features

- **Side Panel UI**: A spacious, pinned sidebar for a comfortable analysis experience.
- **On-Demand Analysis**: Scans the current page only when you click the button, preserving your privacy.
- **AI-Powered Insights**: Uses an LLM to generate a structured report on:
    - **AI Summary**: A concise overview of the key findings.
    - **Risk Scores**: Rates bias, manipulation, commercial intent, and credibility on a 0-100 scale.
    - **Key Claims**: Extracts the main factual claims made on the page.
    - **Warning Signs**: Identifies rhetorical tactics, red flags, and potential conflicts of interest.
    - **Reader Recommendation**: Provides actionable advice based on the analysis.
- **Content Extraction**: Gathers the page title, author, and a text excerpt for analysis.

---

## 🚀 How It Works

1.  **Click the Icon**: Click the Spinguard extension icon in your Chrome toolbar.
2.  **Open Side Panel**: The extension opens in a side panel pinned to your browser window.
3.  **Analyze Page**: Click the "Analyze Current Page" button.
4.  **Get Results**: The extension sends the page content to an AI for analysis and displays a detailed report in the side panel.

---

## 🛠️ Tech Stack

- **Framework**: [Vite](https://vitejs.dev/) with TypeScript
- **Chrome Extension Plugin**: [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- **API**: [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/) APIs (`sidePanel`, `scripting`, `action`)

---

## ⚙️ Setup & Installation

To run this extension locally, follow these steps:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd spinguard-extension
```

### 2. Install Dependencies

```bash
pnpm install
# or npm install or yarn install
```

### 3. Configure API Key

The extension uses the [OpenRouter API](https://openrouter.ai) to make AI calls, specifically using the **`openai/gpt-4o`** model. You need to provide your own API key.

1.  Create a `config.ts` file in the `src/` directory.
2.  Add the following content to `src/config.ts`:

```typescript
// src/config.ts
export const config = {
    OPENROUTER_API_KEY: 'your-openrouter-api-key-here',
    OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
    MODEL: 'openai/chatgpt-4o-latest',
    MAX_TOKENS: 2048,
};
```

**Note**: Your API key is stored locally and is only used to communicate with the OpenRouter API.

### 4. Build the Extension

Run the build command to compile the extension files into the `dist/` directory.

```bash
npm run build
```

### 5. Load in Chrome

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** in the top right corner.
3.  Click **Load unpacked**.
4.  Select the `dist` folder from this project.

The Spinguard extension icon should now appear in your toolbar.

---

## 📁 Project Structure

```
.
├── dist/                  # Compiled extension files
├── docs/                  # Project documentation (PRD, Build Guide)
├── src/
│   ├── background.ts      # Handles API calls and side panel logic
│   ├── content.ts         # Injected into web pages to extract data
│   ├── sidepanel/         # Side panel UI and logic
│   │   ├── index.html
│   │   └── sidepanel.js
│   └── config.ts          # API key and model configuration (you create this)
├── manifest.json          # Core extension configuration
├── package.json
└── vite.config.ts         # Vite build configuration
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-repo/issues).

---

## 📄 License

This project is licensed under the MIT License. 