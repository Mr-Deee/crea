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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  // 🔥 Upload image or video to Firebase Storage + Realtime DB
  const uploadExperience = async (
    file: File,
    type: "image" | "video"
  ): Promise<void> => {
    try {
      const storagePath = `experiences/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, storagePath);

      await uploadBytes(sRef, file);
      const downloadURL = await getDownloadURL(sRef);

      await push(dbRef(database, "experiences"), {
        type,
        url: downloadURL,
        createdAt: Date.now(),
      });

      alert("Experience uploaded successfully 🎉");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed ❌");
    }
  };

  // 📷 Record 15‑second video using camera
  const handleOpenCamera = async (): Promise<void> => {
    try {
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const mediaRecorder: MediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/mp4" });
        const file: File = new File([blob], `memory_${Date.now()}.mp4`, {
          type: "video/mp4",
        });

        uploadExperience(file, "video");
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 15000);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Camera access denied or unavailable");
    }
  };

  // 🖼️ Pick image/video from gallery
  const handleFilePick = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type: "image" | "video" = file.type.startsWith("video")
      ? "video"
      : "image";

    uploadExperience(file, type);
  };

  return (
    <main className={styles.main}>


          {/* ✅ NAVBAR */}
    <nav className={styles.navbar}>
      <div className={styles.logo}>CheeseCakes ✨</div>
      <ul className={styles.navlinks}>
        <li>Home</li>
        <li>Menu</li>
        <li>Order</li>
        <li>Contact</li>
      </ul>
    </nav>
      <section
        className={styles.hero}
        style={{ backgroundImage: `url(${images[index]})` }}
      >
        <div className={styles.overlay}>
          <div className={styles.left}>
            <h1>Cheezy Memories 🧀</h1>
            <p>Capture and share your cheesecake experience</p>

            <button className={styles.orderBtn} onClick={handleOpenCamera}>
              TAKE EXPERIENCE
            </button>

            <button
              className={styles.orderBtn}
              onClick={() => fileInputRef.current?.click()}
            >
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
