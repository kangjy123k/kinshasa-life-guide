"use client";

import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { Html, Environment } from "@react-three/drei";
import { memo, useMemo, useRef } from "react";
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

const Bubble3D = memo(function Bubble3D({
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
  const shockRef = useRef<THREE.Mesh>(null);
  const raysGroupRef = useRef<THREE.Group>(null);

  const color = useMemo(() => {
    const c = colorFromVotes(wish.votes);
    return new THREE.Color().setHSL(c.h / 360, c.s / 100, c.l / 100);
  }, [wish.votes]);

  const peak = useMemo(() => peakScaleFromVotes(wish.votes), [wish.votes]);

  // 8 条放射光线的角度（XZ 平面均布）
  const rayAngles = useMemo(
    () => Array.from({ length: 8 }, (_, i) => (i * Math.PI * 2) / 8),
    []
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const now = performance.now();
    const ageMs = now - bubble.spawnAt;
    const ageSec = ageMs / 1000;

    // 生命周期参数 t ∈ [0, 1]：0=冒出水底，0.5=跃出水面峰值，1=回落水底
    const t = Math.max(0, Math.min(1, ageMs / bubble.lifespan));
    const bell = Math.sin(t * Math.PI); // 0 → 1 → 0

    // 3D 垂直高度：抛物线，从深水 -2.5 升到 +0.5（破水面）再落回 -2.5
    const arcY = -2.5 + 3.0 * bell;

    const baseScale = peak * (0.22 + 0.78 * bell);
    let scale: number;
    let opacity: number;

    if (bubble.poppedAt !== null && bubble.popKind === "wish") {
      // 用户点中 → 爆裂：急速膨胀到本身 3 倍 + 塌缩 + 金闪
      const popAge = now - bubble.poppedAt;
      const EXPAND = 120;
      const COLLAPSE = 380;
      if (popAge < EXPAND) {
        const k = popAge / EXPAND;
        scale = baseScale * (1 + k * 2); // 1 → 3 倍
        opacity = 1;
      } else {
        const k = Math.min(1, (popAge - EXPAND) / COLLAPSE);
        scale = baseScale * 3 * (1 - k * k);
        opacity = 1 - k;
      }
    } else {
      // 正常生命周期：小→大→小
      scale = baseScale;
      // 透明度在两头稍快淡入/淡出，中段保持清晰
      opacity = Math.pow(bell, 0.6);
    }

    // 水流湍流：水平漂移 + 轻微摆动
    const wobble = Math.sin(now / 360 + bubble.wobblePhase) * bubble.wobbleAmp;
    const wobble2 = Math.cos(now / 420 + bubble.wobblePhase) * bubble.wobbleAmp;
    const driftX = bubble.vx * ageSec;
    const driftY = bubble.vy * ageSec;
    // 兜底 clamp：不论漂移/晃动如何，气泡中心绝不越出水池可视区
    const SAFE_X = 2.3;
    const SAFE_Y = 2.6;
    const finalX = Math.max(-SAFE_X, Math.min(SAFE_X, bubble.x + driftX + wobble));
    const finalZ = Math.max(-SAFE_Y, Math.min(SAFE_Y, bubble.y + driftY + wobble2));

    g.position.set(finalX, arcY, finalZ);
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
      // 文字字号统一 — 不随泡泡大小缩放，只跟透明度
      labelRef.current.style.opacity = String(opacity);
    }

    // 爆裂：中心冲击波环 + 放射光线（仅 wish-pop）
    const shock = shockRef.current;
    const rays = raysGroupRef.current;
    const isPop = bubble.poppedAt !== null && bubble.popKind === "wish";
    if (shock && rays) {
      if (isPop) {
        shock.visible = true;
        rays.visible = true;
        const popAge = now - bubble.poppedAt!;
        const DUR = 520;
        const dT = Math.min(1, popAge / DUR);
        const ease = 1 - (1 - dT) * (1 - dT);
        // invParent 抵消 group.scale，让特效的世界尺寸/位置只跟 dT 变化
        const invParent = 1 / Math.max(0.001, scale);

        // 冲击波环：从 0.3 扩到 2.4，同时变薄变淡
        const ringR = (0.3 + ease * 2.1) * invParent;
        shock.scale.setScalar(ringR);
        const shockMat = shock.material as THREE.MeshBasicMaterial;
        shockMat.opacity = (1 - dT) * 0.9;

        // 放射光线：从 0.1 快速拉长到 1.4（最前 40% 伸展，然后淡出）
        const stretch = dT < 0.4 ? (dT / 0.4) : 1;
        const len = (0.1 + stretch * 1.3) * invParent;
        const rayFade = dT < 0.4 ? 1 : 1 - (dT - 0.4) / 0.6;
        for (let i = 0; i < rayAngles.length; i++) {
          const r = rays.children[i] as THREE.Mesh | undefined;
          if (!r) continue;
          const a = rayAngles[i];
          // scale.x 变长的同时把中心向外推 len/2，让 ray 内端始终锚在原点
          r.scale.x = len;
          r.position.x = (len / 2) * Math.cos(a);
          r.position.z = (len / 2) * Math.sin(a);
          const rm = r.material as THREE.MeshBasicMaterial;
          rm.opacity = Math.max(0, rayFade);
        }
      } else {
        shock.visible = false;
        rays.visible = false;
      }
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

      {/* 从中心爆裂：冲击波环（XZ 平面，俯视可见） */}
      <mesh ref={shockRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.78, 1.0, 48]} />
        <meshBasicMaterial
          color="#ffe27a"
          transparent
          opacity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 从中心爆裂：8 条放射光线（细长盒子躺在 XZ 平面，长度/位置随 pop 动画同步） */}
      <group ref={raysGroupRef} visible={false}>
        {rayAngles.map((a, i) => (
          <mesh key={i} rotation={[0, -a, 0]}>
            <boxGeometry args={[1, 0.02, 0.08]} />
            <meshBasicMaterial
              color="#fff4c2"
              transparent
              opacity={0}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

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
}, (prev, next) => {
  // 仅当本气泡自身数据变化才重渲染；别的气泡 spawn/reap 不影响
  return (
    prev.bubble === next.bubble &&
    prev.wish.votes === next.wish.votes &&
    prev.wish.name === next.wish.name &&
    prev.onClick === next.onClick &&
    prev.onDoubleClick === next.onDoubleClick
  );
});

