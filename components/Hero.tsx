"use client";

import React, { useMemo } from "react";

type HeroProps = {
  title: string;
  subtitle?: string;
  height?: "sm" | "md" | "lg";
  backgroundImage?: string;
  overlayClassName?: string; // e.g. "bg-black/40"
};

const heightMap: Record<NonNullable<HeroProps["height"]>, string> = {
  sm: "py-12 md:py-16",
  md: "py-20 md:py-24",
  lg: "py-28 md:py-36",
};

export default function Hero({
  title,
  subtitle,
  height = "sm",
  backgroundImage = "/forest01_preview-01.png",
  overlayClassName = "bg-black/40",
}: HeroProps) {
  // Lightweight star layers for performance; randomized on first render
  const tinyStars = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const midStars = useMemo(() => Array.from({ length: 30 }, (_, i) => i), []);
  const brightStars = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  const heightCls = heightMap[height];

  return (
    <section className={`relative overflow-hidden ${heightCls}`}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay to improve text contrast */}
        <div className={`absolute inset-0 ${overlayClassName}`}></div>

        {/* Stars layer (subtle) */}
        <div className="absolute inset-0 pointer-events-none">
          {tinyStars.map((i) => (
            <div
              key={`t-${i}`}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${8 + Math.random() * 6}s`,
              }}
            >
              <div
                className="rounded-full opacity-60 animate-pulse"
                style={{
                  width: `${1 + Math.random() * 1.5}px`,
                  height: `${1 + Math.random() * 1.5}px`,
                  backgroundColor: "rgba(255,255,255,0.95)",
                }}
              ></div>
            </div>
          ))}

          {midStars.map((i) => (
            <div
              key={`m-${i}`}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${10 + Math.random() * 8}s`,
              }}
            >
              <div
                className="rounded-full opacity-70 animate-pulse"
                style={{
                  width: `${2 + Math.random() * 1.5}px`,
                  height: `${2 + Math.random() * 1.5}px`,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  boxShadow: "0 0 6px rgba(255,255,255,0.6)",
                }}
              ></div>
            </div>
          ))}

          {brightStars.map((i) => (
            <div
              key={`b-${i}`}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${12 + Math.random() * 10}s`,
                transform: `scale(${0.8 + Math.random() * 0.6})`,
              }}
            >
              <div
                className="rounded-full opacity-90 animate-pulse"
                style={{
                  width: `${3 + Math.random() * 2}px`,
                  height: `${3 + Math.random() * 2}px`,
                  backgroundColor: "rgba(255,255,210,0.95)",
                  boxShadow:
                    "0 0 10px rgba(255,235,130,0.8), 0 0 20px rgba(255,235,130,0.4)",
                }}
              ></div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-20 container mx-auto px-4 text-center text-white">
        <h1 className="text-3xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-red-400 via-orange-400 via-yellow-400 via-green-400 via-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base md:text-lg max-w-2xl mx-auto opacity-90">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}