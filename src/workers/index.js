// Initialize workers
const initializeWorkers = () => {
    require("./emailWorker");
    require("./adminEmailWorker");

    console.log("Workers initialized successfully");
};

module.exports = initializeWorkers;