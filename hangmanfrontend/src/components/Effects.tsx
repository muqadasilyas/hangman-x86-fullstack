import { useEffect, useState } from "react";

interface Particle {
  id: number;
  left: number;
  delay: number;
  color: string;
  size: number;
  duration: number;
  shape: "rect" | "circle" | "tri";
}

const PALETTE = [
  "hsl(350 85% 62%)", "hsl(45 95% 62%)", "hsl(160 65% 55%)",
  "hsl(265 75% 70%)", "hsl(200 85% 65%)", "hsl(15 90% 60%)",
];

export function Confetti({ count = 80, duration = 3500 }: { count?: number; duration?: number }) {
  const [parts, setParts] = useState<Particle[]>([]);
  useEffect(() => {
    setParts(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        size: 8 + Math.random() * 10,
        duration: 2.4 + Math.random() * 1.8,
        shape: (["rect", "circle", "tri"] as const)[Math.floor(Math.random() * 3)],
      })),
    );
    const t = setTimeout(() => setParts([]), duration);
    return () => clearTimeout(t);
  }, [count, duration]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {parts.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size,
            background: p.shape === "tri" ? "transparent" : p.color,
            borderRadius: p.shape === "circle" ? "50%" : p.shape === "rect" ? "3px" : 0,
            borderLeft: p.shape === "tri" ? `${p.size / 2}px solid transparent` : undefined,
            borderRight: p.shape === "tri" ? `${p.size / 2}px solid transparent` : undefined,
            borderBottom: p.shape === "tri" ? `${p.size}px solid ${p.color}` : undefined,
            animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(0.3,0.7,0.5,1) forwards`,
            boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          }}
        />
      ))}
    </div>
  );
}

interface Spark { id: number; x: number; y: number; }

export function useSparks() {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const burst = (x: number, y: number) => {
    const id = Date.now() + Math.random();
    setSparks((s) => [...s, { id, x, y }]);
    setTimeout(() => setSparks((s) => s.filter((sp) => sp.id !== id)), 700);
  };
  const Sparks = () => (
    <div className="fixed inset-0 pointer-events-none z-40">
      {sparks.map((s) => (
        <div key={s.id} style={{ position: "absolute", left: s.x, top: s.y }}>
          {Array.from({ length: 10 }).map((_, i) => {
            const angle = (i / 10) * Math.PI * 2;
            const dist = 40 + Math.random() * 30;
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  width: 8, height: 8, borderRadius: "50%",
                  background: PALETTE[i % PALETTE.length],
                  ["--dx" as any]: `${Math.cos(angle) * dist}px`,
                  ["--dy" as any]: `${Math.sin(angle) * dist}px`,
                  animation: "spark 0.6s ease-out forwards",
                  boxShadow: "0 0 8px rgba(255,255,255,0.6)",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
  return { burst, Sparks };
}
