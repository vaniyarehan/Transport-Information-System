const mysql = require('mysql2');
const crypto = require('crypto');
const { getClient } = require('./database'); // Import the database client function

class Admin {

    // View analytics for a specific transporter or all transporters
    static async viewAnalytics(transporterId) {
        const client = await getClient(); // Initialize the client here
        const query = `
            SELECT 
                t.transporter_id,
                IFNULL(SUM(b.status = 'BOOKED') * 1000, 0) AS profit,  -- Example profit calculation, can adjust logic
                IFNULL(AVG(f.rating), 0) AS average_rating,
                IFNULL(SUM(b.status = 'BOOKED') * 500, 0) AS total_revenue  -- Example total revenue calculation, can adjust logic
            FROM transporter t
            LEFT JOIN bookings b ON b.transporter_id = t.transporter_id
            LEFT JOIN feedback f ON f.customer_id = b.customer_id
            WHERE t.transporter_id = ? 
            GROUP BY t.transporter_id
        `;

        try {
            // Execute the query using the client database connection
            const [result] = await client.promise().query(query, [transporterId]);

            if (result.length === 0) {
                console.log('No analytics data found for the given transporter.');
                return null;  // Return null if no data found
            }

            // Return the calculated analytics data
            return result[0];
        } catch (err) {
            console.error('Error retrieving analytics data:', err.message);
            throw new Error('Error retrieving analytics data');
        } finally {
            client.end();  // Ensure the client is closed after the query
        }
    }

    // Admin Sign-In Function
    static async adminSignin(username, password) {
        const client = await getClient();
        try {
            const query = `
                SELECT admin_id, password_hash
                FROM admin
                WHERE username = ? 
            `;

            // Execute the query
            const [result] = await client.promise().query(query, [username]);

            if (result.length === 0) {
                throw new Error('Username does not exist.');
            }

            // Retrieve the stored password hash and admin_id from the database
            const { password_hash, admin_id } = result[0];

            // Hash the entered password using SHA-256 (same hash function as in update)
            const enteredHash = crypto.createHash('sha256').update(password).digest('hex');

            // Compare the entered hash with the stored hash
            if (enteredHash !== password_hash) {
                throw new Error('Incorrect password.');
            }

            console.log('Admin signed in successfully.');
            return {
                success: true,
                message: 'Sign-in successful',
                adminId: admin_id,
            };
        } catch (error) {
            console.error('Error during admin sign-in:', error.message);
            throw error;
        } finally {
            client.end();
        }
    }

    // Update admin details
    static async updateAdminDetails(username, updates) {
        const client = await getClient();
        try {
            await client.promise().query('START TRANSACTION');  // Start the transaction
    
            const fieldMap = {
                'Username': 'username',
                'Password': 'password',
            };
    
            const updateKeys = Object.keys(updates).filter(key => fieldMap[key]);
    
            if (updateKeys.length === 0) {
                throw new Error('No valid fields to update.');
            }
    
            // Fetch admin_id based on username
            const fetchAdminIdQuery = `
                SELECT admin_id
                FROM admin
                WHERE username = ?
            `;
            const [result] = await client.promise().query(fetchAdminIdQuery, [username]);
    
            if (result.length === 0) {
                throw new Error('Admin not found.');
            }
    
            const adminId = result[0].admin_id;
    
            for (const key of updateKeys) {
                const dbColumn = fieldMap[key];
    
                if (dbColumn === 'password') { // Encrypt the password with the same hash function
                    const hashedPassword = crypto.createHash('sha256').update(updates[key]).digest('hex');
    
                    const updatePasswordQuery = `
                        UPDATE admin
                        SET password_hash = ?
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
    
            const selectQuery = `
                SELECT admin_id, username
                FROM admin
                WHERE admin_id = ?
            `;
            const [updatedAdmin] = await client.promise().query(selectQuery, [adminId]);
    
            console.log('Admin details updated successfully:', updatedAdmin[0]);
    
            await client.promise().query('COMMIT');  // Commit the transaction
            return updatedAdmin[0];
        } catch (error) {
            console.error('Error updating admin details:', error.message);
    
            await client.promise().query('ROLLBACK');  // Rollback the transaction in case of error
            throw error;
        } finally {
            client.end();
        }
    }
    
    // Delete an admin by username
   // Delete an admin by username with transactions
static async deleteAdmin(adminUsername) {
    const client = await getClient();
    try {
        // Start the transaction
        await client.promise().query('START TRANSACTION');

        // Delete admin query
        const deleteAdminQuery = `
            DELETE FROM admin
            WHERE username = ? 
        `;
        const [result] = await client.promise().query(deleteAdminQuery, [adminUsername]);

        // Check if the admin was found and deleted
        if (result.affectedRows === 0) {
            throw new Error('Admin not found.');
        }

        console.log('Admin account deleted successfully.');

        // Commit the transaction if everything is successful
        await client.promise().query('COMMIT');

        return { success: true, message: 'Admin account deleted.' };
    } catch (error) {
        console.error('Error deleting admin:', error.message);

        // Rollback the transaction in case of error
        await client.promise().query('ROLLBACK');

        throw error;
    } finally {
        client.end();
    }
}

}

module.exports = { Admin };
