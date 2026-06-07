/* eslint-disable react-hooks/refs, @typescript-eslint/no-unused-vars, prefer-const, react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, ScrollView, Pressable, Platform, Modal, Alert, LayoutAnimation, UIManager, findNodeHandle, Dimensions, Easing } from 'react-native';
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
import { Sun, Moon, Bell, BookOpen, Gamepad2, Dumbbell, MoreHorizontal, ChevronLeft, Calendar, Trash2 } from 'lucide-react-native';
import { TuiTimePicker } from './src/components/tui-time-picker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPermissions, syncNotifications, ScheduleItem } from './src/utils/notifications-service';
import * as SplashScreen from 'expo-splash-screen';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});



// Interface ScheduleItem is imported from notifications-service

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

const PICKER_FADE_DURATION = 70;

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const TimePickerModal: React.FC<TimePickerModalProps> = ({ visible, onClose, children }) => {
  const [mounted, setMounted] = useState(visible);
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: PICKER_FADE_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: PICKER_FADE_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, opacity]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)', opacity }]}>
        {children}
      </Animated.View>
    </Modal>
  );
};

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

interface CategoryButtonProps {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onPress: () => void;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ label, icon: IconComponent, isActive, onPress }) => {
  const { colors, isDark } = useTheme();
  const borderAccent = colors.primary;
  const borderInactive = isDark ? colors.border : '#D4D4D8';
  const currentBorder = isActive ? borderAccent : borderInactive;
  const [legendWidth, setLegendWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const topSegmentWidth = Math.max(0, (containerWidth - legendWidth) / 2);

  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={({ pressed }) => [
        styles.categorySquareBtn,
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

      {/* Legend / Label sitting on top */}
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
          {label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()}
        </TuiText>
      </View>

      {/* Content (Just the Icon) */}
      <IconComponent
        size={22}
        color={isActive ? colors.primary : colors.foreground}
      />
    </Pressable>
  );
};

interface NeobrutalistSliderProps {
  value: 'light' | 'moderate' | 'heavy';
  onChange: (value: 'light' | 'moderate' | 'heavy') => void;
}

const NeobrutalistSlider: React.FC<NeobrutalistSliderProps> = ({ value, onChange }) => {
  const { colors, isDark } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbSize = 12;
  const animLeft = useRef(new Animated.Value(0)).current;
  const isFirstMeasureRef = useRef(true);

  const getIndex = (val: 'light' | 'moderate' | 'heavy') => {
    if (val === 'light') return 0;
    if (val === 'heavy') return 2;
    return 1;
  };

  useEffect(() => {
    if (trackWidth > 0) {
      const index = getIndex(value);
      const usableWidth = trackWidth - thumbSize;
      const targetLeft = index === 0 ? 0 : index === 2 ? usableWidth : usableWidth / 2;

      if (isFirstMeasureRef.current) {
        animLeft.setValue(targetLeft);
        isFirstMeasureRef.current = false;
      } else {
        Animated.spring(animLeft, {
          toValue: targetLeft,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }).start();
      }
    }
  }, [value, trackWidth]);

  const handleTouch = (locationX: number) => {
    if (trackWidth === 0) return;
    const clampedX = Math.max(0, Math.min(locationX, trackWidth));
    const third = trackWidth / 3;
    if (clampedX < third) {
      onChange('light');
    } else if (clampedX < third * 2) {
      onChange('moderate');
    } else {
      onChange('heavy');
    }
  };

  return (
    <View style={{ marginVertical: 8, width: '100%' }}>
      {/* Touch Target Container */}
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(evt) => handleTouch(evt.nativeEvent.locationX)}
        onResponderMove={(evt) => handleTouch(evt.nativeEvent.locationX)}
        style={{
          height: 40,
          width: '100%',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Inactive Track */}
        <View
          style={{
            height: 10,
            width: '100%',
            backgroundColor: isDark ? '#27272A' : '#E4E4E7',
            position: 'relative',
          }}
        >
          {/* Active Progress Fill */}
          {trackWidth > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: animLeft,
                backgroundColor: colors.primary,
              }}
            />
          )}
        </View>

        {/* Thumb */}
        {trackWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: animLeft,
              top: 8, // Centers the 24px high thumb in the 40px container: (40 - 24) / 2 = 8
              width: thumbSize,
              height: 24,
              backgroundColor: isDark ? '#FFFFFF' : '#18181B',
            }}
          />
        )}
      </View>

      {/* Labels below the track */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 }}>
        <Pressable onPress={() => onChange('light')}>
          <TuiText
            weight={value === 'light' ? 'bold' : 'regular'}
            style={{
              fontSize: 12,
              color: value === 'light' ? colors.primary : colors.mutedForeground,
            }}
          >
            Light
          </TuiText>
        </Pressable>
        <Pressable onPress={() => onChange('moderate')}>
          <TuiText
            weight={value === 'moderate' ? 'bold' : 'regular'}
            style={{
              fontSize: 12,
              color: value === 'moderate' ? colors.primary : colors.mutedForeground,
            }}
          >
            Moderate
          </TuiText>
        </Pressable>
        <Pressable onPress={() => onChange('heavy')}>
          <TuiText
            weight={value === 'heavy' ? 'bold' : 'regular'}
            style={{
              fontSize: 12,
              color: value === 'heavy' ? colors.primary : colors.mutedForeground,
            }}
          >
            Heavy
          </TuiText>
        </Pressable>
      </View>
    </View>
  );
};

interface ScheduleCardProps {
  item: ScheduleItem;
  index: number;
  highlightedItemId: string | null;
  exiting: boolean;
  onExitComplete: () => void;
  onPress: () => void;
  onLongPress: (bounds: { x: number; y: number; width: number; height: number }) => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  item,
  index,
  highlightedItemId,
  exiting,
  onExitComplete,
  onPress,
  onLongPress,
}) => {
  const { colors, isDark } = useTheme();
  const cardRef = useRef<View>(null);
  const enterAnim = useRef(new Animated.Value(0)).current;
  const exitAnim = useRef(new Animated.Value(0)).current;

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case 'studying':
        return { icon: BookOpen, label: 'Studying', color: colors.primary };
      case 'playing':
        return { icon: Gamepad2, label: 'Playing', color: colors.primary };
      case 'workout':
        return { icon: Dumbbell, label: 'Workout', color: colors.primary };
      default:
        return { icon: MoreHorizontal, label: 'Other', color: colors.primary };
    }
  };

  const { icon: IconComponent, label: categoryLabel, color: categoryColor } = getCategoryDetails(item.category);

  let displayTitle = item.title;
  let subtitleText: string;
  
  if (item.category === 'workout') {
    const wFocus = item.workoutCategory ? item.workoutCategory.charAt(0).toUpperCase() + item.workoutCategory.slice(1).toLowerCase() : 'General';
    const intens = item.intensity ? item.intensity.charAt(0).toUpperCase() + item.intensity.slice(1).toLowerCase() : 'Moderate';
    displayTitle = `${wFocus} Body Workout`;
    subtitleText = `Intensity: ${intens}`;
  } else if (item.category === 'playing') {
    displayTitle = item.title || 'Casual Gaming';
    subtitleText = 'Gaming Session';
  } else if (item.category === 'studying') {
    subtitleText = 'Topic Focus';
  } else {
    subtitleText = 'Other Activity';
  }

  const handleLongPress = () => {
    const node = findNodeHandle(cardRef.current);
    if (node != null) {
      UIManager.measure(node, (x, y, width, height, pageX, pageY) => {
        onLongPress({ x: pageX, y: pageY, width, height });
      });
    }
  };

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 60),
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterAnim, index]);

  useEffect(() => {
    if (!exiting) {
      exitAnim.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.delay(80),
      Animated.timing(exitAnim, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
    ]).start(({ finished }) => {
      if (finished) onExitComplete();
    });
  }, [exiting, exitAnim, onExitComplete]);

  const enterScale = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const exitScale = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const exitTranslateY = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  const exitOpacity = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const combinedOpacity = Animated.multiply(enterAnim, exitOpacity);

  return (
    <View ref={cardRef} collapsable={false}>
      <Animated.View
        style={{
          opacity: combinedOpacity,
          transform: [
            { scale: enterScale },
            { scale: exitScale },
            { translateY: exitTranslateY },
          ],
        }}
      >
        <Pressable
          onPress={onPress}
          onLongPress={handleLongPress}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            }
          ]}
        >
          <TuiContainer
            label={categoryLabel}
            badge={item.category === 'workout' ? (item.intensity ? item.intensity.charAt(0).toUpperCase() + item.intensity.slice(1).toLowerCase() : undefined) : undefined}
            style={styles.classCard}
            accentBorder={item.id === highlightedItemId}
          >
            <View style={styles.cardHeaderRow}>
              <IconComponent size={18} color={categoryColor} style={{ marginRight: 8 }} />
              <TuiText weight="bold" size="lg" style={{ color: categoryColor, flex: 1 }}>
                {displayTitle}
              </TuiText>
            </View>
            <View style={styles.classMetaRow}>
              <TuiText size="sm" weight="bold">
                {item.time}
              </TuiText>
            </View>
            <TuiText size="xs" variant="muted" style={{ marginTop: 4 }}>
              {subtitleText}
            </TuiText>
          </TuiContainer>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const AnimatedEmptyState: React.FC<{ colors: any }> = ({ colors }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          borderColor: colors.primary + '30',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TuiText weight="bold" variant="muted" style={styles.emptyText}>
        [ No activities scheduled ]
      </TuiText>
    </Animated.View>
  );
};

interface ContextMenuOverlayProps {
  target: {
    item: ScheduleItem;
    bounds: { x: number; y: number; width: number; height: number };
  };
  onClose: () => void;
  onReschedule: () => void;
  onDelete: () => void;
}

const ContextMenuOverlay: React.FC<ContextMenuOverlayProps> = ({
  target,
  onClose,
  onReschedule,
  onDelete,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  const { item, bounds } = target;

  const animOpacity = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(animScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAction = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(animScale, {
        toValue: 0.95,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
    });
  };

  // Calculate layout sizes
  const menuHeight = 88; // 2 rows * 44px
  const previewHeight = bounds.height;
  const previewWidth = bounds.width;
  const previewLeft = bounds.x;
  const previewTop = bounds.y;

  const spaceAbove = previewTop - insets.top;
  const spaceBelow = screenHeight - insets.bottom - (previewTop + previewHeight);
  const showBelow = spaceBelow > spaceAbove;

  const menuLeft = previewLeft + (previewWidth - 200) / 2;
  let menuTop = showBelow 
    ? previewTop + previewHeight + 12 
    : previewTop - menuHeight - 12;

  if (menuTop < insets.top + 16) {
    menuTop = insets.top + 16;
  } else if (menuTop + menuHeight > screenHeight - insets.bottom - 16) {
    menuTop = screenHeight - insets.bottom - 16 - menuHeight;
  }

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case 'studying':
        return { icon: BookOpen, label: 'Studying', color: colors.primary };
      case 'playing':
        return { icon: Gamepad2, label: 'Playing', color: colors.primary };
      case 'workout':
        return { icon: Dumbbell, label: 'Workout', color: colors.primary };
      default:
        return { icon: MoreHorizontal, label: 'Other', color: colors.primary };
    }
  };

  const { icon: IconComponent, label: categoryLabel, color: categoryColor } = getCategoryDetails(item.category);

  let displayTitle = item.title;
  let subtitleText: string;
  
  if (item.category === 'workout') {
    const wFocus = item.workoutCategory ? item.workoutCategory.charAt(0).toUpperCase() + item.workoutCategory.slice(1).toLowerCase() : 'General';
    const intens = item.intensity ? item.intensity.charAt(0).toUpperCase() + item.intensity.slice(1).toLowerCase() : 'Moderate';
    displayTitle = `${wFocus} Body Workout`;
    subtitleText = `Intensity: ${intens}`;
  } else if (item.category === 'playing') {
    displayTitle = item.title || 'Casual Gaming';
    subtitleText = 'Gaming Session';
  } else if (item.category === 'studying') {
    subtitleText = 'Topic Focus';
  } else {
    subtitleText = 'Other Activity';
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 9990 }]}>
      {/* Backdrop */}
      <Pressable onPress={() => handleAction(onClose)} style={StyleSheet.absoluteFillObject}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: 'rgba(0,0,0,0.6)',
              opacity: animOpacity,
            },
          ]}
        />
      </Pressable>

      {/* Cloned Card Preview */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: previewLeft,
            top: previewTop,
            width: previewWidth,
            height: previewHeight,
            zIndex: 9996,
            opacity: animOpacity,
            transform: [{ scale: animScale }],
          }
        ]}
      >
        <TuiContainer
          label={categoryLabel}
          badge={item.category === 'workout' ? (item.intensity ? item.intensity.charAt(0).toUpperCase() + item.intensity.slice(1).toLowerCase() : undefined) : undefined}
          style={styles.classCard}
          accentBorder={true}
        >
          <View style={styles.cardHeaderRow}>
            <IconComponent size={18} color={categoryColor} style={{ marginRight: 8 }} />
            <TuiText weight="bold" size="lg" style={{ color: categoryColor, flex: 1 }}>
              {displayTitle}
            </TuiText>
          </View>
          <View style={styles.classMetaRow}>
            <TuiText size="sm" weight="bold">
              {item.time}
            </TuiText>
          </View>
          <TuiText size="xs" variant="muted" style={{ marginTop: 4 }}>
            {subtitleText}
          </TuiText>
        </TuiContainer>
      </Animated.View>

      {/* Context Menu floating next to card */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: menuLeft,
            top: menuTop,
            width: 200,
            height: menuHeight,
            zIndex: 9997,
            borderWidth: 1.5,
            borderColor: colors.primary,
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            opacity: animOpacity,
            transform: [{ scale: animScale }],
            overflow: 'hidden',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 10,
          }
        ]}
      >
        {/* Reschedule Row */}
        <Pressable
          onPress={() => handleAction(onReschedule)}
          style={({ pressed }) => [
            {
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.primary + '20',
              backgroundColor: pressed ? colors.primary + '15' : 'transparent',
            }
          ]}
        >
          <TuiText size="sm" weight="bold" style={{ color: colors.foreground }}>
            Reschedule
          </TuiText>
          <Calendar size={16} color={colors.foreground} />
        </Pressable>

        {/* Delete Row */}
        <Pressable
          onPress={() => handleAction(onDelete)}
          style={({ pressed }) => [
            {
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              backgroundColor: pressed ? colors.destructive + '15' : 'transparent',
            }
          ]}
        >
          <TuiText size="sm" weight="bold" style={{ color: colors.destructive }}>
            Delete
          </TuiText>
          <Trash2 size={16} color={colors.destructive} />
        </Pressable>
      </Animated.View>
    </View>
  );
};

function MainApp() {
  const { colors, isDark, accentTheme, setThemeMode, loading } = useTheme();
  const insets = useSafeAreaInsets();



  // Splash screen states
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  // App States
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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

  // Context Menu Target State
  const [contextMenuTarget, setContextMenuTarget] = useState<{
    item: ScheduleItem;
    bounds: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [rescheduleTargetItem, setRescheduleTargetItem] = useState<ScheduleItem | null>(null);
  const [exitingItemId, setExitingItemId] = useState<string | null>(null);
  const pendingRescheduleRef = useRef<{
    itemId: string;
    day: string;
    time: string;
  } | null>(null);
  const pendingDeleteItemIdRef = useRef<string | null>(null);

  // Reschedule Drawer States
  const [rescheduleDrawerVisible, setRescheduleDrawerVisible] = useState(false);
  const [rescheduleDay, setRescheduleDay] = useState<string>('Monday');
  const [rescheduleFromTime, setRescheduleFromTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [rescheduleToTime, setRescheduleToTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(10, 30, 0, 0);
    return d;
  });
  const [showRescheduleFromPicker, setShowRescheduleFromPicker] = useState(false);
  const [showRescheduleToPicker, setShowRescheduleToPicker] = useState(false);

  // iOS Reschedule Picker Measurements
  const [rescheduleFromCardWidth, setRescheduleFromCardWidth] = useState(0);
  const [rescheduleFromLegendWidth, setRescheduleFromLegendWidth] = useState(0);
  const [rescheduleToCardWidth, setRescheduleToCardWidth] = useState(0);
  const [rescheduleToLegendWidth, setRescheduleToLegendWidth] = useState(0);

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

  // Add Item Drawer States
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Wizard Flow States (No longer using multi-stage wizard, using single-stage expanded accordion)
  const [newCategory, setNewCategory] = useState<'studying' | 'playing' | 'workout' | 'other' | null>('studying');
  const [newTitle, setNewTitle] = useState('');
  const [newWorkoutCategory, setNewWorkoutCategory] = useState<'upper' | 'core' | 'lower' | 'cardio' | null>(null);
  const [newIntensity, setNewIntensity] = useState<'light' | 'moderate' | 'heavy'>('moderate');
  const [formError, setFormError] = useState('');
  const categoryTransitionLock = useRef(false);

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

  const categories: { id: 'studying' | 'playing' | 'workout' | 'other'; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'studying', label: 'Studying', icon: BookOpen, color: colors.primary },
    { id: 'playing', label: 'Playing', icon: Gamepad2, color: colors.primary },
    { id: 'workout', label: 'Workout', icon: Dumbbell, color: colors.primary },
    { id: 'other', label: 'Other', icon: MoreHorizontal, color: colors.primary },
  ];

  const workoutCategories: { id: 'upper' | 'core' | 'lower' | 'cardio'; label: string }[] = [
    { id: 'upper', label: 'Upper' },
    { id: 'core', label: 'Core' },
    { id: 'lower', label: 'Lower' },
    { id: 'cardio', label: 'Cardio' },
  ];

  const intensities: { id: 'light' | 'moderate' | 'heavy'; label: string }[] = [
    { id: 'light', label: 'Light' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'heavy', label: 'Heavy' },
  ];

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case 'studying':
        return { icon: BookOpen, label: 'Studying', color: colors.primary };
      case 'playing':
        return { icon: Gamepad2, label: 'Playing', color: colors.primary };
      case 'workout':
        return { icon: Dumbbell, label: 'Workout', color: colors.primary };
      default:
        return { icon: MoreHorizontal, label: 'Other', color: colors.primary };
    }
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

  // Load schedule on mount (with migration from old classes key)
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const savedSchedule = await AsyncStorage.getItem('habits_schedule');
        if (savedSchedule) {
          setSchedule(JSON.parse(savedSchedule));
        } else {
          // Attempt migration from old classes key
          const savedClasses = await AsyncStorage.getItem('classes');
          if (savedClasses) {
            const parsed = JSON.parse(savedClasses);
            const migrated: ScheduleItem[] = parsed.map((c: { id: string; name?: string; subject?: string; time: string; day: string }) => ({
              id: c.id,
              category: 'studying',
              title: c.name || c.subject || 'Study Session',
              time: c.time,
              day: c.day,
            }));
            setSchedule(migrated);
            await AsyncStorage.setItem('habits_schedule', JSON.stringify(migrated));
            await AsyncStorage.removeItem('classes');
          }
        }
      } catch (e) {
        console.error('Failed to load schedule', e);
      } finally {
        setScheduleLoaded(true);
      }
    };
    loadSchedule();
  }, []);

  // Save schedule and sync scheduled notifications whenever schedule list changes
  useEffect(() => {
    if (scheduleLoaded) {
      const saveAndSync = async () => {
        try {
          await AsyncStorage.setItem('habits_schedule', JSON.stringify(schedule));
        } catch (e) {
          console.error('Failed to save schedule', e);
        }
        syncNotifications(schedule);
      };
      saveAndSync();
    }
  }, [schedule, scheduleLoaded]);

  // Hide native splash screen once resources are loaded
  useEffect(() => {
    if (dataLoaded && scheduleLoaded && !loading) {
      setIsAppReady(true);
    }
  }, [dataLoaded, scheduleLoaded, loading]);

  // Hide splash screen when app is ready
  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  // Handle Tab Navigation
  const handleNavigate = (screen: ScreenType) => {
    if (screen === 'action') {
      setNewCategory('studying');
      setNewTitle('');
      setNewWorkoutCategory(null);
      setNewIntensity('moderate');
      setFormError('');
      setDrawerVisible(true);
    }
  };

  // Close Drawer
  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setEditingItemId(null);
    setNewCategory('studying');
    setNewTitle('');
    setNewWorkoutCategory(null);
    setNewIntensity('moderate');
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

  // Helper to parse time string into a Date object
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

  // Edit Click Handler
  const handleEditItem = (item: ScheduleItem) => {
    setEditingItemId(item.id);
    setNewCategory(item.category);
    setNewTitle(item.title);
    setNewWorkoutCategory(item.workoutCategory || null);
    setNewIntensity(item.intensity || 'moderate');

    const timeParts = item.time.split(' - ');
    if (timeParts.length === 2) {
      setFromTime(parseTimeStrToDate(timeParts[0]));
      setToTime(parseTimeStrToDate(timeParts[1]));
    }
    setDrawerVisible(true);
  };

  // Context Menu & Single-Item Reschedule Helper Functions
  const handleDeleteTarget = (item: ScheduleItem) => {
    Alert.alert(
      'Delete Activity',
      `Are you sure you want to delete this activity?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            pendingDeleteItemIdRef.current = item.id;
            setExitingItemId(item.id);
          }
        }
      ],
      { cancelable: true }
    );
  };

  const getConflictItem = () => {
    if (!rescheduleTargetItem) return null;
    const targetItem = rescheduleTargetItem;
    
    const proposedStart = rescheduleFromTime.getHours() * 60 + rescheduleFromTime.getMinutes();
    const proposedEnd = rescheduleToTime.getHours() * 60 + rescheduleToTime.getMinutes();
    
    for (const item of schedule) {
      if (item.id === targetItem.id) continue;
      if (item.day !== rescheduleDay) continue;
      
      const timeParts = item.time.split(' - ');
      if (timeParts.length === 2) {
        const itemStartVal = parseTimeStrToDate(timeParts[0]);
        const itemEndVal = parseTimeStrToDate(timeParts[1]);
        
        const itemStart = itemStartVal.getHours() * 60 + itemStartVal.getMinutes();
        const itemEnd = itemEndVal.getHours() * 60 + itemEndVal.getMinutes();
        
        if (proposedStart < itemEnd && itemStart < proposedEnd) {
          return item;
        }
      }
    }
    return null;
  };

  const handleApplyReschedule = () => {
    if (!rescheduleTargetItem) return;
    if (rescheduleFromTime >= rescheduleToTime) return;
    if (getConflictItem()) return;
    
    const targetItem = rescheduleTargetItem;
    const timeStr = `${formatTimeStr(rescheduleFromTime)} - ${formatTimeStr(rescheduleToTime)}`;
    const isSameDay = targetItem.day === rescheduleDay;
    const isSameTime = targetItem.time === timeStr;

    if (isSameDay && isSameTime) {
      setSchedule(prev => prev.map(item => {
        if (item.id === targetItem.id) {
          return {
            ...item,
            day: rescheduleDay,
            time: timeStr,
          };
        }
        return item;
      }));

      setRescheduleDrawerVisible(false);
      setContextMenuTarget(null);
      setRescheduleTargetItem(null);
      return;
    }

    pendingRescheduleRef.current = {
      itemId: targetItem.id,
      day: rescheduleDay,
      time: timeStr,
    };
    setExitingItemId(targetItem.id);

    setRescheduleDrawerVisible(false);
    setContextMenuTarget(null);
    setRescheduleTargetItem(null);
  };

  const commitPendingReschedule = () => {
    const pending = pendingRescheduleRef.current;
    if (!pending) return;

    setSchedule(prev => prev.map(item => {
      if (item.id === pending.itemId) {
        return {
          ...item,
          day: pending.day,
          time: pending.time,
        };
      }
      return item;
    }));

    pendingRescheduleRef.current = null;
    setExitingItemId(null);
  };

  const handleExitComplete = () => {
    if (pendingDeleteItemIdRef.current) {
      const deleteId = pendingDeleteItemIdRef.current;
      setSchedule(prev => prev.filter(x => x.id !== deleteId));
      pendingDeleteItemIdRef.current = null;
      setExitingItemId(null);
    } else if (pendingRescheduleRef.current) {
      commitPendingReschedule();
    }
  };

  const animateDrawerLayoutChange = () => {
    LayoutAnimation.configureNext({
      duration: 250,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  };

  // Reset context menu when selected day changes
  useEffect(() => {
    setContextMenuTarget(null);
  }, [selectedDay]);

  // Add or Update Schedule Submission
  const handleAddOrUpdateItem = () => {
    if (!newCategory) {
      setFormError('Category is required');
      return;
    }

    let finalTitle = newTitle.trim();
    if (newCategory === 'studying') {
      if (!finalTitle) {
        setFormError('Subject / Topic is required');
        return;
      }
    } else if (newCategory === 'playing') {
      if (!finalTitle) {
        finalTitle = 'Casual Gaming';
      }
    } else if (newCategory === 'workout') {
      if (!newWorkoutCategory) {
        setFormError('Workout focus is required');
        return;
      }
      finalTitle = `${newWorkoutCategory.charAt(0).toUpperCase() + newWorkoutCategory.slice(1)} Body`;
    } else if (newCategory === 'other') {
      if (!finalTitle) {
        setFormError('Activity title is required');
        return;
      }
    }

    if (toTime.getHours() < fromTime.getHours() || (toTime.getHours() === fromTime.getHours() && toTime.getMinutes() <= fromTime.getMinutes())) {
      setFormError('End time must be after start time');
      return;
    }

    const itemData: Omit<ScheduleItem, 'id'> = {
      category: newCategory,
      title: finalTitle,
      time: `${formatTimeStr(fromTime)} - ${formatTimeStr(toTime)}`,
      day: selectedDay,
      ...(newCategory === 'workout' ? {
        workoutCategory: newWorkoutCategory || 'upper',
        intensity: newIntensity || 'moderate',
      } : {}),
    };

    if (editingItemId) {
      setSchedule(prev => prev.map(item => {
        if (item.id === editingItemId) {
          return {
            ...item,
            ...itemData,
          };
        }
        return item;
      }));
    } else {
      const newItem: ScheduleItem = {
        id: String(Date.now()),
        ...itemData,
      };
      setSchedule(prev => [...prev, newItem]);
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

  const getActiveHighlightId = (dayItems: ScheduleItem[], weekdayName: string) => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = weekdays[new Date().getDay()];

    if (weekdayName !== todayName || dayItems.length === 0) {
      return null;
    }

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // 1. Find if there is an item currently in session
    for (const item of dayItems) {
      try {
        const [startStr, endStr] = item.time.split(' - ');
        const startMins = getMinutesFromMidnight(startStr);
        const endMins = getMinutesFromMidnight(endStr);
        if (currentMins >= startMins && currentMins <= endMins) {
          return item.id;
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. If no item is currently in session, find the NEXT upcoming item
    let upcomingItem: ScheduleItem | null = null;
    let minDiff = Infinity;

    for (const item of dayItems) {
      try {
        const [startStr] = item.time.split(' - ');
        const startMins = getMinutesFromMidnight(startStr);
        if (startMins > currentMins) {
          const diff = startMins - currentMins;
          if (diff < minDiff) {
            minDiff = diff;
            upcomingItem = item;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (upcomingItem) {
      return upcomingItem.id;
    }

    return null;
  };

  const filteredSchedule = schedule.filter(item => item.day === selectedDay);
  const highlightedItemId = getActiveHighlightId(filteredSchedule, selectedDay);

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

  const conflictItem = getConflictItem();
  const hasInvalidRescheduleTime = rescheduleFromTime >= rescheduleToTime;

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
              Schedule
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


        {filteredSchedule.length > 0 ? (
          filteredSchedule.map((item, index) => (
              <ScheduleCard
                key={item.id}
                item={item}
                index={index}
                highlightedItemId={highlightedItemId}
                exiting={item.id === exitingItemId}
                onExitComplete={handleExitComplete}
                onPress={() => handleEditItem(item)}
                onLongPress={(bounds) => {
                  setContextMenuTarget({ item, bounds });
                }}
              />
          ))
        ) : (
          <AnimatedEmptyState colors={colors} />
        )}
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <TuiTabBar
        currentScreen="screen1"
        onNavigate={handleNavigate}
        startAnimation={true}
      />
      </Animated.View>

      {/* ADD/EDIT HABIT SCHEDULE DRAWER */}
      <TuiDrawer
        visible={drawerVisible}
        onClose={handleCloseDrawer}
        title={editingItemId ? "Edit Schedule" : "Add to Schedule"}
        progressAnim={drawerProgressAnim}
      >
        <View style={styles.wizardStepContainer}>
          <TuiText weight="bold" size="sm" style={{ color: colors.mutedForeground, marginBottom: 8 }}>
            Select Category
          </TuiText>
          
          <View style={styles.categoryRow}>
            {categories.map((cat) => (
              <CategoryButton
                key={cat.id}
                label={cat.label}
                icon={cat.icon}
                isActive={newCategory === cat.id}
                onPress={() => {
                  if (categoryTransitionLock.current) return;
                  categoryTransitionLock.current = true;
                  setTimeout(() => {
                    categoryTransitionLock.current = false;
                  }, 300);

                  LayoutAnimation.configureNext({
                    duration: 250,
                    create: {
                      type: LayoutAnimation.Types.easeInEaseOut,
                      property: LayoutAnimation.Properties.opacity,
                    },
                    update: {
                      type: LayoutAnimation.Types.easeInEaseOut,
                    },
                    delete: {
                      type: LayoutAnimation.Types.easeInEaseOut,
                      property: LayoutAnimation.Properties.opacity,
                    },
                  });
                  setNewCategory(cat.id);
                  setFormError('');
                }}
              />
            ))}
          </View>

          {newCategory !== null && (
            <View style={{ marginTop: 12 }}>
              {/* Time range pickers (From / To) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <TuiContainer
                    label="From"
                    labelSize="sm"
                    style={{ height: 56, paddingTop: 0, paddingBottom: 0, justifyContent: 'center' }}
                  >
                    <Pressable
                      onPressIn={() => {
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
                      onPressIn={() => {
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

              {/* Category-specific inputs */}
              {newCategory === 'studying' && (
                <TuiInput
                  label="Subject / Topic"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="e.g. React Native, Algorithms"
                />
              )}

              {newCategory === 'playing' && (
                <TuiInput
                  label="Game Title (Optional)"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="e.g. Elden Ring, Chess"
                />
              )}

              {newCategory === 'workout' && (
                <>
                  <TuiContainer label="Workout Focus" labelSize="sm" style={{ marginVertical: 8 }}>
                    <View style={styles.subCategoryRow}>
                      {workoutCategories.map((wCat) => {
                        const isSelected = newWorkoutCategory === wCat.id;
                        return (
                          <Pressable
                            key={wCat.id}
                            onPress={() => setNewWorkoutCategory(wCat.id)}
                            style={[
                              styles.subCategoryBtn,
                              {
                                backgroundColor: isSelected ? colors.primary : 'transparent',
                                borderColor: colors.primary,
                                flex: 1,
                                height: 48,
                              }
                            ]}
                          >
                            <TuiText
                              weight="bold"
                              style={{
                                color: isSelected ? colors.primaryForeground : colors.foreground,
                                fontSize: 14,
                                textAlign: 'center',
                              }}
                            >
                              {wCat.label}
                            </TuiText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </TuiContainer>

                  <TuiContainer label="Intensity" labelSize="sm" style={{ marginVertical: 8 }}>
                    <NeobrutalistSlider
                      value={newIntensity}
                      onChange={setNewIntensity}
                    />
                  </TuiContainer>
                </>
              )}

              {newCategory === 'other' && (
                <TuiInput
                  label="Activity Title"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="e.g. Meditate, Laundry"
                />
              )}
            </View>
          )}

          {formError ? (
            <TuiText size="xs" variant="destructive" style={{ marginVertical: 12, textAlign: 'center' }}>
              * {formError}
            </TuiText>
          ) : null}

          <View style={[styles.drawerActions, { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16 }]}>
            <TuiButton variant="outline" style={{ flex: 1 }} onPress={handleCloseDrawer}>
              Cancel
            </TuiButton>
            <TuiButton 
              variant="accent" 
              style={{ flex: 1 }} 
              onPress={handleAddOrUpdateItem}
              disabled={!newCategory}
            >
              {editingItemId ? 'Save Changes' : 'Save Schedule'}
            </TuiButton>
          </View>
        </View>

        {/* Custom Floating DateTimePickers */}
        <TimePickerModal
          visible={showFromPicker}
          onClose={() => setShowFromPicker(false)}
        >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPressIn={() => setShowFromPicker(false)}
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

                <TuiTimePicker
                  value={fromTime}
                  onChange={setFromTime}
                />

              </View>
            </View>
        </TimePickerModal>

        <TimePickerModal
          visible={showToPicker}
          onClose={() => setShowToPicker(false)}
        >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPressIn={() => setShowToPicker(false)}
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

                <TuiTimePicker
                  value={toTime}
                  onChange={setToTime}
                />

              </View>
            </View>
        </TimePickerModal>
      </TuiDrawer>

      {/* RESCHEDULE DRAWER */}
      <TuiDrawer
        visible={rescheduleDrawerVisible}
        onClose={() => {
          setRescheduleDrawerVisible(false);
          setRescheduleTargetItem(null);
        }}
        title="Reschedule Selected"
      >
        <View style={styles.wizardStepContainer}>
          {/* Weekday Selector Row */}
          <View style={[styles.weekdayRow, { marginVertical: 8 }]}>
            {DAYS_OF_WEEK.map(day => (
              <DayButton
                key={day.name}
                shortLabel={day.short}
                dateNumber={getDayNumberOfWeekday(day.name)}
                isActive={rescheduleDay === day.name}
                onPress={() => {
                  animateDrawerLayoutChange();
                  setRescheduleDay(day.name);
                }}
              />
            ))}
          </View>

          {/* Time range pickers (From / To) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginVertical: 12 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TuiContainer
                label="From"
                labelSize="sm"
                style={{ height: 56, paddingTop: 0, paddingBottom: 0, justifyContent: 'center' }}
              >
                  <Pressable
                    onPressIn={() => {
                      setShowRescheduleFromPicker(true);
                      setShowRescheduleToPicker(false);
                    }}
                  style={styles.timeButtonInner}
                >
                  <TuiText weight="bold" style={{ color: colors.foreground }}>
                    {formatTimeStr(rescheduleFromTime)}
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
                    onPressIn={() => {
                      setShowRescheduleToPicker(true);
                      setShowRescheduleFromPicker(false);
                    }}
                  style={styles.timeButtonInner}
                >
                  <TuiText weight="bold" style={{ color: colors.foreground }}>
                    {formatTimeStr(rescheduleToTime)}
                  </TuiText>
                </Pressable>
              </TuiContainer>
            </View>
          </View>

          {/* WARNING CONTAINERS */}
          {hasInvalidRescheduleTime && (
            <TuiContainer label="Invalid Time" accentBorder={true} style={{ marginVertical: 8 }}>
              <TuiText weight="bold" style={{ color: colors.destructive, fontSize: 13 }}>
                End time must be after start time.
              </TuiText>
            </TuiContainer>
          )}

          {conflictItem && (
            <TuiContainer label="Conflict Warning" accentBorder={true} style={{ marginVertical: 8 }}>
              <TuiText weight="bold" style={{ color: colors.destructive, fontSize: 14 }}>
                Target slot overlaps with "{conflictItem.title}" ({conflictItem.time}).
              </TuiText>
            </TuiContainer>
          )}

          {/* Actions */}
          <View style={[styles.drawerActions, { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16 }]}>
            <TuiButton
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => {
                setRescheduleDrawerVisible(false);
                setRescheduleTargetItem(null);
              }}
            >
              Cancel
            </TuiButton>
            <TuiButton
              variant="accent"
              style={{ flex: 1 }}
              onPress={handleApplyReschedule}
              disabled={hasInvalidRescheduleTime || !!conflictItem}
            >
              Apply
            </TuiButton>
          </View>
        </View>

        {/* Custom Floating DateTimePickers for Reschedule */}
        <TimePickerModal
          visible={showRescheduleFromPicker}
          onClose={() => setShowRescheduleFromPicker(false)}
        >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPressIn={() => setShowRescheduleFromPicker(false)}
            />
            <View style={styles.iosFloatingPickerWrapper}>
              <View
                onLayout={(e) => setRescheduleFromCardWidth(e.nativeEvent.layout.width)}
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
                      width: Math.max(0, (rescheduleFromCardWidth - rescheduleFromLegendWidth) / 2)
                    }
                  ]}
                />
                <View
                  style={[
                    styles.borderTopRight,
                    {
                      backgroundColor: colors.primary,
                      left: Math.max(0, (rescheduleFromCardWidth + rescheduleFromLegendWidth) / 2)
                    }
                  ]}
                />

                <View
                  onLayout={(e) => setRescheduleFromLegendWidth(e.nativeEvent.layout.width)}
                  style={styles.floatingLegendWrapper}
                >
                  <TuiText weight="bold" style={{ color: colors.primary }}>
                    Start Time
                  </TuiText>
                </View>

                <TuiTimePicker
                  value={rescheduleFromTime}
                  onChange={(date) => {
                    animateDrawerLayoutChange();
                    setRescheduleFromTime(date);
                  }}
                />

              </View>
            </View>
        </TimePickerModal>

        <TimePickerModal
          visible={showRescheduleToPicker}
          onClose={() => setShowRescheduleToPicker(false)}
        >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPressIn={() => setShowRescheduleToPicker(false)}
            />
            <View style={styles.iosFloatingPickerWrapper}>
              <View
                onLayout={(e) => setRescheduleToCardWidth(e.nativeEvent.layout.width)}
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
                      width: Math.max(0, (rescheduleToCardWidth - rescheduleToLegendWidth) / 2)
                    }
                  ]}
                />
                <View
                  style={[
                    styles.borderTopRight,
                    {
                      backgroundColor: colors.primary,
                      left: Math.max(0, (rescheduleToCardWidth + rescheduleToLegendWidth) / 2)
                    }
                  ]}
                />

                <View
                  onLayout={(e) => setRescheduleToLegendWidth(e.nativeEvent.layout.width)}
                  style={styles.floatingLegendWrapper}
                >
                  <TuiText weight="bold" style={{ color: colors.primary }}>
                    End Time
                  </TuiText>
                </View>

                <TuiTimePicker
                  value={rescheduleToTime}
                  onChange={(date) => {
                    animateDrawerLayoutChange();
                    setRescheduleToTime(date);
                  }}
                />

              </View>
            </View>
        </TimePickerModal>
      </TuiDrawer>

      {contextMenuTarget && (
        <ContextMenuOverlay
          target={contextMenuTarget}
          onClose={() => setContextMenuTarget(null)}
          onReschedule={() => {
            // Populate reschedule day and times with current target values
            const item = contextMenuTarget.item;
            setRescheduleTargetItem(item);
            setRescheduleDay(item.day);
            try {
              const [startStr, endStr] = item.time.split(' - ');
              // parse start time
              const [startHStr, startMStr] = startStr.trim().split(' ')[0].split(':');
              const startAmpm = startStr.trim().split(' ')[1];
              let startHours = Number(startHStr);
              if (startAmpm === 'PM' && startHours < 12) startHours += 12;
              if (startAmpm === 'AM' && startHours === 12) startHours = 0;
              const fromDate = new Date();
              fromDate.setHours(startHours, Number(startMStr), 0, 0);
              setRescheduleFromTime(fromDate);

              // parse end time
              const [endHStr, endMStr] = endStr.trim().split(' ')[0].split(':');
              const endAmpm = endStr.trim().split(' ')[1];
              let endHours = Number(endHStr);
              if (endAmpm === 'PM' && endHours < 12) endHours += 12;
              if (endAmpm === 'AM' && endHours === 12) endHours = 0;
              const toDate = new Date();
              toDate.setHours(endHours, Number(endMStr), 0, 0);
              setRescheduleToTime(toDate);
            } catch (err) {
              // fallback
            }
            setContextMenuTarget(null);
            setRescheduleDrawerVisible(true);
          }}
          onDelete={() => {
            const item = contextMenuTarget.item;
            setContextMenuTarget(null);
            handleDeleteTarget(item);
          }}
        />
      )}

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
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  },
  categorySquareBtn: {
    flex: 1,
    height: 58,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  borderTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1.5,
    zIndex: 5,
  },
  subCategoryRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 6,
    paddingVertical: 4,
  },
  subCategoryBtn: {
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  wizardStepContainer: {
    width: '100%',
  },
});
