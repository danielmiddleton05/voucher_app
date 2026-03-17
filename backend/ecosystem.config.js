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
				MONGODB_URI: process.env.MONGODB_URI,
			},
		},
	],
};
