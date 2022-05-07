/* 
* Create and export configuration variables
*/

// Container for all the environments
const environments = {};

// Staging (Default) Environment
environments.staging = {
    'port': 3000,
    'envName': 'Staging',
    'hashingSecret': 'thisisasecret', 
    'maxChecks': 5
};

// Production Environment
environments.production = {
    'port': 5000,
    'envName': 'Production',
    'hashingSecret': 'thisisasecret', 
    'maxChecks': 5
};

// Determine which environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLocaleLowerCase : '';

// Check if current environment is one of the environments above. Else, default to staging.
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the environment
module.exports = environmentToExport;