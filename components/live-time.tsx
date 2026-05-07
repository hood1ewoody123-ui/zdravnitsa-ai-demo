"use client";

import { useEffect, useState } from "react";

function formatTime(date: Date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function LiveTime() {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <time>{time}</time>;
}
