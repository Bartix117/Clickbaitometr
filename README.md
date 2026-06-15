# Clickbait & Manipulation Analyzer Extension

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![Chrome Extensions](https://img.shields.io/badge/chrome_extension-%234285F4.svg?style=for-the-badge&logo=googlechrome&logoColor=white) ![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white) ![Groq API](https://img.shields.io/badge/Llama_3.1-Groq_API-%23f55036.svg?style=for-the-badge)

A modern, secure browser extension built to detect clickbait and emotional manipulation in web articles. Featuring a lightweight Vanilla JS frontend with an advanced DOM scraping algorithm and a robust, serverless Vercel backend. The system leverages the Groq API (LLaMA 3.1) to deliver real-time manipulation scores, detailed objective analysis, and factual article summaries.

![App Screenshot 1]()

## ✨ Features

* **Smart DOM Scraping & Cleaning:** Features a custom heuristic algorithm and JSON-LD parser that extracts only the core article content. It automatically strips out ads, cookie banners, navigation menus, and footers to ensure the AI analyzes only relevant text and saves API tokens.
* **Serverless Proxy Architecture:** A Backend-for-Frontend (BFF) approach hosted on Vercel. The extension never exposes API keys on the client side, ensuring a 100% secure, production-ready environment.
* **AI-Powered Analysis:** Utilizes `llama-3.1-8b-instant` via the Groq API. The AI is strictly constrained via Prompt Engineering to output structured JSON data, preventing hallucinations and ensuring a consistent format (Score, Analysis, Summary).
* **Custom SVG Gauge Animation:** Includes a smooth, lightweight, mathematically calculated SVG gauge chart to visualize the manipulation score (0-100%), completely eliminating the need for heavy external charting libraries.
* **Local Data Caching:** Seamlessly integrates with `chrome.storage.local` to cache previous analyses. Returning to an already analyzed page loads the result instantly (0ms delay), heavily reducing unnecessary API calls and operational costs.

## 🛠️ Technologies Used

**Frontend (Extension)**
* **Vanilla JavaScript (ES6+)** - Core logic, DOM manipulation, and heuristic scraping.
* **HTML5 / CSS3** - Responsive and clean popup interface.
* **Chrome Extensions API** - For active tab scripting (`chrome.scripting`) and local caching (`chrome.storage`).

**Backend & AI**
* **Vercel Serverless Functions (Node.js)** - Secure proxy backend handling CORS and request validation.
* **Groq API** - Ultra-fast inference engine running the LLM.
* **Meta LLaMA 3.1 (8B)** - The AI model responsible for text analysis, configured for strict JSON object output.

## 📂 Project Structure

```text
├── api/                  # Serverless Backend (Vercel Node.js function)
│   └── analyze.js        # Proxy endpoint handling Groq API requests
├── .vercel/              # Vercel project configuration
├── manifest.json         # Chrome Extension manifest (V3)
├── popup.html            # Extension UI structure
├── popup.css             # Extension UI styling
├── popup.js              # Core frontend logic, UI updates, and DOM scraper
└── README.md             # You are here