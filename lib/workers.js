/* 
* Worker-related tasks
*/

// Dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');
const { callbackify } = require('util');
const { Console } = require('console');

// Instantiate Worker Object
const workers = {};

// Look up all checks, gather their data and validate the data
workers.gatherAllChecks = () =>{
    // Get all the checks that exist in the system 
    _data.list('checks', (err, checksData) =>{
        if(!err && checksData && checksData.length > 0){
            checks.array.forEach(check => {
                _data.read('checks', check, (err, originalCheckData) =>{
                    if(!err && originalCheckData){
                        // Pass original check data into validator, and continue or log error as the case may be
                        workers.validateCheckData(originalCheckData);
                    }else{
                        console.log('Error: Could not read one of the check data');
                    }
                })
            });
        }else{
            console.log('Error: Could not find any checks to process');
        }
    })
}

// Sanity-check the check data
workers.validateCheckData = (originalCheckData) =>{
    originalCheckData = typeof(originalCheckData) == 'object' && !null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.length == 20 ? originalCheckData.id : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.length == 10 ? originalCheckData.userPhone : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) !== 0 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(originalCheckData.method) !== -1 ? originalCheckData.method : false;
    originalCheckData.statusCodes = typeof(originalCheckData.statusCodes) == 'object' && originalCheckData.statusCodes instanceof Array && originalCheckData.statusCodes.length > 0 ? originalCheckData.statusCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set keys that may not be set if workers have never seen this checks before
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) !== -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // If all checks passed, pass the data to the next step in the process. Else, log the error.
    if(originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.statusCodes &&
        originalCheckData.timeoutSeconds){
            workers.performCheck(originalCheckData);
    }else{
        Console.log('Error: one of the checks is not properly formatted');
    }
}


// Perform the check. Send the original check data and the outcome of the check process to the next step in the process
workers.performCheck = (originalCheckData) =>{
    // Prepare the initial check outcome
    const checkOutcome = {
        'error': false,
        'responseCode': false
    }

    // Mark the outcome has not been sent
    const outcomeSent = false;

    // Parse the host name and the path out of the original check data
    const parsedUrl = url.parse(originalCheckData.protocal +'://'+originalCheckData.url, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path; // We are using "path" and not "pathname" because we want the query string

    // Construct the request
    const requestDetails = {
        'protocol': originalCheckData.protocal + ':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    }

    // Instantiate the request object using either the http or the https module
    const _moduleToUse = originalCheckData.protocal == 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, (res) =>{
        const status = res.statusCode;

        //Update the check outcome and pass the data along
        checkOutcome.responseCode = status;

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent =true;
        }
    })

    // Bind to the error event so it does not get thrown
    req.on('error', (err)=>{
        // Update the check outcome and pass the data along 
        checkOutcome.error = {
            'Error': true,
            'Value': err
        };

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent =true;
        }
    })

    // Bind to the timeout so it does not get thrown
    req.on('timeout', (err)=>{
        // Update the check outcome and pass the data along 
        checkOutcome.error = {
            'Error': true,
            'Value': 'timeout'
        };

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent =true;
        }
    })

    req.end();
}

// Process the check outcome and update the check data s needed, and trigger an alert to the user if needed
// Special logic for accommodating a check that has not been tested before (don't alert on that one)
workers.processCheckOutcome = (originalCheckData, checkOutcome) =>{
    // Decide if check in up or down
    const state = !checkOutcome.error && checkOutcome.statusCode && originalCheckData.responseCode.indexOf(checkOutcome.statusCode) > -1 ? 'up' : 'down';

    // Decide if an alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Update the check data
    const newCheckData = originalCheckData
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    // SAve the update
    _data.update('checks', newCheckData.id, newCheckData, (err) =>{
        if(!err){
            // Send the data to the next phase if needed
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData);
            }else{
                console.log('Check outcome has not changed. No alert needed');
            }
        }else{
            console.log('Error tring to update check data');
        }
    })
}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (newCheckData) =>{
    const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocal} :// ${newCheckData.url} is currently ${newCheckData.state}.`

    helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) =>{
        if(!err){
            console.log(`Success! User was alerted to a status check in their check, via sms: ${msg}`);
        }else{
            console.log(`Could not send out sms alert to user who has a state change in their check`);
        }
    })
}
// Timer to execute the worker-process once per minute
workers.loop = () =>{
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 60);
}

// Init Script
workers.init = () =>{
    // Execute all checks immediately
    workers.gatherAllChecks();

    // Call the loop so that the checks will execute later on
    workers.loop();
}

// Export Workers
module.exports = workers;