"use client";

import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { Html, Environment } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { BubbleInstance } from "./WishingPool";
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
  wishById: Map<number, Wish>;
  addingOpen: boolean;
  onBubbleClick: (instanceId: number) => void;
  onBubbleDoubleClick: (instanceId: number) => void;
}

export default function Scene3D({
  bubbles,
  wishById,
  addingOpen,
  onBubbleClick,
  onBubbleDoubleClick,
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

      {/* 气泡（爆破直接做在气泡本身的动画上） */}
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
      const popAge = now - bubble.poppedAt;
      if (bubble.popKind === "wish") {
        // 爆开：0-120ms 快速膨胀到 2.2×；120-500ms 塌缩到 0
        const EXPAND = 120;
        const COLLAPSE = 380;
        if (popAge < EXPAND) {
          const k = popAge / EXPAND;
          scale = 1 + k * 1.2;           // 1 → 2.2
          opacity = 1;
        } else {
          const k = Math.min(1, (popAge - EXPAND) / COLLAPSE);
          scale = 2.2 * (1 - k * k);     // 2.2 → 0（ease-out）
          opacity = 1 - k;
        }
      } else {
        // 自然消散：轻微膨胀后淡出，不抢眼
        const k = Math.min(1, popAge / 360);
        scale = 1 + k * 0.25;
        opacity = Math.max(0, 1 - k);
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
      // 爆破瞬间 emissive 闪一下（金色光）
      if (bubble.poppedAt !== null && bubble.popKind === "wish") {
        const popAge = now - bubble.poppedAt;
        const flash = Math.max(0, 1 - popAge / 260); // 260ms 内衰减
        matRef.current.emissive.setHSL(0.13, 1, 0.55); // 温暖金色
        matRef.current.emissiveIntensity = 0.15 + flash * 2.2;
      } else {
        // 平时用气泡本色做微量自发光
        matRef.current.emissive.copy(color);
        matRef.current.emissiveIntensity = 0.15;
      }
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
        distanceFactor={8}
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
            textShadow: "0 1px 3px rgba(0,0,0,0.55), 0 0 6px rgba(0,0,0,0.35)",
            color: "#fff",
            fontWeight: 800,
            letterSpacing: "0.02em",
            fontSize: 18,
            lineHeight: 1.1,
            transformOrigin: "center",
            transition: "opacity 80ms linear",
          }}
        >
          <div>{wish.name}</div>
          <div style={{ fontSize: 12, opacity: 0.88, marginTop: 2, fontWeight: 700 }}>
            ✨ {wish.votes}
          </div>
        </div>
      </Html>
    </group>
  );
}

