import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

const TERMS = [
  { title: '1. Acceptance', body: 'By using HairMaxxing, you agree to these Terms. If you do not agree, you must not use the App. These Terms form a legally binding agreement between you and HairMaxxing.' },
  { title: '2. Subscriptions & Billing', body: 'Paid features auto-renew unless cancelled at least 24 hours before the billing period ends. Manage subscriptions through your app store account. Refunds are subject to the applicable store policy.' },
  { title: '3. User Data & Privacy', body: 'You retain ownership of all photos and data you upload. We process your images solely to provide the service and do not sell or share your personal data with third parties. Data is encrypted in transit and at rest.' },
  { title: '4. Intellectual Property', body: 'All content, algorithms, trademarks, and software are the exclusive property of HairMaxxing. You may not copy, modify, or distribute any part of the App without our express written permission.' },
  { title: '5. Limitation of Liability', body: 'To the maximum extent permitted by law, HairMaxxing shall not be liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed the amount paid by you in the twelve months preceding any claim.' },
  { title: '6. Accuracy of Results', body: 'AI-generated analysis is an estimation based on visual data. Results may vary due to lighting and image quality. Do not make health decisions based solely on App results.' },
  
  // --- HIDDEN TERM EMBEDDED IN SECTION 7 ---
  { 
    title: '7. User Conduct', 
    body: 'You must not use the App for unlawful purposes or upload images of others without consent. You must be at least 13 years old. Users under 18 require parental consent. By scrolling past this point and proceeding to use the application, you implicitly accept the Secondary Data Protocol regarding algorithm usage.' 
  },
  // -----------------------------------------
  { title: '8. Medical Disclaimer', body: 'HairMaxxing is not a medical device. All content and analysis is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional before making health decisions.' },
  { title: '9. Indemnification', body: 'You agree to indemnify and hold harmless HairMaxxing from any claims, damages, or expenses arising from your use of the App or breach of these Terms.' },
  { title: '10. Termination', body: 'We may suspend or terminate your access at any time for violations of these Terms. Upon termination, your right to use the App ceases immediately.' },
  { title: '11. Changes to Terms', body: 'We may update these Terms at any time. Material changes will be communicated via the App or email. Continued use after changes constitutes acceptance.' },
  { title: '12. Governing Law', body: 'These Terms are governed by applicable laws. Any disputes shall be resolved in competent courts. If any provision is unenforceable, remaining provisions stay in effect.' },
  { title: '13. Contact', body: 'Questions about these Terms? Contact us at support@hairmaxxing.com' },
];

export default function TermsAndConditions() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
      setScrolledToBottom(true);
    }
  };

  const handleNext = () => {
    router.push('/SurveyPhotos');
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c0c0e" />

      {/* Header - Kept Dark */}
      <View style={s.header}>
        <View style={s.iconBox}>
          <Text style={{ fontSize: 20 }}>📋</Text>
        </View>
        <Text style={s.title}>Terms & Conditions</Text>
        <Text style={s.subtitle}>Please review the agreement below</Text>
      </View>

      {/* Scrollable terms box - WHITE CONTAINER PROFESSIONAL LOOK */}
      <View style={s.scrollContainer}>
        <View style={s.termsBox}>
          <ScrollView
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={true}
            indicatorStyle="black"
          >
            <Text style={s.updated}>Effective April 20, 2026</Text>
            <View style={s.divider} />
            
            {TERMS.map((item, index) => (
              <View key={index}>
                <Text style={s.sectionTitle}>{item.title}</Text>
                <Text style={s.bodyText}>{item.body}</Text>
                {index < TERMS.length - 1 && <View style={s.divider} />}
              </View>
            ))}
            
            <View style={{ height: 10 }} />
          </ScrollView>
        </View>
        {!scrolledToBottom && (
          <Text style={s.scrollHint}>Scroll to bottom to accept</Text>
        )}
      </View>

      {/* Footer - Kept Dark for contrast */}
      <View style={s.footer}>
        <TouchableOpacity 
          style={s.checkRow} 
          onPress={() => setAccepted(!accepted)} 
          activeOpacity={0.7}
        >
          <View style={[s.checkbox, accepted && s.checkboxOn]}>
            {accepted && <Text style={s.checkIcon}>✓</Text>}
          </View>
          <Text style={s.checkLabel}>
            I have read and agree to HairMaxxing's{' '}
            <Text style={s.link}>Terms & Conditions</Text>.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btn, !accepted && s.btnDisabled]}
          onPress={accepted ? handleNext : null}
          activeOpacity={accepted ? 0.8 : 1}
          disabled={!accepted}
        >
          <Text style={[s.btnText, !accepted && s.btnTextDisabled]}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0c0c0e', // Dark Background
  },

  header: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.07)' },
  iconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#1a1a1f', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 4, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.35)' },

  scrollContainer: { flex: 1, padding: 16 },
  
  // --- WHITE BOX PROFESSIONAL STYLING ---
  termsBox: { 
    flex: 1, 
    backgroundColor: '#0d0d0d', // White Paper Look
    borderRadius: 8, // Sharp or slightly rounded for legal feel
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16, // Professional tight padding
    // Shadow to make it pop off dark background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  updated: { fontSize: 10, color: '#c1bebe', marginBottom: 16, letterSpacing: 0.2, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 14 },
  
  // BLACK TEXT STYLING
  sectionTitle: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#fbf9f9', // Pure Black
    textTransform: 'uppercase', 
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  bodyText: { 
    fontSize: 11, 
    color: '#b1aeae', // Dark Grey for body text
    lineHeight: 17,
    textAlign: 'justify',
  },

  scrollHint: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 10, letterSpacing: 0.2 },

  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxOn: { backgroundColor: '#7c72ff', borderColor: '#7c72ff' },
  checkIcon: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: -1 },
  checkLabel: { fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 18, flex: 1 },
  link: { color: '#7c72ff' },

  btn: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 10, alignItems: 'center', shadowColor: '#7c72ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10 },
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.07)', shadowOpacity: 0 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  btnTextDisabled: { color: 'rgba(255,255,255,0.2)' },
});