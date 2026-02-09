import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import {
  Sparkles,
  Camera,
  CameraOff,
  Heart,
  Flower2,
  Circle,
  Zap,
  Sun,
  Star,
  RefreshCw,
  Palette,
  Hand,
  MousePointer,
  Mic,
  MicOff,
  Monitor,
  Maximize,
  Minimize,
  Music,
  Volume2,
} from "lucide-react";

// Particle shape definitions
const PARTICLE_SHAPES = {
  hearts: { name: "Hearts", icon: Heart },
  flowers: { name: "Flowers", icon: Flower2 },
  saturn: { name: "Saturn", icon: Circle },
  fireworks: { name: "Fireworks", icon: Zap },
  stars: { name: "Stars", icon: Star },
  cosmic: { name: "Cosmic", icon: Sun },
};

const COLOR_PALETTES = [
  { name: "Neon Dreams", colors: ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff"] },
  { name: "Aurora", colors: ["#00ff87", "#60efff", "#ff1493", "#9d4edd", "#3c096c"] },
  { name: "Sunset", colors: ["#ff7b00", "#ff8800", "#ff9500", "#ffa200", "#ffaa00"] },
  { name: "Ocean", colors: ["#023e8a", "#0077b6", "#0096c7", "#00b4d8", "#48cae4"] },
  { name: "Galaxy", colors: ["#7400b8", "#6930c3", "#5e60ce", "#5390d9", "#4ea8de"] },
  { name: "Fire", colors: ["#ff0000", "#ff4500", "#ff6b00", "#ff8c00", "#ffa500"] },
];

export default function ParticlesPage() {
  const { isDarkMode } = useTheme();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const frequencyCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const sceneRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const handDataRef = useRef(null);
  const mouseDataRef = useRef({ x: 0.5, y: 0.5, active: false });
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const isDetectingRef = useRef(false);
  const controlModeRef = useRef("mouse");
  const audioEnabledRef = useRef(false);
  
  // Audio refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioDataRef = useRef({ bass: 0, mid: 0, high: 0, overall: 0 });
  const frequencyDataRef = useRef(null);
  const audioStreamRef = useRef(null);

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [currentShape, setCurrentShape] = useState("cosmic");
  const [currentPalette, setCurrentPalette] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [gestureInfo, setGestureInfo] = useState("");
  const [particleCount, setParticleCount] = useState(3000);
  const [isLoading, setIsLoading] = useState(false);
  const [controlMode, setControlMode] = useState("audio");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioSource, setAudioSource] = useState(null); // "mic" or "screen"
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [visualMode, setVisualMode] = useState("spectrum"); // "particles" or "spectrum"
  const hideControlsTimeoutRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    controlModeRef.current = controlMode;
  }, [controlMode]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    console.log("audioEnabledRef updated:", audioEnabled);
  }, [audioEnabled]);

  // Initialize Three.js scene
  const initThreeJS = useCallback(async () => {
    if (!canvasRef.current || sceneRef.current) return;

    const THREE = await import("three");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    sceneRef.current = { scene, camera, renderer, THREE };

    // Create particles
    createParticles(THREE, scene);

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      updateParticles();
      drawFrequencyBars();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      renderer.dispose();
    };
  }, []);

  // Create particle system
  const createParticles = (THREE, scene) => {
    particlesRef.current.forEach((p) => {
      scene.remove(p.mesh);
      p.geometry?.dispose();
      p.material?.dispose();
    });
    particlesRef.current = [];

    const palette = COLOR_PALETTES[currentPalette];
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const originalPositions = [];

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 5 + Math.random() * 15;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions.push({ x, y, z, radius, theta, phi });

      const colorIndex = Math.floor(Math.random() * palette.colors.length);
      const color = new THREE.Color(palette.colors[colorIndex]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.3 + Math.random() * 1.2;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        audioExpansion: { value: 1.0 },
        bassImpact: { value: 0.0 },
        midImpact: { value: 0.0 },
        highImpact: { value: 0.0 },
        pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vIntensity;
        uniform float time;
        uniform float audioExpansion;
        uniform float bassImpact;
        uniform float midImpact;
        uniform float highImpact;
        uniform float pixelRatio;
        
        void main() {
          vColor = color;
          
          // Calculate distance from center
          float dist = length(position);
          float normalizedDist = dist / 20.0;
          
          // Audio-reactive position
          vec3 pos = position;
          
          // Bass affects inner particles (pulsing)
          float bassEffect = bassImpact * (1.0 - normalizedDist) * 3.0;
          
          // Mid affects middle particles (wave)
          float midEffect = midImpact * sin(normalizedDist * 6.28 + time * 2.0) * 2.0;
          
          // High affects outer particles (sparkle)
          float highEffect = highImpact * normalizedDist * 2.0;
          
          // Combine effects
          float totalExpansion = audioExpansion + bassEffect + midEffect * 0.5 + highEffect * 0.3;
          pos *= totalExpansion;
          
          // Add wave motion based on audio
          float waveIntensity = (bassImpact + midImpact) * 0.5;
          pos.x += sin(time * 3.0 + position.y * 0.5) * waveIntensity * 2.0;
          pos.y += cos(time * 2.5 + position.x * 0.5) * waveIntensity * 2.0;
          pos.z += sin(time * 2.0 + position.z * 0.5) * waveIntensity * 1.5;
          
          // Intensity for fragment shader (glow based on audio)
          vIntensity = bassImpact * 0.5 + midImpact * 0.3 + highImpact * 0.2;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size pulsing with bass
          float sizeMultiplier = 1.0 + bassImpact * 1.5 + highImpact * 0.5;
          gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z) * sizeMultiplier;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vIntensity;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
          
          // Enhanced glow based on audio intensity
          float glowStrength = 1.5 + vIntensity * 2.0;
          vec3 glow = vColor * glowStrength;
          vec3 finalColor = mix(glow, vColor, dist * 1.5);
          
          // Boost brightness with audio
          finalColor *= (1.0 + vIntensity * 0.5);
          
          gl_FragColor = vec4(finalColor, alpha * (0.8 + vIntensity * 0.2));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    particlesRef.current.push({
      mesh: points,
      geometry,
      material,
      originalPositions,
      startTime: Date.now(),
    });
  };

  // Draw spectrum visualization (full screen when in spectrum mode)
  const drawFrequencyBars = () => {
    if (!frequencyCanvasRef.current) return;
    
    const canvas = frequencyCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear with fade effect for trails
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.fillRect(0, 0, width, height);
    
    if (!frequencyDataRef.current || !audioEnabledRef.current) {
      // Draw idle animation
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, width, height);
      return;
    }
    
    const data = frequencyDataRef.current;
    const palette = COLOR_PALETTES[currentPalette].colors;
    const centerY = height / 2;
    const barCount = 128;
    const barWidth = width / barCount;
    const time = Date.now() * 0.001;
    
    // Draw circular visualization in center
    const centerX = width / 2;
    const baseRadius = Math.min(width, height) * 0.15;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // Draw circular frequency bars
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor(i * (data.length / barCount));
      const value = data[dataIndex] / 255;
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      
      const barLength = value * baseRadius * 2 + 5;
      const innerRadius = baseRadius;
      const outerRadius = innerRadius + barLength;
      
      // Color based on position and value
      const colorIndex = Math.floor((i / barCount) * palette.length);
      const color = palette[colorIndex % palette.length];
      
      // Create gradient for each bar
      const x1 = Math.cos(angle) * innerRadius;
      const y1 = Math.sin(angle) * innerRadius;
      const x2 = Math.cos(angle) * outerRadius;
      const y2 = Math.sin(angle) * outerRadius;
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, color + "40");
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, color + "80");
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = barWidth * 0.8;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = value * 20;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // Draw inner circle glow
    const { bass, mid, high } = audioDataRef.current;
    const pulseRadius = baseRadius * (0.8 + bass * 0.4);
    
    const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseRadius);
    innerGradient.addColorStop(0, palette[0] + "60");
    innerGradient.addColorStop(0.5, palette[2] + "30");
    innerGradient.addColorStop(1, "transparent");
    
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    ctx.shadowBlur = 0;
    
    // Draw mirrored bars at bottom
    const bottomBarCount = 96;
    const bottomBarWidth = width / bottomBarCount - 1;
    
    for (let i = 0; i < bottomBarCount; i++) {
      const dataIndex = Math.floor(i * (data.length / bottomBarCount));
      const value = data[dataIndex] / 255;
      const barHeight = value * height * 0.25;
      
      const x = i * (bottomBarWidth + 1);
      const y = height - barHeight;
      
      const colorIndex = Math.floor((i / bottomBarCount) * palette.length);
      const color = palette[colorIndex % palette.length];
      
      // Gradient bar
      const gradient = ctx.createLinearGradient(x, height, x, y);
      gradient.addColorStop(0, color + "20");
      gradient.addColorStop(0.3, color + "80");
      gradient.addColorStop(1, color);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, bottomBarWidth, barHeight);
      
      // Mirror at top
      ctx.globalAlpha = 0.4;
      const topGradient = ctx.createLinearGradient(x, 0, x, barHeight * 0.5);
      topGradient.addColorStop(0, color);
      topGradient.addColorStop(1, "transparent");
      ctx.fillStyle = topGradient;
      ctx.fillRect(x, 0, bottomBarWidth, barHeight * 0.5);
      ctx.globalAlpha = 1;
    }
    
    // Draw waveform line through center
    if (timeDomainDataRef.current) {
      ctx.strokeStyle = palette[Math.floor(palette.length / 2)] + "80";
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const sliceWidth = width / timeDomainDataRef.current.length;
      let x = 0;
      
      for (let i = 0; i < timeDomainDataRef.current.length; i++) {
        const v = timeDomainDataRef.current[i] / 128.0;
        const y = centerY + (v - 1) * height * 0.15;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      
      ctx.stroke();
    }
    
    // Draw bass/mid/high meters on sides
    const meterWidth = 8;
    const meterHeight = height * 0.4;
    const meterY = (height - meterHeight) / 2;
    
    // Left side - Bass
    const bassGradient = ctx.createLinearGradient(0, meterY + meterHeight, 0, meterY);
    bassGradient.addColorStop(0, palette[0] + "30");
    bassGradient.addColorStop(bass, palette[0]);
    bassGradient.addColorStop(1, palette[0] + "10");
    ctx.fillStyle = bassGradient;
    ctx.fillRect(10, meterY + meterHeight * (1 - bass), meterWidth, meterHeight * bass);
    
    // Right side - High
    const highGradient = ctx.createLinearGradient(0, meterY + meterHeight, 0, meterY);
    highGradient.addColorStop(0, palette[palette.length - 1] + "30");
    highGradient.addColorStop(high, palette[palette.length - 1]);
    highGradient.addColorStop(1, palette[palette.length - 1] + "10");
    ctx.fillStyle = highGradient;
    ctx.fillRect(width - 18, meterY + meterHeight * (1 - high), meterWidth, meterHeight * high);
  };

  // Debug counter for logging
  const debugCounterRef = useRef(0);
  const timeDomainDataRef = useRef(null);
  
  // Update audio analysis
  const updateAudioAnalysis = () => {
    if (!analyserRef.current || !audioContextRef.current) return;
    
    // Make sure audio context is running
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    
    if (!frequencyDataRef.current || frequencyDataRef.current.length !== bufferLength) {
      frequencyDataRef.current = new Uint8Array(bufferLength);
    }
    if (!timeDomainDataRef.current || timeDomainDataRef.current.length !== bufferLength) {
      timeDomainDataRef.current = new Uint8Array(bufferLength);
    }
    
    // Get frequency data
    analyser.getByteFrequencyData(frequencyDataRef.current);
    const data = frequencyDataRef.current;
    
    // Also get time domain data to check for audio activity
    const tdData = timeDomainDataRef.current;
    if (tdData) {
      analyser.getByteTimeDomainData(tdData);
    }
    
    // Calculate total to check if we're getting data
    let total = 0;
    let maxVal = 0;
    for (let i = 0; i < bufferLength; i++) {
      total += data[i];
      maxVal = Math.max(maxVal, data[i]);
    }
    
    // Check time domain for audio activity (values should deviate from 128 when audio is present)
    let tdMin = 128, tdMax = 128;
    if (tdData) {
      for (let i = 0; i < bufferLength; i++) {
        tdMin = Math.min(tdMin, tdData[i]);
        tdMax = Math.max(tdMax, tdData[i]);
      }
    }
    const tdRange = tdMax - tdMin;
    
    // Debug logging every 60 frames (~1 second)
    debugCounterRef.current++;
    if (debugCounterRef.current % 60 === 0) {
      console.log("Audio Debug:", {
        freqTotal: total,
        freqMax: maxVal,
        timeDomainRange: tdRange,
        tdMin,
        tdMax,
        hasAudio: tdRange > 5,
        contextState: audioContextRef.current?.state,
      });
    }
    
    // If frequency data is empty but time domain shows activity, derive values from time domain
    if (total === 0 && tdRange > 5) {
      // Use time domain amplitude as a fallback
      const amplitude = tdRange / 255;
      audioDataRef.current = { 
        bass: amplitude * 0.8, 
        mid: amplitude * 0.6, 
        high: amplitude * 0.4, 
        overall: amplitude 
      };
      setAudioLevel(amplitude);
      return;
    }
    
    // Calculate bass (20-250 Hz) - first ~15% of spectrum
    const bassEnd = Math.floor(bufferLength * 0.15);
    let bassSum = 0;
    let bassMax = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += data[i];
      bassMax = Math.max(bassMax, data[i]);
    }
    const bass = Math.max(bassSum / bassEnd / 255, bassMax / 255 * 0.5);
    
    // Calculate mid (250-2000 Hz) - ~15-50% of spectrum
    const midStart = bassEnd;
    const midEnd = Math.floor(bufferLength * 0.5);
    let midSum = 0;
    let midMax = 0;
    for (let i = midStart; i < midEnd; i++) {
      midSum += data[i];
      midMax = Math.max(midMax, data[i]);
    }
    const mid = Math.max(midSum / (midEnd - midStart) / 255, midMax / 255 * 0.5);
    
    // Calculate high (2000-20000 Hz) - ~50-100% of spectrum
    const highStart = midEnd;
    let highSum = 0;
    let highMax = 0;
    for (let i = highStart; i < bufferLength; i++) {
      highSum += data[i];
      highMax = Math.max(highMax, data[i]);
    }
    const high = Math.max(highSum / (bufferLength - highStart) / 255, highMax / 255 * 0.5);
    
    // Overall level - weighted combination with boost
    const overall = Math.min(1, (bass * 0.5 + mid * 0.35 + high * 0.15) * 1.5);
    
    audioDataRef.current = { bass, mid, high, overall };
    setAudioLevel(overall);
  };

  // Update particles
  const updateParticles = () => {
    if (!sceneRef.current || particlesRef.current.length === 0) return;

    const particle = particlesRef.current[0];
    const { mesh, startTime } = particle;
    const time = (Date.now() - startTime) * 0.001;
    
    mesh.material.uniforms.time.value = time;

    // Update audio analysis - use ref to avoid stale closure
    if (audioEnabledRef.current) {
      updateAudioAnalysis();
    }

    const { bass, mid, high, overall } = audioDataRef.current;
    const currentMode = controlModeRef.current;

    let expansion = 1.0;
    let rotationX = 0;
    let rotationY = 0.002;

    // Audio control mode - use ref to avoid stale closure
    if (currentMode === "audio" && audioEnabledRef.current) {
      // More aggressive smoothing for responsiveness
      const smoothing = 0.4;
      const currentBass = mesh.material.uniforms.bassImpact.value;
      const currentMid = mesh.material.uniforms.midImpact.value;
      const currentHigh = mesh.material.uniforms.highImpact.value;
      
      // Apply audio with boost for better visual effect
      const boostedBass = Math.min(1, bass * 2);
      const boostedMid = Math.min(1, mid * 1.8);
      const boostedHigh = Math.min(1, high * 1.5);
      
      mesh.material.uniforms.bassImpact.value += (boostedBass - currentBass) * smoothing;
      mesh.material.uniforms.midImpact.value += (boostedMid - currentMid) * smoothing;
      mesh.material.uniforms.highImpact.value += (boostedHigh - currentHigh) * smoothing;
      
      expansion = 1.0 + overall * 1.5;
      rotationY = 0.003 + boostedBass * 0.03;
      rotationX = boostedMid * 0.015;
      
      if (overall > 0.05) {
        setGestureInfo(`🎵 Bass: ${Math.round(bass * 100)}% | Mid: ${Math.round(mid * 100)}% | High: ${Math.round(high * 100)}%`);
      } else {
        setGestureInfo("🎵 Waiting for audio signal...");
      }
    }
    // Hand control mode
    else if (currentMode === "hand" && handDataRef.current) {
      const hand = handDataRef.current;
      
      if (hand.keypoints && hand.keypoints.length > 0) {
        const wrist = hand.keypoints.find(k => k.name === "wrist");
        const thumbTip = hand.keypoints.find(k => k.name === "thumb_tip");
        const indexTip = hand.keypoints.find(k => k.name === "index_finger_tip");
        const middleTip = hand.keypoints.find(k => k.name === "middle_finger_tip");
        const pinkyTip = hand.keypoints.find(k => k.name === "pinky_finger_tip");

        if (wrist && thumbTip && pinkyTip) {
          const spread = Math.sqrt(
            Math.pow((thumbTip.x - pinkyTip.x) / 640, 2) +
            Math.pow((thumbTip.y - pinkyTip.y) / 480, 2)
          );
          expansion = 0.5 + spread * 4;

          const fingerTips = [indexTip, middleTip, pinkyTip].filter(Boolean);
          const avgDist = fingerTips.reduce((sum, tip) => {
            return sum + Math.sqrt(
              Math.pow((tip.x - wrist.x) / 640, 2) +
              Math.pow((tip.y - wrist.y) / 480, 2)
            );
          }, 0) / fingerTips.length;

          if (avgDist < 0.15) {
            expansion = 0.3;
            setGestureInfo("✊ Fist - Collapse");
          } else if (spread > 0.25) {
            setGestureInfo("🖐️ Open - Expand");
          } else {
            setGestureInfo("👋 Hand Detected");
          }

          if (wrist) {
            rotationY = ((wrist.x / 640) - 0.5) * 0.04;
            rotationX = ((wrist.y / 480) - 0.5) * 0.02;
          }
        }
      }
    }
    // Mouse control mode
    else if (mouseDataRef.current.active) {
      const { x, y } = mouseDataRef.current;
      const distFromCenter = Math.sqrt(Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2));
      expansion = 0.8 + distFromCenter * 2;
      rotationY = (x - 0.5) * 0.04;
      rotationX = (y - 0.5) * 0.02;
      setGestureInfo("🖱️ Mouse Control");
    } else if (currentMode !== "audio") {
      setGestureInfo("");
    }

    // Apply expansion
    const currentExpansion = mesh.material.uniforms.audioExpansion.value;
    mesh.material.uniforms.audioExpansion.value += (expansion - currentExpansion) * 0.1;

    mesh.rotation.x += rotationX;
    mesh.rotation.y += rotationY;
  };

  // Initialize audio from microphone
  const initMicrophoneAudio = async () => {
    try {
      // Stop any existing audio first
      stopAudio();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      audioStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume audio context (required by browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      setAudioEnabled(true);
      setAudioSource("mic");
      setControlMode("audio");
      
      console.log("Microphone audio initialized successfully");
      return true;
    } catch (error) {
      console.error("Microphone access error:", error);
      alert("Microphone access failed: " + error.message);
      return false;
    }
  };

  // Initialize audio from screen/tab capture
  const initScreenAudio = async () => {
    try {
      // Stop any existing audio first
      stopAudio();
      
      console.log("Requesting screen capture with audio...");
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 1 },
          height: { max: 1 },
          frameRate: { max: 1 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
        },
        preferCurrentTab: false,
        selfBrowserSurface: "include",
        systemAudio: "include",
        surfaceSwitching: "include",
      });
      
      // Check if audio track exists
      const audioTracks = stream.getAudioTracks();
      console.log("Audio tracks:", audioTracks.length, audioTracks);
      
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error("No audio track found. Please make sure to check 'Share audio' checkbox when selecting the tab.");
      }
      
      audioStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000,
      });
      
      // Resume audio context (required by browsers after user interaction)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      console.log("AudioContext state:", audioContext.state);
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      
      // Log audio track details
      const audioTrack = audioTracks[0];
      console.log("Audio track settings:", audioTrack.getSettings());
      console.log("Audio track constraints:", audioTrack.getConstraints());
      console.log("Audio track enabled:", audioTrack.enabled);
      console.log("Audio track muted:", audioTrack.muted);
      console.log("Audio track readyState:", audioTrack.readyState);
      
      // Make sure the track is enabled
      audioTrack.enabled = true;
      
      // Create audio source from the stream
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create a gain node to potentially boost the signal
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      
      // Connect: source -> gain -> analyser
      source.connect(gainNode);
      gainNode.connect(analyser);
      
      // Also try connecting to destination to see if that helps (will be silent for tab capture)
      // analyser.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      // Log initial analyser data after a short delay
      setTimeout(() => {
        const testData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(testData);
        const testSum = testData.reduce((a, b) => a + b, 0);
        console.log("Initial audio test - sum:", testSum, "first 10:", Array.from(testData.slice(0, 10)));
        
        // Also try time domain data
        const timeDomainData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(timeDomainData);
        const tdMin = Math.min(...timeDomainData);
        const tdMax = Math.max(...timeDomainData);
        console.log("Time domain - min:", tdMin, "max:", tdMax, "(should vary from 128 if audio present)");
      }, 500);
      
      // Don't stop video track - it might affect the stream
      // Instead, just hide it if needed
      // setTimeout(() => {
      //   stream.getVideoTracks().forEach(track => {
      //     console.log("Stopping video track:", track.label);
      //     track.stop();
      //   });
      // }, 1000);
      
      setAudioEnabled(true);
      setAudioSource("screen");
      setControlMode("audio");
      
      // Handle stream ending
      audioTrack.onended = () => {
        console.log("Audio track ended");
        stopAudio();
      };
      
      // Handle mute changes
      audioTrack.onmute = () => console.log("Audio track muted");
      audioTrack.onunmute = () => console.log("Audio track unmuted");
      
      console.log("Screen audio initialized successfully");
      console.log("Analyser frequency bin count:", analyser.frequencyBinCount);
      
      return true;
    } catch (error) {
      console.error("Screen audio capture error:", error);
      alert("Audio capture failed: " + error.message + "\n\nMake sure to:\n1. Select a Chrome tab (not window/screen)\n2. Check 'Share audio' at the bottom of the dialog");
      return false;
    }
  };

  // Stop audio capture
  const stopAudio = () => {
    console.log("Stopping audio...");
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => {
        console.log("Stopping track:", track.kind, track.label);
        track.stop();
      });
      audioStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.log("Error closing audio context:", e);
      }
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    frequencyDataRef.current = null;
    audioDataRef.current = { bass: 0, mid: 0, high: 0, overall: 0 };
    
    // Reset particle uniforms
    if (particlesRef.current.length > 0) {
      const particle = particlesRef.current[0];
      if (particle.mesh?.material?.uniforms) {
        particle.mesh.material.uniforms.bassImpact.value = 0;
        particle.mesh.material.uniforms.midImpact.value = 0;
        particle.mesh.material.uniforms.highImpact.value = 0;
      }
    }
    
    setAudioEnabled(false);
    setAudioSource(null);
    setAudioLevel(0);
    setGestureInfo("");
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Hand detection loop
  const runDetectionLoop = useCallback(async () => {
    if (!isDetectingRef.current || !detectorRef.current || !videoRef.current) return;

    try {
      const video = videoRef.current;
      if (video.readyState >= 2) {
        const hands = await detectorRef.current.estimateHands(video, { flipHorizontal: false });
        if (hands && hands.length > 0) {
          setHandDetected(true);
          handDataRef.current = hands[0];
        } else {
          setHandDetected(false);
          handDataRef.current = null;
        }
      }
    } catch (e) {
      console.error("Hand detection error:", e);
    }

    if (isDetectingRef.current) {
      requestAnimationFrame(runDetectionLoop);
    }
  }, []);

  // Initialize hand tracking
  const initHandTracking = async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => video.play().then(resolve).catch(reject);
        setTimeout(() => reject(new Error("Video timeout")), 10000);
      });

      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      await tf.setBackend("webgl").catch(() => {});
      
      const handPoseDetection = await import("@tensorflow-models/hand-pose-detection");
      const detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        { runtime: "tfjs", modelType: "lite", maxHands: 1 }
      );

      detectorRef.current = detector;
      isDetectingRef.current = true;
      setCameraEnabled(true);
      setControlMode("hand");
      runDetectionLoop();
    } catch (error) {
      console.error("Hand tracking error:", error);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
    setIsLoading(false);
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (cameraEnabled) {
      isDetectingRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      detectorRef.current = null;
      setCameraEnabled(false);
      setHandDetected(false);
      handDataRef.current = null;
      setControlMode("audio");
    } else {
      await initHandTracking();
    }
  };

  // Mouse/touch handlers
  const handleMouseMove = (e) => {
    if (controlModeRef.current === "mouse") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        mouseDataRef.current = {
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
          active: true,
        };
      }
    }
  };

  const handleTouchMove = (e) => {
    if (controlModeRef.current === "mouse" && e.touches[0]) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        mouseDataRef.current = {
          x: (e.touches[0].clientX - rect.left) / rect.width,
          y: (e.touches[0].clientY - rect.top) / rect.height,
          active: true,
        };
      }
    }
  };

  const handleMouseLeave = () => {
    if (controlModeRef.current === "mouse") {
      mouseDataRef.current.active = false;
      setGestureInfo("");
    }
  };

  // Change palette
  const changePalette = () => {
    setCurrentPalette((prev) => (prev + 1) % COLOR_PALETTES.length);
  };

  // Reset particles
  const resetParticles = () => {
    if (sceneRef.current) {
      const { THREE, scene } = sceneRef.current;
      createParticles(THREE, scene);
    }
  };

  // Initialize
  useEffect(() => {
    initThreeJS();
    return () => {
      isDetectingRef.current = false;
      stopAudio();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (sceneRef.current) sceneRef.current.renderer.dispose();
    };
  }, [initThreeJS]);

  // Recreate particles when settings change
  useEffect(() => {
    if (sceneRef.current) {
      const { THREE, scene } = sceneRef.current;
      createParticles(THREE, scene);
    }
  }, [currentShape, currentPalette, particleCount]);

  // Update frequency canvas size based on visual mode
  useEffect(() => {
    if (frequencyCanvasRef.current) {
      const updateSize = () => {
        frequencyCanvasRef.current.width = window.innerWidth;
        // Full height in spectrum mode, 150px in particles mode
        frequencyCanvasRef.current.height = visualMode === "spectrum" ? window.innerHeight : 150;
      };
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }
  }, [visualMode]);

  // Resume audio context on any click (browser requirement)
  const handleContainerClick = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log("AudioContext resumed via click");
      });
    }
  };

  // Handle mouse movement for fullscreen control visibility
  const handleMouseMoveForControls = (e) => {
    if (!isFullscreen) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const y = e.clientY - rect.top;
    const bottomThreshold = rect.height * 0.7; // Show controls when in bottom 30%
    
    if (y > bottomThreshold) {
      setShowControls(true);
      // Clear any existing timeout
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      // Set timeout to hide controls after 3 seconds of no movement
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Show controls when not in fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    } else {
      // Hide controls after entering fullscreen
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
    
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isFullscreen]);

  return (
    <Layout>
      <div 
        ref={containerRef}
        className={`relative w-full overflow-hidden ${isFullscreen ? "h-screen" : "h-[calc(100vh-140px)]"}`}
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleMouseMoveForControls(e);
        }}
        onTouchMove={handleTouchMove}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleMouseLeave}
        onClick={handleContainerClick}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-950/20 to-black" />
        
        {/* Full screen spectrum visualization - Always rendered for smooth transitions */}
        <canvas
          ref={frequencyCanvasRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
            visualMode === "spectrum" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Three.js Canvas (particles mode) - Always rendered, hidden when in spectrum mode */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full cursor-crosshair transition-opacity duration-500 ${
            visualMode === "particles" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ touchAction: "none" }}
        />

        {/* Video element for camera */}
        <video
          ref={videoRef}
          className={cameraEnabled ? "absolute top-4 right-4 w-32 h-24 rounded-xl border-2 border-white/20 shadow-2xl bg-black object-cover transform scale-x-[-1]" : "hidden"}
          playsInline
          muted
        />

        {/* Hand detection indicator */}
        {cameraEnabled && (
          <div className={`absolute top-32 right-4 px-3 py-1.5 rounded-lg text-xs font-medium ${
            handDetected ? "bg-green-500/80 text-white" : "bg-yellow-500/80 text-black"
          }`}>
            {handDetected ? "✋ Hand Detected" : "👀 Looking..."}
          </div>
        )}

        {/* Audio level indicator - Hide in fullscreen */}
        {audioEnabled && (
          <div className={`absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-xl px-4 py-2 transition-all duration-500 ${
            isFullscreen && !showControls ? "opacity-0 translate-y-[-20px]" : "opacity-100 translate-y-0"
          }`}>
            <Volume2 className={`w-5 h-5 ${audioLevel > 0.3 ? "text-green-400" : "text-white/60"}`} />
            <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-75"
                style={{ width: `${Math.min(audioLevel * 150, 100)}%` }}
              />
            </div>
            <span className="text-xs text-white/60 w-8">{Math.round(audioLevel * 100)}%</span>
          </div>
        )}

        {/* Gesture Info Display - Hide in fullscreen */}
        {gestureInfo && !(isFullscreen && !showControls) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-full px-6 py-2 text-white font-medium text-sm">
            {gestureInfo}
          </div>
        )}

        {/* Fullscreen Button - Always visible for exit */}
        <button
          onClick={toggleFullscreen}
          className={`absolute top-4 left-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-all duration-300 ${
            isFullscreen && !showControls ? "opacity-30 hover:opacity-100" : "opacity-100"
          }`}
        >
          {isFullscreen ? (
            <Minimize className="w-5 h-5 text-white" />
          ) : (
            <Maximize className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Title - Hide in fullscreen */}
        <div className={`absolute top-4 left-16 flex items-center gap-3 text-white transition-all duration-500 ${
          isFullscreen && !showControls ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
        }`}>
          <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Music Visualizer</h1>
            <p className="text-xs text-white/60">
              {audioEnabled ? `Audio: ${audioSource === "mic" ? "Microphone" : "System Audio"}` : "Enable audio to start"}
            </p>
          </div>
        </div>

        {/* Control Panel - Hidden in fullscreen unless hovering */}
        <div 
          className={`absolute ${isFullscreen ? "bottom-8" : "bottom-4"} left-4 right-4 transition-all duration-500 ${
            isFullscreen && !showControls ? "opacity-0 translate-y-10 pointer-events-none" : "opacity-100 translate-y-0"
          }`}
        >
          {/* Visual Mode Toggle */}
          <div className="flex justify-center gap-2 mb-3">
            <button
              onClick={() => setVisualMode("spectrum")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                visualMode === "spectrum"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white/10 text-white/80 hover:bg-white/20 backdrop-blur-md"
              }`}
            >
              <Music className="w-4 h-4" />
              <span>Spectrum</span>
            </button>
            <button
              onClick={() => setVisualMode("particles")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                visualMode === "particles"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30"
                  : "bg-white/10 text-white/80 hover:bg-white/20 backdrop-blur-md"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Particles</span>
            </button>
          </div>

          {/* Shape Selection - Only in particles mode */}
          {visualMode === "particles" && (
          <div className="flex justify-center gap-2 mb-3 flex-wrap">
            {Object.entries(PARTICLE_SHAPES).map(([key, shape]) => {
              const Icon = shape.icon;
              const isActive = currentShape === key;
              return (
                <button
                  key={key}
                  onClick={() => setCurrentShape(key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                    isActive
                      ? "bg-white text-gray-900 shadow-lg shadow-white/20"
                      : "bg-white/10 text-white/80 hover:bg-white/20 backdrop-blur-md"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{shape.name}</span>
                </button>
              );
            })}
          </div>
          )}

          {/* Audio Controls */}
          <div className="flex justify-center gap-2 mb-3 flex-wrap">
            <button
              onClick={() => audioEnabled ? stopAudio() : initMicrophoneAudio()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
                audioSource === "mic"
                  ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                  : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
              }`}
            >
              {audioSource === "mic" ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              <span className="hidden sm:inline">Microphone</span>
            </button>

            <button
              onClick={() => audioEnabled ? stopAudio() : initScreenAudio()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
                audioSource === "screen"
                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
              }`}
            >
              <Monitor className="w-5 h-5" />
              <span className="hidden sm:inline">System Audio</span>
            </button>

            <button
              onClick={toggleCamera}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
                cameraEnabled
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
              } ${isLoading ? "opacity-50" : ""}`}
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              <span className="hidden sm:inline">{cameraEnabled ? "Camera On" : "Hand Track"}</span>
            </button>
          </div>

          {/* Other Controls */}
          <div className="flex justify-center gap-2 flex-wrap">
            <button
              onClick={changePalette}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all"
            >
              <Palette className="w-5 h-5" />
              <span className="hidden sm:inline">{COLOR_PALETTES[currentPalette].name}</span>
            </button>

            <button
              onClick={resetParticles}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Particle count */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2">
              <span className="text-white/60 text-sm hidden sm:inline">Particles:</span>
              <input
                type="range"
                min="1000"
                max="6000"
                step="500"
                value={particleCount}
                onChange={(e) => setParticleCount(parseInt(e.target.value))}
                className="w-20 accent-purple-500"
              />
              <span className="text-white font-mono text-sm w-10">{particleCount}</span>
            </div>
          </div>
        </div>

        {/* Instructions - Hide in fullscreen */}
        {!audioEnabled && !gestureInfo && !(isFullscreen && !showControls) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white/50 max-w-md px-6">
              <Music className="w-20 h-20 mx-auto mb-4 opacity-30" />
              <h2 className="text-2xl font-bold mb-3 text-white/70">Music Visualizer</h2>
              <div className="space-y-2 text-sm">
                <p>🎤 <strong>Microphone</strong> - Captures audio from speakers</p>
                <p>🖥️ <strong>System Audio</strong> - Direct audio capture (select tab with music)</p>
                <p>✋ <strong>Hand Track</strong> - Control with gestures</p>
              </div>
              <p className="mt-4 text-xs text-white/30">
                Play music on YouTube Music, then click "System Audio" and share the tab with audio enabled
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
