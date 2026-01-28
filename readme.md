# Interview Slot Booking API

A robust RESTful API designed to manage interview slots. It facilitates a two-role system where **Admins** can manage availability (create/delete slots) and **Candidates** can view and book these slots.

This project emphasizes data integrity (using MongoDB transactions), security (JWT authentication), and strict error handling standards.

---

## 🚀 Features

### 🔐 Authentication & Security
- **JWT Authentication:** Secure stateless authentication using JSON Web Tokens.
- **Role-Based Access Control (RBAC):** Distinct routes and permissions for `ADMIN` and `CANDIDATE` roles.
- **Password Hashing:** Passwords are encrypted using `bcryptjs`.

### 📅 Slot Management (Admin)
- **CRUD Operations:** Create, Update, Delete, and List interview slots.
- **Conflict Detection:** Prevents creating overlapping slots for the same time period.
- **Pagination & Filtering:** Robust listing endpoint with date filters and safety limits.

### 📝 Booking System (Candidate)
- **Concurrency Control:** Uses **MongoDB Transactions** to handle race conditions (e.g., two users booking the last seat simultaneously).
- **Atomic Updates:** Ensures `bookedCount` and `Booking` records are always in sync.
- **Self-Service:** Candidates can view their own history and cancel upcoming bookings.

### ⚙️ Technical Highlights
- **Strict Error Response:** Uniform JSON structure (`success`, `message`, `errors`) for all API failures.
- **Swagger Documentation:** Auto-generated API docs via OpenAPI 3.0.
- **Input Validation:** Strict type and format checking (e.g., MongoDB ObjectId validation).

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (with Mongoose ODM)
- **Documentation:** Swagger UI / OpenAPI 3.0
- **Authentication:** jsonwebtoken (JWT) + bcryptjs

---

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v14+)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas URL)

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/interview-slot-booking.git](https://github.com/yourusername/interview-slot-booking.git)
cd interview-slot-booking
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
- Create a .env file in the root directory and add the following variables:
```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/interview_booking
JWT_SECRET=your_super_secret_key_here
```

### 4. Run the Server
- Development Mode (with nodemon):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```
- The server should now be running at http://localhost:3000.


