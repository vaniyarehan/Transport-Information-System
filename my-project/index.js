const { Customer, Admin } = require('./program');
async function testCustomerClass() {
    console.log('Testing Booking:');
    try {
        const booking = await Customer.bookRide(1, 1, 'Clifton, Karachi', 'Karsaz, Karachi');
        console.log(booking);
    } catch (err) {
      console.error('Error during booking test:', err);
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
//   console.log('Testing View Routes:');
//   try {
//     const routes = await Customer.viewRoutes();
//     console.log('Routes:', routes);
//   } catch (error) {
//     console.error('Error during route viewing test:', error);
//   }
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
  
 testCustomerClass()
  .then(() => {
    console.log('Testing complete.');
  })
  .catch(err => {
    console.error('An error occurred during testing:', err);
  });
