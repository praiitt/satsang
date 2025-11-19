'use client';

import { useEffect, useRef } from 'react';

interface MeditationMandalaVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isActive: boolean;
  className?: string;
}

/**
 * MeditationMandalaVisualizer
 *
 * A lightweight, canvas-based radial visualizer that reacts to the
 * current audio element. Designed to feel meditative rather than
 * flashy – smooth motion, soft gradients, and gentle breathing.
 */
export function MeditationMandalaVisualizer({
  audioRef,
  isActive,
  className,
}: MeditationMandalaVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Resize canvas to match CSS size and device pixel ratio
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  };

  useEffect(() => {
    if (!isActive || !audioRef.current || typeof window === 'undefined') {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();

    // Lazily create AudioContext + analyser once
    if (!audioContextRef.current) {
      try {
        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
          console.error('[MeditationMandalaVisualizer] No AudioContext available in this browser');
          return;
        }
        audioContextRef.current = new AudioContextCtor();
      } catch (error) {
        console.error('[MeditationMandalaVisualizer] Failed to create AudioContext', error);
        return;
      }
    }

    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    // Create or reuse analyser
    if (!analyserRef.current) {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;

      try {
        const source = audioContext.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
      } catch (error) {
        // createMediaElementSource can only be called once per audio element per context
        // If it was already created elsewhere, fail silently.
        console.warn(
          '[MeditationMandalaVisualizer] Unable to create media element source (possibly already connected).',
          error
        );
      }
    }

    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const minDim = Math.min(width, height);
      const baseRadius = minDim * 0.15;
      const maxRadius = minDim * 0.45;

      // Soft background glow
      const radialGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.2,
        centerX,
        centerY,
        maxRadius
      );
      radialGradient.addColorStop(0, 'rgba(255, 200, 150, 0.35)'); // warm center
      radialGradient.addColorStop(1, 'rgba(80, 30, 120, 0.05)'); // soft outer
      ctx.fillStyle = radialGradient;
      ctx.fillRect(0, 0, width, height);

      // Normalize a subset of low/mid frequencies for smoother breathing
      let energy = 0;
      const sampleCount = Math.min(40, bufferLength);
      for (let i = 0; i < sampleCount; i += 1) {
        energy += dataArray[i];
      }
      energy /= sampleCount * 255; // 0–1

      const petals = 48;

      ctx.save();
      ctx.translate(centerX, centerY);

      for (let i = 0; i < petals; i += 1) {
        const angle = (i / petals) * Math.PI * 2;
        const sampleIndex = Math.floor((i / petals) * sampleCount);
        const sample = dataArray[sampleIndex] / 255; // 0–1

        // Blend global energy with per-petal sample
        const intensity = 0.4 * energy + 0.6 * sample;
        const radius = baseRadius + intensity * (maxRadius - baseRadius);

        const hue = 30 + i * 2; // warm saffron-to-gold ring
        const alpha = 0.35 + intensity * 0.45;
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
        ctx.lineWidth = 1.5 + intensity * 2.5;

        ctx.beginPath();
        const innerRadius = baseRadius * 0.6;
        const cpRadius = (innerRadius + radius) / 2;

        const x0 = innerRadius * Math.cos(angle);
        const y0 = innerRadius * Math.sin(angle);
        const x1 = radius * Math.cos(angle);
        const y1 = radius * Math.sin(angle);
        const cx = cpRadius * Math.cos(angle);
        const cy = cpRadius * Math.sin(angle);

        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.stroke();
      }

      // Central core
      const coreRadius = baseRadius * (1.1 + energy * 0.6);
      const coreGradient = ctx.createRadialGradient(0, 0, coreRadius * 0.2, 0, 0, coreRadius);
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      coreGradient.addColorStop(1, 'rgba(255, 180, 120, 0.0)');
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);

    // Handle resize
    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [audioRef, isActive]);

  return (
    <div
      className={className ?? 'mt-1 mb-2 h-32 w-full overflow-hidden rounded-2xl bg-transparent'}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
