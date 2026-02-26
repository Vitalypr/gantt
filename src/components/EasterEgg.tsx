import { useEffect, useRef, useState } from 'react';

const DURATION = 7000;
const IMG_SIZE = 300;

export function EasterEgg({ onDone }: { onDone: () => void }) {
  const rafRef = useRef<number>(0);
  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ vx: 0, vy: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const [opacity, setOpacity] = useState(1);

  // Initialize position and velocity
  useEffect(() => {
    const maxW = window.innerWidth - IMG_SIZE;
    const maxH = window.innerHeight - IMG_SIZE;
    posRef.current = {
      x: Math.random() * Math.max(maxW, 0),
      y: Math.random() * Math.max(maxH, 0),
    };
    // Fast random direction
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 3;
    velRef.current = {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  }, []);

  // Animation loop using requestAnimationFrame for smooth bouncing
  useEffect(() => {
    let lastTime = performance.now();

    function animate(now: number) {
      const dt = Math.min((now - lastTime) / 16, 3); // normalize to ~60fps, cap spikes
      lastTime = now;

      const maxW = window.innerWidth - IMG_SIZE;
      const maxH = window.innerHeight - IMG_SIZE;
      const pos = posRef.current;
      const vel = velRef.current;

      let nx = pos.x + vel.vx * dt;
      let ny = pos.y + vel.vy * dt;

      // Bounce off edges
      if (nx <= 0) {
        nx = 0;
        vel.vx = Math.abs(vel.vx);
      } else if (nx >= maxW) {
        nx = maxW;
        vel.vx = -Math.abs(vel.vx);
      }

      if (ny <= 0) {
        ny = 0;
        vel.vy = Math.abs(vel.vy);
      } else if (ny >= maxH) {
        ny = maxH;
        vel.vy = -Math.abs(vel.vy);
      }

      pos.x = nx;
      pos.y = ny;

      if (imgRef.current) {
        imgRef.current.style.left = `${nx}px`;
        imgRef.current.style.top = `${ny}px`;
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Fade out and remove after duration
  useEffect(() => {
    const fadeStart = setTimeout(() => setOpacity(0), DURATION - 1000);
    const done = setTimeout(onDone, DURATION);
    return () => {
      clearTimeout(fadeStart);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <img
      ref={imgRef}
      src={`${import.meta.env.BASE_URL}easter_egg.jpg`}
      alt=""
      style={{
        position: 'fixed',
        left: posRef.current.x,
        top: posRef.current.y,
        width: IMG_SIZE,
        zIndex: 9999,
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 1s ease-out',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    />
  );
}
