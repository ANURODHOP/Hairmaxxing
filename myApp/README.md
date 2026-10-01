# HairMaxxing

HairMaxxing is an AI-powered hair analysis application. This project demonstrates a full-stack mobile application using React Native (Expo) for the frontend and a Node.js (Express) backend.

## Project Structure

- `/myApp`: The React Native / Expo frontend application.
- `/backend`: The Node.js / Express backend server handling AI integration and demo payments.

## Setup Instructions

### 1. Backend Setup

1. Open a terminal and navigate to the `backend` directory.
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Create a `.env` file based on `.env.example` and add your Gemini API key and Firebase Admin credentials.
4. Start the backend server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`.

### 2. Frontend Setup

1. Open a new terminal and navigate to the `myApp` directory.
2. Install dependencies:
   ```bash
   cd myApp
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```

## Demo Mode

This version of HairMaxxing is configured as a demo project:
- **Payments**: Uses a simulated demo checkout. No real charges are made.
- **Backend**: Uses a local Node.js server instead of Firebase Cloud Functions to avoid paid Firebase tiers.

## Note

Ensure both the backend and frontend are running simultaneously for the application to function correctly.
