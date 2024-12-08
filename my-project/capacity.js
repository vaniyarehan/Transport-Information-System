// resetCapacity.js
const { getClient } = require('./database'); 
async function resetVehicleCapacity() {
    const db = await getClient();
    try {
        const currentDayOfWeek = new Date().toLocaleString('en-PK', { weekday: 'long' });
        const currentTime = new Date().toTimeString().split(' ')[0]; 
        const completedSchedulesQuery = `
            SELECT s.vehicle_id, COUNT(b.booking_id) AS completed_bookings
            FROM schedule s
            LEFT JOIN bookings b ON s.vehicle_id = b.vehicle_id
            WHERE s.day_of_week = ? AND s.arrival_time < DATE_ADD(NOW(), INTERVAL 1 HOUR)
            GROUP BY s.vehicle_id
        `;


        const [completedSchedules] = await db.promise().query(completedSchedulesQuery, [
            currentDayOfWeek, 
            currentTime, 
        ]);
        for (const schedule of completedSchedules) {
            const { vehicle_id } = schedule;

            const resetCapacityQuery = `
                UPDATE vehicle
                SET current_capacity = initial_capacity
                WHERE vehicle_id = ?
            `;
            await db.promise().query(resetCapacityQuery, [vehicle_id]);

            console.log(`Reset current_capacity for vehicle_id ${vehicle_id}`);
        }

        console.log('Vehicle capacities reset for completed schedules.');
    } catch (error) {
        console.error('Error resetting vehicle capacity:', error.message);
    } finally {
        db.end(); 
    }
}

module.exports = resetVehicleCapacity;
