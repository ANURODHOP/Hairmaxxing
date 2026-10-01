import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Animated,
  Platform,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
  G,
  Rect,
  Ellipse,
} from 'react-native-svg';
import { uploadMilestonePhoto } from '../components/callables';

const MILESTONE_DAYS = [7, 14, 21, 28];
const isMilestone = (d: number) => MILESTONE_DAYS.includes(d);

const { width: W } = Dimensions.get('window');
const CX_W = W / 2;

// ── Layout constants ──
const NODE_R = 20;           // sleek, professional node size
const MAP_TOP = 60;
const TOTAL_NODES = 30;

// ── Winding path: define 30 node positions along an S-curve snake ──
// The path winds from bottom of screen to top, swinging left/right
// like Candy Crush. We define control-point anchors for each "wave".
const LEFT_X  = W * 0.18;
const RIGHT_X = W * 0.82;
const MID_X   = W * 0.50;

// Each node gets a hand-placed (x, y) for organic feel.
// 5 waves of 6 nodes each, bottom-to-top.
const WAVE_HEIGHT = 118;  // vertical spacing between nodes

function buildNodes() {
  // We'll place nodes in 5 rows of 6, but with sinusoidal x positions
  // that swing wide left and right — mimicking Candy Crush's ribbon.
  const totalHeight = MAP_TOP + (TOTAL_NODES - 1) * WAVE_HEIGHT + 80;
  const nodeList: { day: number; x: number; y: number }[] = [];

  for (let i = 0; i < TOTAL_NODES; i++) {
    const day = i + 1;
    // t goes 0→1 over all nodes
    const t = i / (TOTAL_NODES - 1);
    // y: from bottom to top (index 0 = bottom of scroll = large y)
    const y = MAP_TOP + (TOTAL_NODES - 1 - i) * WAVE_HEIGHT;
    // x: sinusoidal with 2.5 full waves over 30 nodes
    // This gives a natural left-right swing
    const angle = (i / (TOTAL_NODES - 1)) * Math.PI * 5; // 2.5 waves
    const swing = Math.sin(angle);
    // Clamp x between LEFT_X and RIGHT_X
    const x = MID_X + swing * (W * 0.30);
    nodeList.push({ day, x, y });
  }
  return nodeList;
}

const nodes = buildNodes();
const MAP_HEIGHT = MAP_TOP + (TOTAL_NODES - 1) * WAVE_HEIGHT + 120;

// ── Build smooth cubic bezier path segments between consecutive nodes ──
// Each segment uses the midpoint as a control point for smooth curves.
interface SegmentPath {
  d: string;
  fromDay: number;
  toDay: number;
}

function buildSegments(): SegmentPath[] {
  const segs: SegmentPath[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const f = nodes[i];
    const t = nodes[i + 1];
    // Control point: offset perpendicular to segment for curve
    const mx = (f.x + t.x) / 2;
    const my = (f.y + t.y) / 2;
    // Push control point outward based on x difference
    const dx = t.x - f.x;
    const cx = mx - dx * 0.3;
    const cy = my;
    const d = `M ${f.x} ${f.y} Q ${cx} ${cy} ${t.x} ${t.y}`;
    segs.push({ d, fromDay: f.day, toDay: t.day });
  }
  return segs;
}

const segPaths: SegmentPath[] = buildSegments();

// ── Types ──
type StatusType = 'completed' | 'current' | 'locked';

interface NodeData {
  day: number;
  x: number;
  y: number;
}

// ── Month / phase logic ──
function getMonthInfo(day: number): { month: number; phase: string } {
  if (day <= 30) return { month: 1, phase: 'Build the Foundation' };
  if (day <= 60) return { month: 2, phase: 'Growth Phase' };
  if (day <= 90) return { month: 3, phase: 'Transformation Phase' };
  return { month: Math.ceil(day / 30), phase: 'Continued Journey' };
}

// ── Status helpers ──
const nodeStatus = (d: number, totalDays: number): StatusType => {
  if (d < totalDays) return 'completed';
  if (d === totalDays) return 'current';
  return 'locked';
};

const segStatus = (a: number, b: number, totalDays: number): StatusType => {
  const sa = nodeStatus(a, totalDays);
  const sb = nodeStatus(b, totalDays);
  if (sa === 'locked' || sb === 'locked') return 'locked';
  if (sa === 'completed' && sb === 'completed') return 'completed';
  return 'current';
};

// ── Path color palettes (ribbon-style: wider & more layered) ──
// Candy Crush uses a thick white-edged colored ribbon
const pC: Record<StatusType, string[]> = {
  completed: ['#22c55e', '#16a34a', '#ffffff', '#4ade80', '#bbf7d0'],
  current:   ['#4ade80', '#22c55e', '#ffffff', '#86efac', '#dcfce7'],
  locked:    ['#1a2e1c', '#0f1a12', '#0d1f12', '#15291a', '#1a2e1c'],
};
const pO: Record<StatusType, number[]> = {
  completed: [0.15, 1,    0.55, 1,    0.45],
  current:   [0.18, 1,    0.50, 1,    0.30 ],
  locked:    [0.22, 1,    0,    1,    0.18],
};
// Layer widths: outermost glow → shadow → white highlight → core → inner shine
const pW = [26, 16, 10, 7, 3];

// ═══════════════════════════════════════════════════════════════
// BACKGROUND — vibrant Candy Crush inspired with depth & polish
// ═══════════════════════════════════════════════════════════════
const MapBackground = () => (
  <G>
    <Defs>
      <LinearGradient id="dayBg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%"   stopColor="#0a1f14" />
        <Stop offset="35%"  stopColor="#0d2817" />
        <Stop offset="100%" stopColor="#051410" />
      </LinearGradient>
      {/* Refreshing Teal/Cyan secondary accents */}
      <RadialGradient id="glowAccent1" cx="0.5" cy="0.5" r="0.6">
        <Stop offset="0%"   stopColor="#22c55e" />
        <Stop offset="100%"  stopColor="#0a2410" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="glowAccent2" cx="0.5" cy="0.5" r="0.6">
        <Stop offset="0%"   stopColor="#14b8a6" /> 
        <Stop offset="100%"  stopColor="#0a2410" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="glowAccent3" cx="0.5" cy="0.5" r="0.6">
        <Stop offset="0%"   stopColor="#0ea5e9" />
        <Stop offset="100%"  stopColor="#0a2410" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="compGrad" cx="0.38" cy="0.35" r="0.65">
        <Stop offset="0%"   stopColor="#4ade80" />
        <Stop offset="60%"  stopColor="#22c55e" />
        <Stop offset="100%" stopColor="#15803d" />
      </RadialGradient>
      <RadialGradient id="curGrad" cx="0.38" cy="0.35" r="0.65">
        <Stop offset="0%"   stopColor="#1a3d22" />
        <Stop offset="100%" stopColor="#081208" />
      </RadialGradient>
      <RadialGradient id="lockGrad" cx="0.38" cy="0.35" r="0.65">
        <Stop offset="0%"   stopColor="#1a2e1c" />
        <Stop offset="100%" stopColor="#0f1a12" />
      </RadialGradient>
      {/* Premium Milestone Gold Gradient */}
      <RadialGradient id="mileGrad" cx="0.38" cy="0.35" r="0.65">
        <Stop offset="0%"   stopColor="#fbbf24" />
        <Stop offset="60%"  stopColor="#d97706" />
        <Stop offset="100%" stopColor="#92400e" />
      </RadialGradient>
      {/* Vignette gradient for premium framing */}
      <LinearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%"   stopColor="#000000" stopOpacity="0.6" />
        <Stop offset="15%"  stopColor="#000000" stopOpacity="0" />
        <Stop offset="85%"  stopColor="#000000" stopOpacity="0" />
        <Stop offset="100%" stopColor="#000000" stopOpacity="0.7" />
      </LinearGradient>
    </Defs>
    <Rect width={W} height={MAP_HEIGHT} fill="url(#dayBg)" />

    {/* Layered organic blobs with gradient accents + refreshing teal/cyan mixed in */}
    <Ellipse cx={W * 0.2}  cy={MAP_HEIGHT * 0.15} rx={W * 0.5}  ry={220} fill="#0a2410" opacity={0.6} />
    <Ellipse cx={W * 0.85} cy={MAP_HEIGHT * 0.3}  rx={W * 0.4} ry={180} fill="#0f2620" opacity={0.5} />
    <Ellipse cx={W * 0.8}  cy={MAP_HEIGHT * 0.5}  rx={W * 0.45} ry={200} fill="#0d2f19" opacity={0.5} />
    <Ellipse cx={W * 0.15} cy={MAP_HEIGHT * 0.6}  rx={W * 0.35} ry={160} fill="#0c2530" opacity={0.4} />
    <Ellipse cx={W * 0.3}  cy={MAP_HEIGHT * 0.75} rx={W * 0.5}  ry={180} fill="#0a2410" opacity={0.45} />
    <Ellipse cx={W * 0.75} cy={MAP_HEIGHT * 0.88} rx={W * 0.4}  ry={150} fill="#0d2f19" opacity={0.4} />

    {/* Glowing accent orbs (Candy Crush style) */}
    <Ellipse cx={W * 0.15} cy={MAP_HEIGHT * 0.25} rx={120} ry={140} fill="url(#glowAccent1)" opacity={0.12} />
    <Ellipse cx={W * 0.85} cy={MAP_HEIGHT * 0.45} rx={100} ry={130} fill="url(#glowAccent2)" opacity={0.10} />
    <Ellipse cx={W * 0.5}  cy={MAP_HEIGHT * 0.65} rx={110} ry={120} fill="url(#glowAccent3)" opacity={0.08} />
    <Ellipse cx={W * 0.25} cy={MAP_HEIGHT * 0.85} rx={90}  ry={100} fill="url(#glowAccent1)" opacity={0.10} />

    {/* Decorative ribbons/borders on sides */}
    <Rect x="0" y="0" width="6" height={MAP_HEIGHT} fill="#22c55e" opacity={0.08} />
    <Rect x={W - 6} y="0" width="6" height={MAP_HEIGHT} fill="#22c55e" opacity={0.08} />

    {/* Enhanced sparkle dots - more vibrant, varying sizes for depth */}
    {([
      [30,  180, 3], [W-28, 220, 2.5], [22,  460, 3.5], [W-20, 500, 2],
      [40,  720, 2.5], [W-35, 680, 3], [18,  940, 2], [W-22, 900, 3.5],
      [55,  330, 2], [W-50, 380, 3], [CX_W, 150, 4], [CX_W, 600, 2.5],
      [28,  1100,3.5],[W-28,1060,2], [CX_W,850, 3], [CX_W,1200, 2.5],
      [W*0.35, 250, 2], [W*0.65, 350, 3.5], [W*0.25, 550, 2.5], [W*0.75, 650, 2],
      [W*0.45, 800, 3], [W*0.55, 950, 2], [W*0.30, 1150,3.5], [W*0.70, 1250, 2],
      [W*0.10, 1000, 2.5], [W*0.90, 300, 3], [W*0.50, 450, 2], [W*0.40, 1050, 3.5],
    ] as [number,number,number][]).map(([cx,cy,r],i) => (
      <Circle key={`bd${i}`} cx={cx} cy={cy} r={r} fill={i % 3 === 0 ? "#14b8a6" : i % 3 === 1 ? "#22c55e" : "#4ade80"} opacity={i % 3 === 0 ? 0.18 : 0.25} />
    ))}
    
    {/* Vignette Overlay for premium framing */}
    <Rect width={W} height={MAP_HEIGHT} fill="url(#vignette)" />
  </G>
);

// ═══════════════════════════════════════════════════════════════
// FLOATING BACKGROUND ORBS (Parallax Depth Effect)
// ═══════════════════════════════════════════════════════════════
const FloatingOrbs = () => {
  const y1 = useRef(new Animated.Value(0)).current;
  const y2 = useRef(new Animated.Value(0)).current;
  const y3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 40, duration: 8000, useNativeDriver: true, delay }),
          Animated.timing(val, { toValue: -40, duration: 8000, useNativeDriver: true }),
        ])
      ).start();
    };
    loop(y1, 0);
    loop(y2, 2500);
    loop(y3, 5000);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.orb, { backgroundColor: 'rgba(16, 185, 129, 0.07)', width: 300, height: 300, borderRadius: 150, top: '15%', left: '-15%', transform: [{ translateY: y1 }] }]} />
      <Animated.View style={[styles.orb, { backgroundColor: 'rgba(6, 182, 212, 0.05)', width: 250, height: 250, borderRadius: 125, top: '45%', right: '-20%', transform: [{ translateY: y2 }] }]} />
      <Animated.View style={[styles.orb, { backgroundColor: 'rgba(34, 197, 94, 0.06)', width: 350, height: 350, borderRadius: 175, bottom: '15%', left: '25%', transform: [{ translateY: y3 }] }]} />
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// START/FINISH FLAG ICONS
// ═══════════════════════════════════════════════════════════════
interface FlagProps {
  x: number;
  y: number; // Base anchor point (bottom of the pole)
  type: 'start' | 'finish';
}

const FlagIcon: React.FC<FlagProps> = ({ x, y, type }) => {
  const color = type === 'start' ? '#4ade80' : '#fbbf24';
  const poleHeight = 40;
  const flagWidth = 28;
  const flagHeight = 18;
  
  return (
    <G>
      {/* Pole shadow */}
      <Rect x={x + 1.5} y={y - poleHeight + 2} width="3" height={poleHeight} fill="#000" opacity={0.4} rx="1.5" />
      {/* Pole */}
      <Rect x={x - 1} y={y - poleHeight} width="3" height={poleHeight} fill="#e5e7eb" opacity={0.95} rx="1.5" />
      {/* Flag cloth (Pennant shape) */}
      <Path
        d={`M ${x + 2} ${y - poleHeight + 3} L ${x + 2 + flagWidth} ${y - poleHeight + 3 + flagHeight / 2} L ${x + 2} ${y - poleHeight + 3 + flagHeight} Z`}
        fill={color}
        opacity={0.95}
      />
      {/* Flag outline */}
      <Path
        d={`M ${x + 2} ${y - poleHeight + 3} L ${x + 2 + flagWidth} ${y - poleHeight + 3 + flagHeight / 2} L ${x + 2} ${y - poleHeight + 3 + flagHeight} Z`}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity={0.6}
      />
      {/* Small ball on top of pole */}
      <Circle cx={x + 0.5} cy={y - poleHeight - 3} r={4.5} fill={color} opacity={0.95} />
      <Circle cx={x + 0.5} cy={y - poleHeight - 3} r={4.5} fill="none" stroke="#ffffff" strokeWidth="1.2" opacity={0.5} />
    </G>
  );
};

// ═══════════════════════════════════════════════════════════════
// PATH SEGMENT — thick ribbon like Candy Crush
// ═══════════════════════════════════════════════════════════════
interface SegmentProps {
  d: string;
  status: StatusType;
}

const Segment: React.FC<SegmentProps> = ({ d, status }) => {
  const c = pC[status];
  const o = pO[status];
  return (
    <G>
      {/* Outer glow */}
      <Path d={d} stroke={c[0]} strokeWidth={pW[0]} fill="none" strokeLinecap="round" opacity={o[0]} />
      {/* Core ribbon body */}
      <Path d={d} stroke={c[1]} strokeWidth={pW[1]} fill="none" strokeLinecap="round" opacity={o[1]} />
      {/* White highlight stripe (top edge shine) */}
      <Path d={d} stroke={c[2]} strokeWidth={pW[2]} fill="none" strokeLinecap="round" opacity={o[2]} />
      {/* Inner colored stripe */}
      <Path d={d} stroke={c[3]} strokeWidth={pW[3]} fill="none" strokeLinecap="round" opacity={o[3]} />
      {/* Center spine shine */}
      <Path d={d} stroke={c[4]} strokeWidth={pW[4]}  fill="none" strokeLinecap="round" opacity={o[4]} />
    </G>
  );
};

// ═══════════════════════════════════════════════════════════════
// NODE SVG CIRCLE — larger, Candy Crush style gem
// ═══════════════════════════════════════════════════════════════
interface NodeCircleProps {
  x: number;
  y: number;
  day: number;
  totalDays: number;
}

const NodeCircle: React.FC<NodeCircleProps> = ({ x, y, day, totalDays }) => {
  const s = nodeStatus(day, totalDays);
  const isComp = s === 'completed';
  const isCur  = s === 'current';
  const isMile = MILESTONE_DAYS.includes(day);

  return (
    <G>
      {/* Subtle glow halos */}
      {isComp && !isMile && (
        <Circle cx={x} cy={y} r={NODE_R + 8} fill="#22c55e" opacity={0.10} />
      )}
      {isCur && (
        <Circle cx={x} cy={y} r={NODE_R + 10} fill="#4ade80" opacity={0.08} />
      )}

      {/* Premium Milestone Boss Glow (Gold) */}
      {isMile && isComp && (
        <Circle cx={x} cy={y} r={NODE_R + 12} fill="#fbbf24" opacity={0.12} />
      )}

      {/* Drop shadow */}
      <Circle cx={x} cy={y + 2} r={NODE_R} fill="#000" opacity={0.25} />

      {/* Border ring */}
      <Circle
        cx={x} cy={y} r={NODE_R + 2}
        fill={isComp ? (isMile ? '#92400e' : '#22c55e') : isCur ? '#1a3d22' : '#141f16'}
        stroke={isComp ? (isMile ? '#fbbf24' : '#ffffff') : isCur ? '#4ade80' : '#1a2e1c'}
        strokeWidth={isMile ? 2 : 1.5}
        opacity={0.90}
      />

      {/* Main circle fill */}
      <Circle
        cx={x}
        cy={y}
        r={NODE_R}
        fill={isComp ? (isMile ? 'url(#mileGrad)' : 'url(#compGrad)') : isCur ? 'url(#curGrad)' : 'url(#lockGrad)'}
        stroke={isComp ? (isMile ? '#fde68a' : '#86efac') : isCur ? '#4ade80' : '#243b27'}
        strokeWidth={isCur ? 2 : isComp ? 1.5 : 1}
      />

      {/* Inner highlight (glass sheen) */}
      {isComp && (
        <Circle cx={x - 4} cy={y - 5} r={NODE_R * 0.35} fill="#fff" opacity={isMile ? 0.22 : 0.15} />
      )}
      {isCur && (
        <Circle cx={x - 3} cy={y - 4} r={NODE_R * 0.30} fill="#4ade80" opacity={0.10} />
      )}

      {/* Milestone star ring */}
      {isMile && isComp && (
        <Circle cx={x} cy={y} r={NODE_R + 5} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.6} strokeDasharray="4 3" />
      )}
      
      {/* Locked milestone shadow ring */}
      {isMile && !isComp && (
        <Circle cx={x} cy={y} r={NODE_R + 5} fill="none" stroke="#44403c" strokeWidth={1} opacity={0.3} strokeDasharray="4 3" />
      )}
    </G>
  );
};

// ═══════════════════════════════════════════════════════════════
// CURRENT NODE PULSE (Animated) + CONFETTI SPARKLES
// ═══════════════════════════════════════════════════════════════
interface CurrentPulseProps {
  x: number;
  y: number;
}

const CurrentPulse: React.FC<CurrentPulseProps> = ({ x, y }) => {
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const sparkles = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const a1 = Animated.loop(
      Animated.sequence([
        Animated.timing(p1, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(p1, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    const a2 = Animated.loop(
      Animated.sequence([
        Animated.timing(p2, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(p2, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    a1.start();
    const t = setTimeout(() => a2.start(), 800);
    
    // Animate sparkles
    sparkles.forEach((spark, idx) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(spark, { toValue: 1, duration: 1200 + idx * 200, useNativeDriver: true }),
          Animated.timing(spark, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    });
    
    return () => {
      a1.stop();
      clearTimeout(t);
      sparkles.forEach(s => s.setValue(0));
    };
  }, [p1, p2, sparkles]);

  const baseSize = (NODE_R + 2) * 2 + 8;
  const s1 = p1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const o1 = p1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] });
  const s2 = p2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const o2 = p2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0] });

  const sparklePositions = [
    { angle: 0, distance: 34 },
    { angle: 60, distance: 38 },
    { angle: 120, distance: 34 },
    { angle: 180, distance: 38 },
    { angle: 240, distance: 34 },
    { angle: 300, distance: 38 },
  ];

  return (
    <View
      style={[
        styles.pulseAnchor,
        { left: x - baseSize / 2, top: y - baseSize / 2, width: baseSize, height: baseSize },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[styles.pulseRing, { width: baseSize, height: baseSize, opacity: o1, transform: [{ scale: s1 }] }]}
      />
      <Animated.View
        style={[styles.pulseRing, { width: baseSize, height: baseSize, opacity: o2, transform: [{ scale: s2 }] }]}
      />
      {/* Animated sparkles around pulse */}
      {sparklePositions.map((pos, i) => {
        const rad = (pos.angle * Math.PI) / 180;
        const px = pos.distance * Math.cos(rad);
        const py = pos.distance * Math.sin(rad);
        const sparkleO = sparkles[i].interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.9, 0] });
        const sparkleS = sparkles[i].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.3] });
        return (
          <Animated.View
            key={`sparkle${i}`}
            style={[
              {
                position: 'absolute',
                width: 8,
                height: 8,
                left: baseSize / 2 - 4 + px,
                top: baseSize / 2 - 4 + py,
                borderRadius: 4,
                backgroundColor: '#4ade80',
                opacity: sparkleO,
                transform: [{ scale: sparkleS }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// MILESTONE GATE MODAL (blocks access on days 7, 14, 21, 28)
// ═══════════════════════════════════════════════════════════════
interface MilestoneGateProps {
  visible: boolean;
  day: number;
  onDismiss: () => void;
}

const MilestoneGateModal: React.FC<MilestoneGateProps> = ({ visible, day, onDismiss }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
        Animated.timing(opacAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo access to continue.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (res.canceled || !res.assets?.[0]?.base64) return;

    setUploading(true);
    try {
      const callRes = await uploadMilestonePhoto({
        imageBase64: res.assets[0].base64,
        currentDay: day,
        mimeType: res.assets[0].mimeType ?? 'image/jpeg',
      });
      const metric = (callRes as any).data?.improvementMetric ?? `Day ${day} photo saved!`;
      setResult(metric);
    } catch (e: any) {
      Alert.alert(
        'Upload Failed',
        'Firebase Storage is required (Blaze plan). Your photo will be uploadable once you upgrade.',
        [{ text: 'Continue Anyway', onPress: onDismiss }]
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={mgStyles.overlay}>
        <Animated.View style={[mgStyles.card, { opacity: opacAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={mgStyles.icon}>📸</Text>
          <Text style={mgStyles.title}>Progress Photo Required</Text>
          <Text style={mgStyles.desc}>
            Day {day} is a milestone check-in. Upload a progress photo before accessing today's tasks. The AI will measure your hair improvement!
          </Text>

          {result ? (
            <>
              <View style={mgStyles.metricBox}>
                <Text style={mgStyles.metricLabel}>📈 AI INSIGHT</Text>
                <Text style={mgStyles.metricText}>{result}</Text>
              </View>
              <TouchableOpacity style={mgStyles.continueBtn} onPress={onDismiss} activeOpacity={0.85}>
                <Text style={mgStyles.continueBtnText}>Continue to Tasks →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[mgStyles.uploadBtn, uploading && mgStyles.uploadBtnDisabled]}
              onPress={handleUpload}
              disabled={uploading}
              activeOpacity={0.85}
            >
              {uploading ? (
                <ActivityIndicator color="#0a1a0d" size="small" />
              ) : (
                <Text style={mgStyles.uploadBtnText}>📷  Upload Progress Photo</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onDismiss} style={mgStyles.skipBtn}>
            <Text style={mgStyles.skipTxt}>Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const mgStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#0c1810',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(74,222,128,0.25)',
  },
  icon:  { fontSize: 52, marginBottom: 14 },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  desc: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  uploadBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText:     { color: '#0a1a0d', fontSize: 15, fontWeight: '800' },
  continueBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  continueBtnText: { color: '#0a1a0d', fontSize: 15, fontWeight: '800' },
  skipBtn:  { paddingVertical: 8 },
  skipTxt:  { color: '#374151', fontSize: 13, fontWeight: '600' },
  metricBox: {
    backgroundColor: 'rgba(34,197,94,0.07)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  metricLabel: { color: '#4ade80', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  metricText:  { color: '#d1fae5', fontSize: 14, fontWeight: '600', lineHeight: 20 },
});

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export default function DayProgressScreen() {
  const params    = useLocalSearchParams<{ days?: string }>();
  const totalDays = Math.max(1, Math.min(parseInt(params.days ?? '1', 10) || 1, 30));
  const router    = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to the bottom where Day 1 starts
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const { month, phase } = getMonthInfo(totalDays);
  const pct     = Math.min(Math.round((totalDays / 30) * 100), 100);
  const curNode = nodes.find((n) => n.day === totalDays);

  // ── Milestone gate state ──
  const [gateVisible, setGateVisible] = useState(isMilestone(totalDays));
  const [taskProgressPct]             = useState(0);

  const handleNodePress = useCallback((day: number) => {
    const status = nodeStatus(day, totalDays);
    if (status === 'locked') {
      Alert.alert('🔒 Locked', `Complete Day ${day - 1} first to unlock this day.`);
      return;
    }
    // Only the current day is editable; past completed days are view-only
    const isEditable = day === totalDays;
    router.push({ pathname: '/DailyTask', params: { day: String(day), isEditable: String(isEditable) } });
  }, [totalDays, router]);

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Milestone gate modal ── */}
      <MilestoneGateModal
        visible={gateVisible}
        day={totalDays}
        onDismiss={() => setGateVisible(false)}
      />

      {/* ── Floating Background Orbs (Parallax) ── */}
      <FloatingOrbs />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerTop}>
            <Text style={styles.brand}>HAIRMAXXING</Text>
            <View style={styles.brandDot} />
          </View>
          <Text style={styles.title}>Month {month}</Text>
          <Text style={styles.subtitle}>{phase}</Text>
        </View>
      </View>

      {/* ── Scrollable Map ── */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: W, height: MAP_HEIGHT }}>
          {/* SVG: background + ribbon paths + node circles */}
          <Svg width={W} height={MAP_HEIGHT} style={StyleSheet.absoluteFill}>
            <MapBackground />
            {segPaths.map((s, i) => (
              <Segment key={`s${i}`} d={s.d} status={segStatus(s.fromDay, s.toDay, totalDays)} />
            ))}
            {nodes.map((n) => (
              <NodeCircle key={`n${n.day}`} {...n} totalDays={totalDays} />
            ))}
            
            {/* Start flag (Positioned cleanly to the left of Day 1) */}
            {nodes[0] && <FlagIcon x={nodes[0].x - 35} y={nodes[0].y + 10} type="start" />}
            {/* Finish flag (Positioned cleanly to the right of Day 30) */}
            {nodes[29] && <FlagIcon x={nodes[29].x + 35} y={nodes[29].y + 10} type="finish" />}
          </Svg>

          {/* Overlay: day numbers — tappable */}
          {nodes.map(({ x, y, day }) => {
            const s     = nodeStatus(day, totalDays);
            const sz    = NODE_R + 2; // match the border ring radius
            return (
              <TouchableOpacity
                key={`t${day}`}
                style={[
                  styles.numWrap,
                  { left: x - sz, top: y - sz, width: sz * 2, height: sz * 2 },
                ]}
                onPress={() => handleNodePress(day)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.num,
                    s === 'completed' && styles.numDone,
                    s === 'current'   && styles.numCur,
                    s === 'locked'    && styles.numLock,
                    day >= 10 && styles.numSm,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Overlay: current-node pulse */}
          {curNode && <CurrentPulse x={curNode.x} y={curNode.y} />}
        </View>
      </ScrollView>

      {/* ── Legend ── */}
      <View style={styles.legend}>
        {(
          [
            { bg: '#22c55e', border: false, borderColor: '',       label: 'Completed' },
            { bg: 'transparent', border: true, borderColor: '#4ade80', label: 'Current' },
            { bg: '#1a2e1c', border: false, borderColor: '',       label: 'Locked' },
          ] as { bg: string; border: boolean; borderColor: string; label: string }[]
        ).map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: l.bg },
                l.border && { borderWidth: 2.5, borderColor: l.borderColor },
              ]}
            />
            <Text style={styles.legendTxt}>{l.label}</Text>
          </View>
        ))}
      </View>


    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060e07',
    paddingVertical: 30,
  },

  /* ── Floating Parallax Orbs ── */
  orb: {
    position: 'absolute',
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 6,
    zIndex: 10, // Keep header above parallax orbs
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  brand: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: 3,
    opacity: 1,
  },
  brandDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22c55e',
    opacity: 0.7,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 2,
  },

  /* ── Scroll ── */
  scroll: { flex: 1, zIndex: 5 }, // Above orbs, below header

  /* ── Node number overlays ── */
  numWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  num:     { fontSize: 16, fontWeight: '800', letterSpacing: -0.3, includeFontPadding: false },
  numSm:   { fontSize: 13 },
  numDone: { color: '#ffffff' },
  numCur:  { color: '#4ade80' },
  numLock: { color: '#3a4a3e' },

  /* ── Pulse ── */
  pulseAnchor: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#4ade80',
  },

  /* ── Legend ── */
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingVertical: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#22c55e',
    backgroundColor: '#060e07',
    zIndex: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  legendDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
  },
  legendTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.2,
  },


});