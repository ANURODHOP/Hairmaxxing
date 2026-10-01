import { useState, useEffect } from "react";
import { api } from "../services/api";

export function useSubscription() {
  const [subscription, setSubscription] = useState({
    isSubscribed: false,
    planName: null,
    status: "none",
    loading: true,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  });

  const checkSubscription = async () => {
    try {
      const result = await api.getUserStatus();
      setSubscription({
        isSubscribed: result.isSubscribed || false,
        planName: result.planName || null,
        status: result.isSubscribed ? "active" : "none",
        loading: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      });
    } catch (error) {
      console.error("Check sub error:", error);
      setSubscription((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  return { subscription, refetch: checkSubscription };
}