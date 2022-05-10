/*
* Helpers for various tasks
*/

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');

// Container for all the helpers
const helpers = {};

// Create a SHA256 hash helper function
helpers.hash = (str) =>{
    if(typeof(str) == 'string' && str.length > 0){
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    }else{
        return false;
    }
}

// Parse a JSON string to an object without throwing an error
helpers.parseJsonToObject = (str) =>{
    try{
        const obj = JSON.parse(str);
        return obj;
    }catch(err){
        return {};
   }
}

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = (strLength) =>{
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;

    if(strLength){
        // Define all the possible characters that could go into a string
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        // Start the string
        const str = '';
        for(i=0; i < strLength; i++){
          // Get random character from possibleStrings
          const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters));
          
          // Append this character to str
          str += randomCharacter;
        }
        // Return string
        return str;
    }else{
        return false;
    }
}

// Send sms via twilio
// Required data: Phone and Message
// Optional data: none
helpers.sendTwilioSms = (phone, mes, callback) =>{
    // Validate parameters
    const phoneN = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    const message = typeof(mes) == 'string' && mes.trim().length > 0 && mes.trim().length < 1600 ? mes.trim() : false;

    if(phoneN && message){
        // Configure the request payload that will be sent to twilio
        const payload = {
            'From': config.twilio.fromPhone,
            'To': '+234' + phoneN,
            'Body': message
        };

        //stringify payload
        const payloadString = querystring.stringify(payload);

        // Configure the request details
        const requestDetails = {
            'protocol': 'https:',
            'host': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth': config.twilio.accountSid+':'+config.twilio.accountSid.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length':Buffer.byteLength(payloadString)
            }
        };

        // Instantiate the request object
        const req = https.request(requestDetails, (res)=>{
            // Grab the status of the sent request
            const status = res.statusCode;

            // Callback Successfully if request went through
            if(status == 200 || status == 201){
                callback(false);
            }else{
                callback(`Status code returned was ${status}`);
            }
        });

        // Bind to the error event so that it does not get thrown
        req.on('error', (e) =>{
            callback(e);
        })

        // Add the payload
        req.write(payloadString);

        // End request
        req.end();

    }else{
        callback(404, {'Error': 'Required parameters (phone number and message) were missing or invalid'});
    }

};


// Export Helpers
module.exports = helpers;