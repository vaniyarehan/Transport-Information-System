const cron = require('node-cron');
const resetVehicleCapacity = require('./capacity');
async function runner() {
    try {
        console.log('Running vehicle capacity reset...');
        await resetVehicleCapacity();
        console.log('Vehicle capacity reset completed.');
    } catch (error) {
        console.error('Error during runner execution:', error.message);
    }
}

// Call the runner function directly for immediate reset
runner();

// Schedule the reset to run at 11 PM daily
cron.schedule('0 23 * * *', async () => {
    console.log('Scheduled task: Running vehicle capacity reset at 11 PM...');
    await resetVehicleCapacity();
});
