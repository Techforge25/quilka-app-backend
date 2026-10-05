const { Queue } = require("bullmq");
const { redisConfigOptions } = require("../redis/connection");

// Email Queue
const emailQueue = new Queue("emailQueue", { 
    connection: redisConfigOptions, 
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 1000
    }
});

// Attach error handler
emailQueue.on("error", (error) => console.error("Email queue error:", error));

module.exports = emailQueue;