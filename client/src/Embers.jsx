import { useEffect, useRef } from "react";

export function Embers() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const stage = canvas?.parentElement;
    if (!canvas || !stage) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const ctx = canvas.getContext("2d");
    let sparks = [];
    let frame = 0;

    const resize = () => {
      const { width, height } = stage.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, width) * ratio;
      canvas.height = Math.max(1, height) * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const burst = (x, y, count) => {
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.7 + Math.random() * 2.8;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.4,
          life: 1,
          decay: 0.01 + Math.random() * 0.016,
          radius: 1.1 + Math.random() * 2.3,
          amber: Math.random() > 0.3,
        });
      }
    };

    const open = () => {
      const { width, height } = stage.getBoundingClientRect();
      burst(width * 0.18, height * 0.78, 26);
      burst(width * 0.82, height * 0.62, 22);
      burst(width * 0.52, height * 0.92, 16);
    };

    resize();
    open();

    const tick = () => {
      const { width, height } = stage.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      if (Math.random() < 0.45) {
        sparks.push({
          x: 24 + Math.random() * Math.max(width - 48, 1),
          y: height - 6,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -0.45 - Math.random() * 1.15,
          life: 1,
          decay: 0.004 + Math.random() * 0.005,
          radius: 0.8 + Math.random() * 1.5,
          amber: true,
        });
      }
      sparks = sparks.filter((spark) => spark.life > 0).slice(-160);
      for (const spark of sparks) {
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy -= 0.01;
        spark.life -= spark.decay;
        ctx.globalAlpha = Math.max(spark.life, 0);
        ctx.fillStyle = spark.amber ? "#ef8a32" : "#fff8ee";
        ctx.shadowColor = "#ef8a32";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    const onPointer = (event) => {
      const box = stage.getBoundingClientRect();
      burst(event.clientX - box.left, event.clientY - box.top, 24);
    };
    stage.addEventListener("pointerdown", onPointer);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      stage.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return <canvas ref={ref} className="embers" aria-hidden="true" />;
}
