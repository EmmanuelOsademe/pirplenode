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
    const header = req.headers;

    // Get the payloads, if any
    const decoder = new stringDecoder('utf8');
    const buffer = '';
    req.on(data, (data) =>{
        buffer += decoder.write(data);
    });

    req.on(end, ()=> {
        buffer += decoder.end();
        // Send the response
        res.end(`Hello ${trimmedPath}, your http method is: ${method}\n`);
        // Log the request path
        console.log(`The was received with this payload: ${buffer}`);
    })
})

// Start the server and have it listen on a specified port
server.listen(5000, () => {
    console.log('Server is listening on Port: 5000');
})