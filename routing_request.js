/*
* Primary file for the API
*
*/

// Dependencies
const http = require('http');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;

// The server should respond to all requests with a string
const server = http.createServer((req, res) =>{
    // Get the url and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the path
    const path = parsedUrl.pathname;

    const trimmedPath = path.replace(/^\/+|\/+$/g, '');
    
    // Get the query string as an object
    const queryStringObject = JSON.stringify(parsedUrl.query);

    // Get the http method
    const method = req.method.toLocaleLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payloads, if any
    const decoder = new stringDecoder('utf8');
    let buffer = '';
    req.on('data', (data) =>{
        buffer += decoder.write(data);
    });

    req.on('end', ()=> {
        buffer += decoder.end();

        // Choose the handler this request should go to. If one is not found, use the notFound handler.
        const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;
        
        //Construct the data object to send to the handlers
        const data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': buffer
        }

        // Route the request to the handler specified in the router
        chosenHandler(data, (statusCode, payload) =>{
            // Use the status code called back by the handler or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            console.log(statusCode);

            // Use the payload called back by the handler or default to an empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // Convert payload to a string
            const payloadString = JSON.stringify(payload);
            console.log(payloadString);
            
            // Return the response
            res.writeHead(statusCode);
            res.end(payloadString);
            
            // Log the request path
            console.log(`We are returning this response: ${statusCode}, ${payloadString}`);
        })
    })
})

// Start the server and have it listen on a specified port
server.listen(5000, () => {
    console.log('Server is listening on Port: 5000');
})

// Defining handlers
const handlers = {};

// Ping Handler
handlers.ping = (data, callback) =>{
    // callback a http status code, and a payload object
    callback(200);
};

// Defining a not found handler
handlers.notFound = (data, callback) =>{
    // callback a http status code
    callback(404);
};


// Defining Request routers
const router = {
    'ping': handlers.ping
};