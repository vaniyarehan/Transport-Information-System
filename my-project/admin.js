import db from './database';  // Import the database connection from your partner's setup
import crypto from 'crypto';
import bcrypt from 'bcryptjs';  // Assuming bcrypt is used for password hashing

class Admin {
    
    // View analytics for a specific transporter
    static async viewAnalytics(transporterId) {
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
            // Execute the query using the db connection
            const [result] = await db.query(query, [transporterId]);
    
            if (result.length === 0) {
                console.log('No analytics data found for the given transporter.');
                return null;  // Return null if no data found
            }
    
            // Return the calculated analytics data
            return result[0];
        } catch (err) {
            console.error('Error retrieving analytics data:', err.message);
            throw new Error('Error retrieving analytics data');
        }
    }

    // Admin Sign-in
    static async adminSignin(username, password) {
        try {
            // Query to check if the username exists in the database
            const query = `
                SELECT admin_id, password_hash
                FROM admin
                WHERE username = ? 
            `;
  
            // Execute the query
            const [result] = await db.query(query, [username]);
  
            // If no matching username is found, throw a username-specific error
            if (result.length === 0) {
                throw new Error('Username does not exist.');
            }
  
            // Retrieve the stored password hash and admin_id from the database
            const { password_hash, admin_id } = result[0];
  
            // Hash the entered password using the same hashing algorithm (SHA-256)
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
        }
    }
    
    // Update admin details
    static async updateAdminDetails(adminId, updates) {
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
                    await db.query(updatePasswordQuery, [hashedPassword, adminId]);
                } else {
                    const updateFieldQuery = `
                        UPDATE admin
                        SET ${dbColumn} = ?
                        WHERE admin_id = ?
                    `;
                    await db.query(updateFieldQuery, [updates[key], adminId]);
                }
            }
  
            // Retrieve and return the updated admin details
            const selectQuery = `
                SELECT admin_id, username
                FROM admin
                WHERE admin_id = ?
            `;
            const [result] = await db.query(selectQuery, [adminId]);
  
            if (result.length === 0) {
                throw new Error('Admin not found or no changes made.');
            }
  
            console.log('Admin details updated successfully:', result[0]);
            return result[0];
        } catch (error) {
            console.error('Error updating admin details:', error.message);
            throw error;
        }
    }
  
    // Delete an admin by username
    static async deleteAdmin(adminUsername) {
        try {
            const deleteAdminQuery = `
                DELETE FROM admin
                WHERE username = ?
            `;
            const [result] = await db.query(deleteAdminQuery, [adminUsername]);
  
            if (result.affectedRows === 0) {
                console.log('Admin not found.');
                return { success: false, message: 'Admin not found.' };
            }
  
            console.log('Admin account deleted successfully.');
            return { success: true, message: 'Admin account deleted.' };
        } catch (error) {
            console.error('Error deleting admin:', error.message);
            throw error;
        }
    }
}

export default Admin;
