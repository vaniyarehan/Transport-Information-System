const bcrypt = require('bcrypt');
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
      const query = 'SELECT route_id, stops, transporter_id,origin,destination FROM route';
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

static async bookRide(custId, routeId, rideDate) {
  const client = await getClient();
  try {
      // Retrieve transporter_id for the selected route
      const routeQuery = `
          SELECT transporter_id 
          FROM route 
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
          FROM vehicle 
          WHERE transporter_id = $1
      `;
      const vehicleResult = await client.query(vehicleQuery, [transporterId]);
      if (vehicleResult.rows.length === 0) {
          throw new Error('No vehicle found for the selected transporter.');
      }
      const vehicleId = vehicleResult.rows[0].vehicle_id;

      // Generate a feedback record and retrieve feedback_id
      const feedbackInsertQuery = `
          INSERT INTO feedback (comments) 
          VALUES ('No feedback yet') 
          RETURNING feedback_id
      `;
      const feedbackResult = await client.query(feedbackInsertQuery);
      const feedbackId = feedbackResult.rows[0].feedback_id;

      // Insert booking into the bookings table
      const bookingQuery = `
          INSERT INTO bookings (customer_id, vehicle_id, route_id, transporter_id, ride_date, feedback_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING booking_id
      `;
      const bookingResult = await client.query(bookingQuery, [
          custId,
          vehicleId,
          routeId,
          transporterId,
          rideDate,
          feedbackId,
      ]);

      console.log('Booking successful! Booking ID:', bookingResult.rows[0].booking_id);
      return bookingResult.rows[0];
  } catch (error) {
      console.error('Error booking ride:', error.message);
      throw error;
  } finally {
      await client.end();
  }
}
  static async updateCustomerDetails(custId, updates) {
    const client = await getClient();
    try {
      // Map user-friendly field names to database column names
      const fieldMap = {
        'First Name': 'first_name',
        'Last Name': 'last_name',
        'Email': 'cust_email',
        'Phone Number': 'phone_number',
        'Username': 'username',
        'Password': 'password',
      };

      const updateKeys = Object.keys(updates).filter(key => fieldMap[key]);

      if (updateKeys.length === 0) {
        throw new Error('No valid fields to update.');
      }

      for (const key of updateKeys) {
        const dbColumn = fieldMap[key];

        if (dbColumn === 'password') {
          // Encrypt the password
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(updates[key], saltRounds);

          // Update the password and updated_at explicitly
          const updatePasswordQuery = `
            UPDATE customer
            SET hash_password= $1, updated_at = NOW() 
            WHERE cust_id = $2
          `;
          await client.query(updatePasswordQuery, [hashedPassword, custId]);
        } else {
          // Update other fields (e.g., first_name, last_name, etc.)
          const updateFieldQuery = `
            UPDATE customer
            SET ${dbColumn} = $1, updated_at = NOW() 
            WHERE cust_id = $2
          `;
          await client.query(updateFieldQuery, [updates[key], custId]);
        }
      }

      // Retrieve and return the updated customer details
      const selectQuery = `
        SELECT cust_id, first_name, last_name, cust_email, phone_number, username, updated_at 
        FROM customer
        WHERE cust_id = $1
      `;
      const result = await client.query(selectQuery, [custId]);

      if (result.rows.length === 0) {
        throw new Error('Customer not found or no changes made.');
      }

      console.log('Customer details updated successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating customer details:', error.message);
      throw error;
    } finally {
      await client.end();
    }
  }
  static async deleteCustomer(custId) {
    const client = await getClient();
    try {
      // Start by deleting bookings for the customer
      const deleteBookingsQuery = `
        DELETE FROM bookings 
        WHERE customer_id = $1
      `;
      await client.query(deleteBookingsQuery, [custId]);

      // Then, delete the related feedback records
      const deleteFeedbackQuery = `
        DELETE FROM feedback 
        WHERE feedback_id IN (
          SELECT feedback_id FROM bookings WHERE customer_id = $1
        )
      `;
      await client.query(deleteFeedbackQuery, [custId]);

      // Finally, delete the customer
      const deleteCustomerQuery = `
        DELETE FROM customer
        WHERE cust_id = $1
      `;
      await client.query(deleteCustomerQuery, [custId]);

      console.log('Customer and related data deleted successfully.');
      return { success: true, message: 'Customer account deleted.' };
    } catch (error) {
      console.error('Error deleting customer:', error.message);
      throw error;
    } finally {
      await client.end();
    }
  }
 
  
}
class Admin {
    static async updateAdminDetails(adminId, updates) {
      const client = await getClient();
      try {
        const fieldMap = {
          'Username': 'username',
          'Password': 'password_hash',
        };
  
        const updateKeys = Object.keys(updates).filter(key => fieldMap[key]);
  
        if (updateKeys.length === 0) {
          throw new Error('No valid fields to update.');
        }
  
        for (const key of updateKeys) {
          const dbColumn = fieldMap[key];
  
          if (dbColumn === 'password_hash') {
            // Encrypt the password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(updates[key], saltRounds);
  
            // Update the password_hash field
            const updatePasswordQuery = `
              UPDATE admin 
              SET password_hash = $1
              WHERE admin_id = $2
            `;
            await client.query(updatePasswordQuery, [hashedPassword, adminId]);
          } else {
            const updateFieldQuery = `
              UPDATE admin 
              SET ${dbColumn} = $1
              WHERE admin_id = $2
            `;
            await client.query(updateFieldQuery, [updates[key], adminId]);
          }
        }
  
        // Retrieve and return the updated admin details
        const selectQuery = `
          SELECT admin_id, username
          FROM admin 
          WHERE admin_id = $1
        `;
        const result = await client.query(selectQuery, [adminId]);
  
        if (result.rows.length === 0) {
          throw new Error('Admin not found or no changes made.');
        }
  
        console.log('Admin details updated successfully:', result.rows[0]);
        return result.rows[0];
      } catch (error) {
        console.error('Error updating admin details:', error.message);
        throw error;
      } finally {
        await client.end();
      }
    }
    static async deleteAdmin(adminUsername) {
      const client = await getClient();
      try {
        const deleteAdminQuery = `
          DELETE FROM admin 
          WHERE username = $1
        `;
        const result = await client.query(deleteAdminQuery, [adminUsername]);
  
        if (result.rowCount === 0) {
          console.log('Admin not found.');
          return { success: false, message: 'Admin not found.' };
        }
  
        console.log('Admin account deleted successfully.');
        return { success: true, message: 'Admin account deleted.' };
      } catch (error) {
        console.error('Error deleting admin:', error.message);
        throw error;
      } finally {
        await client.end();
      }
    }
  
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
