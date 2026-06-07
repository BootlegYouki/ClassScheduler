/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  FlatList,
} from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

interface TuiTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const LOOP_INITIAL_RENDER_COUNT = 18;
const LOOP_RENDER_BATCH_SIZE = 36;
const LOOP_WINDOW_SIZE = 13;

const HOURS_VALUES = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES_VALUES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS_VALUES = ['AM', 'PM'];

// A long repeated series is more stable than recentering while native momentum
// is active. This gives the wheel plenty of runway without invisible jumps.
const REPS = 121;
const MIDDLE_REP = Math.floor(REPS / 2);

const HOURS_ITEMS = Array.from({ length: REPS }, () => HOURS_VALUES).flat();
const MINUTES_ITEMS = Array.from({ length: REPS }, () => MINUTES_VALUES).flat();
// AM/PM doesn't loop infinitely, so we keep standard padding
const PERIODS_ITEMS = ['', '', ...PERIODS_VALUES, '', ''];

type TimeColumn = 'hour' | 'minute' | 'period';

export const TuiTimePicker: React.FC<TuiTimePickerProps> = ({ value, onChange }) => {
  const { colors } = useTheme();

  // Parse time prop synchronously on render
  let initialHours = value.getHours();
  const initialMinutes = value.getMinutes();
  const initialAmpm = initialHours >= 12 ? 'PM' : 'AM';
  initialHours = initialHours % 12;
  initialHours = initialHours ? initialHours : 12;

  const initialHourStr = String(initialHours).padStart(2, '0');
  const initialMinuteStr = String(initialMinutes).padStart(2, '0');

  // Compute focus scroll indices (centered item is middle repetition index)
  const initialHIndex = MIDDLE_REP * 12 + HOURS_VALUES.indexOf(initialHourStr);
  const initialMIndex = MIDDLE_REP * 60 + MINUTES_VALUES.indexOf(initialMinuteStr);
  const initialPIndex = PERIODS_VALUES.indexOf(initialAmpm) + 2;

  const initialHOffset = (initialHIndex - 2) * ITEM_HEIGHT;
  const initialMOffset = (initialMIndex - 2) * ITEM_HEIGHT;
  const initialPOffset = (initialPIndex - 2) * ITEM_HEIGHT;

  const [activeHour, setActiveHour] = useState(initialHourStr);
  const [activeMinute, setActiveMinute] = useState(initialMinuteStr);
  const [activePeriod, setActivePeriod] = useState(initialAmpm);

  // Scroll animations initialized to target offsets to prevent first-frame render flash
  const hourScrollY = useRef(new Animated.Value(initialHOffset)).current;
  const minuteScrollY = useRef(new Animated.Value(initialMOffset)).current;
  const periodScrollY = useRef(new Animated.Value(initialPOffset)).current;

  const hourRef = useRef<FlatList>(null);
  const minuteRef = useRef<FlatList>(null);
  const periodRef = useRef<FlatList>(null);
  const settleTimers = useRef<Partial<Record<TimeColumn, ReturnType<typeof setTimeout>>>>({});

  // Sync prop changes (external updates)
  useEffect(() => {
    let hours = value.getHours();
    const minutes = value.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    const hourStr = String(hours).padStart(2, '0');
    const minuteStr = String(minutes).padStart(2, '0');

    let changed = false;
    if (hourStr !== activeHour) {
      setActiveHour(hourStr);
      changed = true;
    }
    if (minuteStr !== activeMinute) {
      setActiveMinute(minuteStr);
      changed = true;
    }
    if (ampm !== activePeriod) {
      setActivePeriod(ampm);
      changed = true;
    }

    if (changed) {
      const hIndex = MIDDLE_REP * 12 + HOURS_VALUES.indexOf(hourStr);
      const mIndex = MIDDLE_REP * 60 + MINUTES_VALUES.indexOf(minuteStr);
      const pIndex = PERIODS_VALUES.indexOf(ampm) + 2;

      const timer = setTimeout(() => {
        hourRef.current?.scrollToOffset({ offset: (hIndex - 2) * ITEM_HEIGHT, animated: false });
        minuteRef.current?.scrollToOffset({ offset: (mIndex - 2) * ITEM_HEIGHT, animated: false });
        periodRef.current?.scrollToOffset({ offset: (pIndex - 2) * ITEM_HEIGHT, animated: false });
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [value]);

  const updateParentTime = (hour: string, minute: string, period: string) => {
    if (!hour || !minute || !period) return;
    let h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const isPM = period === 'PM';

    if (isPM) {
      h = h === 12 ? 12 : h + 12;
    } else {
      h = h === 12 ? 0 : h;
    }

    const newDate = new Date(value);
    newDate.setHours(h);
    newDate.setMinutes(m);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    onChange(newDate);
  };

  useEffect(() => {
    return () => {
      Object.values(settleTimers.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const clearSettleTimer = (type: TimeColumn) => {
    const timer = settleTimers.current[type];
    if (timer) {
      clearTimeout(timer);
      delete settleTimers.current[type];
    }
  };

  const settleScroll = (type: TimeColumn, event: NativeSyntheticEvent<NativeScrollEvent>) => {
    clearSettleTimer(type);

    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT) + 2;

    let h = activeHour;
    let m = activeMinute;
    let p = activePeriod;

    if (type === 'hour') {
      const val = HOURS_ITEMS[index];
      if (val) {
        h = val;
        setActiveHour(val);
      }
    } else if (type === 'minute') {
      const val = MINUTES_ITEMS[index];
      if (val) {
        m = val;
        setActiveMinute(val);
      }
    } else if (type === 'period') {
      const val = PERIODS_ITEMS[index];
      if (val) {
        p = val;
        setActivePeriod(val);
      }
    }

    updateParentTime(h, m, p);
  };

  const onScrollEnd = (type: TimeColumn) => (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    settleScroll(type, event);
  };

  const onScrollEndDrag = (type: TimeColumn) => (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    clearSettleTimer(type);
    const capturedEvent = event;

    settleTimers.current[type] = setTimeout(() => {
      settleScroll(type, capturedEvent);
    }, 250);
  };

  const onMomentumScrollBegin = (type: TimeColumn) => () => {
    clearSettleTimer(type);
  };

  const scrollToColumnOffset = (type: TimeColumn, offset: number) => {
    if (type === 'hour') {
      hourRef.current?.scrollToOffset({ offset, animated: true });
    } else if (type === 'minute') {
      minuteRef.current?.scrollToOffset({ offset, animated: true });
    } else {
      periodRef.current?.scrollToOffset({ offset, animated: true });
    }
  };

  const renderItem = (type: TimeColumn, scrollY: Animated.Value) => ({ item, index }: { item: string; index: number }) => {
    const isPadding = item === '';
    if (isPadding) {
      return <View style={{ height: ITEM_HEIGHT }} />;
    }

    const centerOffset = (index - 2) * ITEM_HEIGHT;

    const scale = scrollY.interpolate({
      inputRange: [
        centerOffset - ITEM_HEIGHT * 2,
        centerOffset - ITEM_HEIGHT,
        centerOffset,
        centerOffset + ITEM_HEIGHT,
        centerOffset + ITEM_HEIGHT * 2
      ],
      outputRange: [0.75, 0.9, 1.25, 0.9, 0.75],
      extrapolate: 'clamp',
    });

    const opacity = scrollY.interpolate({
      inputRange: [
        centerOffset - ITEM_HEIGHT * 2,
        centerOffset - ITEM_HEIGHT,
        centerOffset,
        centerOffset + ITEM_HEIGHT,
        centerOffset + ITEM_HEIGHT * 2
      ],
      outputRange: [0.2, 0.45, 1, 0.45, 0.2],
      extrapolate: 'clamp',
    });

    return (
      <Pressable
        onPress={() => {
          scrollToColumnOffset(type, (index - 2) * ITEM_HEIGHT);
        }}
        style={{
          height: ITEM_HEIGHT,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center', justifyContent: 'center' }}>
          <TuiText
            weight="bold"
            style={{
              fontSize: 18,
              color: colors.foreground,
            }}
          >
            {item}
          </TuiText>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { height: CONTAINER_HEIGHT }]}>
      {/* Neobrutalist Selection Highlight Bar */}
      <View
        style={[
          styles.highlightBar,
          {
            top: ITEM_HEIGHT * 2,
            height: ITEM_HEIGHT,
            borderColor: colors.primary,
          },
        ]}
      />

      <View style={styles.columnsContainer}>
        {/* Hour Column */}
        <View style={styles.column}>
          <Animated.FlatList
            ref={hourRef}
            data={HOURS_ITEMS}
            renderItem={renderItem('hour', hourScrollY)}
            keyExtractor={(_, idx) => `h-${idx}`}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            snapToAlignment="center"
            initialScrollIndex={initialHIndex - 2}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: hourScrollY } } }],
              { useNativeDriver: true }
            )}
            onMomentumScrollEnd={onScrollEnd('hour')}
            onMomentumScrollBegin={onMomentumScrollBegin('hour')}
            onScrollEndDrag={onScrollEndDrag('hour')}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            initialNumToRender={LOOP_INITIAL_RENDER_COUNT}
            maxToRenderPerBatch={LOOP_RENDER_BATCH_SIZE}
            updateCellsBatchingPeriod={16}
            windowSize={LOOP_WINDOW_SIZE}
            removeClippedSubviews={false}
          />
        </View>

        {/* Separator Colon */}
        <View style={styles.separator}>
          <TuiText weight="bold" style={{ fontSize: 22, color: colors.primary, opacity: 0.8 }}>
            :
          </TuiText>
        </View>

        {/* Minute Column */}
        <View style={styles.column}>
          <Animated.FlatList
            ref={minuteRef}
            data={MINUTES_ITEMS}
            renderItem={renderItem('minute', minuteScrollY)}
            keyExtractor={(_, idx) => `m-${idx}`}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            snapToAlignment="center"
            initialScrollIndex={initialMIndex - 2}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: minuteScrollY } } }],
              { useNativeDriver: true }
            )}
            onMomentumScrollEnd={onScrollEnd('minute')}
            onMomentumScrollBegin={onMomentumScrollBegin('minute')}
            onScrollEndDrag={onScrollEndDrag('minute')}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            initialNumToRender={LOOP_INITIAL_RENDER_COUNT}
            maxToRenderPerBatch={LOOP_RENDER_BATCH_SIZE}
            updateCellsBatchingPeriod={16}
            windowSize={LOOP_WINDOW_SIZE}
            removeClippedSubviews={false}
          />
        </View>

        {/* Space/Spacer */}
        <View style={{ width: 12 }} />

        {/* Period Column */}
        <View style={[styles.column, { flex: 0.8 }]}>
          <Animated.FlatList
            ref={periodRef}
            data={PERIODS_ITEMS}
            renderItem={renderItem('period', periodScrollY)}
            keyExtractor={(_, idx) => `p-${idx}`}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            snapToAlignment="center"
            initialScrollIndex={initialPIndex - 2}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: periodScrollY } } }],
              { useNativeDriver: true }
            )}
            onMomentumScrollEnd={onScrollEnd('period')}
            onMomentumScrollBegin={onMomentumScrollBegin('period')}
            onScrollEndDrag={onScrollEndDrag('period')}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            initialNumToRender={6}
            windowSize={5}
            removeClippedSubviews={false}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  highlightBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  columnsContainer: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    alignItems: 'center',
  },
  column: {
    flex: 1,
    height: '100%',
  },
  separator: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
});
