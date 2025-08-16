




# OMNIVIEW

**AI-Powered Satellite Image Analysis Software**  
Built with Electron (Frontend) + Python (Backend) for real-time geospatial intelligence and image analysis.


## 🧩 Project Structure

```

omniview/
├── backend/         # Python-based API for ML models, image processing
│   ├── app.py
│   ├── requirements.txt
│   └── ...
├── frontend/        # Electron-based UI
│   ├── main.js
│   ├── package.json
│   └── ...
└── README.md

```
## ⚙️ Prerequisites

- **Node.js** (v16+ recommended)
- **Python 3.7+**
- **pip** (Python package manager)
- **Git** (optional)
- **Docker** (optional for containerized setup)



## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/omniview.git
cd omniview
```



## 2. Set Up the Backend (Python)

```bash
cd backend
#if want a virtual environment
    python -m venv venv         # Create virtual environment
    source venv/bin/activate    # On Windows: venv\Scripts\activate

# Intall all Python dependencies
pip install -r requirements.txt

# Run backend server
python app.py
```

> 🔁 Make sure `app.py` runs on `localhost:5000` (or configure in `.env` if using one).

---

### 3. Set Up the Frontend (Electron)

```bash
cd ../frontend
npm install      # Install Electron and other dependencies
npm start        # Launch Electron app
```

> This will open the OMNIVIEW UI and communicate with the backend at `localhost:5000`.

---

## 🐳 Optional: Run with Docker

To run the backend inside Docker:

```bash
cd backend
docker build -t omniview-backend .
docker run -p 5000:5000 omniview-backend
```

> You can also dockerize the entire app using Docker Compose if needed.

---

## 📝 Notes

* Ensure the backend is running before launching the frontend.
* Modify API base URLs in `main.js` or config files if needed.
* For packaging Electron:
  Use tools like `electron-builder` or `electron-forge`:

  ```bash
  npm install --save-dev electron-builder
  npx electron-builder
  ```

---


# Complete Guide: Free AI API Keys Setup 🚀

## 1. 🤗 Hugging Face API Key (100% FREE)

Hugging Face API keys are free to obtain and provide access to thousands of AI models.

### Step-by-Step:

1. **Go to Hugging Face Website**
   - Visit: [https://huggingface.co](https://huggingface.co)

2. **Create Account**
   - Click "Sign Up" (top right)
   - Enter email, create password
   - Verify email address

3. **Generate API Key**
   - After login, click your profile picture (top right)
   - Go to **"Settings"** → **"Access Tokens"**
   - Click **"New token"**
   - Name it: `disaster-response-api`
   - Role: Select **"Read"** (free tier)
   - Click **"Generate a token"**
   - **COPY AND SAVE THIS TOKEN** (you won't see it again!)

### Free Tier Limits:
- ✅ 1,000+ free models
- ✅ Rate limited but generous for testing
- ✅ Image analysis models included
- ✅ Text generation models included

---

## 2. 🧠 Google Gemini API Key (FREE TIER)

Google offers generous free tier for Gemini API.

### Step-by-Step:

1. **Go to Google AI Studio**
   - Visit: [https://aistudio.google.com](https://aistudio.google.com)

2. **Sign In**
   - Use your Google account
   - If you don't have one, create it first

3. **Create API Key**
   - Click **"Get API key"** in the top menu
   - Click **"Create API key in new project"** (or select existing project)
   - **COPY AND SAVE THE KEY** immediately

4. **Enable the API**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Search for "Generative AI API"
   - Click "Enable" if not already enabled

### Free Tier Limits:
- ✅ 15 requests per minute
- ✅ 1,500 requests per day
- ✅ 1 million tokens per month
- ✅ More than enough for your disaster response system

---

## 3. 🆓 OpenAI API Alternatives (FREE OPTIONS)



### Option B: DeepSeek API (COMPLETELY FREE)

1. **Visit DeepSeek**
   - Go to: [https://platform.deepseek.com](https://platform.deepseek.com)

2. **Register Account**
   - Sign up with email
   - Complete verification

3. **Generate API Key**
   - Go to API Keys section
   - Create new key
   - Copy and save

### Option C: Groq (FREE & FAST)

1. **Visit Groq**
   - Go to: [https://console.groq.com](https://console.groq.com)

2. **Create Account**
   - Sign up with email or GitHub

3. **Get API Key**
   - Go to "API Keys" section
   - Create new key
   - Copy the key

### Free Tier Details:
- ✅ DeepSeek: Completely free with rate limits
- ✅ Groq: Very fast inference, free tier available
- ✅ OpenRouter: Free credits for various models

---


### Free Alternatives for Claude:



### Option B: Claude via Console (NEW USERS)
1. **Visit Anthropic Console**
   - Go to: [https://console.anthropic.com](https://console.anthropic.com)

2. **Sign Up**
   - Create account
   - **New users often get $5 free credits**

3. **Generate API Key**
   - Go to "API Keys" section
   - Create new key
   - Copy and save

### Option C: Use Alternative Models
Since Claude is mostly paid, use these **free alternatives** that work similarly:

```bash
# Instead of ANTHROPIC_API_KEY, use:
DEEPSEEK_API_KEY=your_deepseek_key_here
GROQ_API_KEY=your_groq_key_here

```

---

## 5. 📊 Google Custom Search API (FREE TIER)

For your news and image search functionality:

### Step-by-Step:

1. **Google Cloud Console**
   - Go to: [https://console.cloud.google.com](https://console.cloud.google.com)

2. **Enable APIs**
   - Search for "Custom Search API"
   - Click "Enable"

3. **Create API Key**
   - Go to "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the key

4. **Create Custom Search Engine**
   - Go to: [https://cse.google.com/cse](https://cse.google.com/cse)
   - Click "Add"
   - Sites to search: `*` (for all sites)
   - Create and get your **Search Engine ID**

### Free Limits:
- ✅ 100 searches per day (free)
- ✅ Perfect for your disaster response system

---



**Next Step**: Copy all your API keys to the `.env` file and run your backend!