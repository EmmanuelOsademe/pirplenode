/*
* Primary file for the API
*
*/

// Dependencies
const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Instantiating the http server
const httpServer = http.createServer((req, res) =>{
    unifiedServer(req, res);
})

// Start the http Server
httpServer.listen(config.httpPort, () => {
    console.log(`Server is listening on Port: ${config.httpPort} in the ${config.envName} node`);
})

// Instantiating the https server
const httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) =>{
    unifiedServer(req, res);
})

// Start the https server
httpsServer.listen(config.httpsPort, () => {
    console.log(`Server is listening on Port: ${config.httpsPort} in the ${config.envName} node`);
})


// All the server logic for both http and https
const unifiedServer = (req, res) =>{
    // Get the url and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the path
    const path = parsedUrl.pathname;
    
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');
        
    // Get the query string as an object
    
    const queryStringObject = JSON.stringify(parsedUrl.query);
    
    
    // Get the http method
    const method = req.method.toLowerCase();
    
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
            'payload': helpers.parseJsonToObject(buffer)
        }
    
        // Route the request to the handler specified in the router
        chosenHandler(data, (statusCode, payload) =>{
            // Use the status code called back by the handler or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
    
            // Use the payload called back by the handler or default to an empty object
            payload = typeof(payload) == 'object' ? payload : {};
    
            // Convert payload to a string
            const payloadString = JSON.stringify(payload);
                
            // Return the response
            res.setHeader('content-Type', 'application/json')
            res.writeHead(statusCode);
            res.end(payloadString);
                
            // Log the request path
            console.log(`We are returning this response: ${statusCode}, ${payloadString}`);
        })
    })
}

// Defining Request routers
const router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
};