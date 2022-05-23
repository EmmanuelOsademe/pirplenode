/*
* Server related tasks
*
*/

// Dependencies
const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;
const path = require('path');
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');
const util = require('util');
const debug = util.debuglog('server');


// Instantiate a server module object
const server = {};

// Instantiating the http server
server.httpServer = http.createServer((req, res) =>{
    server.unifiedServer(req, res);
})


// Instantiating the https server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) =>{
    server.unifiedServer(req, res);
})


// All the server logic for both http and https
server.unifiedServer = (req, res) =>{
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
    const decoder = new stringDecoder('utf-8');
    let buffer = '';
    req.on('data', (data) =>{
        buffer += decoder.write(data);
    });
    
    req.on('end', ()=> {
        buffer += decoder.end();
    
        // Choose the handler this request should go to. If one is not found, use the notFound handler.
        let chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        // If the request is within the public directory, use the public handler instead
        chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;
        
        //Construct the data object to send to the handlers
        const data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        }
    
        // Route the request to the handler specified in the router
        chosenHandler(data, (statusCode, payload, contentType) =>{
            // Determinethe type of response (fallback to JSON)
            contentType = typeof(contentType) == 'string' ? contentType : 'json';

            // Use the status code called back by the handler or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Return the response parts that are content specific
            let payloadString = '';
            if(contentType == 'json'){
                res.setHeader('content-Type', 'application/json')
                payload = typeof(payload) == 'object' ? payload : {};
                //Convert the payload to a string
                payloadString = JSON.stringify(payload);
            }
            if(contentType == 'html'){
                res.setHeader('content-Type', 'text/html')
                payloadString = typeof(payload) == 'string' ? payload : '';
            }

            if(contentType == 'favicon'){
                res.setHeader('content-Type', 'image/x.icon')
                payloadString = typeof(payload) !== undefined ? payload : '';
            }

            if(contentType == 'css'){
                res.setHeader('content-Type', 'text/css')
                payloadString = typeof(payload) !== undefined ? payload : '';
            }

            if(contentType == 'png'){
                res.setHeader('content-Type', 'image/png')
                payloadString = typeof(payload) !== undefined ? payload : '';
            }

            if(contentType == 'jpeg'){
                res.setHeader('content-Type', 'image/jpeg')
                payloadString = typeof(payload) !== undefined ? payload : '';
            }

            if(contentType == 'js'){
                res.setHeader('Content-Type', 'application/javascript')
                payloadString = typeof(payload) !== undefined ? payload : '';
            }

            if(contentType == 'plain'){
                res.setHeader('content-Type', 'application/javascript')
                payloadString = typeof(payload) == 'string' ? payload : '';
            }


            // Return the response-type that are common to all content type
            res.writeHead(statusCode);
            res.end(payloadString);
                
            // If the response is 200, print green. Else, print red
            if(statusCode === 200){
                debug('x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
            }else{
                debug('x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
            }
        })
    })
}

// Defining Request routers
server.router = {
    '': handlers.index,
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/deleted': handlers.accoutDeleted,
    'session/create': handlers.sessionCreate,
    'session/delete': handlers.sessionDeleted,
    'checks/all': handlers.checkList,
    'checks/create': handlers.checksCreate,
    'checks/edit': handlers.checksEdit,
    'ping': handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks,
    'favicon.ico': handlers.favicon,
    'public': handlers.public
};

server.init = () =>{
    // Start the http Server
    server.httpServer.listen(config.httpPort, () => {
        //console.log(`Server is listening on Port: ${config.httpPort} in the ${config.envName} node`);
        console.log('\x1b[36m%s\x1b[0m', 'Server is listening on Port: ${config.httpPort} in the ${config.envName} node')
    })

    // Start the https server
    server.httpsServer.listen(config.httpsPort, () => {
        //console.log(`Server is listening on Port: ${config.httpsPort} in the ${config.envName} node`);
        console.log('\x1b[38m%s\x1b[0m', 'Server is listening on Port: ${config.httpsPort} in the ${config.envName} node')
    })
}

// Export Server
module.exports = server;