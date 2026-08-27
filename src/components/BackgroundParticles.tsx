import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: { r: number; g: number; b: number; baseOpacity: number };
  life: number;
  maxLife: number;
}

const PARTICLE_COUNT = 60;
const MOUSE_INFLUENCE_RADIUS = 150;
const REPULSION_FORCE = 0.15;
const FALL_SPEED = 0.08;
const DRIFT_SPEED = 0.015;

// Colors matching the large background gradients (violet/indigo) + subtle white
const PARTICLE_COLORS = [
  { r: 124, g: 58, b: 237, baseOpacity: 0.25 },   // violet from large gradient
  { r: 79, g: 70, b: 229, baseOpacity: 0.22 },    // indigo from large gradient
  { r: 185, g: 168, b: 248, baseOpacity: 0.20 },  // lavender
  { r: 255, g: 255, b: 255, baseOpacity: 0.18 },  // subtle white
];

export default function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      setDimensions({ width, height });
      initParticles(width, height);
    };

    const initParticles = (w: number, h: number) => {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => {
        const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * DRIFT_SPEED,
          vy: FALL_SPEED * (0.5 + Math.random() * 0.5),
          size: Math.random() * 2.5 + 0.8,
          opacity: color.baseOpacity * (0.5 + Math.random() * 0.5),
          color,
          life: 0,
          maxLife: Math.random() * 30000 + 20000,
        };
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    resize();

    function animate() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const { width, height } = dimensions;
      if (!width || !height) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(devicePixelRatio, devicePixelRatio);

      const mouse = mouseRef.current;

      for (const p of particlesRef.current) {
        // Very gentle mouse repulsion
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < MOUSE_INFLUENCE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_INFLUENCE_RADIUS) * REPULSION_FORCE;
          const angle = Math.atan2(dy, dx);
          p.vx -= Math.cos(angle) * force * 0.05;
          p.vy -= Math.sin(angle) * force * 0.05;
        }

        // Very gentle snowfall physics
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.998;
        p.vy = Math.max(FALL_SPEED * 0.2, p.vy * 0.999);

        // Boundary wrap - respawn at top when falling off bottom
        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
          p.vx = (Math.random() - 0.5) * DRIFT_SPEED;
          p.vy = FALL_SPEED * (0.5 + Math.random() * 0.5);
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Life cycle - occasional full reset
        p.life++;
        if (p.life > p.maxLife) {
          p.x = Math.random() * width;
          p.y = -10;
          p.vx = (Math.random() - 0.5) * DRIFT_SPEED;
          p.vy = FALL_SPEED * (0.5 + Math.random() * 0.5);
          p.life = 0;
          p.maxLife = Math.random() * 30000 + 20000;
          const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
          p.color = color;
          p.opacity = color.baseOpacity * (0.5 + Math.random() * 0.5);
          p.size = Math.random() * 2.5 + 0.8;
        }

        // Draw - simple dots, no glow
        const lifeRatio = p.life / p.maxLife;
        const currentOpacity = p.opacity * (1 - lifeRatio * 0.2);
        const currentSize = p.size * (0.8 + lifeRatio * 0.2);

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${currentOpacity})`;
        ctx.fill();
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [dimensions]);

  return (
    <canvas
      ref={canvasRef}
      className="bg-particles-canvas"
      aria-hidden="true"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}