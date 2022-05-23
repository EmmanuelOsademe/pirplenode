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
const _logs = require('./logs');
const util = require('util');
const debug = util. debuglog('workers');

// Instantiate Worker Object
const workers = {};

// Look up all checks, gather their data and validate the data
workers.gatherAllChecks = () =>{
    // Get all the checks that exist in the system 
    _data.list('checks', (err, checksData) =>{
        if(!err && checksData && checksData.length > 0){
            checksData.forEach(check => {
                _data.read('checks', check, (err, originalCheckData) =>{
                    if(!err && originalCheckData){
                        // Pass original check data into validator, and continue or log error as the case may be
                        workers.validateCheckData(originalCheckData);
                    }else{
                        debug('Error: Could not read one of the check data');
                    }
                })
            });
        }else{
            debug('Error: Could not find any checks to process');
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
        debug('Error: one of the checks is not properly formatted');
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

// Process the check outcome and update the check data as needed, and trigger an alert to the user if needed
// Special logic for accommodating a check that has not been tested before (don't alert on that one)
workers.processCheckOutcome = (originalCheckData, checkOutcome) =>{
    // Decide if check in up or down
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.statusCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    // Decide if an alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // // Log the outcome of the check
    const timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    // Update the check data
    const newCheckData = originalCheckData
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    // Save the update
    _data.update('checks', newCheckData.id, newCheckData, (err) =>{
        if(!err){
            // Send the data to the next phase if needed
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData);
            }else{
                debug('Check outcome has not changed. No alert needed');
            }
        }else{
            debug('Error tring to update check data');
        }
    })
}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (newCheckData) =>{
    const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocal} :// ${newCheckData.url} is currently ${newCheckData.state}.`

    helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) =>{
        if(!err){
            debug(`Success! User was alerted to a status check in their check, via sms: ${msg}`);
        }else{
            debug(`Could not send out sms alert to user who has a state change in their check`);
        }
    })
}

// Logging Check outcomes to file
workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) =>{
    // Form the log data
    const logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    };

    // Convert Log data to string
    const logString = JSON.stringify(logData);

    // Determine the name of the logfile
    const logFileName = originalCheckData.id;

    // Append the log string to the file we want to write to
    _logs.append = (logFileName, logString, (err) =>{
        if(!err){
            debug('Logging to file succeeded');
        }else{
            debug('Logging to file failed');
        }
    })
}

// Timer to execute the worker-process once per minute
workers.loop = () =>{
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 60);
}

// Rotate (compress) log files
workers.rotatelog = () => {
    // List all the none compressed log files that are existing  in the .log folder
    _logs.list = (false, (err, logs) =>{
        if(!err && logs && logs.length >0){
            logs.forEach(logName =>{
                // Compress the data to a different file
                const logId = logName.replace('.log', '');
                const newfileId = logId+'-'+Date.now();
                _logs.compress = (logId, newfileId, (err) =>{
                    if(!err){
                        // Truncate the log
                        _logs.truncate(logId, (err)=>{
                            if(!err){
                                debug('Success truncating log file');
                            }else{
                                debug('Error truncating logs');
                            }
                        })
                    }else{
                        debug(`Error compressing one of the log files: ${err}`);
                    }
                })
            })
        }else{
            debug('Error: Could not find any logs to rotate');
        }
    })

}

// Timer to execute log rotation once per day 
workers.logLogRotateLoop = () =>{
    setInterval(() => {
        workers.originalCheckData();
    }, 1000 * 60 * 60 * 24);
}

// Init Script
workers.init = () =>{
    // Send to console in yellow
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

    // Execute all checks immediately
    workers.gatherAllChecks();

    // Call the loop so that the checks will execute later on
    workers.loop();

    // Compress all the logs immediately
    workers.rotatelog();

    // Call the compression loop so logs will be compressed lateron
    workers.logLogRotateLoop();

}

// Export Workers
module.exports = workers;