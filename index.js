const express = require('express');
const oracledb = require('oracledb');
const path = require('path');
const app = express();
const PORT = 3000;

// Oracle database connection config
const dbConfig = {
  user: 'hr',
  password: 'hr',
  connectString: 'localhost/orcl'
};

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: false }));

async function runQuery(query, bindParams = []) {
    let connection;
    let result;
  
    try {
      // Establish the Oracle database connection
      connection = await oracledb.getConnection(dbConfig);
  
      // Execute the query with bind parameters
      result = await connection.execute(query, bindParams, { autoCommit: true });
  
      // Log the query result
      console.log('Query result:', result.rows);
    } catch (err) {
      console.error('Error executing query:', err);
    } finally {
      // Release the connection
      if (connection) {
        try {
          await connection.close();
          console.log('Connection closed.');
        } catch (err) {
          console.error('Error closing Oracle database connection:', err);
        }
      }
    }
  
    // Return the query result, which will be undefined if there was an error
    return result;
  }
  
// Function to check if a table exists in the database
async function tableExists(tableName) {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT table_name FROM user_tables WHERE table_name = :tableName`,
      [tableName]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error('Error checking if table exists:', err);
    return false;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing Oracle database connection:', err);
      }
    }
  }
}

// Example usage to create the "users" table if it doesn't exist
const createTableQuery = `
  CREATE TABLE users (
    username VARCHAR2(100) NOT NULL,
    password VARCHAR2(100) NOT NULL
  )
`;

async function createUsersTableIfNotExists() {
  if (!(await tableExists('users'))) {
    await runQuery(createTableQuery);
  }
}
//createUsersTableIfNotExists();


app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Check if the username and password match a user in the database
      const query = 'SELECT * FROM users WHERE username = :username AND password = :password';
      const bindParams = { username, password };
      const result = await runQuery(query, bindParams);
      console.log(result);
  
      // If a matching user is found, the result will contain rows
      if (result.rows.length > 0) {
        // Successful login, redirect to the welcome page
        console.log('Login successful for user:', username);
        res.redirect('/welcome');
      } else {
        // Invalid credentials, redirect back to the login page with an error message
        console.log('Invalid credentials for user:', username);
        res.redirect('/login');
      }
    } catch (error) {
      console.error('Error executing query:', error);
      // Redirect to an error page or back to the login page with an error message
      res.redirect('/login');
    }
  });
  
  app.get('/welcome', (req, res) => {
    res.render('welcome');
  });
  
app.get('/welcome', (req, res) => {
    res.render('welcome');
  });


// Render the registration page
app.get('/register', (req, res) => {
  res.render('register');
});

// Handle registration form submission
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Check if the username already exists in the database
      const checkQuery = 'SELECT COUNT(*) AS count FROM users WHERE username = :username';
      const checkBindParams = { username };
      const checkResult = await runQuery(checkQuery, checkBindParams);
  
      if (checkResult.rows.length > 0) {
        // Username already exists, redirect back to the registration page with an error message
        console.log('Username already exists:', username);
        res.redirect('/register?error=exists');
        return;
      }
  
      // Insert the new user into the database
      const insertQuery = 'INSERT INTO users (username, password) VALUES (:username, :password)';
      const insertBindParams = { username, password };
      await runQuery(insertQuery, insertBindParams);
  
      // Log the registration result
      console.log('Registration successful!');
    } catch (error) {
      console.error('Error handling registration:', error);
      // Redirect to an error page or back to the registration page with an error message
      res.redirect('/register');
      return; // Return early to avoid res.redirect() in the error case.
    }
  
    // Redirect to a registration success page or login page after successful registration
    res.redirect('/login');
  });
  

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
