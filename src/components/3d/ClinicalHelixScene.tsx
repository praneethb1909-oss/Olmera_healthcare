import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { HelixFallback } from './SceneFallbacks';

interface ClinicalHelixSceneProps {
  className?: string;
}

export default function ClinicalHelixScene({ className = '' }: ClinicalHelixSceneProps) {
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

    // Dimensions
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 450;

    // Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      // Performance standard: Cap devicePixelRatio at 2
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
    } catch {
      setHasWebGL(false);
      return;
    }

    // Ambient & Neon Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x22e3c8, 2.8, 15);
    cyanLight.position.set(-3, 3, 4);
    scene.add(cyanLight);

    const violetLight = new THREE.PointLight(0x7b5cff, 3.0, 15);
    violetLight.position.set(3, -2, 4);
    scene.add(violetLight);

    const roseLight = new THREE.PointLight(0xff5c8a, 2.2, 10);
    roseLight.position.set(0, 0, -3);
    scene.add(roseLight);

    // Root Group for Mouse Parallax & Float
    const helixGroup = new THREE.Group();
    scene.add(helixGroup);

    // Procedural DNA Geometry
    const strand1Points: THREE.Vector3[] = [];
    const strand2Points: THREE.Vector3[] = [];
    const totalPairs = 32;
    const heightSpan = 5.2;
    const turns = 2.4;
    const radius = 1.15;

    const sphereGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const rungCylinderGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);

    // Materials with neon clinical colors
    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x22e3c8,
      emissive: 0x148c7c,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.2
    });

    const violetMat = new THREE.MeshStandardMaterial({
      color: 0x7b5cff,
      emissive: 0x472ec4,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.2
    });

    const roseMat = new THREE.MeshStandardMaterial({
      color: 0xff5c8a,
      emissive: 0xb52b54,
      emissiveIntensity: 0.5,
      roughness: 0.25,
      metalness: 0.2
    });

    const rungMat = new THREE.MeshStandardMaterial({
      color: 0xd3eef0,
      emissive: 0x0e8fb0,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < totalPairs; i++) {
      const t = i / (totalPairs - 1);
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * heightSpan;

      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;
      const p1 = new THREE.Vector3(x1, y, z1);
      strand1Points.push(p1);

      const x2 = Math.cos(angle + Math.PI) * radius;
      const z2 = Math.sin(angle + Math.PI) * radius;
      const p2 = new THREE.Vector3(x2, y, z2);
      strand2Points.push(p2);

      // Node spheres on strand 1 (Cyan to Violet gradient)
      const mat1 = t < 0.5 ? cyanMat : violetMat;
      const node1 = new THREE.Mesh(sphereGeo, mat1);
      node1.position.copy(p1);
      helixGroup.add(node1);

      // Node spheres on strand 2 (Violet to Rose gradient)
      const mat2 = t < 0.5 ? violetMat : roseMat;
      const node2 = new THREE.Mesh(sphereGeo, mat2);
      node2.position.copy(p2);
      helixGroup.add(node2);

      // Connecting Base-Pair Rungs
      const rungMesh = new THREE.Mesh(rungCylinderGeo, rungMat);
      const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const distance = p1.distanceTo(p2);

      rungMesh.position.copy(midpoint);
      rungMesh.scale.set(1, distance, 1);
      rungMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(p2, p1).normalize());
      helixGroup.add(rungMesh);
    }

    // Smooth Tube Curves for the Strands
    const curve1 = new THREE.CatmullRomCurve3(strand1Points);
    const tubeGeo1 = new THREE.TubeGeometry(curve1, 64, 0.025, 8, false);
    const tubeMesh1 = new THREE.Mesh(tubeGeo1, cyanMat);
    helixGroup.add(tubeMesh1);

    const curve2 = new THREE.CatmullRomCurve3(strand2Points);
    const tubeGeo2 = new THREE.TubeGeometry(curve2, 64, 0.025, 8, false);
    const tubeMesh2 = new THREE.Mesh(tubeGeo2, roseMat);
    helixGroup.add(tubeMesh2);

    // Two Thin Neon Orbital Rings
    const ringGeo1 = new THREE.TorusGeometry(2.2, 0.015, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x22e3c8, transparent: true, opacity: 0.65 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    helixGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(2.35, 0.012, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x7b5cff, transparent: true, opacity: 0.55 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 3.5;
    ring2.rotation.y = -Math.PI / 5;
    helixGroup.add(ring2);

    // Parallax tracking
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      targetRotY = ((e.clientX - halfW) / halfW) * 0.25;
      targetRotX = ((e.clientY - halfH) / halfH) * 0.2;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

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

    // Resize Observer
    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth || 400;
      const newH = container.clientHeight || 450;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Only render when visible and tab active
      if (!isVisible || !isTabActive) return;

      const elapsed = clock.getElapsedTime();

      // Continuous gentle helix rotation
      helixGroup.rotation.y += 0.007;

      // Gentle vertical float
      helixGroup.position.y = Math.sin(elapsed * 1.2) * 0.12;

      // Smooth pointer parallax damping
      helixGroup.rotation.x += (targetRotX - helixGroup.rotation.x) * 0.05;
      helixGroup.rotation.z += (targetRotY * 0.5 - helixGroup.rotation.z) * 0.05;

      // Slow counter-rotation of orbital rings
      ring1.rotation.z += 0.004;
      ring2.rotation.z -= 0.003;

      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();

      // Dispose three.js resources
      sphereGeo.dispose();
      rungCylinderGeo.dispose();
      tubeGeo1.dispose();
      tubeGeo2.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      cyanMat.dispose();
      violetMat.dispose();
      roseMat.dispose();
      rungMat.dispose();
      ringMat1.dispose();
      ringMat2.dispose();

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!hasWebGL || isReducedMotion) {
    return <HelixFallback className={className} />;
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full min-h-[300px] flex items-center justify-center relative select-none ${className}`}
      aria-hidden="true"
    />
  );
}
