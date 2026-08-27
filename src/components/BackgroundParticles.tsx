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
  grounded: boolean;
  groundY: number;
}

const PARTICLE_COUNT = 150;
const MOUSE_INFLUENCE_RADIUS = 200;
const REPULSION_FORCE = 0.15;
const FALL_SPEED = 0.00006;
const DRIFT_SPEED = 0.01;
const GROUND_FRICTION = 0.96;
const MAX_GROUND_HEIGHT = 180;
const GROUND_COLUMNS = 240;
const GROUND_GROWTH_RATE = 0.4;

const PARTICLE_COLORS = [
  { r: 124, g: 58, b: 237, baseOpacity: 0.70 },
  { r: 79, g: 70, b: 229, baseOpacity: 0.67 },
  { r: 185, g: 168, b: 248, baseOpacity: 0.65 },
  { r: 255, g: 255, b: 255, baseOpacity: 0.62 },
];

export default function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, down: false });
  const groundRef = useRef<number[]>([]);
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
      initGround();
    };

    const initGround = () => {
      groundRef.current = Array(GROUND_COLUMNS).fill(0);
    };

    const initParticles = (w: number, h: number) => {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => {
        const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        return {
          x: Math.random() * w,
          y: Math.random() * h * 0.1,
          vx: (Math.random() - 0.5) * DRIFT_SPEED,
          vy: FALL_SPEED * (0.5 + Math.random() * 0.5),
          size: Math.random() * 3.5 + 1,
          opacity: color.baseOpacity * (0.7 + Math.random() * 0.3),
          color,
          life: 0,
          maxLife: Math.random() * 60000 + 40000,
          grounded: false,
          groundY: h,
        };
      });
    };

    const getGroundHeightAt = (x: number, w: number): number => {
      const cols = groundRef.current.length;
      if (cols === 0) return 0;
      const idx = Math.floor((x / w) * cols);
      const clamped = Math.max(0, Math.min(cols - 1, idx));
      return groundRef.current[clamped];
    };

    const addToGround = (x: number, size: number, w: number) => {
      const cols = groundRef.current.length;
      if (cols === 0) return;
      const idx = Math.floor((x / w) * cols);
      const clamped = Math.max(0, Math.min(cols - 1, idx));
      const growth = size * GROUND_GROWTH_RATE;
      const newHeight = Math.min(MAX_GROUND_HEIGHT, groundRef.current[clamped] + growth);
      groundRef.current[clamped] = newHeight;
      const spread = Math.max(2, Math.floor(size * 0.6));
      for (let i = 1; i <= spread; i++) {
        const factor = 1 - i / (spread + 1);
        if (clamped - i >= 0) groundRef.current[clamped - i] = Math.max(groundRef.current[clamped - i], newHeight * factor * 0.6);
        if (clamped + i < cols) groundRef.current[clamped + i] = Math.max(groundRef.current[clamped + i], newHeight * factor * 0.6);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, down: mouseRef.current.down };
    };

    const handleMouseDown = () => {
      mouseRef.current = { ...mouseRef.current, down: true };
    };

    const handleMouseUp = () => {
      mouseRef.current = { ...mouseRef.current, down: false };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999, down: false };
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
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
      const ground = groundRef.current;

      for (const p of particlesRef.current) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < MOUSE_INFLUENCE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_INFLUENCE_RADIUS) * REPULSION_FORCE;
          const angle = Math.atan2(dy, dx);
          const clickMultiplier = mouse.down ? 6 : 1;
          p.vx -= Math.cos(angle) * force * 0.1 * clickMultiplier;
          p.vy -= Math.sin(angle) * force * 0.1 * clickMultiplier;
        }

        if (!p.grounded) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.996;
          p.vy = Math.max(FALL_SPEED * 0.3, p.vy * 0.999);

          const groundH = getGroundHeightAt(p.x, width);
          const groundY = height - groundH;
          
          if (p.y + p.size >= groundY) {
            p.y = groundY - p.size;
            p.grounded = true;
            p.groundY = p.y;
            p.vx *= GROUND_FRICTION;
            p.vy = 0;
            addToGround(p.x, p.size, width);
          }
        } else {
          if (mouse.down && dist < MOUSE_INFLUENCE_RADIUS * 1.5 && dist > 0) {
            const force = (1 - dist / (MOUSE_INFLUENCE_RADIUS * 1.5)) * REPULSION_FORCE * 4;
            const angle = Math.atan2(dy, dx);
            p.vx += Math.cos(angle) * force * 0.2;
            p.vy -= Math.sin(angle) * force * 0.25;
            
            if (p.vy < -0.2) {
              p.grounded = false;
            }
          }

          if (p.grounded) {
            p.x += p.vx;
            p.vy += 0.0003;
            p.y += p.vy;
            p.vx *= GROUND_FRICTION;
            
            const groundH = getGroundHeightAt(p.x, width);
            const groundY = height - groundH;
            
            if (p.y >= groundY - p.size) {
              p.y = groundY - p.size;
              p.vy = 0;
              p.groundY = p.y;
            } else if (p.y < groundY - p.size - 8) {
              p.grounded = false;
            }
          }
        }

        if (p.x < -p.size) p.x = width + p.size;
        if (p.x > width + p.size) p.x = -p.size;

        p.life++;
        if (p.life > p.maxLife) {
          p.x = Math.random() * width;
          p.y = Math.random() * height * 0.1;
          p.vx = (Math.random() - 0.5) * DRIFT_SPEED;
          p.vy = FALL_SPEED * (0.5 + Math.random() * 0.5);
          p.grounded = false;
          p.life = 0;
          p.maxLife = Math.random() * 60000 + 40000;
          const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
          p.color = color;
          p.opacity = color.baseOpacity * (0.7 + Math.random() * 0.3);
          p.size = Math.random() * 3.5 + 1;
        }

        const lifeRatio = p.life / p.maxLife;
        const currentOpacity = p.opacity * (1 - lifeRatio * 0.1);
        const currentSize = p.size * (0.9 + lifeRatio * 0.1);

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${currentOpacity})`;
        ctx.fill();
      }

      if (ground.length > 0) {
        const cols = ground.length;
        const colWidth = width / cols;
        
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        for (let i = 0; i <= cols; i++) {
          const x = i * colWidth;
          const h = i < cols ? ground[i] : ground[cols - 1];
          const y = height - h;
          
          if (i === 0) {
            ctx.lineTo(x, y);
          } else {
            const prevX = (i - 1) * colWidth;
            const prevH = ground[i - 1];
            const prevY = height - prevH;
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(cpX, prevY, cpX, y);
          }
        }
        
        ctx.lineTo(width, height);
        ctx.closePath();
        
        const grad = ctx.createLinearGradient(0, height - MAX_GROUND_HEIGHT, 0, height);
        grad.addColorStop(0, "rgba(185, 168, 248, 0.15)");
        grad.addColorStop(0.5, "rgba(124, 58, 237, 0.22)");
        grad.addColorStop(1, "rgba(79, 70, 229, 0.30)");
        ctx.fillStyle = grad;
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let i = 0; i <= cols; i++) {
          const x = i * colWidth;
          const h = i < cols ? ground[i] : ground[cols - 1];
          const y = height - h;
          if (i === 0) ctx.lineTo(x, y);
          else {
            const prevX = (i - 1) * colWidth;
            const prevH = ground[i - 1];
            const prevY = height - prevH;
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(cpX, prevY, cpX, y);
          }
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleMouseLeave);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [dimensions]);

  return (
    <canvas
      ref={canvasRef}
      className="bg-particles-canvas"
      aria-hidden="true"
      style={{ width: "100vw", height: "100vh", touchAction: "none" }}
    />
  );
}