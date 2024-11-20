const bcrypt = require('bcrypt'); // For hashing passwords
const axios = require('axios');
const { getClient } = require('./database'); // Import the database client function

class Customer {
  constructor(custId, firstName, lastName, email, feedbackId, loyaltyPoints) {
    this.custId = custId;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.feedbackId = feedbackId;
    this.loyaltyPoints = loyaltyPoints;
  }

  static async viewRoutes() {
    const client = await getClient();
    try {
      const query = 'SELECT route_id, stops, transporter_id FROM routes';
      const result = await client.query(query);
      return result.rows; // Return all rows from the result
    } finally {
      await client.end();
    }
  }
  static async getTrafficUpdates(origin, destination) {
    const API_KEY = 'AIzaSyD3X0SjDZocXb0C9TCtl9xdebH8MyjIwnI'; 
    const baseURL = 'https://maps.googleapis.com/maps/api/directions/json';

    try {
      // Make a request to the API
      const response = await axios.get(baseURL, {
        params: {
          origin: origin,
          destination: destination,
          departure_time: 'now',
          traffic_model: 'best_guess',
          key: API_KEY,
        },
      });

      if (response.data.status === 'OK') {
        const route = response.data.routes[0];
        const leg = route.legs[0];
        return {
          distance: leg.distance.text,
          duration: leg.duration.text,
          duration_in_traffic: leg.duration_in_traffic.text,
          summary: route.summary,
        };
      } else {
        throw new Error(`API Error: ${response.data.status}`);
      }
    } catch (error) {
      console.error('Error fetching traffic updates:', error);
      throw error;
    }
  }
  static async estimateFare(origin, destination) {
    const apiKey = 'AIzaSyD3X0SjDZocXb0C9TCtl9xdebH8MyjIwnI'; 
    const baseFare = 120; // Base fare in your currency
    const costPerKm = 40; // Cost per kilometer
    const costPerMin = 2; // Cost per minute
    const trafficSurcharge = 50; // Flat traffic surcharge

    try {
        // Fetch route data using Google Maps Directions API
        const departureTime = Math.floor(Date.now() / 1000);
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}&departure_time=${departureTime}&traffic_model=best_guess`
        );

        const data = await response.json();

        // Handle API errors
        if (data.error_message) {
            throw new Error(`API Error: ${data.error_message}`);
        }

        // Extract distance and duration from the API response
        const route = data.routes[0];
        const distanceInMeters = route.legs[0].distance.value; // Distance in meters
        const durationInSeconds = route.legs[0].duration.value; // Duration in seconds

        const distanceInKm = distanceInMeters / 1000; // Convert to kilometers
        const timeInMinutes = durationInSeconds / 60; // Convert to minutes

        // Calculate fare
        const estimatedFare = 
            baseFare +
            (costPerKm * distanceInKm) +
            (costPerMin * timeInMinutes) +
            trafficSurcharge;

        const finalFare = Math.ceil(estimatedFare); // Take the ceiling value
        console.log(`Estimated Fare: ${finalFare} Rs`);
        return finalFare;
    } catch (error) {
        console.error('Error during fare estimation:', error);
        throw error;
    }
}

static async bookRide(custId, routeId, source, destination) {
    const client = await getClient();
    try {
      // Retrieve transporter_id for the selected route
      const routeQuery = `
        SELECT transporter_id 
        FROM routes 
        WHERE route_id = $1
      `;
      const routeResult = await client.query(routeQuery, [routeId]);
      if (routeResult.rows.length === 0) {
        throw new Error('Invalid route_id selected.');
      }
      const transporterId = routeResult.rows[0].transporter_id;
  
      // Retrieve vehicle_id for the transporter
      const vehicleQuery = `
        SELECT vehicle_id 
        FROM vehicles 
        WHERE transporter_id = $1
      `;
      const vehicleResult = await client.query(vehicleQuery, [transporterId]);
      if (vehicleResult.rows.length === 0) {
        throw new Error('No vehicle found for the selected transporter.');
      }
      const vehicleId = vehicleResult.rows[0].vehicle_id;
  
      // Generate price using the fare estimation function
      const price = await this.estimateFare(source, destination);
  
      // Retrieve the customer's first name
      const customerQuery = `
        SELECT first_name 
        FROM customers 
        WHERE cust_id = $1
      `;
      const customerResult = await client.query(customerQuery, [custId]);
      if (customerResult.rows.length === 0) {
        throw new Error('Invalid customer ID.');
      }
      const customerFirstName = customerResult.rows[0].first_name;
  
      // Generate a new feedback record and retrieve feedback_id
      const feedbackInsertQuery = `
        INSERT INTO feedback (comments) VALUES ('No feedback yet') RETURNING feedback_id
      `;
      const feedbackResult = await client.query(feedbackInsertQuery);
      const feedbackId = feedbackResult.rows[0].feedback_id;
  
      // Insert booking into the bookings table, now including customers_first_name
      const bookingQuery = `
        INSERT INTO bookings (transporter_id, vehicle_id, price, customers_cust_id, feedback_feedback_id, customers_first_name)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING booking_id
      `;
      
      const bookingResult = await client.query(bookingQuery, [
        transporterId,
        vehicleId,
        price,
        custId,
        feedbackId,
        customerFirstName,  // Include customers_first_name
      ]);
  
      console.log('Booking successful! Booking ID:', bookingResult.rows[0].booking_id);
      return bookingResult.rows[0];
    } finally {
      await client.end();
    }
  }
  
  
  
  
}
class Admin {
    // View Analytics function
    static async viewAnalytics(transporterId) {
      const client = await getClient();  // Get the database client
      try {
        // SQL query to fetch analytics for a specific transporter or all transporters
        const query = `
          SELECT profit, average_rating, total_revenue, transporters_transporter_id 
          FROM analytics
          WHERE transporters_transporter_id = $1
        `;
        
        // Execute query with the given transporterId (pass null if you want to fetch all transporters)
        const result = await client.query(query, [transporterId]);
  
        if (result.rows.length === 0) {
          console.log('No analytics data found for the given transporter.');
          return null;  // Return null if no data found
        }
  
        // Return the analytics data
        return result.rows;
      } catch (err) {
        console.error('Error retrieving analytics data:', err);
        throw new Error('Error retrieving analytics data');
      } finally {
        await client.end();  // Ensure the client is closed after the query
      }
    }
  }
  

  module.exports = { Customer, Admin };
