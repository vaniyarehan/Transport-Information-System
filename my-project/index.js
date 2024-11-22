const { Customer, Admin } = require('./program');
async function testCustomerClass() {
  console.log('Testing Update Customer Details:');
  
  try {
    // Sample data for testing
    const custId = 1;  // Replace with a valid customer ID from your database

    // Data to update (could be first_name, last_name, phone_number, email, etc.)
    const updates = {
      'First Name': 'Vaniya',
      'Last Name': 'Rehan',
      'Email': 'vaniya.rehane@example.com',
      'Phone Number': '123-456-7890'
    };

    // Call the updateCustomerDetails function
    const updatedCustomer = await Customer.updateCustomerDetails(custId, updates);
    console.log('Updated Customer Details:', updatedCustomer);
  } catch (error) {
    console.error('Error during update customer details test:', error.message);
  }
  console.log('Testing Book Ride Function:');
    try {
        // Sample data for testing
        const customerId = 1;    // Replace with a valid customer ID from your database
        const routeId = 'RT001';  // Replace with a valid route ID
        const rideDate = '2024-11-21';  // Date format (YYYY-MM-DD)

        // Call the bookRide function
        const booking = await Customer.bookRide(customerId, routeId, rideDate);
        console.log('Booking Details:', booking);  // Log the booking details (e.g., booking ID)
    } catch (err) {
        console.error('Error during booking test:', err.message);
    }
    console.log('Testing Fare Estimation:');
    try {
        const origin = 'Nazimabad, Karachi'; // Replace with test data
        const destination = 'Clifton, Karachi'; // Replace with test data
        const estimatedFare = await Customer.estimateFare(origin, destination);
        console.log(`Estimated Fare from ${origin} to ${destination}: ${estimatedFare}`);
    } catch (error) {
        console.error('Error during fare estimation test:', error);
    
    }

 // Test View Routes
  console.log('Testing View Routes:');
  try {
    const routes = await Customer.viewRoutes();
    console.log('Routes:', routes);
  } catch (error) {
    console.error('Error during route viewing test:', error);
  }
  console.log('Testing Real-Time Traffic Updates:');
  try {
    const origin = 'Clifton, Karachi';
    const destination = 'Nazimabad, Karachi';
    const trafficData = await Customer.getTrafficUpdates(origin, destination);
    console.log('Traffic Data:', trafficData);
  } catch (error) {
    console.error('Error during traffic update test:', error);
  }
}
// async function testAdminAnalytics() {
//     try {
//       // Replace with the transporter_id you want to retrieve analytics for
//       const transporterId = 1;  // Example transporter_id
//       const analyticsData = await Admin.viewAnalytics(transporterId);
  
//       if (analyticsData) {
//         console.log('Analytics Data:', analyticsData);
//       } else {
//         console.log('No analytics data found.');
//       }
//     } catch (err) {
//       console.error('Error during analytics test:', err);
//     }
//   }
  
  // testAdminAnalytics();
//   async function testUpdateAdminDetails() {
//     console.log('Testing Update Admin Details:');
    
//     try {
//       // Sample data for testing
//       const adminId = 1;  // Replace with a valid admin ID from your database
  
//       // Data to update (we'll only update the Username here, or you can update Password as well)
//       const updates = {
//         'Username': 'daniazehra123', // New username for testing
//         'Password': 'dbproject123'  // Uncomment this line if you want to test password update
//       };
  
//       // Call the updateAdminDetails function
//       const updatedAdmin = await Admin.updateAdminDetails(adminId, updates);
//       console.log('Updated Admin Details:', updatedAdmin);
//     } catch (error) {
//       console.error('Error during update admin details test:', error.message);
//     }
//   }
  
//   testUpdateAdminDetails()
//     .then(() => {
//       console.log('Update admin details testing complete.');
//     })
//     .catch((err) => {
//       console.error('An error occurred during update admin details test:', err);
//     });
//  testCustomerClass()
//   .then(() => {
//     console.log('Testing complete.');
//   })
//   .catch(err => {
//     console.error('An error occurred during testing:', err);
//   });
  async function testDeleteCustomer() {
    console.log('Testing Delete Customer:');
    
    try {
      const custId = 1;  
      const result = await Customer.deleteCustomer(custId);
      console.log(result.message);  
    } catch (error) {
      console.error('Error during delete customer test:', error.message);
    }
  }
  
  testDeleteCustomer()
    .then(() => {
      console.log('Delete customer testing complete.');
    })
    .catch((err) => {
      console.error('An error occurred during delete customer test:', err);
    });
    async function testDeleteAdmin() {
      try {
        const adminUsername = 'admin2';  
        const response = await Admin.deleteAdmin(adminUsername);
        console.log(response.message);  
      } catch (error) {
        console.error('Error during delete admin test:', error.message);
      }
    }
    
    testDeleteAdmin();