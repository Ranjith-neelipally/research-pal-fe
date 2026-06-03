import React, { useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import BootSplash from 'react-native-bootsplash';

type AnimatedBootSplashProps = {
  ready: boolean;
  onAnimationEnd: () => void;
};

const AnimatedBootSplash = ({ ready, onAnimationEnd }: AnimatedBootSplashProps) => {
  const [containerOpacity] = useState(() => new Animated.Value(1));
  const [logoScale] = useState(() => new Animated.Value(1));
  const [nameOpacity] = useState(() => new Animated.Value(0));
  const [nameTranslateY] = useState(() => new Animated.Value(8));
  const [taglineOpacity] = useState(() => new Animated.Value(0));
  const [taglineTranslateY] = useState(() => new Animated.Value(10));

  const { container, logo } = BootSplash.useHideAnimation({
    manifest: require('../../../assets/bootsplash/manifest.json'),
    logo: require('../../../assets/bootsplash/logo.png'),
    ready,
    animate: () => {
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.06,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(nameOpacity, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(nameTranslateY, {
            toValue: 0,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 260,
            delay: 140,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(taglineTranslateY, {
            toValue: 0,
            duration: 260,
            delay: 140,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(800),
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationEnd();
      });
    },
  });

  return (
    <Animated.View {...container} style={[container.style, styles.overlay, { opacity: containerOpacity }]}>
      <View style={styles.centerStage}>
        <Animated.Image
          {...logo}
          style={[logo.style, styles.logo, { transform: [{ scale: logoScale }] }]}
        />
      </View>
      <Animated.View
        style={[
          styles.nameContainer,
          {
            opacity: nameOpacity,
            transform: [{ translateY: nameTranslateY }],
          },
        ]}
      >
        <Text style={styles.researchText}>RESEARCH </Text>
        <Text style={styles.palText}>PAL</Text>
      </Animated.View>

      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          },
        ]}
      >
        {'RECORD \u2022 OBSERVE \u2022 GROW'}
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerStage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    marginBottom: 0,
  },
  nameContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: 74,
    flexDirection: 'row',
    alignItems: 'center',
  },
  researchText: {
    color: '#142228',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  palText: {
    color: '#B6F4B9',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  tagline: {
    position: 'absolute',
    top: '50%',
    marginTop: 124,
    color: '#122228',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.8,
  },
});

export default AnimatedBootSplash;
