var fs = require('fs');
const FILENAME = 'temp2.txt';
var fileInfo = fs.statSync(FILENAME);
var fileSize = fileInfo.size;
var buffer;
var checkEOF = 0;



/*
// 비동기버전
fs.open(FILENAME, 'r', function(err, fd) {
    if (err) {
        console.log(err.message);
        return;
    }
    console.log(`size : ${fileSize}`);
    buffer = Buffer.alloc(fileSize);
    
    fs.read(fd, buffer, 0, 1, null, (err, num) => {
        read(fd, buffer, err,num);
    });
    
});

function read(fd, buffer, err, num) {
    if(err) {
        console.log(err.message);
        return;
    }
    checkEOF += num;

    if(checkEOF === fileSize) {
        // console.log(buffer.toString())
        return;
    }

    fs.read(fd, buffer, checkEOF, 1, null, (err, num,buffer) => {
        console.log(buffer[checkEOF])
        read(fd, buffer, err,num)
    })
}
*/


// 동기버전
var ff;
ff = fs.openSync(FILENAME,'r');
console.log(ff);
buffer = Buffer.alloc(fileSize)

while(checkEOF !== fileSize) {
    checkEOF += fs.readSync(ff, buffer, checkEOF, 1, null);
}

console.log(fileSize)
console.log(buffer);

var filesizeBuffer = Buffer.alloc(4);
filesizeBuffer.writeInt32BE(fileSize, 0);
console.log(filesizeBuffer)
var fout = fs.openSync('fout.txt', 'w');
var st = fs.writeSync(fout, filesizeBuffer, 0, filesizeBuffer.length, 0);
fs.writeSync(fout, buffer, 0, buffer.length, st);