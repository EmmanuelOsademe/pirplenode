/*
* These are the request handlers
*/

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');


// Define handlers
const handlers = {};

// Ping handler
handlers.ping = (data, callback) =>{
    // callback a http status code, and a payload object
    callback(200);
};

// User handler
handlers.users = (data, callback) =>{
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) !== -1){
        handlers._users[data.method](data, callback);
    }else{
        callback(405);
    }
};


// Container for users submethods
handlers._users = {};

// Users Post
// Required data: firstname, lastname, phoneNumber, password, tosAgreement
// Optional data: None
handlers._users.post = (data, callback) =>{
    // Check that all required fields are filled out
    const firstname = typeof(data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
    const lastname = typeof(data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement.trim() == true ? true : false; 

    if(firstname && lastname && phone && password && tosAgreement){
        // Check that user does not already exist in the file
        _data.read('users', phone, (err, data) =>{
            if(err){
                // Hash password
                const hashedPassword = helpers.hash(password);

                // Check that password is hashed
                if(hashedPassword){
                    // Create User object
                    const userObject ={
                        'firstname': firstname,
                        'lastname': lastname,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    }

                    _data.create('users', phone, userObject, (err) =>{
                        if(!err){
                            callback(200);
                        }else{
                            console.log(err);
                            callback(500, {'Error': 'Could not create new user'});
                        }
                })

                }else{
                    callback(500, {'Error': `Could not hash user's password`});
                }


            }else{
                // User already exists.
                callback(404, {'Error': 'A user with that phone number already exists'});
            }
        })
    }else{
        callback(404, {'Error': 'Missing required fields'});
    }
};

// Users Get
// Required data: phone
// Optional Data: None
handlers._users.get = (data, callback) =>{
    // Check that the phone number is valid
    const queryObject = helpers.parseJsonToObject(data.queryStringObject);
    const phone = typeof(queryObject.phone) == 'string' && queryObject.phone.trim().length == 10 ? queryObject.phone.trim() : false;
    if(phone){

        // Get token from from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token.trim() : false;
        
        //Verify that the given token is valid for the phone number
        handers._tokens.tokenIsValid(token, phone, (isValid) =>{
            if(isValid){
                _data.read('users', phone, (err, dataObject) =>{
                    if(!err && dataObject){
                        // Remove the hashed password from the userObject before returning info to the requester
                        delete data.hashedPassword;
                        callback(200, dataObject);
                    }else{
                        callback(404, {'Error': 'Requested data not available'});
                    }
                })
            }else{
                callback(403, {'Error': 'Missing required token in header or token is invalid'});
            }
        })
    }else{
        callback(400, {'Error': 'Missing required field'});
    }

};

// Users Put
// Required field: phone
// Optional data: firstname, lastname, password(at least one must be specified)
handlers._users.put = (data, callback) =>{
    // Check for the required field
    const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;

    // Check for the optional fields
    const firstname = typeof(data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
    const lastname = typeof(data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length === 10 ? data.payload.password.trim() : false;
    
    // Check that phone is valid
    if(phone){
        // Get token from headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false
        
        // Check that token is valid
        handlers._tokens.tokenIsValid(token, phone, (isValid) => {
            if(isValid){
                // Check that there are fields to update
                if(firstname || lastname || password){
                    // lookup user
                    _data.read('users', phone, (err, userData) => {
                        if(!err && userData){
                            // Update necessary fields
                            if(firstname){
                                userData.firstname = firstname;
                            }
                            if(lastname){
                                userData.lastname = lastname;
                            }
                            if(password){
                                userData.hashedPassword = helpers.hash(password);
                            }

                            // Store the updates
                            _data.update('users', phone, userData, (err) =>{
                                if(!err){
                                    callback(200);
                                }else{
                                    console.log(err);
                                    callback(500, {'Error': 'Could not update file'});
                                }
                            })
                        }else{
                            callback(400, {'Error': 'User does not exist'});
                        }
                    })
                }else{
                    callback(404, {'Error': 'Missing field(s) to update'});
                }
            }else{
                callback(403, {'Error': 'Missing required token in header or token is invalid'});
            }
        })
    }else{
        callback(404, {'Error': 'Missing required field'});
    }
};

// Users Delete
// Required field: phone
// @TODO Delete any other files associated with this user
handlers._users.delete = (data, callback) =>{
    //Check that phone number is valid
    const queryObject = helpers.parseJsonToObject(data.queryStringObject);
    const phone = typeof(queryObject.phone) == 'string' && queryObject.phone.trim().length == 10 ? queryObject.phone.trim() : false;
   
    if(phone){
        // Get token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        handlers._tokens.tokenIsValid(token, phone, (isValid) =>{
            if(isValid){
                // Check that the file exists
        _data.read('users', phone, (err, data) => {
            if(!err){
                if(data){
                    _data.delete('users', phone, (err)=>{
                        if(!err){
                            callback(200);
                        }else{
                            callback(500, {'Error': 'Could not delete the specified user'});
                        }
                    })
                }else{
                    callback(404, {'Error': 'File is empty'})
                }
            }else{
                callback(404, {'Error': 'Could not read file'});
            }
        })
            }else{
                callback(403, {'Error': 'Missing required token in header or token is invalid'});
            }
        })
    }else{
        callback(400, {'Error': 'Missing Required field'})
    }

};

// Tokens handler
handlers.tokens = (data, callback) =>{
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) !== -1){
        handlers._tokens[data.method](data, callback);
    }else{
        callback(405);
    }
};

// Container for token submethods
handlers._token = {};

// Tokens Post
// Required fields: phone, password
// Optional fields: none
handlers._tokens.post = (data, callback) => {
    // Get required fields from payload and check that they are valid
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    
    if(phone && password){
        // Check that user data exists
        _data.read('users', phone, (err, userData) => {
            if(!err && userData0){
                // Hash password from payload so as to compare with hashed password in DB
                const passwordHashed = helpers.hash(password);
                

                //Compare hashed password with the hashed password in the DB
                if(passwordHashed === userData.hashedPassword){
                    // Create new token with randome name. Set expiration date 1 hour in the future 
                    const tokenId = helpers.createRandomString(20);

                    const expires = Date.now() + 1000 * 60 * 60;

                    const token = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };
                    
                    // store token
                    _data.create('tokens', tokenId, token, (err) =>{
                        if(!err){
                            callback(200, token);
                        }else{
                            callback(500, {'Error': 'Could not create the new token'});
                        }
                    })
                }else{
                    callback(400, {'Error': 'Invalid password'});
                }
            }else{
                callback(400, {'Error': 'User not found'});
            }
        })
    }else{
        callback(404, {'Error': 'Missing required fields'});
    }
};

// Tokens Get
// Required field: id
// Optional field: none
handlers._tokens.get = (data, callback) => {
    
    // Accept id from query string and check  its validity
    const queryObject = helpers.parseJsonToObject(data.queryStringObject);
    const tokenId = typeof(data.queryObject.tokenId) == 'str' && data.queryObject.tokenId.trim().length === 20 ? data.queryObject.tokenId.trim() : false;

    if(tokenId){
        // Fetch user data
        _data.read('tokens', tokenId, (err, tokenData) =>{
            if(!err && tokenData){
                callback(200, tokenData);
            }else{
                callback(404, {'Error': 'Could not read user token'});
            }
        })
    }
    else{
        callback(404, {'Error': 'Invalid token ID'});
    }

};

// Tokens Put
// Required fields: tokenId and extend
// Optional: none
handlers._tokens.put = (data, callback) => {
    // Validate the token Id
    const tokenId = typeof(data.payload.tokenId) == 'string' && data.payload.tokenId.trim() === 20 ? data.payload.tokenId.trim() : false;
    const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend.trim() == true ? data.payload.extend : false;

    if(tokenId && extend){
        // Check that token data exists
        _data.read('tokens', tokenId, (err, tokenData) => {
            if(!err && extend){
                // Check that token data has not expired
                if(tokenData.expires > Date.now()){
                    // Update token expiration
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    // Save the new data into the user's tokens file
                    _data.update('tokens', tokenId, tokenData, (err) =>{
                        if(!err){
                            callback(200);
                        }else{
                            callback(500, {'Error': 'Could not update the expiration time'});
                        }
                    })
                }else{
                    callback(404, {'Error': 'Token has already expired and cannot be extended'});
                }

            }else{
                callback(404, {'Error': 'Token data does not exist'});
            }
        })
    }else{
        callback(404, {'Error': `Missing required field(s) or field(s) are invalid`});
    }
};

// Tokens Delete
// Required field: tokenId
// Optional field: none
handlers._tokens.delete = (data, callback) => {
    // Get the tokenid from the querystring and  confirm its validity
    const queryObject = helpers.parseJsonToObject(data.queryStringObject);
    const tokenId = typeof(queryObject.tokenId) == 'string' && queryObject.tokenId.trim().length === 20 ? queryObject.tokenId : false;

    if(tokenId){
        // Check that token data exists
        _data.read('tokens', tokenId, (err, tokenData) =>{
            if(!err && tokenData){
                _data.delete('tokens', tokenId, (err) =>{
                    if(!err){
                        callback(200);
                    }else{
                        callback(500, {'Error': 'Could not delete data'});
                    }
                })
            }else{
                callback(404, {'Error': 'Specified token data does not exist'});
            }
        })
    }else{
        callback(404, {'Error': 'Invalid token'});
    }
};

// Verify if a given token Id is currently valid for a given user
handlers._tokens.verifyToken = (tokenId, phone, callback) =>{
    // Look up token
    const queryObject = helpers.parseJsonToObject(data.queryStringObject);
    const tokenId = typeof(queryObject.tokenId) == 'string' && queryObject.tokenId.trim().length === 20 ? queryObject.tokenId : false;

    if(tokenId){
        _data.read('tokens', tokenId, (err, tokenData) =>{
            if(!err && tokenData){

                //Compare phone to token phone and ensure that token has not expired
                if(tokenData.phone === phone && tokenData.expires > Date.now()){
                   callback(true);
                }else{
                    callback(false);
                }
            }else{
                callback(404, {'Error': 'Token Data does not exist'});
            }
        })
    }else{
        callback(404, {'Error': 'Invalid token Id'});
    }
};

// Defining a not found handler
handlers.notFound = (data, callback) =>{
    // callback a http status code
    callback(404);
};


// Export Module
module.exports = handlers;