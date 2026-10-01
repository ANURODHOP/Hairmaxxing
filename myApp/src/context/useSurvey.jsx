import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

const SurveyContext = createContext();

const SURVEY_STORAGE_KEY = '@hair_survey_progress';



export const SurveyProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);

  // State definitions
  const [step1Data, setStep1Data] = useState({ name: '', age: 18, gender: '' });
  const [step3Data, setStep3Data] = useState({ weightKg: 70, heightCm: 175, bmi: 22.9 });
  const [step4Data, setStep4Data] = useState({
    hairProblem: '',
    problemDuration: '',
    photos: { front: null, top: null, side: null },
  });

  // 1. Load data from AsyncStorage on App Start
  useEffect(() => {
    const loadData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(SURVEY_STORAGE_KEY);
        if (jsonValue != null) {
          const savedData = JSON.parse(jsonValue);
          // Only load if data exists
          if (savedData.step1) {
            const s1 = savedData.step1;
            setStep1Data({
              ...s1,
              // Ensure age is always a number (AsyncStorage returns strings)
              age: s1.age ? Number(s1.age) : 18,
            });
          }
          if (savedData.step3) setStep3Data(savedData.step3);
          if (savedData.step4) setStep4Data(savedData.step4);
        }
      } catch (e) {
        console.error("Failed to load survey data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 2. Save data to AsyncStorage whenever state changes
  useEffect(() => {
    const saveData = async () => {
      try {
        const dataToSave = {
          step1: step1Data,
          step3: step3Data,
          step4: step4Data,
        };
        await AsyncStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        console.error("Failed to save survey data", e);
      }
    };

    // Don't save on the very first render loop (loading phase)
    if (!loading) saveData();
  }, [step1Data, step3Data, step4Data, loading]);

  // Helpers
  const updateStep3 = (weightKg, heightCm) => {
    const h = heightCm / 100;
    const bmi = (weightKg / (h * h)).toFixed(1);
    setStep3Data({ weightKg, heightCm, bmi });
  };

  const updatePhotos = (newPhotos) => {
    setStep4Data(prev => ({
      ...prev,
      photos: { ...prev.photos, ...newPhotos }
    }));
  };

  const resetSurvey = async () => {
    try {
      // Clear state
      setStep1Data({ name: '', age: 18, gender: '' });
      setStep3Data({ weightKg: 70, heightCm: 175, bmi: 22.9 });
      setStep4Data({ hairProblem: '', problemDuration: '', photos: { front: null, top: null, side: null } });

      // Clear storage
      await AsyncStorage.removeItem(SURVEY_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to reset survey", e);
    }
  };



  const saveAllDataToFirebase = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email,
          name: user.displayName,

          step1: step1Data,
          step3: step3Data,

          // step4 WITHOUT images — save hairProblems array
          step4: {
            hairProblems: step4Data.hairProblems ?? (step4Data.hairProblem ? [step4Data.hairProblem] : []),
            problemDuration: step4Data.problemDuration,
          },

          createdAt: new Date(),
        },
        { merge: true }
      );

      console.log("Survey saved ✅");
      return true;

    } catch (error) {
      console.error("Error saving survey:", error);
      throw error;
    }
  };

  return (
    <SurveyContext.Provider
      value={{
        step1Data,
        setStep1Data,
        step3Data,
        updateStep3,
        step4Data,
        setStep4Data,
        updatePhotos,
        resetSurvey,
        saveAllDataToFirebase,
        surveyLoading: loading,
      }}
    >
      {children}
    </SurveyContext.Provider>
  );
};

export const useSurvey = () => useContext(SurveyContext);