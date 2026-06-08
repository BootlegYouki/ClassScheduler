import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Animated, Keyboard, Easing, PanResponder, KeyboardEvent } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import { TuiText } from './tui-text';

const SPRING_CONFIG_OPEN = {
  stiffness: 300,
  damping: 28,
  mass: 0.8,
  useNativeDriver: true,
};

interface TuiDrawerProps {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  title: string;
  children: React.ReactNode;
  keyboardOffset?: number;
  progressAnim?: Animated.Value;
  closeOnBackdropPress?: boolean;
  closeOnSwipeDown?: boolean;
  closeOnRequestClose?: boolean;
}

export const TuiDrawer: React.FC<TuiDrawerProps> = ({
  visible,
  onClose,
  onDismiss,
  title,
  children,
  keyboardOffset = 0,
  progressAnim,
  closeOnBackdropPress = true,
  closeOnSwipeDown = true,
  closeOnRequestClose = true,
}) => {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(300);
  const [legendWidth, setLegendWidth] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const activeAnim = useRef(progressAnim || new Animated.Value(0)).current;
  const nudgeAnim = useRef(new Animated.Value(0)).current;

  const slideAnim = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [cardHeight || 300, 0],
  });

  const latest = useRef({ cardHeight, onClose, onDismiss, closeOnSwipeDown });
  latest.current = { cardHeight, onClose, onDismiss, closeOnSwipeDown };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => latest.current.closeOnSwipeDown,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!latest.current.closeOnSwipeDown) {
          return false;
        }

        return Math.abs(gestureState.dy) > 2;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!latest.current.closeOnSwipeDown) {
          return;
        }

        if (gestureState.dy > 0) {
          const { cardHeight: currentHeight } = latest.current;
          const dragProgress = 1 - (gestureState.dy / (currentHeight || 300));
          activeAnim.setValue(Math.max(0, Math.min(1, dragProgress)));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!latest.current.closeOnSwipeDown) {
          return;
        }

        if (Math.abs(gestureState.dy) < 10 && Math.abs(gestureState.dx) < 10) {
          Keyboard.dismiss();
          return;
        }

        const { onClose: currentOnClose } = latest.current;

        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.timing(activeAnim, {
            toValue: 0,
            duration: 150,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start(() => {
            currentOnClose();
          });
        } else {
          Animated.spring(activeAnim, {
            toValue: 1,
            ...SPRING_CONFIG_OPEN,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(activeAnim, {
          toValue: 1,
          ...SPRING_CONFIG_OPEN,
        }).start();
      },
    })
  ).current;

  const borderTopLeftWidth = Math.max(0, (cardWidth - legendWidth) / 2);
  const borderTopRightLeft = Math.max(0, (cardWidth + legendWidth) / 2);

  // Interpolate backdrop opacity dynamically based on active progress
  const backdropOpacity = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.65],
    extrapolate: 'clamp',
  });

  // Sync nudge animation when keyboard height changes.
  useEffect(() => {
    const onKeyboardShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const subs = [
      Keyboard.addListener('keyboardWillShow', onKeyboardShow),
      Keyboard.addListener('keyboardDidShow', onKeyboardShow),
      Keyboard.addListener('keyboardWillHide', onKeyboardHide),
      Keyboard.addListener('keyboardDidHide', onKeyboardHide),
      Keyboard.addListener('keyboardWillChangeFrame', onKeyboardShow),
    ];

    return () => {
      subs.forEach((sub) => sub.remove());
    };
  }, []);

  useEffect(() => {
    const targetOffset = -Math.max(keyboardOffset, keyboardHeight);
    Animated.timing(nudgeAnim, {
      toValue: targetOffset,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [keyboardOffset, keyboardHeight, nudgeAnim]);

  // Sync animations with visible state changes
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      activeAnim.setValue(0);
      Animated.spring(activeAnim, {
        toValue: 1,
        ...SPRING_CONFIG_OPEN,
      }).start();
    } else if (modalVisible) {
      Animated.timing(activeAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
        latest.current.onDismiss?.();
      });
    }
  }, [visible]);

  const borderAccent = isDark ? colors.primary : '#000000';

  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent={true}
      onRequestClose={closeOnRequestClose ? onClose : undefined}
    >
      <View style={styles.modalOverlay}>
        {/* Dimmed backdrop view fading in/out during open/close transitions */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: '#000000', opacity: backdropOpacity }
          ]}
        />
        {/* Tap backdrop to close */}
        {closeOnBackdropPress ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        ) : null}
        
        <View style={styles.drawerKeyboardAvoidingView}>
          <Animated.View
            onLayout={(e) => {
              setCardWidth(e.nativeEvent.layout.width);
              setCardHeight(e.nativeEvent.layout.height);
            }}
            style={[
              styles.drawerContent,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: Animated.add(slideAnim, nudgeAnim) }],
              }
            ]}
          >
            {/* Background tap/drag capture area */}
            <View 
              {...panResponder.panHandlers}
              style={StyleSheet.absoluteFill}
            />

            {/* Drag handle header zone */}
            <View
              {...panResponder.panHandlers}
              style={styles.dragZone}
            />

            {/* Custom Segmented Borders: only the top has a border to act as the shelf boundary */}
            <View style={[styles.borderTopLeft, { backgroundColor: borderAccent, width: borderTopLeftWidth }]} />
            <View 
              style={[
                styles.borderTopRight, 
                { 
                  backgroundColor: borderAccent, 
                  left: borderTopRightLeft,
                }
              ]} 
            />

            {/* Legend title resting on top border */}
            <View
              onLayout={(e) => setLegendWidth(e.nativeEvent.layout.width)}
              style={styles.legendWrapper}
            >
              <TuiText weight="bold" size="md" style={{ color: colors.primary }}>
                {title}
              </TuiText>
            </View>

            {/* Form/Children Content */}
            <View style={styles.content}>
              {children}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  drawerKeyboardAvoidingView: {
    width: '100%',
  },
  drawerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    position: 'relative',
  },
  dragZone: {
    position: 'absolute',
    top: -25,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 110,
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
    top: 0,
    right: 0,
    height: 1.5,
    zIndex: 5,
  },
  legendWrapper: {
    position: 'absolute',
    top: -15,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 100,
  },
  content: {
    width: '100%',
    marginTop: 20,
  },
});
