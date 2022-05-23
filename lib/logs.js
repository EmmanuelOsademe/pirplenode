/*
*This is a library for storing and rotating logs
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');


// Container for the module
const lib = {};

// Base directory of the logs folder
lib.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a file. Create the file if it does not exist
lib.append = (file, str, callback) =>{
    // Open the file for appending
    fs.open(lib.baseDir+file+'.log', 'a', (err, fileDescriptor) =>{
        if(!err && fileDescriptor){
            // Append to the file and close it
            fs.appendFile(fileDescriptor, str+'\n', (err)=>{
                if(!err){
                    // Close the file
                    fs.close(fileDescriptor, (err)=>{
                        if(!err){
                            callback(false)
                        }else{
                            callback('Error closing file that was being appended to');
                        }
                    })
                }else{
                    callback('Error appending the file');
                }
            })
        }else{
            callback('Could not open file for appending');
        }
    })
};

// List all the logs and optionally include compressed logs
lib.list = (includeCompressedLogs, callback) =>{
    fs.readdir(lib.baseDir, (err, data) =>{
        if(!err && data){
            const trimmedFileName = [];
            data.forEach((filename) =>{
                // Add the .log files
                if(filename.indexOf('.log') > -1){
                    trimmedFileName.push(filename.replace('.log', ''));
                }

                // Add the .gz files to the array
                if(includeCompressedLogs){
                    if(filename.indexOf('.gzb64')){
                        trimmedFileName.push(filename.replace('.gzb64', ''));
                    }
                }
            })
            callback(false, trimmedFileName);
        }else{
            callback(err, data);
        }
    })
}

// Compress the content of one .log file to .gz.b64 file within the same directory
lib.compress = (logId, newFileId, callback) =>{
    const sourceFile = logId+'.logId';
    const destinationFile = newFileId+'.gz.b64';

    // Read the source file
    fs.readFile(lib.baseDir+sourceFile, (utf8), (err, inputString) =>{
        if(!err && inputString){
            // Compress the data using zlib
            zlib.gz(inputString, (err, buffer) =>{
                if(!err && buffer){
                    //Open the destination file
                    fs.open(lib.baseDir+destinationFile, 'wx', (err, fileDescriptor) =>{
                        if(!err && fileDescriptor){
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), (err)=>{
                                if(!err){
                                    //Close the destination file
                                    fs.close(fileDescriptor, (err) =>{
                                        if(!err){
                                            callback(false);
                                        }else{
                                            callback(err);
                                        }
                                    })
                                }else{
                                    callback(err);
                                }
                            })
                        }else{
                            callback(err);
                        }
                    })
                }else{
                    callback(err);
                }
            })
        }else{
            callback(err);
        }
    })
}


// Decompress the content of a .gz.b64 file into a string variable
lib.decompress = (fileId, callback) =>{
    const fileName = fileId+'gz.b64';
    fs.readFile(lib.baseDir+fileName, 'utf8', (err, str) =>{
        if(!err && str){
            // Decompress the data
            const inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, (err, outputBuffer) =>{
                if(!err && outputBuffer){
                    const str = outputBuffer.toString();
                    callback(false);
                }else{
                    callback(err);
                }
            })
        }else{
            callback(err);
        }
    })
}

// Truncating a log file
lib.truncate = (logId, callback) =>{
    fs.truncate(lib.baseDir+logId+'.log', (err) =>{
        if(!err){
            callback(false);
        }else{
            callback(err);
        }
    })
} 

// Export modules
module.exports = lib;