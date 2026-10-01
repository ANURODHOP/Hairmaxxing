/**
 * useNotifications — Real push notifications via expo-notifications
 *
 * Usage:
 *   const { scheduleTaskReminder, cancelAllReminders, registerForPushNotifications } = useNotifications();
 */
import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('hair-routine', {
      name: 'Daily Hair Routine',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e',
      sound: 'default',
    });
  }

  // For Expo-managed workflow, get the Expo push token
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (e) {
    console.log('Could not get push token:', e);
    return null;
  }
}

interface ScheduleReminderOptions {
  remainingTasks: number;
  delaySeconds?: number; // Default: 30 minutes (1800s) for real use; set low for testing
}

export function useNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const scheduledIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Listen for notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Listen for user tapping a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  /**
   * Schedule a local reminder for incomplete tasks.
   * Cancels any previously scheduled reminder first.
   * delaySeconds: how long until the notification fires (default 30 min)
   */
  const scheduleTaskReminder = useCallback(
    async ({ remainingTasks, delaySeconds = 1800 }: ScheduleReminderOptions) => {
      // Cancel existing scheduled reminder
      if (scheduledIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(scheduledIdRef.current).catch(() => {});
        scheduledIdRef.current = null;
      }

      if (remainingTasks <= 0) return; // All tasks done — no reminder needed

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💆 HairMaxxing Routine',
          body: `You're so close! Only ${remainingTasks} task${remainingTasks === 1 ? '' : 's'} left for today's growth routine.`,
          sound: 'default',
          data: { screen: 'DailyTask' },
          ...(Platform.OS === 'android' && { channelId: 'hair-routine' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
          repeats: false,
        },
      });

      scheduledIdRef.current = id;
      return id;
    },
    []
  );

  /** Cancel all pending reminders (call when day is complete or screen unmounts) */
  const cancelAllReminders = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    scheduledIdRef.current = null;
  }, []);

  return { scheduleTaskReminder, cancelAllReminders, registerForPushNotificationsAsync };
}
