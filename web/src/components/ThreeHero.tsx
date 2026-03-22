'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeHero() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a2e');

    // Camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 8);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      // WebGL unavailable — component returns null, CSS background shows
      return;
    }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Invitation card planes
    const cardGeo = new THREE.PlaneGeometry(1.4, 2.0);
    const cards: THREE.Mesh[] = [];
    const vels: { rx: number; ry: number; vx: number; vy: number }[] = [];

    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: '#16213e',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(cardGeo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      scene.add(mesh);
      cards.push(mesh);
      vels.push({
        rx: (Math.random() - 0.5) * 0.004,
        ry: (Math.random() - 0.5) * 0.004,
        vx: (Math.random() - 0.5) * 0.006,
        vy: (Math.random() - 0.5) * 0.004,
      });
    }

    // Particles
    const particleCount = 200;
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 20;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: '#e94560',
      size: 0.06,
      transparent: true,
      opacity: 0.5,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // Animate
    let frameId: number;
    let t = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      t += 0.005;

      cards.forEach((card, i) => {
        card.rotation.x += vels[i].rx;
        card.rotation.y += vels[i].ry;
        card.position.x += vels[i].vx;
        card.position.y += vels[i].vy;
        // Bounce off invisible walls
        if (Math.abs(card.position.x) > 9) vels[i].vx *= -1;
        if (Math.abs(card.position.y) > 7) vels[i].vy *= -1;
      });

      // Camera drift
      camera.position.x = Math.sin(t * 0.12) * 0.6;
      camera.position.y = Math.cos(t * 0.09) * 0.4;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      cards.forEach((c) => (c.material as THREE.Material).dispose());
      cardGeo.dispose();
      pGeo.dispose();
      pMat.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}
