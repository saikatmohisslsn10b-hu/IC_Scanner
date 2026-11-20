# IC Scanner – Integrated Circuit Identification & Analysis

IC Scanner is a web-based IC chip identification, pinout analysis, testing diagnostics, and interactive learning tool powered by OpenRouter.

---

## Getting Started Locally

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/saikatmohisslsn10b-hu/IC_Scanner.git
cd IC_Scanner
npm install
```

### 3. OpenRouter API Key & Model Configuration
You can configure your OpenRouter credentials in either of two ways:

#### Option A: Direct Code Configuration in `src/config.js`
Open `src/config.js` and edit the following fields at the top of the file:
```javascript
// 1. Enter your OpenRouter API key:
export const OPENROUTER_API_KEY = 'YOUR_OPENROUTER_API_KEY_HERE';

// 2. Enter your verified OpenRouter model identifier (intended: Gemini 3.1 Flash):
export const OPENROUTER_MODEL = 'YOUR_OPENROUTER_MODEL_HERE';
```

#### Option B: Local Environment File (`.env` or `.env.local`)
Copy `.env.example` to `.env` or `.env.local` and add your credentials:
```env
VITE_OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY_HERE
VITE_OPENROUTER_MODEL=YOUR_OPENROUTER_MODEL_HERE
```
*(Note: `.env` and `.env.local` are automatically ignored by Git and will never be committed).*

#### Option C: In-App Configuration Gate
If not pre-configured in code or environment variables, the application will prompt you on startup to enter your API key and model identifier in the UI.

---

## 4. Running the Application
Start the local development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## CSV Token & API Usage Logging
Every successful API request made to OpenRouter is automatically recorded in a local CSV file:
- **File location:** `openrouter_usage_log.csv` (in the project root directory).
- **Recorded columns:**
  1. `Timestamp` – Readable date and time (`DD-MM-YYYY HH:mm:ss`)
  2. `Input_Tokens` – Actual prompt/input token count from OpenRouter
  3. `Output_Tokens` – Actual completion/output token count from OpenRouter
  4. `Total_Tokens` – Total token count (`Input_Tokens + Output_Tokens`)
- **Security:** The CSV file is strictly local, added to `.gitignore`, and is **never** uploaded to GitHub.
- **Resilience:** CSV logging errors are handled gracefully and will never crash or interrupt scanning.

---

## Building for Production
```bash
npm run build
npm run preview
```
