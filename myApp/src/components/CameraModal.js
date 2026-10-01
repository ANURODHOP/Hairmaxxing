import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Linking, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CameraModal = ({ visible, type, onClose, onCapture, instructionLabel }) => {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Determine if it's the top view based on the instruction label passed from parent
  const isTopView = instructionLabel?.toLowerCase().includes('top');

  if (!visible) return null;

  // 1. Loading State
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff' }}>Loading Camera...</Text>
      </View>
    );
  }

  // 2. Permission Denied State
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need access to your camera to analyze your hair. Please grant permission.
        </Text>

        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            const result = await requestPermission();
            if (!result.granted && result.canAskAgain === false) {
                Alert.alert("Permission Denied", "Please enable camera permissions in your phone settings.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Open Settings", onPress: () => Linking.openSettings() }
                ]);
            }
          }}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
            <Text style={{ color: '#888' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Camera Active State
  const handleSnap = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true, // <-- CHANGED: Get base64 directly to avoid expo-file-system crash
        skipProcessing: true,
      });
      // Pass BOTH uri and base64 string to parent
      onCapture(photo.uri, photo.base64);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.cameraView} facing="front" ref={cameraRef}>

        <View style={styles.overlay}>
            {/* Top Bar */}
            <View style={styles.cameraHeader}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
                
                {/* Use the dynamic instruction label, fallback to default */}
                <Text style={styles.cameraTitle}>
                    {instructionLabel || (isTopView ? 'Position Top of Head' : 'Center Your Face')}
                </Text>
                <View style={{width: 40}} />
            </View>

            {/* Shape Guide */}
            <View style={styles.guideContainer}>
                <View style={isTopView ? styles.circleGuide : styles.ovalGuide}>
                    <View style={[styles.guideBorder, isTopView && styles.guideBorderCircle]} />
                </View>
                <Text style={styles.guideText}>Align within the green frame</Text>
            </View>

            {/* Bottom Controls */}
            <View style={styles.cameraFooter}>
                <TouchableOpacity onPress={handleSnap} style={styles.shutterBtn}>
                    <View style={styles.shutterInner} />
                </TouchableOpacity>
            </View>
        </View>

      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },

  // Permission Styles
  permissionTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  permissionText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 30, paddingHorizontal: 30 },
  permissionButton: {
    backgroundColor: '#4ADE80',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  permissionButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },

  // Camera UI Styles
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cameraTitle: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },

  guideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ovalGuide: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: SCREEN_WIDTH * 0.35,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  circleGuide: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: SCREEN_WIDTH * 0.375,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  guideBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: SCREEN_WIDTH * 0.35,
    borderWidth: 3,
    borderColor: '#4ADE80',
  },
  guideBorderCircle: { borderRadius: SCREEN_WIDTH * 0.375 },
  guideText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 10,
  },

  cameraFooter: {
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#4ADE80',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});

export default CameraModal;

// For auto camera clicking

// import React, { useRef, useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Dimensions,
//   ActivityIndicator,
//   Alert,
//   Linking
// } from 'react-native';
// import { CameraView, useCameraPermissions } from 'expo-camera';
// import * as FaceDetector from 'expo-face-detector';
// import { Accelerometer } from 'expo-sensors';

// const { width: SCREEN_WIDTH } = Dimensions.get('window');

// const CameraModal = ({ visible, type, onClose, onCapture }) => {
//   const cameraRef = useRef(null);
//   const [permission, requestPermission] = useCameraPermissions();
//   const [capturing, setCapturing] = useState(false);
  
//   // Is the face/phone in the correct position to take the photo?
//   const [isAligned, setIsAligned] = useState(false);

//   if (!visible) return null;

//   // --- CAPTURE LOGIC ---
//   const handleSnap = async () => {
//     // Prevent tapping unless aligned and not already capturing
//     if (!cameraRef.current || capturing || !isAligned) return;
    
//     setCapturing(true);

//     try {
//       const photo = await cameraRef.current.takePictureAsync({
//         quality: 0.7,
//         skipProcessing: true,
//       });
//       onCapture(photo.uri);
//     } catch (e) {
//       console.error("Capture Error", e);
//       Alert.alert("Error", "Failed to take photo.");
//     } finally {
//       setCapturing(false);
//     }
//   };

//   // --- FACE DETECTION LOGIC ---
//   const handleFacesDetected = ({ faces }) => {
//     if (capturing) return;

//     // Top view doesn't use face detection
//     if (type === 'top') {
//       setIsAligned(false);
//       return;
//     }

//     if (faces.length === 0) {
//       setIsAligned(false);
//       return;
//     }

//     const face = faces[0];
    
//     // Use relative bounds (0.0 to 1.0) for better device compatibility
//     const relativeX = face.bounds.origin.x / SCREEN_WIDTH;
//     const relativeY = face.bounds.origin.y / SCREEN_WIDTH; 

//     if (type === 'front') {
//       // Is face roughly in the center of the screen?
//       const isCentered = relativeX > 0.3 && relativeX < 0.7 && relativeY > 0.2 && relativeY < 0.6;
//       setIsAligned(isCentered);
//     }

//     if (type === 'side') {
//       const yaw = face.yawAngle || 0;
//       // Is head turned significantly?
//       const isTurned = Math.abs(yaw) > 25;
//       setIsAligned(isTurned);
//     }
//   };

//   // --- ACCELEROMETER LOGIC FOR TOP VIEW ---
//   useEffect(() => {
//     if (type !== 'top' || !visible) return;

//     let accelerometerSubscription;
    
//     const startAccelerometer = async () => {
//       Accelerometer.setUpdateInterval(300);
//       accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
//         if (capturing) return;
        
//         // When a user holds a phone over their head to look at the screen:
//         // z will be roughly 0.4 to 0.8, y will be -0.4 to -0.8
//         const isOverHead = z > 0.3 && y < -0.3 && x > -0.4 && x < 0.4;
//         setIsAligned(isOverHead);
//       });
//     };

//     startAccelerometer();

//     return () => {
//       if (accelerometerSubscription) accelerometerSubscription.remove();
//     };
//   }, [type, visible, capturing]);


//   // --- PERMISSION HANDLING UI ---
//   if (!permission) {
//     return <View style={styles.container}><ActivityIndicator color="#fff" /></View>;
//   }

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.permissionTitle}>Camera Access</Text>
//         <Text style={styles.permissionText}>We need access to your camera to analyze your hair.</Text>
//         <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
//           <Text style={styles.permissionButtonText}>Grant Permission</Text>
//         </TouchableOpacity>
//         <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}><Text style={{ color: '#888' }}>Cancel</Text></TouchableOpacity>
//       </View>
//     );
//   }

//   // --- MAIN CAMERA UI ---
//   const isTopView = type === 'top';

//   return (
//     <View style={styles.container}>
//       <CameraView
//         style={styles.cameraView}
//         facing="front"
//         ref={cameraRef}
//         onFacesDetected={type !== 'top' ? handleFacesDetected : undefined}
//         faceDetectorSettings={{
//           mode: FaceDetector.FaceDetectorMode.fast,
//           detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
//           tracking: true,
//         }}
//       >
//         <View style={styles.overlay}>
//             {/* Header UI */}
//             <View style={styles.cameraHeader}>
//                 <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
//                     <Text style={styles.closeText}>✕</Text>
//                 </TouchableOpacity>
//                 <Text style={styles.cameraTitle}>
//                     {isTopView ? 'Position Top of Head' : 'Center Your Face'}
//                 </Text>
//                 <View style={{width: 40}} />
//             </View>

//             {/* Guide UI */}
//             <View style={styles.guideContainer}>
//                 {/* Dynamic Shape */}
//                 <View style={isTopView ? styles.circleGuide : styles.ovalGuide}>
//                     <View style={[
//                       styles.guideBorder, 
//                       isTopView && styles.guideBorderCircle,
//                       isAligned && styles.guideBorderActive // Turns green when aligned
//                     ]} />
//                 </View>

//                 {/* Dynamic Instructions */}
//                 <Text style={[styles.guideText, isAligned && styles.guideTextActive]}>
//                   {type === 'front' && (isAligned ? 'Perfect! Tap to capture' : 'Align your face')}
//                   {type === 'side' && (isAligned ? 'Perfect! Tap to capture' : 'Turn your head sideways')}
//                   {type === 'top' && (isAligned ? 'Perfect! Tap to capture' : 'Hold phone above head')}
//                 </Text>
//             </View>

//             {/* Footer / Manual Button */}
//             <View style={styles.cameraFooter}>
//                 <TouchableOpacity
//                   onPress={handleSnap}
//                   style={[styles.shutterBtn, !isAligned && styles.shutterBtnDisabled]} // Dim button when not aligned
//                   disabled={!isAligned || capturing}
//                 >
//                     {capturing ? (
//                        <ActivityIndicator color="#000" size="small" />
//                     ) : (
//                        <View style={[styles.shutterInner, isAligned && styles.shutterInnerActive]} /> 
//                     )}
//                 </TouchableOpacity>
//             </View>
//         </View>
//       </CameraView>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: '#000',
//     zIndex: 100,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   cameraView: {
//     flex: 1,
//     width: '100%',
//     height: '100%',
//   },
//   overlay: {
//     flex: 1,
//     backgroundColor: 'transparent',
//     justifyContent: 'space-between',
//   },

//   // Permission Styles
//   permissionTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
//   permissionText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 30, paddingHorizontal: 30 },
//   permissionButton: {
//     backgroundColor: '#4ADE80',
//     paddingVertical: 14,
//     paddingHorizontal: 30,
//     borderRadius: 30,
//   },
//   permissionButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },

//   // Camera UI Styles
//   cameraHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 20,
//     paddingTop: 50,
//     backgroundColor: 'rgba(0,0,0,0.4)',
//   },
//   closeBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   closeText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
//   cameraTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

//   // Guide Shapes
//   guideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   ovalGuide: {
//     width: SCREEN_WIDTH * 0.7,
//     height: SCREEN_WIDTH * 0.85,
//     borderRadius: SCREEN_WIDTH * 0.35,
//     borderWidth: 2,
//     borderColor: 'transparent',
//     backgroundColor: 'rgba(0,0,0,0.3)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     overflow: 'hidden',
//   },
//   circleGuide: {
//     width: SCREEN_WIDTH * 0.75,
//     height: SCREEN_WIDTH * 0.75,
//     borderRadius: SCREEN_WIDTH * 0.375,
//     borderWidth: 2,
//     borderColor: 'transparent',
//     backgroundColor: 'rgba(0,0,0,0.3)',
//     overflow: 'hidden',
//   },
//   guideBorder: {
//     position: 'absolute',
//     top: 0, left: 0, right: 0, bottom: 0,
//     borderRadius: SCREEN_WIDTH * 0.35,
//     borderWidth: 3,
//     borderColor: 'rgba(255,255,255,0.3)', // Default white/grey border
//   },
//   guideBorderCircle: { borderRadius: SCREEN_WIDTH * 0.375 },
  
//   // ACTIVE STATE (Green frame)
//   guideBorderActive: {
//     borderColor: '#4ADE80',
//     shadowColor: '#4ADE80',
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0.8,
//     shadowRadius: 10,
//   },
//   guideText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//     marginTop: 20,
//     backgroundColor: 'rgba(0,0,0,0.6)',
//     padding: 8,
//     borderRadius: 10,
//   },
//   guideTextActive: {
//     color: '#4ADE80', // Text turns green
//   },

//   // Footer
//   cameraFooter: {
//     height: 150,
//     backgroundColor: 'rgba(0,0,0,0.6)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   shutterBtn: {
//     width: 70,
//     height: 70,
//     borderRadius: 35,
//     backgroundColor: '#fff',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 4,
//     borderColor: '#4ADE80',
//   },
//   shutterBtnDisabled: {
//     backgroundColor: '#888', // Dim button
//     borderColor: '#555',     // Dim border
//   },
//   shutterInner: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#888', // Default inner grey
//   },
//   shutterInnerActive: {
//     backgroundColor: '#fff', // Inner white when ready to snap
//   }
// });

// export default CameraModal;