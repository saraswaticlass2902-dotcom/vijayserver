
// // server.js
// require("dotenv").config();
// const path = require("path");
// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");
// const http = require("http");
// const { Server } = require("socket.io");

// // Routes
// const authRoute = require("./routes/authRoute");
// const transactionRoute = require("./routes/transactionRoute");
// const stockRoute = require("./routes/stockRoute");
// const profileRoutes = require("./routes/profileRoute");
// const adminRoutes = require("./routes/adminRoute");
// const contactRoutes = require("./routes/contactRoute");
// const chatRoutes = require("./routes/chatRoutes");
// const alluser = require("./routes/authRoute");
// const purchaseRoutes = require("./routes/purchaseRoutes");
// const lectureRoutes = require("./routes/lectureRoutes");
// const houseRoutes = require("./routes/houseRoutes");

// // Models (only import if used here; leaving Chat if you use it)
// const Chat = require("./models/chatModel");

// // App config
// const app = express();
// const PORT = process.env.PORT || 5000;
// const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
// const MONGO_URI = process.env.MONGO_URI;

// // Basic checks
// if (!MONGO_URI) {
//   console.error("❌ MONGO_URI not set. Add it to your .env file.");
//   process.exit(1);
// }

// // Middleware & static files
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use(express.static("public"));

// app.use(
//   cors({
//     origin: CLIENT_URL,
//     credentials: true,
//   })
// );

// app.use(express.json({ limit: "10mb" })); // increase limit if needed
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// // Create HTTP server + Socket.IO server
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: CLIENT_URL,
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// // --------- MongoDB Connection ----------
// mongoose
//   .connect(MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     // serverSelectionTimeoutMS: 5000, // optional: fail fast
//   })
//   .then(() => console.log("✅ MongoDB connected"))
//   .catch((err) => {
//     console.error("Mongo error:", err);
//     // Exit if DB connection is critical
//     process.exit(1);
//   });

// mongoose.connection.on("error", (err) =>
//   console.error("Mongoose connection error:", err)
// );
// mongoose.connection.on("disconnected", () =>
//   console.warn("Mongoose disconnected")
// );

// // --------- API Routes ----------
// app.use("/api/auth", authRoute);
// app.use("/api/transaction", transactionRoute);
// app.use("/api/stock", stockRoute);
// app.use("/api/profile", profileRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api", contactRoutes);
// app.use("/api/chat", chatRoutes);
// app.use("/api/registration", alluser);
// app.use("/api/houses", houseRoutes);
// app.use("/api/purchases", purchaseRoutes);
// app.use("/api/lectures", lectureRoutes);

// // Default root route
// app.get("/", (req, res) => res.send("Server Running 🚀"));

// // ---------------- SOCKET.IO ----------------
// /*
//   Lecture signaling flow:
//   - join-lecture: { roomId, role }
//   - request-join: { roomId, studentId, name }
//   - approve-student: { roomId, studentSocketId }
//   - offer/answer/ice-candidate for WebRTC signaling
// */
// const rooms = {}; // { roomId: { teacher, students: [] } }
// const pendingRequests = {}; // { roomId: [ { id, name, socketId } ] }

// io.on("connection", (socket) => {
//   console.log("🟢 Socket connected:", socket.id);

//   // JOIN LECTURE
//   socket.on("join-lecture", ({ roomId, role }) => {
//     if (!roomId) return;
//     socket.join(roomId);

//     if (!rooms[roomId]) rooms[roomId] = { teacher: null, students: [] };
//     if (!pendingRequests[roomId]) pendingRequests[roomId] = [];

//     if (role === "teacher") {
//       rooms[roomId].teacher = socket.id;
//       // Send existing pending requests to teacher
//       io.to(socket.id).emit("pending-requests", pendingRequests[roomId]);
//     } else {
//       // avoid duplicate student entries
//       if (!rooms[roomId].students.includes(socket.id)) {
//         rooms[roomId].students.push(socket.id);
//       }
//     }
//   });

//   // STUDENT sends join request
//   socket.on("request-join", ({ roomId, studentId, name }) => {
//     if (!roomId) return;
//     const req = { id: studentId || null, name: name || "Student", socketId: socket.id };
//     if (!pendingRequests[roomId]) pendingRequests[roomId] = [];
//     pendingRequests[roomId].push(req);

//     // notify teacher if present
//     const teacherSocket = rooms[roomId] && rooms[roomId].teacher;
//     if (teacherSocket) {
//       io.to(teacherSocket).emit("student-request", req);
//       io.to(teacherSocket).emit("pending-requests", pendingRequests[roomId]);
//     }

//     io.to(socket.id).emit("request-sent", { ok: true });
//   });

//   // TEACHER approves a student
//   socket.on("approve-student", ({ roomId, studentSocketId }) => {
//     if (!roomId || !studentSocketId) return;
//     pendingRequests[roomId] = (pendingRequests[roomId] || []).filter(
//       (req) => req.socketId !== studentSocketId
//     );

//     // notify student
//     io.to(studentSocketId).emit("approved", {
//       roomId,
//       teacherSocketId: socket.id,
//     });

//     // update teacher
//     io.to(socket.id).emit("pending-requests", pendingRequests[roomId]);
//   });

//   // SIGNALING events for WebRTC
//   socket.on("offer", ({ targetStudentId, offer }) => {
//     if (!targetStudentId) return;
//     io.to(targetStudentId).emit("offer", { from: socket.id, offer });
//   });

//   socket.on("answer", ({ targetTeacherId, answer }) => {
//     if (!targetTeacherId) return;
//     io.to(targetTeacherId).emit("answer", { from: socket.id, answer });
//   });

//   socket.on("ice-candidate", ({ targetId, candidate }) => {
//     if (!targetId) return;
//     io.to(targetId).emit("ice-candidate", { from: socket.id, candidate });
//   });

//   // CHAT persist example (if used)
//   socket.on("save-chat", async (chatObj) => {
//     try {
//       // chatObj should match your chatModel schema
//       if (!chatObj) return;
//       const newChat = new Chat(chatObj);
//       await newChat.save();
//       socket.emit("chat-saved", { ok: true });
//     } catch (err) {
//       console.error("Chat save error:", err);
//       socket.emit("chat-saved", { ok: false });
//     }
//   });

//   // Disconnect cleanup
//   socket.on("disconnect", () => {
//     console.log("🔴 Socket disconnected:", socket.id);

//     // remove from pendingRequests
//     for (const roomId in pendingRequests) {
//       pendingRequests[roomId] = pendingRequests[roomId].filter(
//         (r) => r.socketId !== socket.id
//       );
//       // notify teacher if available
//       const teacherSocket = rooms[roomId] && rooms[roomId].teacher;
//       if (teacherSocket) {
//         io.to(teacherSocket).emit("pending-requests", pendingRequests[roomId]);
//       }
//     }

//     // remove from rooms students and teacher if matches
//     for (const roomId in rooms) {
//       if (rooms[roomId].teacher === socket.id) {
//         rooms[roomId].teacher = null;
//       }
//       rooms[roomId].students = (rooms[roomId].students || []).filter(
//         (sId) => sId !== socket.id
//       );
//       // cleanup empty rooms
//       if (!rooms[roomId].teacher && (!rooms[roomId].students || rooms[roomId].students.length === 0)) {
//         delete rooms[roomId];
//         delete pendingRequests[roomId];
//       }
//     }
//   });
// });

// // Graceful shutdown handlers
// const shutdown = () => {
//   console.log("Shutting down server...");
//   server.close(() => {
//     console.log("HTTP server closed.");
//     mongoose.connection.close(false, () => {
//       console.log("Mongo connection closed.");
//       process.exit(0);
//     });
//   });
// };

// process.on("SIGINT", shutdown);
// process.on("SIGTERM", shutdown);

// // Start server
// server.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT} (PORT=${PORT})`);
// });

// server.js (drop-in replacement)
require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

// Routes
const authRoute = require("./routes/authRoute");
const transactionRoute = require("./routes/transactionRoute");
const stockRoute = require("./routes/stockRoute");
const profileRoutes = require("./routes/profileRoute");
const adminRoutes = require("./routes/adminRoute");
const contactRoutes = require("./routes/contactRoute");
const chatRoutes = require("./routes/chatRoutes");
const alluser = require("./routes/authRoute");
const purchaseRoutes = require("./routes/purchaseRoutes");
const lectureRoutes = require("./routes/lectureRoutes");
const houseRoutes = require("./routes/houseRoutes");

// Models (only import if used here)
const Chat = require("./models/chatModel");

// App config
const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const MONGO_URI = process.env.MONGO_URI;

// Basic checks
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set. Add it to your .env file.");
  process.exit(1);
}

// Middleware & static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static("public"));

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Default root route (safe to keep here)
app.get("/", (req, res) => res.send("Server Running 🚀"));

// Mongoose event logging
mongoose.connection.on("connected", () => console.log("✅ Mongoose connected"));
mongoose.connection.on("error", (err) => console.error("Mongoose connection error:", err));
mongoose.connection.on("disconnected", () => console.warn("Mongoose disconnected"));

// Graceful shutdown for DB + server
const gracefulClose = async (server) => {
  try {
    console.log("Shutting down server...");
    if (server) {
      server.close(() => console.log("HTTP server closed."));
    }
    await mongoose.connection.close(false);
    console.log("Mongo connection closed.");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulClose(global.__httpServer));
process.on("SIGTERM", () => gracefulClose(global.__httpServer));

// Start function: connect to DB, then start server + sockets + routes
async function start() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      // modern driver: do not use useNewUrlParser/useUnifiedTopology (no-op)
      serverSelectionTimeoutMS: 10000, // fail fast if can't reach servers
      // socketTimeoutMS: 45000, // optional
      // family: 4 // optionally prefer IPv4
    });

    // register routes AFTER DB connect (safe)
    app.use("/api/auth", authRoute);
    app.use("/api/transaction", transactionRoute);
    app.use("/api/stock", stockRoute);
    app.use("/api/profile", profileRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api", contactRoutes);
    app.use("/api/chat", chatRoutes);
    app.use("/api/registration", alluser);
    app.use("/api/houses", houseRoutes);
    app.use("/api/purchases", purchaseRoutes);
    app.use("/api/lectures", lectureRoutes);

    // Create HTTP server and Socket.IO AFTER DB connected
    const server = http.createServer(app);
    global.__httpServer = server; // for gracefulClose access

    const io = new Server(server, {
      cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // -------- SOCKET.IO handlers (your existing logic) ----------
    const rooms = {};
    const pendingRequests = {};

    io.on("connection", (socket) => {
      console.log("🟢 Socket connected:", socket.id);

      socket.on("join-lecture", ({ roomId, role }) => {
        if (!roomId) return;
        socket.join(roomId);

        if (!rooms[roomId]) rooms[roomId] = { teacher: null, students: [] };
        if (!pendingRequests[roomId]) pendingRequests[roomId] = [];

        if (role === "teacher") {
          rooms[roomId].teacher = socket.id;
          io.to(socket.id).emit("pending-requests", pendingRequests[roomId]);
        } else {
          if (!rooms[roomId].students.includes(socket.id)) {
            rooms[roomId].students.push(socket.id);
          }
        }
      });

      socket.on("request-join", ({ roomId, studentId, name }) => {
        if (!roomId) return;
        const req = { id: studentId || null, name: name || "Student", socketId: socket.id };
        if (!pendingRequests[roomId]) pendingRequests[roomId] = [];
        pendingRequests[roomId].push(req);

        const teacherSocket = rooms[roomId] && rooms[roomId].teacher;
        if (teacherSocket) {
          io.to(teacherSocket).emit("student-request", req);
          io.to(teacherSocket).emit("pending-requests", pendingRequests[roomId]);
        }

        io.to(socket.id).emit("request-sent", { ok: true });
      });

      socket.on("approve-student", ({ roomId, studentSocketId }) => {
        if (!roomId || !studentSocketId) return;
        pendingRequests[roomId] = (pendingRequests[roomId] || []).filter(
          (req) => req.socketId !== studentSocketId
        );

        io.to(studentSocketId).emit("approved", {
          roomId,
          teacherSocketId: socket.id,
        });

        io.to(socket.id).emit("pending-requests", pendingRequests[roomId]);
      });

      socket.on("offer", ({ targetStudentId, offer }) => {
        if (!targetStudentId) return;
        io.to(targetStudentId).emit("offer", { from: socket.id, offer });
      });

      socket.on("answer", ({ targetTeacherId, answer }) => {
        if (!targetTeacherId) return;
        io.to(targetTeacherId).emit("answer", { from: socket.id, answer });
      });

      socket.on("ice-candidate", ({ targetId, candidate }) => {
        if (!targetId) return;
        io.to(targetId).emit("ice-candidate", { from: socket.id, candidate });
      });

      socket.on("save-chat", async (chatObj) => {
        try {
          if (!chatObj) return;
          const newChat = new Chat(chatObj);
          await newChat.save();
          socket.emit("chat-saved", { ok: true });
        } catch (err) {
          console.error("Chat save error:", err);
          socket.emit("chat-saved", { ok: false });
        }
      });

      socket.on("disconnect", () => {
        console.log("🔴 Socket disconnected:", socket.id);

        for (const roomId in pendingRequests) {
          pendingRequests[roomId] = pendingRequests[roomId].filter(
            (r) => r.socketId !== socket.id
          );
          const teacherSocket = rooms[roomId] && rooms[roomId].teacher;
          if (teacherSocket) {
            io.to(teacherSocket).emit("pending-requests", pendingRequests[roomId]);
          }
        }

        for (const roomId in rooms) {
          if (rooms[roomId].teacher === socket.id) {
            rooms[roomId].teacher = null;
          }
          rooms[roomId].students = (rooms[roomId].students || []).filter(
            (sId) => sId !== socket.id
          );
          if (!rooms[roomId].teacher && (!rooms[roomId].students || rooms[roomId].students.length === 0)) {
            delete rooms[roomId];
            delete pendingRequests[roomId];
          }
        }
      });
    });

    // Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT} (PORT=${PORT})`);
    });

  } catch (err) {
    console.error("❌ MongoDB connection error (start):", err);
    // exit process so the issue is obvious and process manager can restart
    process.exit(1);
  }
}

start();
