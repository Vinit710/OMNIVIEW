Here's an updated `README.md` for your **OMNIVIEW** project that guides others through setting up and running both the frontend (Electron) and backend (Python Flask/FastAPI/etc.):

---

```markdown
# OMNIVIEW

**AI-Powered Satellite Image Analysis Software**  
Built with Electron (Frontend) + Python (Backend) for real-time geospatial intelligence and image analysis.

---

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

````

---

## ⚙️ Prerequisites

- **Node.js** (v16+ recommended)
- **Python 3.7+**
- **pip** (Python package manager)
- **Git** (optional)
- **Docker** (optional for containerized setup)

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/omniview.git
cd omniview
````

---

### 2. Set Up the Backend (Python)

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


