/* 
* Create and export configuration variables
*/

// Container for all the environments
const environments = {};

// Staging (Default) Environment
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'Staging',
    'hashingSecret': 'thisisasecret', 
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken': '9455e3eb3109edc12e3d8c927687967',
        'fromPhone': '+2347035039302'
    },
    'templateGlobals': {
        'appName': 'UptimeChecker',
        'companyName': 'EmmaBest',
        'yearCreated': '2022',
        'baseUrl': 'http://localhost:3000/'
    }
};

// Production Environment
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'Production',
    'hashingSecret': 'thisisasecret', 
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken': '9455e3eb3109edc12e3d8c927687967',
        'fromPhone': '+15005550006'
    },
    'templateGlobals': {
        'appName': 'UptimeChecker',
        'companyName': 'EmmaBest',
        'yearCreated': '2022',
        'baseUrl': 'http://localhost:3000/'
    }
};

// Determine which environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLocaleLowerCase : '';

// Check if current environment is one of the environments above. Else, default to staging.
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the environment
module.exports = environmentToExport;