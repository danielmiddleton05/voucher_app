const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001; // Using 3001 to avoid conflicts

// CORS configuration - more permissive for local development
const corsOptions = {
	origin: "*", // Allow all origins for local testing
	methods: ["GET", "POST"],
	allowedHeaders: ["Content-Type"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://AcademyTEAS:WGUAcademy123@cluster0.47vsctq.mongodb.net/voucher-system?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB with retry logic
async function connectToMongoDB() {
	const maxRetries = 5;
	let retryCount = 0;

	while (retryCount < maxRetries) {
		try {
			console.log(`MongoDB connection attempt ${retryCount + 1}...`);
			const maskedUri = MONGODB_URI.replace(/:[^:@]+@/, ":****@");
			console.log("Attempting to connect to MongoDB with URI:", maskedUri);

			const client = new MongoClient(MONGODB_URI, {
				useNewUrlParser: true,
				useUnifiedTopology: true,
				serverSelectionTimeoutMS: 30000,
				connectTimeoutMS: 30000,
				socketTimeoutMS: 45000,
				family: 4,
				authSource: "admin",
				authMechanism: "SCRAM-SHA-1",
				directConnection: false,
			});

			await client.connect();
			console.log("Client connected successfully");

			db = client.db("voucher-system");
			console.log("Connected to database: voucher-system");

			const collections = await db.listCollections().toArray();
			console.log(
				"Available collections:",
				collections.map((c) => c.name)
			);

			return;
		} catch (error) {
			retryCount++;
			console.error(`MongoDB connection attempt ${retryCount} failed:`, error);

			if (retryCount === maxRetries) {
				console.error("Max retries reached. Could not connect to MongoDB");
				process.exit(1);
			}

			console.log("Waiting 5 seconds before retrying...");
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}
}

// API Routes
app.get("/health", (req, res) => {
	res.json({
		status: "OK",
		timestamp: new Date().toISOString(),
		database: db ? "Connected" : "Disconnected",
		environment: "Local Development",
	});
});

// Test route to see all vouchers (helpful for development)
app.get("/api/vouchers", async (req, res) => {
	try {
		if (!db) {
			return res.status(500).json({ error: "Database connection error" });
		}

		const vouchers = await db.collection("vouchers").find({}).toArray();
		res.json({
			count: vouchers.length,
			vouchers: vouchers,
		});
	} catch (error) {
		console.error("Database error:", error);
		res.status(500).json({
			error: "Internal server error",
			details: error.message,
		});
	}
});

// Voucher lookup endpoint
app.post("/api/voucher-lookup", async (req, res) => {
	try {
		console.log("=== Voucher Lookup Request ===");
		console.log("Headers:", req.headers);
		console.log("Received request body:", req.body);
		const { email } = req.body;
		console.log("Voucher lookup request received for email:", email);

		if (!email) {
			console.log("No email provided in request");
			return res.status(400).json({ error: "Email is required" });
		}

		const normalizedEmail = email.toLowerCase().trim();
		console.log("Normalized email:", normalizedEmail);

		if (!db) {
			console.error("Database connection not established");
			return res.status(500).json({ error: "Database connection error" });
		}

		console.log("Searching database for voucher...");
		const query = { email: normalizedEmail };
		console.log("Database query:", query);

		const voucher = await db.collection("vouchers").findOne(query);
		console.log("Database query result:", voucher);

		if (voucher) {
			console.log("Voucher found:", voucher.voucherCode);
			res.json({
				voucherCode: voucher.voucherCode,
				message: "Voucher found successfully",
			});
		} else {
			console.log("No voucher found for email:", normalizedEmail);
			res.status(404).json({
				error: "Email not found",
				message: "Please contact student support",
			});
		}
	} catch (error) {
		console.error("Database error:", error);
		res.status(500).json({
			error: "Internal server error",
			message: "Please try again later",
			details: error.message,
		});
	}
});

// Start the server
async function startServer() {
	try {
		await connectToMongoDB();

		// Create HTTP server (no SSL for local development)
		app.listen(PORT, "localhost", () => {
			console.log("=== LOCAL DEVELOPMENT SERVER STARTED ===");
			console.log(`Server is running on port ${PORT}`);
			console.log(`Health check: http://localhost:${PORT}/health`);
			console.log(`View all vouchers: http://localhost:${PORT}/api/vouchers`);
			console.log(`API endpoint: http://localhost:${PORT}/api/voucher-lookup`);
			console.log("CORS enabled for all origins (development mode)");
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

startServer();
