"use client";

import { useState, useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { ref as dbRef, push } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, database } from "../firebase";
import styles from "./Home.module.css";

export default function LandingPage() {
  const images: string[] = [
    "/images/cheese2.jpg",
    "/images/cheese0.jpg",
    "/images/cheese3.jpg",
  ];

  const [index, setIndex] = useState<number>(0);
  const [recording, setRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-change hero images
  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % images.length), 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Upload experience to Firebase
  const uploadExperience = async (file: File, type: "image" | "video", name?: string, caption?: string) => {
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
      console.error(err);
      alert("Upload failed ❌");
    }
  };

  // Start camera preview
  const handleStartCamera = async () => {
    if (recording) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error(err);
      alert("Camera access denied or unavailable");
    }
  };

  // Start recording
  const handleStartRecording = () => {
    if (!stream) return;
    const mediaRecorder = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/mp4" });
      const file = new File([blob], `video_${Date.now()}.mp4`, { type: "video/mp4" });

      const name = prompt("Enter your name:");
      const caption = prompt("Enter a caption for your video:");

      uploadExperience(file, "video", name || undefined, caption || undefined);

      // Stop camera tracks
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      setStream(null);
    };

    mediaRecorder.start();
    setRecording(true);
    mediaRecorderRef.current = mediaRecorder;

    // Stop after 40 seconds
    setTimeout(() => {
      if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    }, 40000);
  };

  // Stop recording manually
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // Upload from gallery
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
        <div className={styles.logo}><img src="/images/logo.png" alt="CheeseCakes Logo" /></div>
        <ul className={styles.navlinks}>
          <li>Home</li>
          <li>Menu</li>
          <li>Order</li>
          <li>Contact</li>
        </ul>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        {images.map((src, i) => (
          <div key={i} className={styles.heroImage} style={{
            backgroundImage: `url(${src})`,
            opacity: i === index ? 1 : 0,
          }} />
        ))}

        <div className={styles.overlay}>
          <div className={styles.left}>
            <h1>Cheezy Memories 🧀</h1>
            <p>Capture and share your cheesecake experience</p>

            {!stream && <button className={styles.orderBtn} onClick={handleStartCamera}>OPEN CAMERA</button>}

            {stream && (
              <>
                <video ref={videoRef} autoPlay muted style={{ width: "100%", borderRadius: "12px", margin: "10px 0" }} />
                {!recording ? (
                  <button className={styles.orderBtn} onClick={handleStartRecording}>START RECORDING (40s)</button>
                ) : (
                  <button className={styles.orderBtn} onClick={handleStopRecording}>STOP RECORDING</button>
                )}
              </>
            )}

            <button className={styles.orderBtn} onClick={() => fileInputRef.current?.click()}>
              UPLOAD FROM GALLERY
            </button>

            <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={handleFilePick} />
          </div>
        </div>
      </section>
    </main>
  );
}
