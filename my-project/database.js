const { Client } = require('pg');

// Database configuration object
const dbConfig = {
  user: 'postgres',      // Your PostgreSQL username
  host: 'localhost',         // PostgreSQL server address
  database: 'test',  // Your PostgreSQL database name
  password: 'admin',  // Your PostgreSQL password
  port: 5432,                // PostgreSQL port (default is 5432)
};

// Function to connect to the database and query
async function connectToDatabase() {
  const client = new Client(dbConfig);

  try {
    // Connect to PostgreSQL
    await client.connect();
    console.log("Successfully connected to PostgreSQL!");

    // Example query: fetch all rows from a table called 'users'
    const result = await client.query('SELECT * FROM admin');
    console.log("Query result:", result.rows);

    // Close the connection
    await client.end();
  } catch (err) {
    console.error("Error connecting to the database:", err);
  }
}
async function getClient() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('Successfully connected to PostgreSQL!');
    return client;
  } catch (err) {
    console.error('Error connecting to the database:', err);
    throw err; // Rethrow error for the calling function to handle
  }
}

module.exports = { getClient };

// Call the function to connect and query
connectToDatabase();