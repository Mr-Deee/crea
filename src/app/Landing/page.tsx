// File: app/page.jsx
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./Home.module.css";

export default function LandingPage() {
const images = [
"/images/cheese2.jpg",
"/images/cheese1.jpg",
"/images/cheese3.jpg"
];

const [index, setIndex] = useState(0);

useEffect(() => {
const interval = setInterval(() => {
setIndex((prev) => (prev + 1) % images.length);
}, 4000);
return () => clearInterval(interval);
}, []);

return (
<main className={styles.main}>
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
<h1>Delicious, Creamy & Fresh Cheesecakes</h1>
<p>Hand-crafted cheesecakes baked with love and the finest ingredients.</p>
<button className={styles.orderBtn}>SHARE A PICTURE</button>
<button className={styles.orderBtn}>UPLOAD A PICTURE</button>

</div>
</div>
</section>
</main>
);
}
