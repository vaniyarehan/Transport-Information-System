const { getClient } = require('./database');
const bcrypt = require('bcrypt');
const axios = require('axios');

class Customer {
    static async viewRoutes() {
        const db = await getClient(); // Get database connection
        try {
            const query = 'SELECT route_id, stops, transporter_id, origin, destination FROM route';
            const [rows] = await db.promise().query(query);
            return rows;
        } catch (error) {
            console.error('Error fetching routes:', error);
            throw error;
        } finally {
            db.end(); // Close connection
        }
    }

    static async getTrafficUpdates(origin, destination) {
        const API_KEY = 'AIzaSyD3X0SjDZocXb0C9TCtl9xdebH8MyjIwnI'; // Store API key in .env for security

        const baseURL = 'https://maps.googleapis.com/maps/api/directions/json';
        const origin_m = `${origin}, Karachi`;
        const destination_m = `${destination}, Karachi`;

        try {
            const response = await axios.get(baseURL, {
                params: {
                    origin: origin_m,
                    destination: destination_m,
                    departure_time: 'now',
                    traffic_model: 'best_guess',
                    key: API_KEY,
                },
            });

            if (response.data.status === 'OK' && response.data.routes.length > 0) {
                const route = response.data.routes[0]; // Take the first route
                const leg = route.legs?.[0]; // Take the first leg of the route

                if (leg) {
                    return {
                        distance: leg.distance?.text || 'Distance not available',
                        duration: leg.duration?.text || 'Duration not available',
                        duration_in_traffic: leg.duration_in_traffic?.text || 'Traffic duration not available',
                        summary: route.summary || 'No summary available',
                    };
                } else {
                    throw new Error('Legs not found in the route.');
                }
            } else {
                throw new Error(`API Error: ${response.data.status}`);
            }
        } catch (error) {
            console.error('Error fetching traffic updates:', error.response?.data || error.message);
            throw error;
        }
    }

    static async estimateFare(origin, destination) {
        const apiKey ='AIzaSyD3X0SjDZocXb0C9TCtl9xdebH8MyjIwnI'
        const baseFare = 120;
        const costPerKm = 40;
        const costPerMin = 2;
        const trafficSurcharge = 50;
        const origin_m = `${origin}, Karachi`;
        const destination_m = `${destination}, Karachi`;

        try {
            const departureTime = Math.floor(Date.now() / 1000);
            const response = await axios.get(
                'https://maps.googleapis.com/maps/api/directions/json',
                {
                    params: {
                        origin: origin_m,
                        destination: destination_m,
                        key: apiKey,
                        departure_time: departureTime,
                        traffic_model: 'best_guess',
                    },
                }
            );

            const data = response.data;

            if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
                throw new Error(`No routes found or API error: ${data.status}`);
            }

            const route = data.routes[0];
            if (!route.legs || route.legs.length === 0) {
                throw new Error('No legs found in the route.');
            }

            const distanceInMeters = route.legs[0].distance.value;
            const durationInSeconds = route.legs[0].duration.value;

            const distanceInKm = distanceInMeters / 1000;
            const timeInMinutes = durationInSeconds / 60;

            const estimatedFare =
                baseFare + (costPerKm * distanceInKm) + (costPerMin * timeInMinutes) + trafficSurcharge;

            return Math.ceil(estimatedFare);
        } catch (error) {
            console.error('Error during fare estimation:', error);
            throw error;
        }
    }

    static async bookRide(cust_id, route_id, rideDate, origin, destination) {
        const db = await getClient(); 
        console.log('Origin:', origin);
        console.log('Destination:', destination);
        try {
            const routeQuery = 'SELECT transporter_id FROM route WHERE route_id = ?';
            const [routeResult] = await db.promise().query(routeQuery, [route_id]);
            if (routeResult.length === 0) {
                throw new Error('Invalid route_id selected.');
            }
            const transporterId = routeResult[0].transporter_id;
    
            const vehicleQuery = `
                SELECT vehicle_id, current_capacity, initial_capacity 
                FROM vehicle 
                WHERE transporter_id = ?
            `;
            const [vehicleResult] = await db.promise().query(vehicleQuery, [transporterId]);
            if (vehicleResult.length === 0) {
                throw new Error('No vehicle found for the selected transporter.');
            }
    
            const { vehicle_id, current_capacity, initial_capacity } = vehicleResult[0];
    
            if (current_capacity <= 0) {
                throw new Error('No seats available for this vehicle.');
            }
    
            const updateCapacityQuery = `
                UPDATE vehicle 
                SET current_capacity = current_capacity - 1 
                WHERE vehicle_id = ?
            `;
            await db.promise().query(updateCapacityQuery, [vehicle_id]);

            const fare = await Customer.estimateFare(origin, destination);
    
            const bookingQuery = `
                INSERT INTO bookings (customer_id, vehicle_id, route_id, transporter_id, ride_date, price)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const [bookingResult] = await db.promise().query(bookingQuery, [
                cust_id,
                vehicle_id,
                route_id,
                transporterId,
                rideDate,
                fare // Insert the estimated fare into the price column
            ]);
    
            const loyaltyQuery = 'UPDATE customer SET loyalty_points = loyalty_points + 5 WHERE cust_id = ?';
            await db.promise().query(loyaltyQuery, [cust_id]);
    
            console.log(
                `Booking successful! Booking ID: ${bookingResult.insertId}. Remaining seats: ${
                    current_capacity - 1
                }/${initial_capacity}. Estimated Fare: ${fare}`
            );
    
            return bookingResult;
        } catch (error) {
            console.error('Error booking ride:', error.message);
            throw error;
        } finally {
            db.end(); 
        }
    }
    
    
}

module.exports = Customer;
