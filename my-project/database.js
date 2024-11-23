const mysql = require('mysql2');

// Database configuration object for MySQL
const dbConfig = {
  host: 'localhost',      // MySQL server address
  user: 'root',           // Your MySQL username
  password: 'blegh;;1',      // Your MySQL password
  database: 'test3',      // Your MySQL database name
  port: 3306,             // MySQL port (default is 3306)
};

// Function to connect to the database and query
async function connectToDatabase() {
  const connection = mysql.createConnection(dbConfig);

  try {
    // Connect to MySQL
    connection.connect((err) => {
      if (err) {
        console.error("Error connecting to MySQL:", err.stack);
        return;
      }
      console.log("Successfully connected to MySQL!");
    });

    // Example query: fetch all rows from a table called 'admin'
    connection.query('SELECT * FROM admin', (err, results, fields) => {
      if (err) {
        console.error("Error executing query:", err);
        return;
      }
      console.log("Query result:", results);
    });

    // Close the connection
    connection.end();
  } catch (err) {
    console.error("Error connecting to the database:", err);
  }
}

async function getClient() {
  const connection = mysql.createConnection(dbConfig);
  try {
    connection.connect((err) => {
      if (err) {
        console.error("Error connecting to MySQL:", err.stack);
        throw err;
      }
      console.log("Successfully connected to MySQL!");
    });
    return connection;
  } catch (err) {
    console.error('Error connecting to the database:', err);
    throw err; // Rethrow error for the calling function to handle
  }
}

module.exports = { getClient };

// Call the function to connect and query
connectToDatabase();
