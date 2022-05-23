/*
* Helpers for various tasks
*/

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

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
        let str = '';
        for(i=0; i < strLength; i++){
          // Get random character from possibleStrings
          const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
          
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

// Get the string content of a template
helpers.getTemplate = (templateName, dataObj, callback) =>{
    // Validate the template name
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    dataObj = typeof(dataObj) == 'object' && dataObj !== null ? dataObj : {};

    if(templateName){
        const templatesDir = path.join(__dirname, '/../templates/');
        fs.readFile(templatesDir+templateName+'.html', 'utf8', (err, templateData) =>{
            if(!err && templateData && templateData.length > 0){
                // Do an interpolation on the template data
                const finalTemplate = helpers.interpolate(templateData, dataObj)
                callback(false, finalTemplate);
            }else{
                callback('No template data could be found');
            }
        })
    }else{
        callback('A valid template name is not specified');
    }
}

// Add the universal header and footer to a string and pass the provided dataobject to the header and footer for interpolation
helpers.addUniversalTemplates = (str, data, callback) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    dataObj = typeof(dataObj) == 'object' && dataObj !== null ? dataObj : {};

    // Get the header
    helpers.getTemplate('_header', data, (err, headerString) => {
        if(!err && headerString){
            // Get the footer
            helpers.getTemplate('_footer', data, (err, footerString) =>{
                if(!err && footerString){
                    const fullstring = headerString + str + footerString;
                    callback(false, fullstring);
                }else{
                    callback('Could not get footer string');
                }
            })
        }else{
            callback('Could not find the header template');
        }
    })
}


/*
// Get the string content of a template
helpers.getTemplate = (templateName, callback) =>{
    // Validate the template name
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;

    if(templateName){
        const templatesDir = path.join(__dirname, '/../templates/');
        fs.readFile(templatesDir+templateName+'.html', 'utf8', (err, templateData) =>{
            if(!err && templateData && templateData.length > 0){
                callback(false, templateData);
            }else{
                callback('No template data could be found');
            }
        })
    }else{
        callback('A valid template name is not specified');
    }
}*/

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = (str, dataObj) =>{
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    dataObj = typeof(dataObj) == 'object' && dataObj !== null ? dataObj : {};


    // Add the templateGlobals to the data object, prepending their key name with "global"
    for (let keyName in config.templateGlobals) {
        if(config.templateGlobals.hasOwnProperty(keyName)){
            dataObj['global.'+keyName] = config.templateGlobals[keyName];
        }
    }

    // For each key in the data object, insert its value into the string at the corresponding placeholder
    for (let key in dataObj){
        if(dataObj.hasOwnProperty(key) && typeof(dataObj[key]) == 'string'){
            let replace = dataObj[key];
            let find = '{'+key+'}';
            str = str.replace(find, replace);
        }
    }

    return str;
}

// Get the content of a static (public) asset
helpers.getStaticAsset = (assetName, callback) =>{
    assetName = typeof(assetName) == 'string' && assetName.length > 0 ? assetName : false;
    
    if(assetName){
        const publicDir = path.join(__dirname, '/../public/');
        fs.readFile(publicDir+assetName, (err, data) =>{
            if(!err && data){
                callback(false, data);
            }else{
                callback('No file could be found');
            }
        })
    }else{
        callback('A valid asset name was not defined');
    }
}

// Export Helpers
module.exports = helpers;