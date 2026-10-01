# HairMaxxing 💇‍♂️

**HairMaxxing** is an AI-powered mobile application built with **React Native and Expo** that allows users to capture hair photos, analyze their hair condition using AI, track their progress, and explore personalized hair-care insights.


---

## 📱 About the App

HairMaxxing provides a mobile-first experience for users who want to analyze and monitor their hair condition.

The application includes:

* 📸 Hair photo capture and assessment
* 🧑‍🦱 Multiple hair-photo angles for analysis
* 🤖 AI-powered hair analysis
* 📊 Hair progress and analytics
* 👤 User authentication
* ☁️ Firebase / Firestore data storage
* 💳 Demo subscription and payment flow
* 🔄 Subscription restoration
* 📱 Android support through Expo
* 🖥️ Local Node.js backend for AI/API operations

> **Note:** This repository is a project/demo implementation. Payments are simulated and no real money is charged.

---

# 🛠️ Technology Stack

### Mobile Application

* **React Native**
* **Expo**
* **Expo Router**
* JavaScript / TypeScript
* Firebase Authentication
* Firestore

### Backend

* **Node.js**
* **Express.js**
* Firebase Admin SDK
* Google Gemini API
* REST API

### Development

* Android Studio
* Android Emulator
* Expo CLI
* Git / GitHub

---

# 🏗️ Project Architecture

```text
HairMaxxing/
│
├── myApp/                 # React Native / Expo mobile application
│   ├── app/               # Expo Router screens/routes
│   ├── src/               # Components, services and application logic
│   ├── assets/            # Images and application assets
│   ├── package.json
│   └── ...
│
├── backend/               # Node.js / Express backend
│   ├── src/
│   ├── package.json
│   ├── .env.example
│   └── ...
│
├── .gitignore
└── README.md
```

The mobile application communicates with the local Express backend for operations such as AI analysis, user data operations, progress updates, and demo subscription management.

```text
┌─────────────────────┐
│   React Native App  │
│       (Expo)        │
└──────────┬──────────┘
           │ REST API
           ▼
┌─────────────────────┐
│   Node.js / Express │
│      Backend        │
└───────┬───────┬─────┘
        │       │
        ▼       ▼
   Firebase    Gemini
   / Firestore   API
```

---

# 🚀 Getting Started

## Prerequisites

Before running HairMaxxing, install:

* [Node.js](https://nodejs.org/)
* [Git](https://git-scm.com/)
* [Android Studio](https://developer.android.com/studio) — required if you want to use an Android Emulator
* An Android device or Android Emulator
* Expo-compatible development environment

You can verify Node.js:

```bash
node --version
npm --version
```

---

# 🔐 Environment Variables

The backend requires environment variables for Firebase Admin and Gemini.

Inside the `backend` directory, copy:

```text
.env.example
```

to:

```text
.env
```

For example:

```bash
cd backend
```

Then create the `.env` file.

### `.env.example`

```env
PORT=5000

# Google Gemini
GEMINI_API_KEY=

# Firebase Admin SDK
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Fill these values with your own credentials.

### Important Security Notice

**Never commit your `.env` file to GitHub.**

The following should remain private:

```text
backend/.env
Firebase service-account credentials
Firebase private keys
Gemini API keys
Access tokens
Passwords
```

Only the following should be committed:

```text
backend/.env.example
```

The `.env.example` file intentionally contains empty placeholders so other developers know which variables are required.

---

# 🔥 Firebase Setup

HairMaxxing uses Firebase for authentication and Firestore data.

Create or open your Firebase project and configure:

### Firebase Authentication

Enable the authentication providers required by the application.

### Firestore

Create a Firestore database for development/testing.

### Firebase Admin SDK

For the local Express backend, generate a Firebase Admin SDK service-account key from:

```text
Firebase Console
→ Project Settings
→ Service Accounts
→ Firebase Admin SDK
→ Generate New Private Key
```

Use the appropriate values from the downloaded credentials to configure your local `.env`.

**Do not upload the service-account JSON file to GitHub.**

---

# 🤖 Gemini API Setup

HairMaxxing uses Google's Gemini API for AI-powered hair analysis.

Create a Gemini API key through Google AI Studio and add it to:

```env
GEMINI_API_KEY=your_key_here
```

The Gemini API key is used by the **backend**, not directly by the mobile application.

This prevents the API key from being bundled into the React Native application.

---

# ▶️ Running the Backend

Open a terminal:

```bash
cd backend
npm install
```

Create your `.env` file from `.env.example`.

Then start the development server:

```bash
npm run dev
```

The backend should start on:

```text
http://localhost:5000
```

You can verify that the server is running using the health endpoint if one is available in the current implementation.

---

# 📱 Running the React Native App

Open another terminal:

```bash
cd myApp
npm install
```

Then start Expo:

```bash
npx expo start
```

Expo will display the development server and available launch options.

---

# 🤖 Running HairMaxxing on Android Studio

HairMaxxing can be run using an Android Emulator through Android Studio.

## 1. Install Android Studio

Download and install Android Studio:

https://developer.android.com/studio

During installation, make sure the Android SDK and Android Emulator components are installed.

---

## 2. Create an Android Virtual Device

Open Android Studio.

Go to:

```text
More Actions
→ Virtual Device Manager
```

Create a new virtual device.

For example:

```text
Pixel 7
```

Choose an Android system image and download it if necessary.

Start the emulator.

---

## 3. Start the HairMaxxing Backend

In one terminal:

```bash
cd backend
npm install
npm run dev
```

Keep this terminal running.

---

## 4. Start Expo

Open another terminal:

```bash
cd myApp
npx expo start
```

---

## 5. Open the App in the Android Emulator

With the Android Emulator running, use the Expo terminal and press:

```text
a
```

Expo will attempt to open HairMaxxing inside the Android emulator.

Alternatively, you can use the Expo development interface to launch the Android application.

---

# ⚠️ Android Emulator Networking

When the React Native application communicates with a backend running on your computer, remember that:

```text
localhost
```

inside the Android emulator refers to the **emulator itself**, not your computer.

For Android Emulator development, the host machine is normally accessible through:

```text
10.0.2.2
```

Therefore, if the application needs to directly access the local Express server from an Android Emulator, the API base URL may need to use:

```text
http://10.0.2.2:5000
```

instead of:

```text
http://localhost:5000
```

The exact API configuration should follow the value used by the current application.

---

# 📸 Hair Assessment Flow

The main application flow allows users to:

1. Sign in
2. Start a hair assessment
3. Complete the assessment questionnaire
4. Capture the required hair photographs
5. Submit the assessment
6. Send the assessment to the backend
7. Process the images using Gemini
8. Display the resulting analysis
9. Track progress over time

The application is designed around a mobile-first photo-based experience.

---

# 💳 Demo Subscription

This project does **not** process real payments.

Instead, HairMaxxing includes a simulated checkout flow for demonstration purposes.

The demo flow allows you to:

```text
Choose Plan
      ↓
Demo Checkout
      ↓
Demo Payment
      ↓
Premium Access
```

No credit card or real payment transaction is processed.

The simulated subscription state is stored for the authenticated user so the premium state can persist between sessions.

---

# 🧪 Development Mode

This repository is intended to be easy to run locally.

The project uses:

```text
React Native / Expo
        ↓
Local Express Backend
        ↓
Firebase / Firestore
        ↓
Gemini API
```

This means the project does not require Firebase Cloud Functions or a production payment provider for the demo implementation.

---

# 🔒 Security

Before pushing changes to GitHub, make sure sensitive files are excluded.

Never commit:

```text
.env
*.pem
service-account.json
firebase-adminsdk-*.json
private keys
API keys
access tokens
```

Use:

```text
.env.example
```

to document required configuration without exposing secrets.

---

# 🧹 Production vs Demo

This repository currently focuses on **development and demonstration** rather than production deployment.

### Demo implementation

* Local Express backend
* Firebase Authentication
* Firestore
* Gemini API
* Simulated payments
* No real payment processing
* No Firebase Cloud Functions requirement

For a production deployment, the architecture could later be extended with:

* Production backend hosting
* Secure secret management
* Production payment provider
* Cloud storage/CDN
* Monitoring and logging
* Rate limiting
* Production database/security rules
* Automated CI/CD

---

# 🗂️ Useful Commands

### Install frontend dependencies

```bash
cd myApp
npm install
```

### Start Expo

```bash
npx expo start
```

### Open Android

```text
Press `a` in the Expo terminal
```

### Install backend dependencies

```bash
cd backend
npm install
```

### Start backend

```bash
npm run dev
```

---

# 🐛 Troubleshooting

### Expo cannot connect to the backend

Make sure the backend is running:

```bash
cd backend
npm run dev
```

If using an Android Emulator, check whether the API URL needs:

```text
10.0.2.2:5000
```

instead of:

```text
localhost:5000
```

### Gemini analysis fails

Check that:

```env
GEMINI_API_KEY=...
```

is correctly configured in:

```text
backend/.env
```

and restart the backend after changing environment variables.

### Firebase authentication fails

Check:

* Firebase project configuration
* Authentication providers
* Firebase Admin credentials
* Firestore configuration
* `.env` values

Never paste private Firebase credentials into source code.

---

# 📌 Project Status

**HairMaxxing is currently a functional development/demo project.**

The goal of this repository is to demonstrate a complete mobile application workflow involving:

* React Native
* Expo
* Authentication
* Firebase
* Firestore
* Node.js
* Express
* AI integration
* Image-based analysis
* Subscription UI
* REST APIs
* Android development

---

# 👨‍💻 Author

**Anurodh Prasai**

GitHub:
https://github.com/ANURODHOP/

---

## ⭐ Future Improvements

Possible future improvements include:

* More advanced hair analysis
* Improved AI recommendations
* Historical hair-image comparison
* Better progress visualization
* More detailed analytics
* Production payment integration
* Cloud-hosted backend
* Automated testing
* Push notifications
* Improved Android and iOS production builds

---
