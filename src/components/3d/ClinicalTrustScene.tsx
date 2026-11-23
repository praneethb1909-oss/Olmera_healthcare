import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TrustFallback } from './SceneFallbacks';

interface ClinicalTrustSceneProps {
  className?: string;
}

export default function ClinicalTrustScene({ className = '' }: ClinicalTrustSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    // 1. Accessibility: Check for prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setIsReducedMotion(true);
        return;
      }
    }

    // 2. WebGL Feature Check
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0, 5.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
    } catch {
      setHasWebGL(false);
      return;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const rimLightCyan = new THREE.DirectionalLight(0x22e3c8, 2.5);
    rimLightCyan.position.set(-2, 3, 2);
    scene.add(rimLightCyan);

    const rimLightViolet = new THREE.DirectionalLight(0x7b5cff, 2.5);
    rimLightViolet.position.set(2, -2, -2);
    scene.add(rimLightViolet);

    // Group for the 3D Pulse Heart / Shield Beacon
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Procedural Anatomical Heart Shape in 3D using parametric curves & lathe/extrusion
    const x = 0, y = 0;
    const heartShape = new THREE.Shape();
    heartShape.moveTo(x + 0.25, y + 0.25);
    heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
    heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
    heartShape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 0.95);
    heartShape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
    heartShape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
    heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

    const extrudeSettings = {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 2,
      bevelSize: 0.08,
      bevelThickness: 0.08
    };

    const heartGeo = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    heartGeo.center();

    // Subtle neon rim light shader material
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0x07131a,
      emissive: 0x0e4f4a,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.8
    });

    const heartMesh = new THREE.Mesh(heartGeo, heartMat);
    heartMesh.rotation.z = Math.PI; // Orient heart upright
    heartMesh.scale.set(1.4, 1.4, 1.4);
    rootGroup.add(heartMesh);

    // Neon Rim Rings around the pulse beacon
    const ringGeo1 = new THREE.TorusGeometry(1.65, 0.015, 16, 80);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x22e3c8, transparent: true, opacity: 0.75 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 4;
    rootGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(1.78, 0.012, 16, 80);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x7b5cff, transparent: true, opacity: 0.65 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 3;
    ring2.rotation.y = Math.PI / 6;
    rootGroup.add(ring2);

    // Cardiac Pulse Beacon Dot
    const beaconGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff5c8a });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0, 0.4);
    rootGroup.add(beacon);

    // Performance: Pause rendering when off-screen or tab hidden
    let isVisible = true;
    let isTabActive = !document.hidden;

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.05 });
    observer.observe(container);

    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth || 320;
      const newH = container.clientHeight || 320;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible || !isTabActive) return;

      const elapsed = clock.getElapsedTime();

      // Gentle continuous rotation
      rootGroup.rotation.y = Math.sin(elapsed * 0.6) * 0.35;
      rootGroup.rotation.x = Math.cos(elapsed * 0.4) * 0.15;

      // Simulated systolic cardiac pulse
      const pulse = Math.sin(elapsed * 3.5);
      const scaleBase = 1.0 + (pulse > 0.7 ? (pulse - 0.7) * 0.12 : 0);
      heartMesh.scale.set(1.4 * scaleBase, 1.4 * scaleBase, 1.4 * scaleBase);

      // Neon orbital rings counter-spin
      ring1.rotation.z += 0.005;
      ring2.rotation.z -= 0.004;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();

      heartGeo.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      beaconGeo.dispose();
      heartMat.dispose();
      ringMat1.dispose();
      ringMat2.dispose();
      beaconMat.dispose();

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!hasWebGL || isReducedMotion) {
    return <TrustFallback className={className} />;
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full min-h-[200px] flex items-center justify-center relative select-none ${className}`}
      aria-hidden="true"
    />
  );
}
