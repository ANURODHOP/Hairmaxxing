import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../services/api';

const DemoCheckout = () => {
  const router = useRouter();
  const { planId, price, title } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('card');
  const [success, setSuccess] = useState(false);
  const [txId, setTxId] = useState('');

  const handlePay = async () => {
    setLoading(true);
    try {
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const generatedTxId = `HM-DEMO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      // Call our backend
      await api.demoPurchase(planId, generatedTxId);
      
      setTxId(generatedTxId);
      setSuccess(true);
    } catch (error) {
      Alert.alert("Payment Error", error.message || "Something went wrong in demo checkout.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.replace('/month');
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Payment Successful</Text>
          
          <View style={styles.receiptBox}>
            <Text style={styles.receiptLabel}>Demo Transaction</Text>
            <Text style={styles.receiptValue}>{txId}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.receiptLabel}>Plan</Text>
            <Text style={styles.receiptValue}>{title}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.receiptLabel}>Status</Text>
            <Text style={styles.receiptValueActive}>Active</Text>
          </View>
          
          <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
            <Text style={styles.primaryBtnTxt}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.title}>HairMaxxing</Text>
        <Text style={styles.subtitle}>Demo Checkout</Text>

        <View style={styles.summaryBox}>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planPrice}>{price}</Text>
        </View>

        <Text style={styles.sectionTitle}>Payment Method</Text>
        
        {['card', 'upi', 'wallet'].map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.methodRow, method === m && styles.methodRowActive]}
            onPress={() => setMethod(m)}
          >
            <View style={styles.radio}>
              {method === m && <View style={styles.radioActive} />}
            </View>
            <Text style={styles.methodTxt}>
              {m === 'card' ? 'Demo Card' : m === 'upi' ? 'Demo UPI' : 'Demo Wallet'}
            </Text>
          </TouchableOpacity>
        ))}

        {method === 'card' && (
          <View style={styles.cardDetailsBox}>
            <Text style={styles.cardLabel}>Card Number</Text>
            <Text style={styles.cardValue}>4242 4242 4242 4242</Text>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardLabel}>Expiry</Text>
                <Text style={styles.cardValue}>12/30</Text>
              </View>
              <View>
                <Text style={styles.cardLabel}>CVV</Text>
                <Text style={styles.cardValue}>123</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.warningBox}>
          <Text style={styles.warningTxt}>
            This is a simulated payment for demonstration purposes. No real money will be charged.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]} 
          onPress={handlePay}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryBtnTxt}>Pay {price}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingTop: 40, flex: 1 },
  headerRow: { marginBottom: 20 },
  backBtn: { color: '#888', fontSize: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 30 },
  
  summaryBox: { backgroundColor: '#111', padding: 20, borderRadius: 12, marginBottom: 30, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  planTitle: { color: '#fff', fontSize: 18, marginBottom: 8 },
  planPrice: { color: '#8B5CF6', fontSize: 24, fontWeight: 'bold' },
  
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  methodRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  methodRowActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#555', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  radioActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8B5CF6' },
  methodTxt: { color: '#fff', fontSize: 16 },
  
  cardDetailsBox: { padding: 16, backgroundColor: '#151515', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  cardLabel: { color: '#666', fontSize: 12, marginBottom: 4 },
  cardValue: { color: '#ddd', fontSize: 16, marginBottom: 12, fontFamily: 'monospace' },
  cardRow: { flexDirection: 'row', gap: 40 },
  
  warningBox: { marginTop: 'auto', marginBottom: 20, padding: 16, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  warningTxt: { color: '#f59e0b', textAlign: 'center', fontSize: 13, lineHeight: 20 },
  
  primaryBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnTxt: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  
  successIcon: { fontSize: 60, color: '#10B981', textAlign: 'center', marginBottom: 10, marginTop: 40 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 30 },
  receiptBox: { backgroundColor: '#111', padding: 20, borderRadius: 12, marginBottom: 40, borderWidth: 1, borderColor: '#222' },
  receiptLabel: { color: '#888', fontSize: 14, marginBottom: 4 },
  receiptValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  receiptValueActive: { color: '#10B981', fontSize: 16, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 16 },
});

export default DemoCheckout;
