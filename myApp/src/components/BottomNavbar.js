import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

// Define your tabs and their routes here
const TABS = [
  { id: 'journey', label: 'Journey', icon: '✦', route: '/' },
  { id: 'potential', label: 'Potential', icon: '✨', route: '/potential' },
  { id: 'streak', label: 'Streak', icon: '🔥', route: '/streak' },
  { id: 'profile', label: 'Profile', icon: '⚙', route: '/Profile' },
];

export default function BottomNavbar({ activeTab = 'journey' }) {
  const router = useRouter();

  return (
    <View style={styles.nav}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            onPress={() => router.push(tab.route)}
            activeOpacity={0.7}
          >
            {isActive ? (
              <View style={styles.navActiveChip}>
                <Text style={styles.navActiveIcon}>{tab.icon}</Text>
              </View>
            ) : (
              // Increased fontSize slightly for better visibility of inactive icons
              <Text style={styles.navIcon}>{tab.icon}</Text>
            )}
            <Text style={isActive ? styles.navLabelActive : styles.navLabel}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: '#060e07',
    borderTopWidth: 1,
    borderTopColor: '#0f1d13',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navActiveChip: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  navActiveIcon: {
    fontSize: 18,
    color: '#22c55e',
  },
  // FIX: Changed from opacity: 0.25 to a solid color for visibility
  navIcon: {
    fontSize: 22,
    color: '#6b7280',
    marginTop: 2, // Slight offset to align baseline with active chip icon
  },
  // FIX: Made inactive labels clearly visible
  navLabel: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  navLabelActive: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});