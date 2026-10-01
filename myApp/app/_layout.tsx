// app/_layout.js
import { Stack } from 'expo-router';
import { SurveyProvider } from '../src/context/useSurvey';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SurveyProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="SurveyNameAge" />
          <Stack.Screen name="SurveyGender" />
          <Stack.Screen name="surveyWeightHeight" />
          <Stack.Screen name="SurveyPhotos" />
          <Stack.Screen name="Profile" />
          <Stack.Screen name="AuthScreen" />
          <Stack.Screen name="Analyze" />
          <Stack.Screen name="Dashboard" />
          <Stack.Screen name="Terms" />
          <Stack.Screen name="day" />
          <Stack.Screen name="month" />
          <Stack.Screen name="DailyTask" />
          <Stack.Screen name="WeeklySnapshot" />
        </Stack>
      </SurveyProvider>
    </AuthProvider>
  );
}