module.exports = {
	apps: [
		{
			name: "personallm-scheduler",
			script: "bun",
			args: "run src/scheduler.ts",
			watch: false,
		},
	],
};
