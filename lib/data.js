/*
* Library for Storing and Editing data
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module (to be exported)
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');


// Write data to a file
lib.create = (dir, file, data, callback) => {
    // Open the file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', (err, fileDescriptor) => {
        if(!err && fileDescriptor){
            // Convert data to string
            const stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, (err) =>{
                if(!err){
                    fs.close(fileDescriptor, (err) =>{
                        if(!err){
                            callback(false);
                        }else{
                            callback('Error closing new file');
                        }
                    })
                }else{
                    callback('Error writing to new file');
                }
            })

        }else{
            callback('Could not create new file. It may already exist');
        }
    });
};

// Read Data from a file 
lib.read = (dir, file, callback) =>{
    fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf8', (err, data)=>{
        if(!err && data){
            const dataObject = helpers.parseJsonToObject(data);
            callback(false, dataObject);
        }else{
            callback(err, data);
        }
    })
};

// Updating an existing file 
lib.update = (dir, file, data, callback) =>{
    // Open the file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', (err, fd) =>{
        if(!err && fd){
            // Convert data to string
            const dataString = JSON.stringify(data);

            // Truncate file
            fs.ftruncate(fd, (err)=>{
                if(!err){
                    // Write to the file and close it
                    fs.writeFile(fd, dataString, (err)=>{
                        if(!err){
                            fs.close(fd, (err) =>{
                                if(!err){
                                    callback(false);
                                }else{
                                    callback('Error closing file');
                                }
                            })
                        }else{
                            callback('Error writing into the file');
                        }
                    } )
                }else{
                    callback('Error truncating file');
                }
            })

        }else{
            callback('Could not open the file for updating. It may not exist here.');
        }
    })
};

// Function for deleting a file
lib.delete = (dir, file, callback) =>{
    // Unlink the file
    fs.unlink(lib.baseDir+dir+'/'+file+'.json', (err)=>{
        if(!err){
            callback(false);
        }else{
            callback('Error deleting file. File probably does not exist');
        }
    })
}

// List all the items in a directory
// Required: Directory
// Optional: None
lib.list = (dir, callback) =>{
    fs.readdir(__dirname + dir + '/', (err, data)=>{
        if(!err && data && data.length > 0){
            const trimmedFileNames = [];
            data.forEach((files)=>{
                trimmedFileNames.push(files.replace('.json', ''));
            })
            callback(false, trimmedFileNames);
        }else{
            callback(err, data);
        }
    })
}

// Export the module
module.exports = lib;