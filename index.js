/*
* Primary file for the API
*
*/

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare App 
const app = {};

// Initialise app
app.init = () =>{
    // Start the server
    server.init();
    

    // Start the Workers
    workers.init();
}

// Call the app init method to start up the app
app.init();

// Export
module.exports = app;