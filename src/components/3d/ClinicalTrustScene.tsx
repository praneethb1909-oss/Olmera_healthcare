import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TrustFallback } from './SceneFallbacks';

interface ClinicalTrustSceneProps {
  className?: string;
}

/**
 * Architectural open-ring emblem in Olmera's Deep Fern, Mist, and Signal Coral palette.
 * Respects prefers-reduced-motion and falls back cleanly when WebGL is unavailable.
 */
export default function ClinicalTrustScene({ className = '' }: ClinicalTrustSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setIsReducedMotion(true);
        return;
      }
    }

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
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0, 5.2);

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

    const ambientLight = new THREE.AmbientLight(0xf6f2ea, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(-2, 3, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcfe3dd, 0.9);
    fillLight.position.set(2, -2, 2);
    scene.add(fillLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Primary Open Ring (Olmera Circle of Care)
    const openRingGeo = new THREE.TorusGeometry(1.15, 0.12, 24, 96, Math.PI * 1.72);
    const openRingMat = new THREE.MeshStandardMaterial({
      color: 0x0e4f4a,
      roughness: 0.35,
      metalness: 0.25
    });
    const openRing = new THREE.Mesh(openRingGeo, openRingMat);
    openRing.rotation.z = 0.45;
    rootGroup.add(openRing);

    // Subtle Secondary Mist Orbit
    const outerRingGeo = new THREE.TorusGeometry(1.58, 0.025, 16, 96);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0xcfe3dd,
      roughness: 0.5,
      metalness: 0.1
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = Math.PI / 3.2;
    rootGroup.add(outerRing);

    // Signal Coral Care Node at the gap
    const nodeGeo = new THREE.SphereGeometry(0.18, 28, 28);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xff7a59,
      roughness: 0.3,
      metalness: 0.15
    });
    const coralNode = new THREE.Mesh(nodeGeo, nodeMat);
    coralNode.position.set(1.12, 0.18, 0);
    rootGroup.add(coralNode);

    let frameId: number;
    let time = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      time += 0.008;
      rootGroup.rotation.y = Math.sin(time * 0.7) * 0.28;
      outerRing.rotation.z = time * 0.35;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 320;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      openRingGeo.dispose();
      openRingMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      renderer.dispose();
    };
  }, []);

  if (!hasWebGL || isReducedMotion) {
    return <TrustFallback className={className} />;
  }

  return <div ref={containerRef} className={className} aria-label="Olmera care security emblem" />;
}
