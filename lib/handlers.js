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
        _data.read(users, phone, (err, data) =>{
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
//@TODO Only let an authenticated user object their own object and none else.
handlers._users.get = (data, callback) =>{
    // Check that the phone number is valid
    const queryObject = helpers.parseJsonToObject(data.queryStringObject);
    const phone = typeof(queryObject.phone) == 'string' && queryObject.phone.trim().length == 10 ? queryObject.phone.trim() : false;
    if(phone){
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
        callback(400, {'Error': 'Missing required field'});
    }

};

// Users Put
// Required field: phone
// Optional data: firstname, lastname, password(at least one must be specified)
// @TODO: Only let authenticated User update their own information
handlers._users.put = (data, callback) =>{
    // Check for the required field
    const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;

    // Check for the optional fields
    const firstname = typeof(data.payload.firstname) == 'string' && data.payload.firstname.trim().length > 0 ? data.payload.firstname.trim() : false;
    const lastname = typeof(data.payload.lastname) == 'string' && data.payload.lastname.trim().length > 0 ? data.payload.lastname.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length === 10 ? data.payload.password.trim() : false;
    
    // Check that phone is valid
    if(phone){
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
        callback(404, {'Error': 'Missing required field'});
    }
};

// Users Delete
// Required field: phone
// @TODO only let an authenticated user delete his/her data and not any other data
// @TODO Delete any other files associated with this user
handlers._users.delete = (data, callback) =>{
    //Check that phone number is valid
    const queryObject = helpers.parseJsonToObject(data.queryStringObject);
    const phone = typeof(queryObject.phone) == 'string' && queryObject.phone.trim().length == 10 ? queryObject.phone.trim() : false;
   
    if(phone){
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
        callback(400, {'Error': 'Missing Required field'})
    }

};

// Defining a not found handler
handlers.notFound = (data, callback) =>{
    // callback a http status code
    callback(404);
};

// Export Module
module.exports = handlers;