"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { ref as dbRef, push, onValue } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, database } from "../firebase";
import styles from "./Home.module.css";

export default function LandingPage() {
  const images: string[] = [
    "/images/cheese2.jpg",
    "/images/cheese0.jpg",
    "/images/cheese3.jpg",
  ];

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [index, setIndex] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("stack");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const SWIPE_THRESHOLD = 120;

  type LayoutMode = "stack" | "tile";

  type Experience = {
    id: string;
    type: "image" | "video";
    url: string;
    name?: string;
    caption?: string;
    createdAt: number;
  };

  // Detect mobile
  const isMobile =
    typeof window !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Auto-change hero images
  useEffect(() => {
    const interval = setInterval(
      () => setIndex((prev) => (prev + 1) % images.length),
      4000
    );
    return () => clearInterval(interval);
  }, [images.length]);

  // Fetch experiences from Firebase
  useEffect(() => {
    const expRef = dbRef(database, "experiences");

    const unsubscribe = onValue(expRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setExperiences([]);
        return;
      }

      const list: Experience[] = Object.entries(data)
        .map(([id, value]: any) => ({
          id,
          ...value,
        }))
        .sort((a, b) => b.createdAt - a.createdAt); // newest first

      setExperiences(list);
    });

    return () => unsubscribe();
  }, []);

  // Auto swipe every 5s
  useEffect(() => {
    if (!isMobile) return; // optional: auto-swipe only on desktop
    const timer = setInterval(() => swipeNext(), 5000);
    return () => clearInterval(timer);
  }, [currentIndex, experiences]);

  // Swipe handlers
  const handleStart = (x: number) => {
    setStartX(x);
    setIsDragging(true);
  };

  const handleMove = (x: number) => {
    if (startX !== null) setOffsetX(x - startX);
  };

  const handleEnd = () => {
    if (Math.abs(offsetX) > SWIPE_THRESHOLD) {
      swipeNext();
    } else {
      setOffsetX(0); // snap back
    }
    setStartX(null);
    setIsDragging(false);
  };

  const swipeNext = () => {
    setOffsetX(0);
    setCurrentIndex((prev) =>
      prev + 1 >= experiences.length ? 0 : prev + 1
    );
  };

  // Upload experience
  const uploadExperience = async (
    file: File,
    type: "image" | "video",
    name?: string,
    caption?: string
  ) => {
    try {
      const path = `experiences/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      await push(dbRef(database, "experiences"), {
        type,
        url,
        name: name || null,
        caption: caption || null,
        createdAt: Date.now(),
      });

      alert("Experience uploaded successfully 🎉");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed ❌");
    }
  };

  // Camera / file handling
  const handleStartCamera = async () => {
    if (isMobile) {
      fileInputRef.current?.click();
      return;
    }
    if (stream) return;

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      alert("Camera access denied or unavailable.");
    }
  };

  const handleTakePhoto = async () => {
    if (!stream || !videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `photo_${Date.now()}.png`, { type: "image/png" });
      const name = prompt("Enter your name:");
      const caption = prompt("Enter a caption:");
      await uploadExperience(file, "image", name || undefined, caption || undefined);
    });
  };

  const handleStartRecording = () => {
    if (!stream) return;
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/mp4" });
      const file = new File([blob], `video_${Date.now()}.mp4`, { type: "video/mp4" });
      const name = prompt("Enter your name:");
      const caption = prompt("Enter a caption:");
      await uploadExperience(file, "video", name || undefined, caption || undefined);
      setRecording(false);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);

    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, 40000);
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
    const name = prompt("Enter your name:");
    const caption = prompt("Enter a caption:");
    uploadExperience(file, type, name || undefined, caption || undefined);
  };

  return (
    <main className={styles.main}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <img src="/images/logo.png" alt="CheeseCakes Logo" />
        </div>
        <ul className={styles.navlinks}>
          <li>Home</li>
          <li>Memories</li>
          <li>Order</li>
          <li>Contact</li>
        </ul>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        {images.map((src, i) => (
          <div
            key={i}
            className={styles.heroImage}
            style={{ backgroundImage: `url(${src})`, opacity: i === index ? 1 : 0 }}
          />
        ))}
        <div className={styles.overlay}>
          <div className={styles.left}>
            <h1>Cheezy Memories 🧀</h1>
            <p>Capture and share your cheesecake experience</p>

            {!stream && <button className={styles.orderBtn} onClick={handleStartCamera}>OPEN CAMERA</button>}

            {stream && !isMobile && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", borderRadius: "12px", margin: "10px 0", maxHeight: "480px" }}
                />
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button className={styles.orderBtn} onClick={handleTakePhoto}>TAKE PHOTO</button>
                  {!recording ? (
                    <button className={styles.orderBtn} onClick={handleStartRecording}>START RECORDING (40s)</button>
                  ) : (
                    <button className={styles.orderBtn} onClick={handleStopRecording}>STOP RECORDING</button>
                  )}
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              capture
              hidden
              onChange={handleFilePick}
            />
          </div>
        </div>
      </section>

      {/* Memories Section */}
      <section className={styles.memoriesSection} id="memories">
        <div className={styles.memoriesHeader}>
          <h2 className={styles.memoriesTitle}>Shared Memories 💛</h2>
          {!isMobile && (
            <div className={styles.layoutToggle}>
              <button className={layoutMode === "stack" ? styles.active : ""} onClick={() => setLayoutMode("stack")}>Stack</button>
              <button className={layoutMode === "tile" ? styles.active : ""} onClick={() => setLayoutMode("tile")}>Tile</button>
            </div>
          )}
        </div>

        {/* Tile layout */}
        {layoutMode === "tile" && !isMobile && (
          <div className={`${styles.memoriesGrid} ${styles.tile}`}>
            {experiences.map(exp => (
              <div key={exp.id} className={styles.memoryCard}>
                {exp.type === "image" ? (
                  <img src={exp.url} onClick={() => setFullscreenImg(exp.url)} style={{ cursor: "pointer" }} />
                ) : (
                  <video src={exp.url} controls preload="metadata" style={{ height: "240px", objectFit: "cover" }} />
                )}
                <div className={styles.memoryInfo}>
                  {exp.name && <h4>{exp.name}</h4>}
                  {exp.caption && <p>{exp.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stack layout */}
        {(layoutMode === "stack" || isMobile) && (
          <div className={styles.tinderStack}>
            {experiences.slice(currentIndex, currentIndex + 3).map((exp, i) => {
              const isTop = i === 0;
              return (
                <div
                  key={exp.id}
                  className={styles.tinderCard}
                  style={{
                    transform: isTop ? `translateX(${offsetX}px) rotate(${offsetX / 15}deg)` : `scale(${1 - i*0.05}) translateY(${i*12}px)`,
                    zIndex: 10 - i,
                    transition: isTop ? "none" : "transform 0.3s ease",
                  }}
                  onMouseDown={e => handleStart(e.clientX)}
                  onMouseMove={e => isTop && handleMove(e.clientX)}
                  onMouseUp={handleEnd}
                  onMouseLeave={handleEnd}
                  onTouchStart={e => handleStart(e.touches[0].clientX)}
                  onTouchMove={e => handleMove(e.touches[0].clientX)}
                  onTouchEnd={handleEnd}
                >
                  {exp.type === "image" ? (
                    <img src={exp.url} onClick={() => setFullscreenImg(exp.url)} style={{ cursor: "pointer" }} />
                  ) : (
                    <video src={exp.url} controls preload="metadata" style={{ height: "240px", objectFit: "cover" }} />
                  )}
                  <div className={styles.memoryInfo}>
                    {exp.name && <h4>{exp.name}</h4>}
                    {exp.caption && <p>{exp.caption}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Fullscreen Modal */}
      {fullscreenImg && (
        <div className={styles.fullscreenOverlay} onClick={() => setFullscreenImg(null)}>
          <img src={fullscreenImg} alt="Memory Fullscreen" />
        </div>
      )}
    </main>
  );
}
