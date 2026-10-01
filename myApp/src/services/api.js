import { auth } from "../config/firebase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000";

async function fetchWithAuth(endpoint, options = {}) {
  const user = auth.currentUser;
  let token = "";
  if (user) {
    token = await user.getIdToken();
  }

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

export const api = {
  // User
  getUserStatus: () => fetchWithAuth("/api/user/status"),
  getAnalytics: () => fetchWithAuth("/api/user/analytics"),

  // Analysis
  analyzeHair: (data) => fetchWithAuth("/api/analysis/analyze-hair", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  // Progress
  updateDailyProgress: (data) => fetchWithAuth("/api/progress/update", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  // Photo
  uploadMilestonePhoto: (data) => fetchWithAuth("/api/photo/upload-milestone", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  // Subscription
  demoPurchase: (planId, transactionId) => fetchWithAuth("/api/subscription/demo-purchase", {
    method: "POST",
    body: JSON.stringify({ planId, transactionId }),
  }),
  restorePurchase: () => fetchWithAuth("/api/subscription/restore", {
    method: "POST",
  }),
};
