const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const https = require("https");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// SSL certificate paths
const SSL_CERT_PATH = "/etc/letsencrypt/live/3.142.94.167.nip.io/fullchain.pem";
const SSL_KEY_PATH = "/etc/letsencrypt/live/3.142.94.167.nip.io/privkey.pem";

// CORS configuration
const corsOptions = {
	origin: ["http://customcodes.s3.us-east-2.amazonaws.com", "https://customcodes.s3.us-east-2.amazonaws.com", "http://localhost:3000", "*"],
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
	});
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
			console.log(`Health check: https://3.142.94.167.nip.io:${PORT}/health`);
			console.log(`API endpoint: https://3.142.94.167.nip.io:${PORT}/api/voucher-lookup`);
			console.log("CORS enabled for:", corsOptions.origin);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

startServer();
