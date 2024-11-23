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
      const query = 'SELECT route_id, stops, transporter_id, origin, destination FROM route';
      const [rows] = await client.promise().query(query);
      return rows; // Return all rows from the result
    } finally {
      client.end();
    }
  }

  static async getTrafficUpdates(origin, destination) {
    const API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; 
    const baseURL = 'https://maps.googleapis.com/maps/api/directions/json';

    try {
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
    const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; 
    const baseFare = 120; 
    const costPerKm = 40; 
    const costPerMin = 2; 
    const trafficSurcharge = 50; 

    try {
      const departureTime = Math.floor(Date.now() / 1000);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}&departure_time=${departureTime}&traffic_model=best_guess`
      );

      const data = await response.json();

      if (data.error_message) {
        throw new Error(`API Error: ${data.error_message}`);
      }

      const route = data.routes[0];
      const distanceInMeters = route.legs[0].distance.value;
      const durationInSeconds = route.legs[0].duration.value;

      const distanceInKm = distanceInMeters / 1000;
      const timeInMinutes = durationInSeconds / 60;

      const estimatedFare = 
        baseFare +
        (costPerKm * distanceInKm) +
        (costPerMin * timeInMinutes) +
        trafficSurcharge;

      const finalFare = Math.ceil(estimatedFare);
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
      const routeQuery = 'SELECT transporter_id FROM route WHERE route_id = ?';
      const [routeResult] = await client.promise().query(routeQuery, [routeId]);
      if (routeResult.length === 0) {
        throw new Error('Invalid route_id selected.');
      }
      const transporterId = routeResult[0].transporter_id;

      const vehicleQuery = 'SELECT vehicle_id FROM vehicle WHERE transporter_id = ?';
      const [vehicleResult] = await client.promise().query(vehicleQuery, [transporterId]);
      if (vehicleResult.length === 0) {
        throw new Error('No vehicle found for the selected transporter.');
      }
      const vehicleId = vehicleResult[0].vehicle_id;

      const feedbackInsertQuery = 'INSERT INTO feedback (comments) VALUES ("No feedback yet")';
      const [feedbackResult] = await client.promise().query(feedbackInsertQuery);
      const feedbackId = feedbackResult.insertId;

      const bookingQuery = `
        INSERT INTO bookings (customer_id, vehicle_id, route_id, transporter_id, ride_date, feedback_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [bookingResult] = await client.promise().query(bookingQuery, [
        custId,
        vehicleId,
        routeId,
        transporterId,
        rideDate,
        feedbackId,
      ]);

      console.log('Booking successful! Booking ID:', bookingResult.insertId);
      return bookingResult;
    } catch (error) {
      console.error('Error booking ride:', error.message);
      throw error;
    } finally {
      client.end();
    }
  }

  static async updateCustomerDetails(custId, updates) {
    const client = await getClient();
    try {
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
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(updates[key], saltRounds);

          const updatePasswordQuery = `
            UPDATE customer
            SET password = ?, updated_at = NOW() 
            WHERE cust_id = ?
          `;
          await client.promise().query(updatePasswordQuery, [hashedPassword, custId]);
        } else {
          const updateFieldQuery = `
            UPDATE customer
            SET ${dbColumn} = ?, updated_at = NOW() 
            WHERE cust_id = ?
          `;
          await client.promise().query(updateFieldQuery, [updates[key], custId]);
        }
      }

      const selectQuery = `
        SELECT cust_id, first_name, last_name, cust_email, phone_number, username, updated_at 
        FROM customer
        WHERE cust_id = ?
      `;
      const [result] = await client.promise().query(selectQuery, [custId]);

      if (result.length === 0) {
        throw new Error('Customer not found or no changes made.');
      }

      console.log('Customer details updated successfully:', result[0]);
      return result[0];
    } catch (error) {
      console.error('Error updating customer details:', error.message);
      throw error;
    } finally {
      client.end();
    }
  }

  static async deleteCustomer(custId) {
    const client = await getClient();
    try {
      const deleteCustomerQuery = 'DELETE FROM customer WHERE cust_id = ?';
      await client.promise().query(deleteCustomerQuery, [custId]);

      console.log('Customer and associated data deleted successfully.');
    } catch (error) {
      console.error('Error deleting customer:', error.message);
      throw error;
    } finally {
      client.end();
    }
  }
}

class Admin {
  // Update admin details
  static async updateAdminDetails(adminId, updates) {
    const client = await getClient();
    try {
      const fieldMap = {
        'Username': 'username',
        'Password': 'password',
      };

      const updateKeys = Object.keys(updates).filter(key => fieldMap[key]);

      if (updateKeys.length === 0) {
        throw new Error('No valid fields to update.');
      }

      for (const key of updateKeys) {
        const dbColumn = fieldMap[key];

        if (dbColumn === 'password') { // Encrypt the password
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(updates[key], saltRounds);

          const updatePasswordQuery = `
            UPDATE admin
            SET password = ?
            WHERE admin_id = ?
          `;
          await client.promise().query(updatePasswordQuery, [hashedPassword, adminId]);
        } else {
          const updateFieldQuery = `
            UPDATE admin
            SET ${dbColumn} = ?
            WHERE admin_id = ?
          `;
          await client.promise().query(updateFieldQuery, [updates[key], adminId]);
        }
      }

      // Retrieve and return the updated admin details
      const selectQuery = `
        SELECT admin_id, username
        FROM admin
        WHERE admin_id = ?
      `;
      const [result] = await client.promise().query(selectQuery, [adminId]);

      if (result.length === 0) {
        throw new Error('Admin not found or no changes made.');
      }

      console.log('Admin details updated successfully:', result[0]);
      return result[0];
    } catch (error) {
      console.error('Error updating admin details:', error.message);
      throw error;
    } finally {
      client.end();
    }
  }

  // Delete an admin by username
  static async deleteAdmin(adminUsername) {
    const client = await getClient();
    try {
      const deleteAdminQuery = `
        DELETE FROM admin
        WHERE username = ?
      `;
      const [result] = await client.promise().query(deleteAdminQuery, [adminUsername]);

      if (result.affectedRows === 0) {
        console.log('Admin not found.');
        return { success: false, message: 'Admin not found.' };
      }

      console.log('Admin account deleted successfully.');
      return { success: true, message: 'Admin account deleted.' };
    } catch (error) {
      console.error('Error deleting admin:', error.message);
      throw error;
    } finally {
      client.end();
    }
  }

  // View analytics for a specific transporter or all transporters
  static async viewAnalytics(transporterId) {
    const client = await getClient();
    try {
      // SQL query to fetch analytics for a specific transporter or all transporters
      const query = `
        SELECT profit, average_rating, total_revenue, transporters_transporter_id
        FROM analytics
        WHERE transporters_transporter_id = ?
      `;

      // Execute query with the given transporterId (pass null if you want to fetch all transporters)
      const [result] = await client.promise().query(query, [transporterId]);

      if (result.length === 0) {
        console.log('No analytics data found for the given transporter.');
        return null;  // Return null if no data found
      }

      // Return the analytics data
      return result;
    } catch (err) {
      console.error('Error retrieving analytics data:', err);
      throw new Error('Error retrieving analytics data');
    } finally {
      client.end();  // Ensure the client is closed after the query
    }
  }
}
module.exports = {Customer,Admin};

