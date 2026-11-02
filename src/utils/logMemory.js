const logMemory = (stage) => {
    const memory = process.memoryUsage();

    console.log(`[MEMORY: ${stage}]`, {
        rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
        arrayBuffers: `${(memory.arrayBuffers / 1024 / 1024).toFixed(2)} MB`
    });
};

module.exports = { logMemory };