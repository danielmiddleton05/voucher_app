module.exports = {
	apps: [
		{
			name: "voucher-app",
			script: "https-server.js",
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: "1G",
			env: {
				NODE_ENV: "production",
				PORT: 3000,
				MONGODB_URI: "mongodb+srv://AcademyTEAS:WGUAcademy123@cluster0.47vsctq.mongodb.net/voucher-system?retryWrites=true&w=majority&appName=Cluster0",
			},
		},
	],
};
