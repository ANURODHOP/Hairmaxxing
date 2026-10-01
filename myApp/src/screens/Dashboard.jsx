import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { auth } from "../config/firebase";
import { api } from "../services/api";

const PLAN_COLORS = {
  0: "#3B82F6", // Weekly - Blue
  1: "#8B5CF6", // Monthly - Purple
  2: "#10B981", // 3-Month - Green
};

const getPlanIndex = (title) => {
  if (title === "Weekly") return 0;
  if (title === "Monthly") return 1;
  if (title === "3 Months") return 2;
  return 1;
};

// Fallback plans — shown when RC returns 0 packages so UI is never blank/stuck
const FALLBACK_PLANS = [
  {
    identifier: "__weekly",
    title: "Weekly",
    price: "$6.00",
    period: "/week",
    pricePerMonth: "24.00",
    description: "Billed weekly",
    rawPackage: null,
  },
  {
    identifier: "__monthly",
    title: "Monthly",
    price: "$22.00",
    period: "/month",
    pricePerMonth: "22.00",
    description: "Billed monthly",
    rawPackage: null,
  },
  {
    identifier: "__3month",
    title: "3 Months",
    price: "$59.00",
    period: "/3 months",
    pricePerMonth: "19.67",
    description: "Billed every 3 months",
    rawPackage: null,
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("__monthly");
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(true);


  // ==========================================
  // GATEKEEPER: If already premium, skip paywall
  // ==========================================
  useEffect(() => {
    const checkAccess = async () => {
      if (!auth.currentUser) {
        setIsChecking(false);
        return;
      }
      try {
        const res = await api.getUserStatus();
        if (res.isSubscribed) {
          router.replace("/month");
          return;
        }
        setIsChecking(false);
      } catch (error) {
        console.warn("Dashboard check warning:", error?.message || error);
        setIsChecking(false);
      }
    };
    checkAccess();
  }, []);

  // ==========================================
  // LOAD DEMO PLANS
  // ==========================================
  useEffect(() => {
    setTimeout(() => {
      setPackages(FALLBACK_PLANS);
      setSelectedPackageId(FALLBACK_PLANS[1].identifier);
      setPackagesLoading(false);
    }, 500);
  }, []);

  // ==========================================
  // HANDLE PURCHASE
  // ==========================================
  const handleSubscribe = () => {
    const displayPlans = packages.length > 0 ? packages : FALLBACK_PLANS;
    const activeId = selectedPackageId || displayPlans[1]?.identifier;
    const selectedPkg = displayPlans.find((p) => p.identifier === activeId);

    // Route to demo checkout screen
    router.push({
      pathname: "/DemoCheckout",
      params: {
        planId: selectedPkg.identifier.replace("__", ""),
        price: selectedPkg.price,
        title: selectedPkg.title,
      }
    });
  };

  // ==========================================
  // HANDLE RESTORE PURCHASES
  // ==========================================
  const handleRestorePurchases = async () => {
    setLoading(true);
    try {
      const result = await api.restorePurchase();
      if (result.success && result.isPremium) {
        Alert.alert("Success!", "Your purchases have been restored.");
        router.replace("/month");
      } else if (result.success) {
        Alert.alert("No Purchases", "No previous purchases found to restore.");
      } else {
        Alert.alert("Error", result.message || "Failed to restore purchases.");
      }
    } catch (error) {
      console.error("Restore error:", error);
      Alert.alert("Error", "Could not restore purchases.");
    } finally {
      setLoading(false);
    }
  };

  // Loading screen while checking Firestore
  if (isChecking) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#8B5CF6" size="large" />
      </View>
    );
  }

  const displayPlans = packages.length > 0 ? packages : FALLBACK_PLANS;
  const effectiveSelectedId = selectedPackageId || displayPlans[1]?.identifier;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>HM</Text>
          </View>
          <Text style={styles.title}>HairMaxxing Pro</Text>
          <Text style={styles.subtitle}>
            Unlock AI-powered hair analysis with personalized maxxing plans
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {[
            "AI Hair Analysis (Front, Side, Top)",
            "Future Hair Predictions",
            "Progress Graph Tracking",
            "Personalized Maxxing Plan",
          ].map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Plan Selection */}
        <View style={styles.plansContainer}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>

          {packagesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#8B5CF6" size="large" />
              <Text style={styles.loadingText}>Loading plans...</Text>
            </View>
          ) : (
            displayPlans.map((pkg) => {
              const planIndex = getPlanIndex(pkg.title);
              const color = PLAN_COLORS[planIndex] || "#8B5CF6";
              const isPopular = pkg.title === "Monthly";
              const badgeText = pkg.title === "3 Months" ? "BEST VALUE" : null;
              const isSelected = effectiveSelectedId === pkg.identifier;

              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  activeOpacity={0.8}
                  onPress={() => setSelectedPackageId(pkg.identifier)}
                  style={[
                    styles.planCard,
                    isSelected && {
                      borderColor: color,
                      backgroundColor: `${color}15`,
                    },
                  ]}
                >
                  {isPopular && (
                    <View
                      style={[styles.popularBadge, { backgroundColor: color }]}
                    >
                      <Text style={styles.popularText}>MOST POPULAR</Text>
                    </View>
                  )}
                  {badgeText && (
                    <View
                      style={[styles.popularBadge, { backgroundColor: color }]}
                    >
                      <Text style={styles.popularText}>{badgeText}</Text>
                    </View>
                  )}

                  <View style={styles.planContent}>
                    <View>
                      <Text style={styles.planName}>{pkg.title}</Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.planPrice}>{pkg.price}</Text>
                        <Text style={styles.planInterval}>{pkg.period}</Text>
                      </View>
                      {pkg.pricePerMonth && (
                        <Text style={styles.pricePerMonth}>
                          ${pkg.pricePerMonth}/month
                        </Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && { borderColor: color },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.radioInner,
                            { backgroundColor: color },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubscribe}
          disabled={loading || packagesLoading}
          style={[
            styles.subscribeButton,
            (loading || packagesLoading) && styles.subscribeButtonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.subscribeText}>Unlock Premium →</Text>
          )}
        </TouchableOpacity>

        {/* Restore Purchases */}
        <TouchableOpacity
          onPress={handleRestorePurchases}
          disabled={loading || packagesLoading}
        >
          <Text style={styles.restoreText}>Restore purchases</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          Secure payments via App Store or Google Play. Cancel anytime.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#1a1a2e",
    borderWidth: 2,
    borderColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#888888",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  featuresContainer: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  featureCheck: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 12,
  },
  featureText: {
    color: "#CCCCCC",
    fontSize: 15,
  },
  errorBanner: {
    backgroundColor: "#1a0a00",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerTitle: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "600",
  },
  errorBannerDetail: {
    color: "#d97706",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  plansContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: "#888888",
    fontSize: 14,
    marginTop: 12,
  },
  planCard: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#1a1a1a",
    padding: 20,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  planCardFallback: {
    opacity: 0.75,
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  popularText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  planContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  planPrice: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "bold",
    marginRight: 6,
  },
  planInterval: {
    color: "#666666",
    fontSize: 14,
  },
  pricePerMonth: {
    color: "#888888",
    fontSize: 12,
    marginTop: 2,
  },
  fallbackNote: {
    color: "#f59e0b",
    fontSize: 11,
    marginTop: 2,
    fontStyle: "italic",
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  subscribeButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  subscribeText: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "bold",
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  restoreText: {
    color: "#8B5CF6",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  termsText: {
    color: "#555555",
    fontSize: 12,
    textAlign: "center",
  },
});
