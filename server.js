import admin from "./firebaseAdmin.js";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer } from "node:http";
import { Server } from "socket.io";
import connectDB from "./db/connect.js";
import { User } from "./models/user.js";
import { OTP } from "./models/otp.js";
import { Conversation } from "./models/Conversation.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { Message } from "./models/Messages.js";
import { Deal } from "./models/Deal.js";
import dotenv from "dotenv";




dotenv.config();

connectDB();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 8080;

// const allowedOrigins = [
//   "http://localhost:5173",               // local frontend
//   "https://bogoxclient.vercel.app"       // deployed frontend
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps or curl requests)
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true
// }));
// app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cors({ origin: "https://bogoxclient.vercel.app", credentials: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
// WebSocket

const io = new Server(server, {
  cors: {
    // origin: "http://localhost:5173",
    origin: "https://bogoxclient.vercel.app",
    methods: ["GET", "POST"],
    Credential: true,
  },
});

io.on("connection", (socket) => {
  socket.on("join room", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on("chat message", (msg) => {
    io.to(msg.conversationId).emit("chat message", msg); // broadcast to room
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Create a deal

const secretKey = process.env.SECRET_KEY;


app.post("/create_deal", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, secretKey);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      name,
      phoneNumber,
      city,
      state,
      area,
      productPrice,
      hasMembership,
      additionalInfo,
    } = req.body;

    if (!name || !phoneNumber || !city || !state || !area || !productPrice) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled." });
    }

    // Save deal in Deal collection
    const deal = await Deal.create({
      name,
      phoneNumber,
      city,
      state,
      area,
      productPrice,
      hasMembership,
      additionalInfo,
      owner: user._id,
    });

    res.status(201).json({
      message: "Deal created successfully",
      deal,
    });
  } catch (error) {
    console.error("Error creating deal:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//fetching all deals
app.get("/deals", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.id;

    // Exclude deals where the owner is the logged-in user
    const deals = await Deal.find({ owner: { $ne: userId } });
    res.status(200).json(deals);
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    console.log("backend m dikkat h ");
    res.status(500).json({ error: "Internal problem" });
  }
});

app.post("/conversations", async (req, res) => {
  try {
    const { dealId, otherUserId } = req.body;
    const token = req.cookies.token;

    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, secretKey);
    const requesterId = decoded.id;

    const deal = await Deal.findById(dealId);
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const dealOwnerId = deal.owner?.toString();
    if (!dealOwnerId) {
      return res.status(500).json({ message: "Deal owner missing" });
    }

    // 🧠 Determine the buyer ID based on who is accessing
    let buyerId;

    if (requesterId === dealOwnerId) {
      // Owner is accessing, otherUserId must be provided
      if (!otherUserId) {
        return res.status(400).json({ message: "Buyer ID required for owner" });
      }
      buyerId = otherUserId;
    } else {
      // Buyer is accessing
      buyerId = requesterId;
    }

    if (buyerId === dealOwnerId) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    // ✅ Now use the correct trio: deal + buyer + owner
    let conversation = await Conversation.findOne({
      deal: dealId,
      user: buyerId,
      owner: dealOwnerId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        deal: dealId,
        user: buyerId,
        owner: dealOwnerId,
      });
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    }).sort("createdAt");

    res.status(200).json({
      conversationId: conversation._id,
      messages,
      userId: requesterId,
      participants: [
        conversation.owner.toString(),
        conversation.user.toString(),
      ],
    });
  } catch (error) {
    console.error("Conversation creation error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/messages", async (req, res) => {
  try {
    const token = req.cookies.token;
    const { conversationId, text } = req.body;

    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, secretKey);
    const senderId = decoded.id;

    const newMessage = await Message.create({
      conversationId,
      sender: senderId,
      text,
    });

    res.status(200).json(newMessage);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



app.get("/allconversations", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.id;

    // Get all conversations where user is either buyer or owner
    const conversations = await Conversation.find({
      $or: [{ user: userId }, { owner: userId }],
    })
      .populate("deal")
      .populate("user", "name _id") // Only name and _id
      .populate("owner", "name _id"); // Only name and _id

    // Format the response so frontend gets the other participant's info
    console.log("Conversations fetched:", conversations);
    
    const result = conversations.map((conv) => {
      const isOwner = conv.owner._id.toString() === userId;
      const otherUser = isOwner ? conv.user : conv.owner;

      return {
        _id: conv._id,
        deal: conv.deal,
        otherUser: {
          _id: otherUser._id,
          name: otherUser.name,
        },
      };
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("Error in /allconversations:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// app.post("/otp-send", async (req, res) => {
//   const { phone } = req.body;
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
//   console.log("otp", otp);

//   try {
//     await OTP.create({ phone, otp, expiresAt });
//     res.json({ success: true, otp, message: "OTP generated successfully." });
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to generate OTP." });
//   }
// });

//Verify OTP
// app.post("/verify-otp", async (req, res) => {
//   const { otp, phone, name } = req.body;

//   try {
//     const existingOtp = await OTP.findOne({
//       phone,
//       otp,
//       expiresAt: { $gt: new Date() },
//     });

//     if (!existingOtp) {
//       return res.status(400).json({
//         success: false,
//         message: "Incorrect or expired OTP",
//       });
//     }

//     // Find user by phone
//     let user = await User.findOne({ phone });

//     if (user) {
//       // If name is different, update it
//       if (user.name !== name) {
//         user.name = name;
//         await user.save();
//       }
//     } else {
//       // Create new user if not exists
//       user = await User.create({ phone, name, deals: [] });
//     }

//     await OTP.deleteMany({ phone }); // cleanup used OTPs

//     const token = jwt.sign({ id: user.id, phone: user.phone }, secretKey, {
//       expiresIn: "7d",
//     });

//     res.cookie("token", token, {
//       httpOnly: true,
//       sameSite: "none",
//       secure: true,
//     });

//     return res.json({
//       success: true,
//       message: "User created",
//       user,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Network problem" });
//   }
// });

app.post("/firebase-login", async (req, res) => {
  const { token, name } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number not found in token" });
    }

    // Find or create user
    let user = await User.findOne({ phone: phoneNumber });

    if (user) {
      if (user.name !== name) {
        user.name = name;
        await user.save();
      }
    } else {
      user = await User.create({ phone: phoneNumber, name });
    }

    // Create JWT token
    const jwtToken = jwt.sign({ id: user._id, phone: user.phone }, secretKey, {
      expiresIn: "7d",
    });

    // Set cookie
    res.cookie("token", jwtToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true, // change to false if testing over HTTP
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Firebase Login Error:", error);
    res.status(401).json({ error: "Invalid Firebase token" });
  }
});

//GET /mydeals
app.get("/mydeals", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.id;

    const deals = await Deal.find({ owner: userId });

    res.json(deals);
  } catch (err) {
    console.error("Error fetching deals:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/islogin", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, secretKey);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Loggedin", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Network problem" });
  }
});



app.delete("/deals/:id", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.id;

    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    if (deal.owner.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this deal" });
    }

    await deal.deleteOne();

    res.status(200).json({ message: "Deal deleted successfully" });
  } catch (error) {
    console.error("Error deleting deal:", error);
    res.status(500).json({ message: "Server error while deleting deal" });
  }
});

// Start server
server.listen(PORT, () =>
  console.log(`Server is live at http://localhost:${PORT}/`)
);
