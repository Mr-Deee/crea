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
    "/images/cheese.jpg",
  ];

  const [index, setIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % images.length), 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  // 🔥 Upload file to Firebase Storage + Realtime DB
  const uploadExperience = async (file: File, type: "image" | "video") => {
    try {
      const path = `experiences/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);

      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      await push(dbRef(database, "experiences"), {
        type,
        url,
        createdAt: Date.now(),
      });

      alert("Experience uploaded successfully 🎉");
    } catch (err) {
      console.error(err);
      alert("Upload failed ❌");
    }
  };

  // 📷 Take photo using camera
  const handleTakePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      await new Promise((resolve) => setTimeout(resolve, 500)); // allow camera to start

      // Capture photo to canvas
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.png`, { type: "image/png" });
          uploadExperience(file, "image");
        }
      }, "image/png");

      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.error(err);
      alert("Camera access denied or unavailable");
    }
  };

  // 🎥 Record 15-second video
  const handleRecordVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/mp4" });
        const file = new File([blob], `video_${Date.now()}.mp4`, { type: "video/mp4" });
        uploadExperience(file, "video");
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 15000);
    } catch (err) {
      console.error(err);
      alert("Camera access denied or unavailable");
    }
  };

  // 🖼️ Pick image/video from gallery
  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
    uploadExperience(file, type);
  };

  return (
    <main className={styles.main}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <img src="/images/logo.png" alt="CheeseCakes Logo" />
        </div>
        <ul className={styles.navlinks}>
          <li>Home</li>
          <li>Menu</li>
          <li>Order</li>
          <li>Contact</li>
        </ul>
      </nav>

      <section className={styles.hero}>

      {images.map((src, i) => (
        
    <div
      key={i}
      className={styles.heroImage}
      style={{
        backgroundImage: `url(${src})`,
        opacity: i === index ? 1 : 0,
      }}
    />
  ))}

        <div className={styles.overlay}>
          <div className={styles.left}>
            <h1>Cheezy Memories 🧀</h1>
            <p>Capture and share your cheesecake experience</p>

        

            <button className={styles.orderBtn} onClick={handleRecordVideo}>
              RECORD VIDEO
            </button>

            <button className={styles.orderBtn} onClick={() => fileInputRef.current?.click()}>
              UPLOAD FROM GALLERY
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={handleFilePick}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
