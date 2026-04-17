"use client";

import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { Html, Environment } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BubbleInstance, BurstEffect } from "./WishingPool";
import { peakScaleFromVotes, colorFromVotes } from "./WishingPool";

interface Wish {
  id: number;
  name: string;
  votes: number;
  createdAt: string;
  lastVotedAt: string | null;
}

interface Props {
  bubbles: BubbleInstance[];
  bursts: BurstEffect[];
  wishById: Map<number, Wish>;
  addingOpen: boolean;
  onBubbleClick: (instanceId: number) => void;
  onBubbleDoubleClick: (instanceId: number) => void;
  onBurstDone: (id: number) => void;
}

export default function Scene3D({
  bubbles,
  bursts,
  wishById,
  addingOpen,
  onBubbleClick,
  onBubbleDoubleClick,
  onBurstDone,
}: Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 6.5, 0.001], fov: 50, near: 0.1, far: 40 }}
      frameloop={addingOpen ? "demand" : "always"}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0, 0);
      }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      {/* 环境光 + 冷光 + 底部蓝紫光（水底透光） */}
      <ambientLight intensity={0.35} color={"#94c7ff"} />
      <directionalLight position={[3, 6, 3]} intensity={0.55} color={"#ffffff"} />
      <pointLight position={[0, -4, 0]} intensity={8} distance={10} color={"#3b82f6"} />
      <pointLight position={[-3, -2, 0]} intensity={4} distance={8} color={"#a78bfa"} />

      {/* 水底 (radial-gradient via shader mat) */}
      <PoolFloor />

      {/* 环境贴图（给气泡折射用） */}
      <Environment preset="night" />

      {/* 气泡 */}
      {bubbles.map((b) => {
        const w = wishById.get(b.wishId);
        if (!w) return null;
        return (
          <Bubble3D
            key={b.instanceId}
            bubble={b}
            wish={w}
            onClick={() => onBubbleClick(b.instanceId)}
            onDoubleClick={() => onBubbleDoubleClick(b.instanceId)}
          />
        );
      })}

      {/* 爆裂特效 */}
      {bursts.map((b) => (
        <Burst key={b.id} burst={b} onDone={() => onBurstDone(b.id)} />
      ))}
    </Canvas>
  );
}

function PoolFloor() {
  // 一个圆盘当池底，亮度从中心到边缘微递变
  return (
    <mesh position={[0, -4.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[6, 64]} />
      <meshStandardMaterial
        color="#081838"
        emissive="#0a2555"
        emissiveIntensity={0.35}
        roughness={0.9}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Bubble3D({
  bubble,
  wish,
  onClick,
  onDoubleClick,
}: {
  bubble: BubbleInstance;
  wish: Wish;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);

  const color = useMemo(() => {
    const c = colorFromVotes(wish.votes);
    return new THREE.Color().setHSL(c.h / 360, c.s / 100, c.l / 100);
  }, [wish.votes]);

  const peak = useMemo(() => peakScaleFromVotes(wish.votes), [wish.votes]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const now = performance.now();
    const age = (now - bubble.spawnAt) / 1000; // s

    // z 计算：自然上升
    let z = bubble.zStart + age * bubble.riseSpeed;
    let scale = 1;
    let opacity = 1;

    if (bubble.poppedAt !== null) {
      const pt = Math.max(0, Math.min(1, (now - bubble.poppedAt) / 400));
      if (bubble.popKind === "wish") {
        scale = 1 + pt * 0.9;
        opacity = 1 - pt;
      } else {
        scale = 1 + pt * 0.35;
        opacity = Math.max(0, 1 - pt);
      }
    } else {
      // 深度映射：zStart (-5) → zEnd (0)
      const tDepth = (z - bubble.zStart) / (bubble.zEnd - bubble.zStart);
      const depthT = Math.max(0, Math.min(1, tDepth));
      const base = 0.25 + depthT * 0.75; // 深水小，上升到水面变大
      scale = base * peak;
      opacity = 0.45 + 0.55 * depthT;
    }

    // 水流湍流：水平漂移 + 轻微摆动
    const wobble = Math.sin(now / 360 + bubble.wobblePhase) * bubble.wobbleAmp;
    const wobble2 = Math.cos(now / 420 + bubble.wobblePhase) * bubble.wobbleAmp;
    const driftX = bubble.vx * age;
    const driftY = bubble.vy * age;
    const finalX = bubble.x + driftX + wobble;
    const finalY = bubble.y + driftY + wobble2;

    // 注意：相机俯视 → 我们把 y 位置映射成 3D 的 z 轴（深度），
    // x,y(水平散布) → 3D 的 x,z 平面
    g.position.set(finalX, z, finalY);
    g.scale.setScalar(scale);

    if (matRef.current) {
      matRef.current.opacity = opacity;
      matRef.current.transparent = true;
    }

    if (labelRef.current) {
      // 文字跟着气泡当前大小缩放 + 同步透明度 → 融为一体
      labelRef.current.style.opacity = String(opacity);
      labelRef.current.style.transform = `scale(${Math.max(0.25, Math.min(1.25, scale))})`;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick();
        }}
      >
        <sphereGeometry args={[0.6, 28, 28]} />
        <meshPhysicalMaterial
          ref={matRef}
          color={color}
          roughness={0.08}
          metalness={0}
          transmission={0.9}
          thickness={0.5}
          ior={1.33}
          clearcoat={1}
          clearcoatRoughness={0.06}
          transparent
          opacity={1}
          emissive={color}
          emissiveIntensity={0.15}
          envMapIntensity={1.5}
          attenuationDistance={1.2}
          attenuationColor={color}
        />
      </mesh>

      {/* 文字 HTML 投影（贴在气泡上，随气泡缩放） */}
      <Html
        center
        distanceFactor={3.4}
        occlude={false}
        style={{
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          ref={labelRef}
          style={{
            textAlign: "center",
            whiteSpace: "nowrap",
            textShadow: "0 0 4px rgba(0,0,0,0.45)",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 700,
            letterSpacing: "0.01em",
            fontSize: 10,
            lineHeight: 1.15,
            mixBlendMode: "screen",
            transformOrigin: "center",
            transition: "opacity 80ms linear",
          }}
        >
          <div>{wish.name}</div>
          <div style={{ fontSize: 8, opacity: 0.78, marginTop: 1, fontWeight: 600 }}>
            ✨ {wish.votes}
          </div>
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  爆裂特效：粒子 + 冲击波环                                           */
/* ------------------------------------------------------------------ */
const WISH_LIFE_MS = 900;
const DECAY_LIFE_MS = 520;

function Burst({ burst, onDone }: { burst: BurstEffect; onDone: () => void }) {
  const lifeMs = burst.kind === "wish" ? WISH_LIFE_MS : DECAY_LIFE_MS;

  // 粒子初速度（固定一次，不每帧重算）
  const particles = useMemo(() => {
    const n = burst.kind === "wish" ? 14 : 5;
    const arr: Array<{ vx: number; vy: number; vz: number; size: number }> = [];
    for (let i = 0; i < n; i++) {
      const theta = (i / n) * Math.PI * 2 + Math.random() * 0.45;
      const pitch =
        burst.kind === "wish"
          ? (Math.random() - 0.25) * 1.0 // 偏向上扩散
          : -0.15 - Math.random() * 0.2; // 贴着水面跑
      const speed =
        burst.kind === "wish"
          ? 1.6 + Math.random() * 1.2
          : 0.5 + Math.random() * 0.5;
      arr.push({
        vx: Math.cos(theta) * Math.cos(pitch) * speed,
        vy: Math.sin(pitch) * speed + (burst.kind === "wish" ? 0.9 : 0.25),
        vz: Math.sin(theta) * Math.cos(pitch) * speed,
        size: (burst.kind === "wish" ? 0.06 : 0.04) * (0.85 + Math.random() * 0.4),
      });
    }
    return arr;
  }, [burst.kind]);

  const particleRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const particleMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // 过期清理
  useEffect(() => {
    const t = setTimeout(onDone, lifeMs + 80);
    return () => clearTimeout(t);
  }, [lifeMs, onDone]);

  const baseColor = useMemo(() => {
    const hue = burst.kind === "wish" ? 48 : burst.hue; // 愿望成就 = 金色
    return new THREE.Color().setHSL(hue / 360, 0.9, 0.72);
  }, [burst.kind, burst.hue]);

  useFrame(() => {
    const now = performance.now();
    const age = (now - burst.startAt) / 1000; // s
    const life = lifeMs / 1000;
    const t = Math.min(1, age / life);

    // 粒子：位置 + 重力 + 淡出
    const gravity = burst.kind === "wish" ? 2.4 : 1.2;
    particleRefs.current.forEach((m, i) => {
      if (!m) return;
      const p = particles[i];
      if (!p) return;
      m.position.set(
        burst.x + p.vx * age,
        burst.y + p.vy * age - 0.5 * gravity * age * age,
        burst.z + p.vz * age
      );
    });
    if (particleMatRef.current) {
      particleMatRef.current.opacity = Math.max(0, 1 - t);
    }

    // 冲击波环
    if (ringRef.current && ringMatRef.current) {
      const ringScale =
        burst.kind === "wish" ? 0.5 + t * 4.5 : 0.3 + t * 2;
      ringRef.current.scale.set(ringScale, ringScale, ringScale);
      ringMatRef.current.opacity = Math.max(0, 1 - t) * (burst.kind === "wish" ? 0.85 : 0.5);
    }
  });

  return (
    <group>
      {/* 粒子 */}
      {particles.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            particleRefs.current[i] = el;
          }}
          position={[burst.x, burst.y, burst.z]}
        >
          <sphereGeometry args={[particles[i].size, 8, 8]} />
          {/* 共用一个材质引用以便整体淡出 */}
          <meshStandardMaterial
            ref={i === 0 ? particleMatRef : undefined}
            color={baseColor}
            emissive={baseColor}
            emissiveIntensity={burst.kind === "wish" ? 1.4 : 0.5}
            transparent
            roughness={0.25}
            metalness={0.15}
          />
        </mesh>
      ))}

      {/* 冲击波环 */}
      <mesh
        ref={ringRef}
        position={[burst.x, burst.y + 0.02, burst.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.85, 1.0, 64]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={baseColor}
          transparent
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
