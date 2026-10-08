# VogueThreads — Modern Full-Stack Fashion E-Commerce Platform

A production-ready, full-stack fashion e-commerce ecosystem built with **Next.js**, **React**, **Tailwind CSS**, and **MongoDB Atlas**. VogueThreads features a decoupled architecture separating the customer-facing shopping experience from the administrative back-office management system.

---

## 🏗️ Architecture Overview

The repository consists of two integrated applications:

```
VogueThreads/
├── voguethreads-storefront/      # Modern customer shopping storefront
└── fashion-commerce-admin/       # Administrative management portal
```

### 1. `voguethreads-storefront` (Customer Experience)
* **Next.js & React:** High-performance server-side rendering (SSR) and client-side interactions.
* **Modern UI/UX:** Styled with **Tailwind CSS** and accessible primitives from **Radix UI**.
* **Interactive Catalog:** Dynamic category filtering, search, sorting, and responsive product cards.
* **Cart & Checkout State:** Sliding cart drawer, persistent session management, and seamless order workflows.
* **Database Integration:** Direct connection to **MongoDB Atlas** with Mongoose models for products, orders, and users.

### 2. `fashion-commerce-admin` (Back-Office Administration)
* **Product Management:** Full CRUD capabilities for adding, updating, and archiving fashion inventory.
* **Order Tracking & Status:** Real-time visibility into customer orders, fulfillment pipelines, and transactions.
* **Catalog Seeding & Migration:** Automated seeding scripts to populate diverse product categories and mock inventory.
* **Secure Operations:** Dedicated administrative views and controls to prevent unauthorized modifications.

---

## 🛠️ Tech Stack

* **Frontend Framework:** Next.js (App Router), React 18+
* **Styling & Design:** Tailwind CSS, PostCSS, Lucide Icons, Radix UI Primitives
* **Backend & API:** Next.js Server Actions & API Routes, Node.js
* **Database & ORM:** MongoDB Atlas, Mongoose
* **State & Authentication:** Custom React Context / Hooks, JWT / Session Handling

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **pnpm** or **npm**
* **MongoDB Atlas** connection string

### 1. Setup Storefront
```bash
cd voguethreads-storefront
npm install # or pnpm install
cp .env.example .env.local
npm run dev # Runs on http://localhost:3001
```

### 2. Setup Admin Portal
```bash
cd fashion-commerce-admin
npm install # or pnpm install
cp .env.example .env.local
npm run dev # Runs on http://localhost:3000
```

---

## 📄 License
This project is licensed under the MIT License.
