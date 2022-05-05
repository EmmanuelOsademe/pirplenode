/*
* Helpers for various tasks
*/

// Dependencies
const crypto = require('crypto');
const { callbackify } = require('util');
const config = require('./config');

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
        for(i=0; i <= strLength; i++){
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



// Export Helpers
module.exports = helpers;