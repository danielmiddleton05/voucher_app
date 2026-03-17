const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log("=== STARTING LOCAL SERVER ===");
console.log(`Port: ${PORT}`);

// CORS configuration - very permissive for local testing
const corsOptions = {
	origin: "*", // Allow all origins for local testing
	methods: ["GET", "POST", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: false,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://AcademyTEAS:WGUAcademy123@cluster0.47vsctq.mongodb.net/voucher-system?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB
async function connectToMongoDB() {
	try {
		console.log("Connecting to MongoDB...");
		const client = new MongoClient(MONGODB_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});

		await client.connect();
		db = client.db("voucher-system");
		console.log("✅ Connected to MongoDB");

		const collections = await db.listCollections().toArray();
		console.log(
			"Available collections:",
			collections.map((c) => c.name)
		);
	} catch (error) {
		console.error("❌ MongoDB connection failed:", error.message);
		// Continue without DB for testing
	}
}

// Routes
app.get("/health", (req, res) => {
	res.json({
		status: "OK",
		timestamp: new Date().toISOString(),
		database: db ? "Connected" : "Disconnected",
		environment: "Local Development",
	});
});

app.post("/api/voucher-lookup", async (req, res) => {
	try {
		console.log("=== Voucher Lookup Request ===");
		console.log("Request body:", req.body);
		const { email } = req.body;

		if (!email) {
			return res.status(400).json({ error: "Email is required" });
		}

		if (!db) {
			console.log("No database connection - returning test response");
			return res.json({
				voucherCode: "TEST-VOUCHER!",
				message: "Test voucher (no database connection)",
			});
		}

		const normalizedEmail = email.toLowerCase().trim();
		const voucher = await db.collection("vouchers").findOne({ email: normalizedEmail });

		if (voucher) {
			res.json({
				voucherCode: voucher.voucherCode,
				message: "Voucher found successfully",
			});
		} else {
			res.status(404).json({
				error: "Email not found",
				message: "Please contact student support",
			});
		}
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({
			error: "Internal server error",
			details: error.message,
		});
	}
});

// Start server
async function startServer() {
	await connectToMongoDB();

	app.listen(PORT, "localhost", () => {
		console.log("\n=== SERVER RUNNING ===");
		console.log(`🚀 Server running at: http://localhost:${PORT}`);
		console.log(`📊 Health check: http://localhost:${PORT}/health`);
		console.log(`🔍 API endpoint: http://localhost:${PORT}/api/voucher-lookup`);
		console.log("\n=== Ready for frontend testing! ===\n");
	});
}

startServer().catch(console.error);
