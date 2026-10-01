import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSurvey } from '../context/useSurvey';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// ─── Selection Options ──────────────────────────────────────────
const problemOptions = [
  { id: 'none', title: 'No Problem', icon: '😎' },
  { id: 'fall', title: 'Hair Fall', icon: '🍂' },
  { id: 'dandruff', title: 'Dandruff', icon: '❄️' },
  { id: 'thinning', title: 'Hair Thinning', icon: '📉' },
  { id: 'receding', title: 'Receding Hairline', icon: '↩️' },
  { id: 'density', title: 'Low Density', icon: '🕳️' },
];

const durationOptions = [
  { id: 'new', title: 'Just Started (< 1 Mo)', icon: '🆕' },
  { id: 'short', title: '1 - 3 Months', icon: '🕐' },
  { id: 'medium', title: '3 - 6 Months', icon: '🗓️' },
  { id: 'long', title: '6+ Months', icon: '📅' },
];

const Profile = () => {
  const router = useRouter();
  const { step1Data, setStep1Data, step3Data, updateStep3, step4Data, setStep4Data } = useSurvey();
  const { user } = useAuth();

  const [redirectTimer, setRedirectTimer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Unit toggle states
  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightUnit, setHeightUnit] = useState('cm');

  const [editData, setEditData] = useState({
    name: '',
    age: '',
    gender: 'Male', // Strictly Male or Female
    weight: '',     // Holds either kg or lb based on weightUnit
    heightCm: '',   // Holds cm if heightUnit === 'cm'
    heightFt: '',   // Holds feet if heightUnit === 'ft'
    heightIn: '',   // Holds inches if heightUnit === 'ft'
    hairProblem: '',
    problemDuration: ''
  });

  const hasData = step1Data.name || step4Data.hairProblem;

  useEffect(() => {
    if (!hasData) {
      const timer = setTimeout(() => router.replace('/SurveyNameAge'), 3000);
      setRedirectTimer(timer);
      return () => clearTimeout(timer);
    }
  }, [hasData]);

  // --- Conversion Helpers ---
  const kgToLb = (kg) => kg ? (parseFloat(kg) * 2.20462).toFixed(1) : '';
  const lbToKg = (lb) => lb ? (parseFloat(lb) / 2.20462).toFixed(1) : '';

  const cmToFtIn = (cm) => {
    if (!cm) return { ft: '', in: '' };
    const totalInches = parseFloat(cm) / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { ft: String(ft), in: String(inches) };
  };

  const ftInToCm = (ft, inches) => {
    if (!ft) return '';
    return ((parseFloat(ft) * 12) + parseFloat(inches || 0)) * 2.54;
  };

  // --- Display Helpers ---
  const getProblemTitle = (id) => {
    const found = problemOptions.find(opt => opt.id === id);
    return found ? `${found.icon} ${found.title}` : 'Not set';
  };

  const getDurationTitle = (id) => {
    const found = durationOptions.find(opt => opt.id === id);
    return found ? `${found.icon} ${found.title}` : 'Not set';
  };

  const txt = (val) => val || 'Not set';

  // --- Edit/Save Logic ---
  const handleEdit = () => {
    setWeightUnit('kg');
    setHeightUnit('cm');
    setEditData({
      name: step1Data.name || '',
      age: String(step1Data.age) || '',
      gender: step1Data.gender || 'Male',
      weight: String(step3Data.weightKg) || '',
      heightCm: String(step3Data.heightCm) || '',
      heightFt: '',
      heightIn: '',
      hairProblem: step4Data.hairProblem || '',
      problemDuration: step4Data.problemDuration || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // 1. Validate Age (Must be a valid number)
    const ageNum = parseInt(editData.age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      Alert.alert("Invalid Age", "Please enter a valid age between 1 and 120.");
      return;
    }

    // 2. Process and Validate Weight
    let finalWeightKg = parseFloat(editData.weight);
    if (isNaN(finalWeightKg) || finalWeightKg <= 0) {
      Alert.alert("Invalid Weight", "Please enter a valid weight.");
      return;
    }
    if (weightUnit === 'lb') {
      finalWeightKg = parseFloat(lbToKg(finalWeightKg));
    }

    // 3. Process and Validate Height
    let finalHeightCm;
    if (heightUnit === 'cm') {
      finalHeightCm = parseFloat(editData.heightCm);
      if (isNaN(finalHeightCm) || finalHeightCm <= 0) {
        Alert.alert("Invalid Height", "Please enter a valid height in cm.");
        return;
      }
    } else {
      // If feet/inches, validate them separately
      const ftNum = parseFloat(editData.heightFt);
      const inNum = parseFloat(editData.heightIn) || 0;
      if (isNaN(ftNum) || ftNum < 0 || inNum < 0 || inNum > 11) {
        Alert.alert("Invalid Height", "Please enter valid feet (0-8) and inches (0-11).");
        return;
      }
      finalHeightCm = ftInToCm(ftNum, inNum);
    }

    // 4. Save to Context (which triggers AsyncStorage/Firebase save)
    setStep1Data({
      name: editData.name,
      age: String(ageNum), // Store cleaned age
      gender: editData.gender
    });

    updateStep3(finalWeightKg, finalHeightCm); // Recalculates BMI automatically

    setStep4Data(prev => ({
      ...prev,
      hairProblem: editData.hairProblem,
      problemDuration: editData.problemDuration,
      // hairlineStatus is completely removed/ignored here
    }));

    setIsEditing(false);
  };

  const handleCancel = () => setIsEditing(false);

  // --- Reusable Text Input ---
  const EditableField = ({ value, field, keyboardType = 'default', placeholder = 'Not set' }) => {
    if (isEditing) {
      return (
        <TextInput
          style={styles.input}
          value={editData[field]}
          onChangeText={(text) => setEditData(prev => ({ ...prev, [field]: text }))}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#555"
        />
      );
    }
    return <Text style={styles.value}>{txt(value)}</Text>;
  };

  // --- RENDER: EMPTY STATE ---
  if (!hasData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🧬</Text>
          <Text style={styles.emptyTitle}>No Data Found</Text>
          <Text style={styles.emptyText}>It looks like you haven't completed the survey yet.</Text>
          <Text style={styles.redirectText}>Redirecting to survey in a few seconds...</Text>
          <TouchableOpacity style={styles.startButton} onPress={() => { clearTimeout(redirectTimer); router.replace('/SurveyNameAge'); }}>
            <Text style={styles.startButtonText}>Start Survey Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- RENDER: FILLED PROFILE ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>User Profile</Text>
            <Text style={styles.headerSub}>Summary of captured data</Text>
          </View>
          {isEditing ? (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit ✏️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section 1: Personal Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Info</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <EditableField value={step1Data.name} field="name" placeholder="Enter name" />
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Age</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editData.age}
                onChangeText={(text) => setEditData(prev => ({ ...prev, age: text.replace(/[^0-9]/g, '') }))}
                keyboardType="number-pad"
                placeholder="Age"
                placeholderTextColor="#555"
                maxLength={3}
              />
            ) : (
              <Text style={styles.value}>{txt(step1Data.age)}</Text>
            )}
          </View>
          <View style={styles.divider} />

          {/* Strict Male/Female Gender Selector */}
          <View style={styles.row}>
            <Text style={styles.label}>Gender</Text>
            {isEditing ? (
              <View style={styles.genderToggle}>
                <TouchableOpacity
                  style={[styles.genderBtn, editData.gender === 'Male' && styles.genderBtnActive]}
                  onPress={() => setEditData(prev => ({ ...prev, gender: 'Male' }))}
                >
                  <Text style={[styles.genderText, editData.gender === 'Male' && styles.genderTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, editData.gender === 'Female' && styles.genderBtnActive]}
                  onPress={() => setEditData(prev => ({ ...prev, gender: 'Female' }))}
                >
                  <Text style={[styles.genderText, editData.gender === 'Female' && styles.genderTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.value}>{txt(step1Data.gender)}</Text>
            )}
          </View>
        </View>

        {/* Section 2: Body Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Body Stats</Text>

          {/* Weight Row */}
          <View style={styles.row}>
            <Text style={styles.label}>Weight</Text>
            <View style={styles.inputGroup}>
              {isEditing ? (
                <>
                  <TextInput
                    style={[styles.input, { minWidth: 80 }]}
                    value={editData.weight}
                    onChangeText={(text) => setEditData(prev => ({ ...prev, weight: text.replace(/[^0-9.]/g, '') }))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#555"
                  />
                  <View style={styles.unitToggleContainer}>
                    <TouchableOpacity
                      style={[styles.unitToggleBtn, weightUnit === 'kg' && styles.unitToggleActive]}
                      onPress={() => {
                        if (weightUnit === 'lb' && editData.weight) {
                          setEditData(prev => ({ ...prev, weight: lbToKg(prev.weight) }));
                        }
                        setWeightUnit('kg');
                      }}
                    >
                      <Text style={[styles.unitToggleText, weightUnit === 'kg' && styles.unitToggleTextActive]}>kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unitToggleBtn, weightUnit === 'lb' && styles.unitToggleActive]}
                      onPress={() => {
                        if (weightUnit === 'kg' && editData.weight) {
                          setEditData(prev => ({ ...prev, weight: kgToLb(prev.weight) }));
                        }
                        setWeightUnit('lb');
                      }}
                    >
                      <Text style={[styles.unitToggleText, weightUnit === 'lb' && styles.unitToggleTextActive]}>lb</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.value}>{txt(step3Data.weightKg)}</Text>
                  <Text style={styles.unit}>kg</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.divider} />

          {/* Height Row */}
          <View style={styles.row}>
            <Text style={styles.label}>Height</Text>
            <View style={styles.inputGroup}>
              {isEditing ? (
                <>
                  {heightUnit === 'cm' ? (
                    <TextInput
                      style={[styles.input, { minWidth: 80 }]}
                      value={editData.heightCm}
                      onChangeText={(text) => setEditData(prev => ({ ...prev, heightCm: text.replace(/[^0-9.]/g, '') }))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#555"
                    />
                  ) : (
                    <View style={styles.ftInContainer}>
                      <TextInput
                        style={[styles.input, { minWidth: 40, textAlign: 'center' }]}
                        value={editData.heightFt}
                        onChangeText={(text) => setEditData(prev => ({ ...prev, heightFt: text.replace(/[^0-9]/g, '') }))}
                        keyboardType="number-pad"
                        placeholder="ft"
                        placeholderTextColor="#555"
                        maxLength={1}
                      />
                      <Text style={styles.ftInSeparator}>'</Text>
                      <TextInput
                        style={[styles.input, { minWidth: 40, textAlign: 'center' }]}
                        value={editData.heightIn}
                        onChangeText={(text) => setEditData(prev => ({ ...prev, heightIn: text.replace(/[^0-9]/g, '') }))}
                        keyboardType="number-pad"
                        placeholder="in"
                        placeholderTextColor="#555"
                        maxLength={2}
                      />
                      <Text style={styles.ftInSeparator}>"</Text>
                    </View>
                  )}
                  <View style={styles.unitToggleContainer}>
                    <TouchableOpacity
                      style={[styles.unitToggleBtn, heightUnit === 'cm' && styles.unitToggleActive]}
                      onPress={() => {
                        if (heightUnit === 'ft') {
                          const cm = ftInToCm(editData.heightFt, editData.heightIn);
                          setEditData(prev => ({ ...prev, heightCm: String(Math.round(cm)) }));
                        }
                        setHeightUnit('cm');
                      }}
                    >
                      <Text style={[styles.unitToggleText, heightUnit === 'cm' && styles.unitToggleTextActive]}>cm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unitToggleBtn, heightUnit === 'ft' && styles.unitToggleActive]}
                      onPress={() => {
                        if (heightUnit === 'cm' && editData.heightCm) {
                          const ftIn = cmToFtIn(editData.heightCm);
                          setEditData(prev => ({ ...prev, heightFt: ftIn.ft, heightIn: ftIn.in }));
                        }
                        setHeightUnit('ft');
                      }}
                    >
                      <Text style={[styles.unitToggleText, heightUnit === 'ft' && styles.unitToggleTextActive]}>ft</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.value}>{txt(step3Data.heightCm)}</Text>
                  <Text style={styles.unit}>cm</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>BMI</Text>
            <Text style={[styles.value, { color: '#4ADE80' }]}>
              {isEditing ? 'Auto-calculated' : step3Data.bmi}
            </Text>
          </View>
        </View>

        {/* Section 3: Hair Analysis */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hair Analysis</Text>

          {/* Problem (Multiple Choice Grid) */}
          <Text style={[styles.label, { marginBottom: 12 }]}>Primary Problem</Text>
          {isEditing ? (
            <View style={styles.optionsGrid}>
              {problemOptions.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.optionChip, editData.hairProblem === opt.id && styles.optionChipActive]}
                  onPress={() => setEditData(prev => ({ ...prev, hairProblem: opt.id }))}
                >
                  <Text style={styles.optionIcon}>{opt.icon}</Text>
                  <Text style={[styles.optionTitle, editData.hairProblem === opt.id && styles.optionTitleActive]}>
                    {opt.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.value}>{getProblemTitle(step4Data.hairProblem)}</Text>
          )}

          <View style={styles.divider} />

          {/* Duration (Multiple Choice Grid) */}
          <Text style={[styles.label, { marginBottom: 12 }]}>Duration</Text>
          {isEditing ? (
            <View style={styles.optionsGrid}>
              {durationOptions.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.optionChip, editData.problemDuration === opt.id && styles.optionChipActive]}
                  onPress={() => setEditData(prev => ({ ...prev, problemDuration: opt.id }))}
                >
                  <Text style={styles.optionIcon}>{opt.icon}</Text>
                  <Text style={[styles.optionTitle, editData.problemDuration === opt.id && styles.optionTitleActive]}>
                    {opt.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.value}>{getDurationTitle(step4Data.problemDuration)}</Text>
          )}

        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIcon: { fontSize: 50, marginBottom: 20 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#777', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  redirectText: { fontSize: 12, color: '#4ADE80', marginBottom: 30 },
  startButton: { backgroundColor: '#4ADE80', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14 },
  startButtonText: { color: '#000', fontSize: 15, fontWeight: '700' },

  // Filled Profile
  scrollContent: { padding: 24, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  headerSub: { fontSize: 14, color: '#555' },
  headerActions: { flexDirection: 'row', gap: 10, marginTop: 5 },
  editBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginTop: 5 },
  editBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: '#4ADE80', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 10 },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cancelBtnText: { color: '#777', fontSize: 14, fontWeight: '600' },

  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardTitle: { color: '#4ADE80', fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: 15, textTransform: 'uppercase' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  unit: { color: '#555', fontSize: 14, fontWeight: '500', marginLeft: 6 },
  label: { color: '#777', fontSize: 14, fontWeight: '500' },
  value: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'right' },

  input: { color: '#fff', fontSize: 15, fontWeight: '600', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.3)', textAlign: 'right' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 12 },

  // Gender Toggle
  genderToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  genderBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  genderBtnActive: { backgroundColor: 'rgba(74, 222, 128, 0.15)' },
  genderText: { color: '#777', fontSize: 14, fontWeight: '600' },
  genderTextActive: { color: '#4ADE80', fontWeight: '700' },

  // Unit Toggles (kg/lb & cm/ft)
  unitToggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2, marginLeft: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  unitToggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  unitToggleActive: { backgroundColor: 'rgba(74, 222, 128, 0.15)' },
  unitToggleText: { color: '#555', fontSize: 12, fontWeight: '700' },
  unitToggleTextActive: { color: '#4ADE80' },

  // Feet/Inches specific
  ftInContainer: { flexDirection: 'row', alignItems: 'center' },
  ftInSeparator: { color: '#777', fontSize: 16, fontWeight: '700', marginHorizontal: 2 },

  // Options Grid
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  optionChip: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  optionChipActive: { backgroundColor: 'rgba(74, 222, 128, 0.1)', borderColor: '#4ADE80' },
  optionIcon: { fontSize: 18 },
  optionTitle: { color: '#888', fontSize: 12, fontWeight: '600', flex: 1 },
  optionTitleActive: { color: '#fff' },

  // Photos
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { width: (width - 70) / 3, aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoLabel: { position: 'absolute', bottom: 5, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});

export default Profile;