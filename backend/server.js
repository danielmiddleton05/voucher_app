const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const https = require("https");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log("Starting server initialization...");
console.log(`Port: ${PORT}`);

// SSL certificate paths
const SSL_CERT_PATH = "/etc/letsencrypt/live/3.142.94.167.nip.io/fullchain.pem";
const SSL_KEY_PATH = "/etc/letsencrypt/live/3.142.94.167.nip.io/privkey.pem";

// CORS configuration
const corsOptions = {
	origin: [
		"http://customcodes.s3.us-east-2.amazonaws.com",
		"https://customcodes.s3.us-east-2.amazonaws.com",
		"http://localhost:3000", // For local development
		"*", // Temporarily allow all origins for testing
	],
	methods: ["GET", "POST"],
	allowedHeaders: ["Content-Type"],
};

console.log("CORS options configured");

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

console.log("Middleware configured");

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://AcademyTEAS:WGUAcademy123@cluster0.47vsctq.mongodb.net/voucher-system?retryWrites=true&w=majority&appName=Cluster0";

console.log("Attempting to connect to MongoDB...");

// Connect to MongoDB with retry logic
async function connectToMongoDB() {
	const maxRetries = 5;
	let retryCount = 0;

	while (retryCount < maxRetries) {
		try {
			console.log(`MongoDB connection attempt ${retryCount + 1}...`);
			// Log connection attempt with masked password
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

			console.log("MongoDB client options:", {
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

			console.log("Attempting to connect...");
			await client.connect();
			console.log("Client connected successfully");

			// Connect to our application database
			db = client.db("voucher-system");
			console.log("Connected to database: voucher-system");

			// Verify the vouchers collection exists
			const collections = await db.listCollections().toArray();
			console.log(
				"Available collections:",
				collections.map((c) => c.name)
			);

			return;
		} catch (error) {
			retryCount++;
			console.error(`MongoDB connection attempt ${retryCount} failed:`);
			console.error("Error name:", error.name);
			console.error("Error message:", error.message);
			console.error("Error code:", error.code);
			console.error("Full error:", error);

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
app.get("/", (req, res) => {
	console.log("Root endpoint hit");
	res.json({ message: "Voucher Lookup API is running!" });
});

// Voucher lookup endpoint
app.post("/api/voucher-lookup", async (req, res) => {
	try {
		console.log("=== Voucher Lookup Request ===");
		console.log("Headers:", req.headers);
		console.log("Received request body:", req.body);
		const { email } = req.body;
		console.log("Voucher lookup request received for email:", email);

		// Validate email
		if (!email) {
			console.log("No email provided in request");
			return res.status(400).json({ error: "Email is required" });
		}

		// Convert email to lowercase for consistent searching
		const normalizedEmail = email.toLowerCase().trim();
		console.log("Normalized email:", normalizedEmail);

		// Verify database connection
		if (!db) {
			console.error("Database connection not established");
			return res.status(500).json({ error: "Database connection error" });
		}

		// Search for voucher in database
		console.log("Searching database for voucher...");
		const query = { email: normalizedEmail };
		console.log("Database query:", query);

		// List all vouchers in the database for debugging
		const allVouchers = await db.collection("vouchers").find({}).toArray();
		console.log("All vouchers in database:", allVouchers);

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

// Add a new voucher (for testing purposes only!)
app.post("/api/add-voucher", async (req, res) => {
	try {
		const { email, voucherCode } = req.body;

		if (!email || !voucherCode) {
			return res.status(400).json({ error: "Email and voucher code are required" });
		}

		const normalizedEmail = email.toLowerCase().trim();

		// Check if email already exists
		const existingVoucher = await db.collection("vouchers").findOne({
			email: normalizedEmail,
		});

		if (existingVoucher) {
			return res.status(409).json({ error: "Email already exists" });
		}

		// Insert new voucher
		const result = await db.collection("vouchers").insertOne({
			email: normalizedEmail,
			voucherCode: voucherCode,
			createdAt: new Date(),
		});

		res.status(201).json({
			message: "Voucher added successfully",
			id: result.insertedId,
		});
	} catch (error) {
		console.error("Database error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Get all vouchers (for admin purposes - remove in production)
app.get("/api/vouchers", async (req, res) => {
	try {
		const vouchers = await db.collection("vouchers").find({}).toArray();
		res.json(vouchers);
	} catch (error) {
		console.error("Database error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Test endpoint to verify MongoDB connection and data
app.get("/api/test-db", async (req, res) => {
	try {
		console.log("Testing database connection...");

		// Test the connection
		const collections = await db.listCollections().toArray();
		console.log("Available collections:", collections);

		// Test the vouchers collection
		const vouchers = await db.collection("vouchers").find({}).toArray();
		console.log("All vouchers:", vouchers);

		res.json({
			status: "success",
			collections: collections.map((c) => c.name),
			vouchers: vouchers,
		});
	} catch (error) {
		console.error("Database test error:", error);
		res.status(500).json({
			status: "error",
			error: error.message,
		});
	}
});

// Health check endpoint
app.get("/health", (req, res) => {
	console.log("Health check endpoint hit");
	res.json({
		status: "OK",
		timestamp: new Date().toISOString(),
		database: db ? "Connected" : "Disconnected",
	});
});

// Debug endpoint to check database contents
app.get("/api/debug", async (req, res) => {
	try {
		// Get all vouchers
		const vouchers = await db.collection("vouchers").find({}).toArray();

		// Log the raw data
		console.log("Raw database contents:", JSON.stringify(vouchers, null, 2));

		res.json({
			message: "Debug information",
			databaseConnected: !!db,
			collectionName: "vouchers",
			totalVouchers: vouchers.length,
			vouchers: vouchers,
		});
	} catch (error) {
		console.error("Debug endpoint error:", error);
		res.status(500).json({
			error: "Debug endpoint error",
			details: error.message,
		});
	}
});

// Start the server
async function startServer() {
	try {
		await connectToMongoDB();

		// Create HTTPS server
		const httpsOptions = {
			cert: fs.readFileSync(SSL_CERT_PATH),
			key: fs.readFileSync(SSL_KEY_PATH),
		};

		https.createServer(httpsOptions, app).listen(PORT, "0.0.0.0", () => {
			console.log("=== Server Started ===");
			console.log(`Server is running on port ${PORT}`);
			console.log(`Server is listening on all interfaces (0.0.0.0)`);
			console.log(`Health check: https://3.142.94.167:${PORT}/health`);
			console.log(`API endpoint: https://3.142.94.167:${PORT}/api/voucher-lookup`);
			console.log("CORS enabled for:", corsOptions.origin);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

startServer();
