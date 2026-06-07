import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, ScrollView, Pressable, Platform, Modal, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

import { ThemeProvider, useTheme, AccentTheme } from './src/theme/theme-provider';
import { TuiText } from './src/components/tui-text';
import { TuiTabBar, ScreenType } from './src/components/tui-nav';
import { TuiContainer } from './src/components/tui-container';
import { TuiButton } from './src/components/tui-button';
import { TuiDrawer } from './src/components/tui-drawer';
import { TuiInput } from './src/components/tui-input';
import { Sun, Moon, Bell } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPermissions, syncNotifications } from './src/utils/notifications-service';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});



interface ClassItem {
  id: string;
  subject: string;
  name: string;
  time: string;
  room: string;
  teacher: string;
  day: string; // e.g. "Monday", "Tuesday", etc.
}

// Initial empty classes list


const DAYS_OF_WEEK = [
  { name: 'Sunday', short: 'Sun', letter: 'S' },
  { name: 'Monday', short: 'Mon', letter: 'M' },
  { name: 'Tuesday', short: 'Tue', letter: 'T' },
  { name: 'Wednesday', short: 'Wed', letter: 'W' },
  { name: 'Thursday', short: 'Thu', letter: 'T' },
  { name: 'Friday', short: 'Fri', letter: 'F' },
  { name: 'Saturday', short: 'Sat', letter: 'S' },
];

const getHeaderBgColor = (theme: AccentTheme) => {
  switch (theme) {
    case 'cobalt': return '#0b132b'; // deep navy
    case 'rose': return '#1a0b12'; // deep rose
    case 'green': return '#0b1a12'; // deep forest green
    case 'amber': return '#1a140b'; // deep amber
    case 'gray': return '#18181b'; // deep gray
    case 'classic': return '#09090b'; // near black
    default: return '#0b132b';
  }
};

const getHeaderBgColorLight = (theme: AccentTheme) => {
  switch (theme) {
    case 'cobalt': return '#eef2f6';
    case 'rose': return '#fff0f3';
    case 'green': return '#f0fdf4';
    case 'amber': return '#fefcf0';
    case 'gray': return '#f4f4f5';
    case 'classic': return '#ffffff';
    default: return '#eef2f6';
  }
};

const getHeaderLabelColor = (theme: AccentTheme) => {
  switch (theme) {
    case 'cobalt': return '#64748b'; // slate-500
    case 'rose': return '#9f1239'; // rose-800
    case 'green': return '#166534'; // green-800
    case 'amber': return '#92400e'; // amber-800
    case 'gray': return '#71717a'; // gray-500
    case 'classic': return '#a1a1aa'; // zinc-400
    default: return '#64748b';
  }
};

interface DayButtonProps {
  shortLabel: string;
  dateNumber: number | string;
  isActive: boolean;
  onPress: () => void;
}

const DayButton: React.FC<DayButtonProps> = ({ shortLabel, dateNumber, isActive, onPress }) => {
  const { colors, isDark } = useTheme();
  const borderAccent = colors.primary;
  const borderInactive = isDark ? colors.border : '#D4D4D8';
  const currentBorder = isActive ? borderAccent : borderInactive;
  const [legendWidth, setLegendWidth] = useState(0);

  const topSegmentWidth = Math.max(0, (52 - legendWidth) / 2);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.daySquare,
        {
          backgroundColor: isActive
            ? (isDark ? colors.primary + '20' : colors.primary + '15')
            : pressed
              ? (isDark ? '#27272A' : '#E4E4E7')
              : colors.card,
        },
      ]}
    >
      {/* Borders */}
      <View style={[styles.borderLeft, { backgroundColor: currentBorder }]} />
      <View style={[styles.borderRight, { backgroundColor: currentBorder }]} />
      <View style={[styles.borderBottom, { backgroundColor: currentBorder }]} />
      <View style={[styles.borderTopLeft, { backgroundColor: currentBorder, width: topSegmentWidth }]} />
      <View style={[styles.borderTopRight, { backgroundColor: currentBorder, width: topSegmentWidth }]} />

      {/* Legend */}
      <View
        onLayout={(e) => setLegendWidth(e.nativeEvent.layout.width)}
        style={styles.dayLegendWrapper}
      >
        <TuiText
          weight="bold"
          style={{
            fontSize: 14,
            letterSpacing: 0.2,
            color: isActive ? colors.primary : colors.mutedForeground,
          }}
        >
          {shortLabel}
        </TuiText>
      </View>

      {/* Content */}
      <TuiText
        weight="bold"
        style={{
          fontSize: 16,
          color: isActive ? colors.primary : colors.foreground,
        }}
      >
        {dateNumber}
      </TuiText>
    </Pressable>
  );
};

function MainApp() {
  const { colors, isDark, accentTheme, setAccentTheme, setThemeMode, loading } = useTheme();
  const insets = useSafeAreaInsets();



  // Splash screen states
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  // App States
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoaded, setClassesLoaded] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // iOS Picker Layout Measurements (for segmented borders with transparent text bg)
  const [fromCardWidth, setFromCardWidth] = useState(0);
  const [fromLegendWidth, setFromLegendWidth] = useState(0);
  const [toCardWidth, setToCardWidth] = useState(0);
  const [toLegendWidth, setToLegendWidth] = useState(0);

  // Selected Day State
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[new Date().getDay()];
  });

  // Animated values for iOS-style deck transition (parallax scaleout)
  const drawerProgressAnim = useRef(new Animated.Value(0)).current;

  const screenScaleAnim = drawerProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.93],
  });
  const screenTranslateYAnim = drawerProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });
  const screenBorderRadiusAnim = drawerProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 16],
  });

  // Add Class Drawer States
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [newSubject, setNewSubject] = useState('');
  const [newName, setNewName] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const [formError, setFormError] = useState('');

  // Time Picker States
  const [fromTime, setFromTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [toTime, setToTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(10, 30, 0, 0);
    return d;
  });
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const formatTimeStr = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const hoursStr = hours < 10 ? '0' + hours : hours;
    return `${hoursStr}:${minutesStr} ${ampm}`;
  };



  // Simulate initial data loading delay for a premium boot feel
  useEffect(() => {
    const timer = setTimeout(() => {
      setDataLoaded(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Request notification permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  // Load classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const savedClasses = await AsyncStorage.getItem('classes');
        if (savedClasses) {
          setClasses(JSON.parse(savedClasses));
        }
      } catch (e) {
        console.error('Failed to load classes', e);
      } finally {
        setClassesLoaded(true);
      }
    };
    loadClasses();
  }, []);

  // Save classes and sync scheduled notifications whenever classes list changes (after loading)
  useEffect(() => {
    if (classesLoaded) {
      const saveAndSync = async () => {
        try {
          await AsyncStorage.setItem('classes', JSON.stringify(classes));
        } catch (e) {
          console.error('Failed to save classes', e);
        }
        syncNotifications(classes);
      };
      saveAndSync();
    }
  }, [classes, classesLoaded]);



  // Hide native splash screen once resources are loaded
  useEffect(() => {
    if (dataLoaded && classesLoaded && !loading) {
      setIsAppReady(true);
    }
  }, [dataLoaded, classesLoaded, loading]);

  // Hide splash screen when app is ready
  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  // Handle Tab Navigation (Only action trigger now)
  const handleNavigate = (screen: ScreenType) => {
    if (screen === 'action') {
      setDrawerVisible(true);
    }
  };

  // Close Drawer
  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setEditingClassId(null);
    // Reset form states
    setNewSubject('');
    setNewName('');
    setNewRoom('');
    setNewTeacher('');
    setFormError('');
    setFromTime(() => {
      const d = new Date();
      d.setHours(9, 0, 0, 0);
      return d;
    });
    setToTime(() => {
      const d = new Date();
      d.setHours(10, 30, 0, 0);
      return d;
    });
    setShowFromPicker(false);
    setShowToPicker(false);
  };

  // Helper to parse time string (e.g. "09:00 AM") into a Date object
  const parseTimeStrToDate = (timeStr: string) => {
    const d = new Date();
    try {
      const parts = timeStr.trim().split(' ');
      if (parts.length === 2) {
        const [time, modifier] = parts;
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) {
          hours += 12;
        }
        if (modifier === 'AM' && hours === 12) {
          hours = 0;
        }
        d.setHours(hours, minutes, 0, 0);
      }
    } catch (e) {
      console.error('Failed to parse time string', timeStr, e);
    }
    return d;
  };

  // Edit Class Click Handler
  const handleEditClass = (cls: ClassItem) => {
    setEditingClassId(cls.id);
    setNewName(cls.name);
    setNewSubject(cls.subject);
    setNewRoom(cls.room);
    setNewTeacher(cls.teacher === 'TBA' ? '' : cls.teacher);

    const timeParts = cls.time.split(' - ');
    if (timeParts.length === 2) {
      setFromTime(parseTimeStrToDate(timeParts[0]));
      setToTime(parseTimeStrToDate(timeParts[1]));
    }
    setDrawerVisible(true);
  };

  // Delete Class Handler (Long Press)
  const handleLongPressDelete = (cls: ClassItem) => {
    Alert.alert(
      'Delete Schedule',
      `Are you sure you want to delete ${cls.name} (${cls.subject})?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setClasses(prev => prev.filter(item => item.id !== cls.id));
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Add or Update Class Submission
  const handleAddOrUpdateClass = () => {
    if (!newSubject || !newName || !newRoom) {
      setFormError('Subject, Title, and Room are required');
      return;
    }

    if (toTime.getHours() < fromTime.getHours() || (toTime.getHours() === fromTime.getHours() && toTime.getMinutes() <= fromTime.getMinutes())) {
      setFormError('End time must be after start time');
      return;
    }

    if (editingClassId) {
      setClasses(prev => prev.map(cls => {
        if (cls.id === editingClassId) {
          return {
            ...cls,
            subject: newSubject.trim().toUpperCase(),
            name: newName.trim(),
            time: `${formatTimeStr(fromTime)} - ${formatTimeStr(toTime)}`,
            room: newRoom.trim(),
            teacher: newTeacher.trim() || 'TBA',
            day: selectedDay,
          };
        }
        return cls;
      }));
    } else {
      const newClass: ClassItem = {
        id: String(Date.now()),
        subject: newSubject.trim().toUpperCase(),
        name: newName.trim(),
        time: `${formatTimeStr(fromTime)} - ${formatTimeStr(toTime)}`,
        room: newRoom.trim(),
        teacher: newTeacher.trim() || 'TBA',
        day: selectedDay,
      };
      setClasses(prev => [...prev, newClass]);
    }

    handleCloseDrawer();
  };

  // Helper to compute the date of a weekday in the current week
  const getDateOfWeekday = (targetWeekdayName: string) => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const currentDayIndex = today.getDay(); // 0 (Sun) to 6 (Sat)
    const targetDayIndex = weekdays.indexOf(targetWeekdayName);

    // Difference in days
    const diff = targetDayIndex - currentDayIndex;

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    return targetDate;
  };

  const getDayNumberOfWeekday = (weekdayName: string) => {
    return getDateOfWeekday(weekdayName).getDate();
  };

  // Date Formatting for the Header
  const getHeaderDateText = (weekdayName: string) => {
    const today = new Date();
    const targetDate = getDateOfWeekday(weekdayName);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[targetDate.getMonth()];
    const date = targetDate.getDate();

    if (targetDate.toDateString() === today.toDateString()) {
      return `Today, ${month} ${date}`;
    } else {
      const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${weekdaysShort[targetDate.getDay()]}, ${month} ${date}`;
    }
  };

  const getMinutesFromMidnight = (timeStr: string) => {
    try {
      const [time, modifier] = timeStr.trim().split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) {
        hours += 12;
      }
      if (modifier === 'AM' && hours === 12) {
        hours = 0;
      }
      return hours * 60 + minutes;
    } catch (e) {
      return 0;
    }
  };

  const getActiveHighlightId = (dayClasses: ClassItem[], weekdayName: string) => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = weekdays[new Date().getDay()];

    if (weekdayName !== todayName || dayClasses.length === 0) {
      return null;
    }

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // 1. Find if there is a class currently in session
    for (const cls of dayClasses) {
      try {
        const [startStr, endStr] = cls.time.split(' - ');
        const startMins = getMinutesFromMidnight(startStr);
        const endMins = getMinutesFromMidnight(endStr);
        if (currentMins >= startMins && currentMins <= endMins) {
          return cls.id;
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. If no class is currently in session, find the NEXT upcoming class
    let upcomingClass: ClassItem | null = null;
    let minDiff = Infinity;

    for (const cls of dayClasses) {
      try {
        const [startStr] = cls.time.split(' - ');
        const startMins = getMinutesFromMidnight(startStr);
        if (startMins > currentMins) {
          const diff = startMins - currentMins;
          if (diff < minDiff) {
            minDiff = diff;
            upcomingClass = cls;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (upcomingClass) {
      return upcomingClass.id;
    }

    return null;
  };

  const filteredClasses = classes.filter(cls => cls.day === selectedDay);
  const highlightedClassId = getActiveHighlightId(filteredClasses, selectedDay);

  // Trigger immediate test notification
  const handleTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Notification Test",
          body: "Class Scheduler notifications are working perfectly!",
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
        },
        trigger: null, // null triggers immediately
      });
    } catch (e) {
      console.error('Failed to trigger test notification', e);
    }
  };

  if (!isAppReady) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Animated.View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          transform: [
            { scale: screenScaleAnim },
            { translateY: screenTranslateYAnim },
          ],
          borderRadius: screenBorderRadiusAnim,
          overflow: 'hidden',
        }}
      >

      {/* TOP FIXED PANEL: Header + Weekday Selector */}
      <View
        style={{
          width: '100%',
          backgroundColor: isDark ? getHeaderBgColor(accentTheme) : getHeaderBgColorLight(accentTheme),
          borderBottomWidth: 1.5,
          borderBottomColor: isDark ? colors.primary + '20' : colors.primary + '15',
        }}
      >
        {/* Header Row */}
        <View
          style={[
            styles.headerContainer,
            {
              paddingTop: insets.top + 16,
              paddingBottom: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            },
          ]}
        >
          <View>
            <TuiText
              style={[
                styles.headerLabel,
                {
                  color: isDark ? getHeaderLabelColor(accentTheme) : colors.mutedForeground,
                },
              ]}
              weight="bold"
              size="xs"
            >
              SCHEDULE
            </TuiText>
            <TuiText
              style={[
                styles.headerTitle,
                { color: isDark ? '#ffffff' : colors.foreground },
              ]}
              weight="bold"
              size="2xl"
            >
              {getHeaderDateText(selectedDay)}
            </TuiText>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Pressable
              onPress={handleTestNotification}
              style={({ pressed }) => [
                styles.settingsBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor: pressed ? colors.primary + '20' : colors.card,
                }
              ]}
            >
              <Bell size={16} color={colors.foreground} />
            </Pressable>

            <Pressable
              onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
              style={({ pressed }) => [
                styles.settingsBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor: pressed ? colors.primary + '20' : colors.card,
                }
              ]}
            >
              {isDark ? (
                <Sun size={16} color={colors.foreground} />
              ) : (
                <Moon size={16} color={colors.foreground} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Date Selector Row */}
        <View
          style={[
            styles.weekdayRow,
            {
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 16,
            },
          ]}
        >
          {DAYS_OF_WEEK.map(day => (
            <DayButton
              key={day.name}
              shortLabel={day.short}
              dateNumber={getDayNumberOfWeekday(day.name)}
              isActive={selectedDay === day.name}
              onPress={() => setSelectedDay(day.name)}
            />
          ))}
        </View>
      </View>

      {/* MAIN CONTENT AREA */}
      <ScrollView
        contentContainerStyle={[
          styles.contentScroll,
          {
            paddingBottom: insets.bottom + 90, // Spacing for the bottom navigation bar
          },
        ]}
        showsVerticalScrollIndicator={false}
      >


        {filteredClasses.length > 0 ? (
          filteredClasses.map((cls, idx) => (
            <Pressable
              key={cls.id}
              onPress={() => handleEditClass(cls)}
              onLongPress={() => handleLongPressDelete(cls)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                }
              ]}
            >
              <TuiContainer
                label={cls.subject}
                badge={cls.room}
                style={styles.classCard}
                accentBorder={cls.id === highlightedClassId}
              >
                <TuiText weight="bold" size="lg" style={{ color: colors.primary }}>
                  {cls.name}
                </TuiText>
                <View style={styles.classMetaRow}>
                  <TuiText size="sm" weight="bold">
                    {cls.time}
                  </TuiText>
                </View>
                <TuiText size="xs" variant="muted" style={{ marginTop: 4 }}>
                  Instructor: {cls.teacher}
                </TuiText>
              </TuiContainer>
            </Pressable>
          ))
        ) : (
          <View style={[styles.emptyContainer, { borderColor: colors.primary + '30' }]}>
            <TuiText weight="bold" variant="muted" style={styles.emptyText}>
              [ NO CLASSES SCHEDULED ]
            </TuiText>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <TuiTabBar
        currentScreen="screen1"
        onNavigate={handleNavigate}
        startAnimation={true}
      />
      </Animated.View>

      {/* ADD/EDIT CLASS MODAL DRAWER */}
      <TuiDrawer
        visible={drawerVisible}
        onClose={handleCloseDrawer}
        title={editingClassId ? "EDIT CLASS SCHEDULE" : "ADD CLASS SCHEDULE"}
        progressAnim={drawerProgressAnim}
      >
        <TuiInput
          label="Subject Name"
          value={newName}
          onChangeText={setNewName}
          placeholder="e.g. Introduction to Computer Science"
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <TuiInput
              label="Subject Code"
              value={newSubject}
              onChangeText={setNewSubject}
              placeholder="e.g. CS-101"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <TuiInput
              label="Room Number"
              value={newRoom}
              onChangeText={setNewRoom}
              placeholder="e.g. Room 402"
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginVertical: 4 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <TuiContainer
              label="From"
              labelSize="sm"
              style={{ height: 56, paddingTop: 0, paddingBottom: 0, justifyContent: 'center' }}
            >
              <Pressable
                onPress={() => {
                  setShowFromPicker(true);
                  setShowToPicker(false);
                }}
                style={styles.timeButtonInner}
              >
                <TuiText weight="bold" style={{ color: colors.foreground }}>
                  {formatTimeStr(fromTime)}
                </TuiText>
              </Pressable>
            </TuiContainer>
          </View>

          <View style={{ flex: 1, marginLeft: 8 }}>
            <TuiContainer
              label="To"
              labelSize="sm"
              style={{ height: 56, paddingTop: 0, paddingBottom: 0, justifyContent: 'center' }}
            >
              <Pressable
                onPress={() => {
                  setShowToPicker(true);
                  setShowFromPicker(false);
                }}
                style={styles.timeButtonInner}
              >
                <TuiText weight="bold" style={{ color: colors.foreground }}>
                  {formatTimeStr(toTime)}
                </TuiText>
              </Pressable>
            </TuiContainer>
          </View>
        </View>

        <TuiInput
          label="Instructor Name"
          value={newTeacher}
          onChangeText={setNewTeacher}
          placeholder="e.g. Danel Oandasan (optional)"
        />

        {/* Android DateTimePickers */}
        {showFromPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={fromTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={(event, date) => {
              setShowFromPicker(false);
              if (date) setFromTime(date);
            }}
          />
        )}

        {showToPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={toTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={(event, date) => {
              setShowToPicker(false);
              if (date) setToTime(date);
            }}
          />
        )}

        {/* iOS Floating DateTimePickers */}
        <Modal
          visible={showFromPicker && Platform.OS === 'ios'}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFromPicker(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowFromPicker(false)}
            />
            <View style={styles.iosFloatingPickerWrapper}>
              <View
                onLayout={(e) => setFromCardWidth(e.nativeEvent.layout.width)}
                style={[
                  styles.iosFloatingPickerCard,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.card,
                    borderTopWidth: 0,
                  }
                ]}
              >
                {/* Segmented Top Borders */}
                <View
                  style={[
                    styles.borderTopLeft,
                    {
                      backgroundColor: colors.primary,
                      width: Math.max(0, (fromCardWidth - fromLegendWidth) / 2)
                    }
                  ]}
                />
                <View
                  style={[
                    styles.borderTopRight,
                    {
                      backgroundColor: colors.primary,
                      left: Math.max(0, (fromCardWidth + fromLegendWidth) / 2)
                    }
                  ]}
                />

                <View
                  onLayout={(e) => setFromLegendWidth(e.nativeEvent.layout.width)}
                  style={styles.floatingLegendWrapper}
                >
                  <TuiText weight="bold" style={{ color: colors.primary }}>
                    Start Time
                  </TuiText>
                </View>

                <DateTimePicker
                  value={fromTime}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  textColor={colors.foreground}
                  onChange={(event, date) => {
                    if (date) setFromTime(date);
                  }}
                />

                <TuiButton
                  variant="outline"
                  onPress={() => setShowFromPicker(false)}
                  style={{ marginTop: 12, width: '100%' }}
                >
                  Confirm
                </TuiButton>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showToPicker && Platform.OS === 'ios'}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowToPicker(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowToPicker(false)}
            />
            <View style={styles.iosFloatingPickerWrapper}>
              <View
                onLayout={(e) => setToCardWidth(e.nativeEvent.layout.width)}
                style={[
                  styles.iosFloatingPickerCard,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.card,
                    borderTopWidth: 0,
                  }
                ]}
              >
                {/* Segmented Top Borders */}
                <View
                  style={[
                    styles.borderTopLeft,
                    {
                      backgroundColor: colors.primary,
                      width: Math.max(0, (toCardWidth - toLegendWidth) / 2)
                    }
                  ]}
                />
                <View
                  style={[
                    styles.borderTopRight,
                    {
                      backgroundColor: colors.primary,
                      left: Math.max(0, (toCardWidth + toLegendWidth) / 2)
                    }
                  ]}
                />

                <View
                  onLayout={(e) => setToLegendWidth(e.nativeEvent.layout.width)}
                  style={styles.floatingLegendWrapper}
                >
                  <TuiText weight="bold" style={{ color: colors.primary }}>
                    End Time
                  </TuiText>
                </View>

                <DateTimePicker
                  value={toTime}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  textColor={colors.foreground}
                  onChange={(event, date) => {
                    if (date) setToTime(date);
                  }}
                />

                <TuiButton
                  variant="outline"
                  onPress={() => setShowToPicker(false)}
                  style={{ marginTop: 12, width: '100%' }}
                >
                  Confirm
                </TuiButton>
              </View>
            </View>
          </View>
        </Modal>



        {formError ? (
          <TuiText size="xs" variant="destructive" style={{ marginBottom: 12, textAlign: 'center' }}>
            * {formError}
          </TuiText>
        ) : null}

        <View style={[styles.drawerActions, { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }]}>
          <TuiButton variant="outline" style={{ flex: 1 }} onPress={handleCloseDrawer}>
            Cancel
          </TuiButton>
          <TuiButton variant="accent" style={{ flex: 1 }} onPress={handleAddOrUpdateClass}>
            {editingClassId ? 'Save Changes' : 'Save Schedule'}
          </TuiButton>
        </View>
      </TuiDrawer>




    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  headerLabel: {
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    // Large, bold title
  },
  settingsBtn: {
    borderWidth: 1.5,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  contentScroll: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  classCard: {
    marginTop: 20,
  },
  classMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  emptyContainer: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  drawerActions: {
    marginTop: 16,
  },
  timeButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosFloatingPickerWrapper: {
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  iosFloatingPickerCard: {
    width: '100%',
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
  },
  floatingLegendWrapper: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    paddingHorizontal: 8,
    zIndex: 10,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  daySquare: {
    height: 52,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 2,
  },
  dayLegendWrapper: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    paddingHorizontal: 2,
    zIndex: 10,
  },
  borderLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1.5,
    zIndex: 5,
  },
  borderRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 1.5,
    zIndex: 5,
  },
  borderBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1.5,
    zIndex: 5,
  },
  borderTopLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 1.5,
    zIndex: 5,
  },
  borderTopRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 1.5,
    zIndex: 5,
  },
});
