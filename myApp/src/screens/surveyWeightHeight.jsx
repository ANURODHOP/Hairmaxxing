import React, { useState, useRef, useEffect, useCallback } from 'react';

// Global state
import { useSurvey } from '../context/useSurvey';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  FlatList,
  Dimensions,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THEME_COLOR = '#6C63FF';
const THEME_SECONDARY = '#FF6B9D';
const ITEM_HEIGHT = 70;
const VISIBLE_ITEMS = 5;

// --- Data Generators ---
const KG_RANGE = Array.from({ length: 271 }, (_, i) => 30 + i);
const LB_RANGE = Array.from({ length: 500 }, (_, i) => 60 + i);
const CM_RANGE = Array.from({ length: 151 }, (_, i) => 100 + i);

const FT_IN_RANGE = [];
for (let f = 3; f <= 8; f++) {
  for (let i = 0; i < 12; i++) {
    FT_IN_RANGE.push({ ft: f, in: i, label: `${f}' ${i}"` });
  }
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function SurveyWeightHeight() {
  const router = useRouter();
   const { step3Data, updateStep3 } = useSurvey(); 

  // Initialize state from context if available, or default
  const [weightKg, setWeightKg] = useState(step3Data.weightKg);
  const [heightCm, setHeightCm] = useState(step3Data.heightCm);

  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [isWeightModalVisible, setWeightModalVisible] = useState(false);
  const [isHeightModalVisible, setHeightModalVisible] = useState(false);

  // --- Animated Values ---
  const weightScaleAnim = useRef(new Animated.Value(1)).current;
  const heightScaleAnim = useRef(new Animated.Value(1)).current;
  const modalSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const modalBackdropAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const unitToggleAnim = useRef(new Animated.Value(0)).current;

  const weightListRef = useRef(null);
  const heightListRef = useRef(null);

  // --- Derived Values ---
  const weightLb = Math.round(weightKg * 2.20462);
  const displayWeight = weightUnit === 'kg' ? weightKg : weightLb;
  
  const totalInches = Math.round(heightCm / 2.54);
  const displayHeightFt = Math.floor(totalInches / 12);
  const displayHeightIn = totalInches % 12;

  // --- Effects ---
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, []);

  useEffect(() => {
    if (isWeightModalVisible || isHeightModalVisible) {
      Animated.parallel([
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(modalBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Scroll to correct position
      setTimeout(() => {
        if (isWeightModalVisible) {
          const index = weightUnit === 'kg' 
            ? KG_RANGE.indexOf(weightKg) 
            : LB_RANGE.indexOf(weightLb);
          weightListRef.current?.scrollToIndex({ 
            index: Math.max(0, index), 
            animated: true 
          });
        } else {
          let index = 0;
          if (heightUnit === 'ft-in') {
            index = FT_IN_RANGE.findIndex(
              item => item.ft === displayHeightFt && item.in === displayHeightIn
            );
          } else {
            index = CM_RANGE.indexOf(heightCm);
          }
          heightListRef.current?.scrollToIndex({ 
            index: Math.max(0, index), 
            animated: true 
          });
        }
      }, 100);
    } else {
      Animated.parallel([
        Animated.timing(modalSlideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(modalBackdropAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isWeightModalVisible, isHeightModalVisible, weightUnit, heightUnit]);

  // --- Handlers ---
  const pulseAnimation = (anim) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(anim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleWeightPress = () => {
    pulseAnimation(weightScaleAnim);
    setWeightModalVisible(true);
  };

  const handleHeightPress = () => {
    pulseAnimation(heightScaleAnim);
    setHeightModalVisible(true);
  };

  const closeModals = () => {
    setWeightModalVisible(false);
    setHeightModalVisible(false);
  };

  const handleWeightScroll = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const data = weightUnit === 'kg' ? KG_RANGE : LB_RANGE;
    
    if (data[index] !== undefined) {
      const val = data[index];
      if (weightUnit === 'kg') setWeightKg(val);
      else setWeightKg(Math.round(val / 2.20462));
    }
  }, [weightUnit]);

  const handleHeightScroll = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const data = heightUnit === 'cm' ? CM_RANGE : FT_IN_RANGE;
    
    if (data[index] !== undefined) {
      if (heightUnit === 'cm') {
        setHeightCm(data[index]);
      } else {
        const item = data[index];
        const totalIn = (item.ft * 12) + item.in;
        setHeightCm(Math.round(totalIn * 2.54));
      }
    }
  }, [heightUnit]);

  const handleNext = () => {
    updateStep3(weightKg, heightCm);
    router.push('/Terms');
  };

  // --- Render Items with 3D Wheel Effect ---
  const renderWeightItem = useCallback(({ item, index }) => {
    const isSelected = weightUnit === 'kg' 
      ? item === weightKg 
      : item === weightLb;
    
    return (
      <View style={styles.pickerItemContainer}>
        <Animated.View style={[
          styles.pickerItem,
          isSelected && styles.pickerItemSelected,
          isSelected && {
            transform: [{ scale: 1.1 }],
            shadowOpacity: 0.3,
            shadowRadius: 10,
          }
        ]}>
          <Text style={[
            styles.pickerText, 
            isSelected && styles.pickerTextSelected
          ]}>
            {item}
          </Text>
          {isSelected && (
            <View style={styles.unitBadge}>
              <Text style={styles.unitBadgeText}>{weightUnit}</Text>
            </View>
          )}
        </Animated.View>
      </View>
    );
  }, [weightKg, weightLb, weightUnit]);

  const renderHeightItem = useCallback(({ item, index }) => {
    let label = '';
    let isSelected = false;

    if (heightUnit === 'cm') {
      label = `${item}`;
      isSelected = item === heightCm;
    } else {
      label = item.label;
      isSelected = item.ft === displayHeightFt && item.in === displayHeightIn;
    }

    return (
      <View style={styles.pickerItemContainer}>
        <Animated.View style={[
          styles.pickerItem,
          isSelected && styles.pickerItemSelected,
          isSelected && {
            transform: [{ scale: 1.1 }],
          }
        ]}>
          <Text style={[
            styles.pickerText, 
            isSelected && styles.pickerTextSelected
          ]}>
            {label}
          </Text>
          {isSelected && heightUnit === 'cm' && (
            <View style={styles.unitBadge}>
              <Text style={styles.unitBadgeText}>cm</Text>
            </View>
          )}
        </Animated.View>
      </View>
    );
  }, [heightCm, heightUnit, displayHeightFt, displayHeightIn]);

  const getItemLayout = (_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#0a0a0a']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.contentWrapper}>
        {/* Enhanced Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressSegments}>
            {[1, 2, 3, 4].map((step, index) => (
              <Animated.View 
                key={step} 
                style={[
                  styles.segment, 
                  step <= 3 && styles.activeSegment,
                  step <= 3 && {
                    transform: [{
                      scale: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      })
                    }]
                  }
                ]} 
              />
            ))}
          </View>
          <Text style={styles.stepText}>Step 3 of 4</Text>
        </View>

        {/* Header */}
        <View style={styles.mainContent}>
          <Text style={styles.headline}>Your Body Stats</Text>
          <Text style={styles.subtext}>
            Personalize your experience with accurate measurements for precise calculations.
          </Text>

          {/* WEIGHT CARD */}
          <Animated.View style={[
            styles.inputCard,
            { transform: [{ scale: weightScaleAnim }] }
          ]}>
            <LinearGradient
              colors={['rgba(108, 99, 255, 0.1)', 'rgba(108, 99, 255, 0.05)']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={styles.labelContainer}>
                  <Ionicons name="fitness-outline" size={16} color={THEME_COLOR} />
                  <Text style={styles.cardLabel}>WEIGHT</Text>
                </View>
                
                <View style={styles.unitToggleRow}>
                  {['kg', 'lb'].map((unit, idx) => (
                    <TouchableOpacity 
                      key={unit}
                      style={[
                        styles.unitBtn, 
                        weightUnit === unit && styles.unitBtnActive
                      ]}
                      onPress={() => setWeightUnit(unit)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.unitBtnText, 
                        weightUnit === unit && styles.unitBtnTextActive
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={handleWeightPress} 
                style={styles.cardTouchable}
                activeOpacity={0.9}
              >
                <View style={styles.cardValueRow}>
                  <Text style={styles.cardMainValue}>
                    {displayWeight}
                  </Text>
                  <Text style={styles.cardUnit}>{weightUnit}</Text>
                </View>
                <View style={styles.changeHint}>
                  <Ionicons name="chevron-up" size={12} color="#666" />
                  <Text style={styles.tapHint}>Tap to adjust</Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* HEIGHT CARD */}
          <Animated.View style={[
            styles.inputCard,
            { transform: [{ scale: heightScaleAnim }] }
          ]}>
            <LinearGradient
              colors={['rgba(255, 107, 157, 0.1)', 'rgba(255, 107, 157, 0.05)']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={styles.labelContainer}>
                  <Ionicons name="resize-outline" size={16} color={THEME_SECONDARY} />
                  <Text style={[styles.cardLabel, { color: THEME_SECONDARY }]}>HEIGHT</Text>
                </View>
                
                <View style={styles.unitToggleRow}>
                  {['cm', 'ft-in'].map((unit) => (
                    <TouchableOpacity 
                      key={unit}
                      style={[
                        styles.unitBtn, 
                        heightUnit === unit && [styles.unitBtnActive, { backgroundColor: THEME_SECONDARY }]
                      ]}
                      onPress={() => setHeightUnit(unit)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.unitBtnText, 
                        heightUnit === unit && styles.unitBtnTextActive
                      ]}>
                        {unit === 'ft-in' ? 'ft' : unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleHeightPress} 
                style={styles.cardTouchable}
                activeOpacity={0.9}
              >
                <View style={styles.cardValueRow}>
                  <Text style={styles.cardMainValue}>
                    {heightUnit === 'cm' 
                      ? heightCm 
                      : `${displayHeightFt}' ${displayHeightIn}"`
                    }
                  </Text>
                  {heightUnit === 'cm' && <Text style={styles.cardUnit}>cm</Text>}
                </View>
                <View style={styles.changeHint}>
                  <Ionicons name="chevron-up" size={12} color="#666" />
                  <Text style={styles.tapHint}>Tap to adjust</Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#fff', '#f0f0f0']}
              style={styles.buttonGradient}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" style={styles.buttonIcon} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- ENHANCED MODAL --- */}
      <Modal 
        visible={isWeightModalVisible || isHeightModalVisible} 
        transparent 
        animationType="none"
        onRequestClose={closeModals}
      >
        <Animated.View style={[
          styles.modalOverlay,
          { opacity: modalBackdropAnim }
        ]}>
          <TouchableOpacity style={styles.backdropTouchable} onPress={closeModals} />
        </Animated.View>

        <Animated.View style={[
          styles.modalContainer,
          { transform: [{ translateY: modalSlideAnim }] }
        ]}>
          <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModals} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Select {isWeightModalVisible ? 'Weight' : 'Height'}
              </Text>
              <TouchableOpacity onPress={closeModals} style={styles.doneBtn}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              {/* Selection Indicator */}
              <View style={styles.selectionIndicator} pointerEvents="none">
                <LinearGradient
                  colors={['transparent', 'rgba(108, 99, 255, 0.1)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Side Gradients for Fade Effect */}
              <View style={[styles.fadeGradient, styles.fadeTop]} pointerEvents="none">
                <LinearGradient
                  colors={['#0a0a0a', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <View style={[styles.fadeGradient, styles.fadeBottom]} pointerEvents="none">
                <LinearGradient
                  colors={['transparent', '#0a0a0a']}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {isWeightModalVisible ? (
                <FlatList
                  ref={weightListRef}
                  data={weightUnit === 'kg' ? KG_RANGE : LB_RANGE}
                  keyExtractor={(item) => item.toString()}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onScroll={handleWeightScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={styles.listContent}
                  renderItem={renderWeightItem}
                  getItemLayout={getItemLayout}
                  initialNumToRender={15}
                  maxToRenderPerBatch={20}
                  windowSize={10}
                />
              ) : (
                <FlatList
                  ref={heightListRef}
                  data={heightUnit === 'cm' ? CM_RANGE : FT_IN_RANGE}
                  keyExtractor={(item, index) => index.toString()}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onScroll={handleHeightScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={styles.listContent}
                  renderItem={renderHeightItem}
                  getItemLayout={getItemLayout}
                />
              )}
            </View>

            <View style={styles.modalFooter}>
              <Text style={styles.modalHelperText}>
                Scroll to select your {isWeightModalVisible ? 'weight' : 'height'}
              </Text>
            </View>
          </BlurView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000',
  },
  contentWrapper: { 
    flex: 1, 
    paddingHorizontal: 24, 
    paddingVertical: 30,
  },

  /* Progress */
  progressContainer: { 
    marginBottom: 30,
    marginTop: 10,
  },
  progressSegments: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 8,
  },
  segment: { 
    flex: 1, 
    height: 4, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 10,
    overflow: 'hidden',
  },
  activeSegment: { 
    backgroundColor: THEME_COLOR,
    shadowColor: THEME_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  stepText: { 
    color: 'rgba(255,255,255,0.4)', 
    fontSize: 12, 
    marginTop: 12, 
    fontWeight: '600', 
    letterSpacing: 1, 
    textTransform: 'uppercase',
  },

  /* Content */
  mainContent: { 
    flex: 1,
    justifyContent: 'center',
  },
  headline: { 
    fontSize: 34, 
    fontWeight: '800', 
    color: '#fff', 
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtext: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.5)', 
    marginBottom: 40, 
    lineHeight: 24,
    fontWeight: '400',
  },

  /* Cards */
  inputCard: {
    borderRadius: 28,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: { 
    color: THEME_COLOR, 
    fontSize: 13, 
    fontWeight: '800', 
    letterSpacing: 1.5, 
    textTransform: 'uppercase',
  },
  
  /* Unit Toggle */
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  unitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  unitBtnActive: {
    backgroundColor: THEME_COLOR,
    shadowColor: THEME_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  unitBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
  },
  unitBtnTextActive: {
    color: '#fff',
  },
  
  cardTouchable: {
    alignItems: 'center',
  },
  cardValueRow: { 
    flexDirection: 'row', 
    alignItems: 'baseline',
    marginBottom: 8,
  },
  cardMainValue: { 
    fontSize: 48, 
    fontWeight: '800', 
    color: '#fff',
    letterSpacing: -1,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  cardUnit: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: 'rgba(255,255,255,0.4)', 
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  changeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.6,
  },
  tapHint: { 
    color: 'rgba(255,255,255,0.4)', 
    fontSize: 12, 
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* Footer */
  footer: { 
    paddingTop: 20, 
    paddingBottom: 10,
  },
  primaryButton: {
    borderRadius: 999, 
    overflow: 'hidden',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { 
    color: '#000', 
    fontSize: 18, 
    fontWeight: '800', 
    letterSpacing: 0.5,
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },

  /* MODAL */
  modalOverlay: { 
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
  },
  modalBlur: {
    flex: 1,
    backgroundColor: 'rgba(20,20,30,0.95)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20,
    paddingHorizontal: 24,
  },
  closeBtn: {
    padding: 4,
  },
  doneBtn: {
    padding: 4,
  },
  modalTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalDone: { 
    color: THEME_COLOR, 
    fontSize: 16, 
    fontWeight: '800',
  },

  pickerContainer: { 
    flex: 1,
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    height: ITEM_HEIGHT,
    marginTop: -ITEM_HEIGHT / 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    backgroundColor: 'rgba(108, 99, 255, 0.05)',
    zIndex: 1,
  },
  fadeGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.5,
    zIndex: 2,
    pointerEvents: 'none',
  },
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
  listContent: {
    paddingVertical: (SCREEN_HEIGHT * 0.6 - ITEM_HEIGHT) / 2 - 100,
  },
  pickerItemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 12,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
  },
  pickerText: { 
    fontSize: 24, 
    color: 'rgba(255,255,255,0.3)', 
    fontWeight: '600',
  },
  pickerTextSelected: { 
    fontSize: 32, 
    color: '#fff', 
    fontWeight: '800',
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  unitBadge: {
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  unitBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modalFooter: {
    padding: 20,
    alignItems: 'center',
  },
  modalHelperText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    fontWeight: '500',
  },
});