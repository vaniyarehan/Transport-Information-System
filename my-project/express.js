const express = require('express');
const bodyParser = require('body-parser');
const { Customer, Admin} = require('./program');
const app = express();
app.use(bodyParser.json()); 

// Customer routes
app.get('/viewRoutes', async (req, res) => {
    try {
      const routes = await Customer.viewRoutes(); 
      res.status(200).json(routes);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.get('/trafficUpdates', async (req, res) => {
    const origin = 'Clifton, Karachi';
    const destination = 'Nazimabad, Karachi';
  
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required.' });
    }
  
    try {
      const trafficUpdates = await Customer.getTrafficUpdates(origin, destination);
      res.status(200).json(trafficUpdates);
    } catch (err) {
      console.error('Error fetching traffic updates:', err.message);
      res.status(500).json({ error: 'An error occurred while fetching traffic updates.' });
    }
  });
  app.get('/estimateFare', async (req, res) => {
    const origin = 'Clifton, Karachi';
    const destination = 'Nazimabad, Karachi';
  
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required.' });
    }
  
    try {
      const fare = await Customer.estimateFare(origin, destination);
      res.status(200).json({ estimatedFare: fare });
    } catch (err) {
      console.error('Error estimating fare:', err.message);
      res.status(500).json({ error: 'An error occurred while estimating the fare.' });
    }
  });
  
  app.post('/bookRide', async (req, res) => {
    const customerId = 1; // Replace with a valid customer ID from your database
    const routeId = 'RT001'; // Replace with a valid route ID
    const rideDate = '2024-11-21'; 
  
    if (!customerId || !routeId || !rideDate) {
      return res.status(400).json({ error: 'customerId, routeId, and rideDate are required.' });
    }
  
    try {
      const booking = await Customer.bookRide(customerId, routeId, rideDate); // Pass correct variables
      res.status(201).json({ success: true, booking });
    } catch (err) {
      console.error('Error booking ride:', err.message);
      res.status(500).json({ error: 'An error occurred while booking the ride.' });
    }
  });
  
  
  app.put('/updateCustomer/:custId', async (req, res) => {
    const custId = 2; 
    const updates = {
      'First Name': 'Vaniya',
      'Last Name': 'Rehan',
      'Email': 'vaniya.rehane@example.com',
      'Phone Number': '123-456-7890'
    };
  
    try {
      const updatedCustomer = await Customer.updateCustomerDetails(custId, updates);
      res.status(200).json(updatedCustomer);
    } catch (err) {
      console.error('Error updating customer details:', err.message);
      res.status(500).json({ error: 'An error occurred while updating customer details.' });
    }
  });
  app.delete('/deleteCustomer/:custId', async (req, res) => {
    const custId = 2;
  
    try {
      const result = await Customer.deleteCustomer(custId);
      res.status(200).json(result);
    } catch (err) {
      console.error('Error deleting customer:', err.message);
      res.status(500).json({ error: 'An error occurred while deleting the customer.' });
    }
  });
  

// // Admin routes
app.put('/updateAdmin/:adminId', async (req, res) => {
    const adminId = 1;
    const updates = {
                 'Username': 'daniazehra122', // New username for testing
                 'Password': 'dbproject123'  // Uncomment this line if you want to test password update
              };
  
    try {
      const updatedAdmin = await Admin.updateAdminDetails(adminId, updates);
      res.status(200).json(updatedAdmin);
    } catch (err) {
      console.error('Error updating admin details:', err.message);
      res.status(500).json({ error: 'An error occurred while updating admin details.' });
    }
  });
  
  app.delete('/deleteAdmin', async (req, res) => {
    const username = 'daniazehra123';
  
    try {
      const result = await Admin.deleteAdmin(username);
      res.status(200).json(result);
    } catch (err) {
      console.error('Error deleting admin:', err.message);
      res.status(500).json({ error: 'An error occurred while deleting the admin.' });
    }
  });
  
app.get('/viewAnalytics/:transporterId', async (req, res) => {
    const transporterId = 'TR001';
  
    try {
      const analytics = await Admin.viewAnalytics(transporterId);
      if (!analytics) {
        return res.status(404).json({ error: 'No analytics found for the given transporter ID.' });
      }
      res.status(200).json(analytics);
    } catch (err) {
      console.error('Error fetching analytics:', err.message);
      res.status(500).json({ error: 'An error occurred while fetching analytics.' });
    }
  });
  

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
