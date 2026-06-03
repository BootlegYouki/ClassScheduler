import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export interface ClassItem {
  id: string;
  subject: string;
  name: string;
  time: string;
  room: string;
  teacher: string;
  day: string;
}

const parseTime = (timeStr: string) => {
  try {
    const [time, modifier] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) {
      hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
    return { hours, minutes };
  } catch (e) {
    return null;
  }
};

export const calculateNotificationTrigger = (
  classDay: string,
  startHours: number,
  startMinutes: number,
  warningMinutes: number
) => {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = weekdays.indexOf(classDay);
  if (dayIndex === -1) return null;

  let totalMinutes = startHours * 60 + startMinutes;
  totalMinutes -= warningMinutes;

  let targetDayIndex = dayIndex;
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
    targetDayIndex = (targetDayIndex - 1 + 7) % 7;
  }

  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const weekday = targetDayIndex + 1; // 1 = Sunday, 7 = Saturday for expo-notifications

  return { weekday, hour, minute };
};

export const requestPermissions = async () => {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F71',
      });
    }

    return finalStatus === 'granted';
  } catch (e) {
    console.error('Error requesting notification permissions:', e);
    return false;
  }
};

export const syncNotifications = async (classesList: ClassItem[]) => {
  if (Platform.OS === 'web') return;

  try {
    // 1. Cancel all scheduled notifications for the app
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 2. Schedule warnings for each class
    for (const cls of classesList) {
      const [startStr] = cls.time.split(' - ');
      if (!startStr) continue;

      const start = parseTime(startStr);
      if (!start) continue;

      const warnings = [30, 15, 0]; // 30 mins, 15 mins warning offsets, and starting now (0 mins)

      for (const mins of warnings) {
        const trigger = calculateNotificationTrigger(cls.day, start.hours, start.minutes, mins);
        if (!trigger) continue;

        const title = mins === 0
          ? `${cls.subject} is starting now`
          : `${cls.subject} starts in ${mins}m`;
        const body = mins === 0
          ? `${cls.name} in ${cls.room} is starting now.`
          : `${cls.name} in ${cls.room} starts at ${startStr}.`;

        await Notifications.scheduleNotificationAsync({
          identifier: `${cls.id}_${mins}`,
          content: {
            title,
            body,
            sound: true,
            data: { classId: cls.id },
            ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
          },
          trigger: Platform.OS === 'ios' ? {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday: trigger.weekday,
            hour: trigger.hour,
            minute: trigger.minute,
            repeats: true,
          } : {
            weekday: trigger.weekday,
            hour: trigger.hour,
            minute: trigger.minute,
            repeats: true,
          } as any,
        });
      }
    }
  } catch (e) {
    console.error('Failed to sync scheduled notifications:', e);
  }
};
