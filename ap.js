const fs = require('fs');
const Events = require('./Events');
const Utilities = require('./utilities');
const Run = require('./Run');
let fileSize;
let buffer;
let numOfByte = 0;
let prevByte;
let checkEOF = 0;
let fd;
let bufferPacked = undefined;
let bufferData = '';
// let subBufferData;
let subBufferData;

let sizeOfData = 0;


function openAndRead(fileName, isCollect) {
    numOfByte = 0;
    fileSize = fs.statSync(fileName).size;
    fd = fs.openSync(fileName, 'r');
    buffer = Buffer.alloc(fileSize);

    checkEOF += fs.readSync(fd, buffer, checkEOF, 1, null);
    numOfByte++;
    prevByte = buffer[0];
    
    while(checkEOF !== fileSize) {
        checkEOF += fs.readSync(fd, buffer, checkEOF, 1, null);
        numOfByte++;

        if(isCollect(prevByte, buffer[checkEOF-1], numOfByte-1, checkEOF === fileSize))
            numOfByte = 1;
        prevByte = buffer[checkEOF-1];
    }
    checkEOF = 0;

    Events.trigger('completedReadFile');
}

function writeHeader(fin, runs, ref) {
    const fd = fs.openSync(fin.substr(0, fin.indexOf('.'))+'.z', 'w');
    let headerSize = fin.length + 16;

    fs.writeSync(fd, bufferGenerator(fin.length), 0, 4); // write originalFilenameLength
    fs.writeSync(fd, Buffer(fin)); // write originalFileName
    fs.writeSync(fd, bufferGenerator(runs.length), 0, 4); // write numofruns
    fs.writeSync(fd, bufferGenerator(fileSize), 0, 4); // write filesize
    fs.writeSync(fd, bufferGenerator(ref.length * 6), 0, 4); // write reference length
    for(let i=0; i<ref.length; i++) {
        fs.writeSync(fd, bufferGenerator(ref[i].A.symbol, true), 0, 1); // write symbol 
        fs.writeSync(fd, bufferGenerator(ref[i].A.runLen), 0, 4);// write symbol length
        fs.writeSync(fd, bufferGenerator(ref[i].A.freq), 0, 4);// write freq

        fs.writeSync(fd, bufferGenerator(ref[i].B.symbol, true), 0, 1); // write symbol 
        fs.writeSync(fd, bufferGenerator(ref[i].B.runLen), 0, 4);// write symbol length
        fs.writeSync(fd, bufferGenerator(ref[i].B.freq), 0, 4);// write freq
        headerSize += 18;
    }
    
    for(let i=0; i<runs.length; i++) {
        fs.writeSync(fd, bufferGenerator(runs[i].symbol, true), 0, 1);
        fs.writeSync(fd, bufferGenerator(runs[i].runLen), 0, 4);
        fs.writeSync(fd, bufferGenerator(runs[i].freq), 0, 4);
        headerSize+=9;
    }
    // header 크기 : 런갯수(4) + 파일사이즈(4) + 심볼(1*n) + 런길이(4*n) + 빈도수(4*n

    console.log(`header size : ${headerSize} `);
    fs.closeSync(fd);
}



function readHeader(fd, runs) {
    const numOfRunsBuffer = Buffer.alloc(4);
    const sizeOriginalFile = Buffer.alloc(4);
    const fileNameBuffer = Buffer.alloc(100);
    const fileNameLength = Buffer.alloc(4);
    const numOfRef = Buffer.alloc(4);
    let run, tempBuffer, refBuffer, refs = [], refA = {},refB = {};

    fs.readSync(fd, fileNameLength, 0, 4, null);
    fs.readSync(fd, fileNameBuffer, 0, fileNameLength.readUInt32BE(0), null);
    fs.readSync(fd, numOfRunsBuffer, 0, 4, null);
    fs.readSync(fd, sizeOriginalFile, 0, 4, null);
    fs.readSync(fd, numOfRef, 0, 4, null);
    for(let i=0; i<numOfRef.readUInt32BE(0)/6; i++) {
        refBuffer = Buffer.alloc(1);
        fs.readSync(fd, refBuffer, 0, 1, null);  // symbol
        refA.symbol = refBuffer.readUInt8(0);
        refBuffer = Buffer.alloc(4);
        fs.readSync(fd, refBuffer, 0, 4, null);  // symbol length
        refA.runLen = refBuffer.readUInt32BE(0);
        refBuffer = Buffer.alloc(4);
        fs.readSync(fd, refBuffer, 0, 4, null);  // freq
        refA.freq = refBuffer.readUInt32BE(0);

        refBuffer = Buffer.alloc(1);
        fs.readSync(fd, refBuffer, 0, 1, null);  // symbol
        refB.symbol = refBuffer.readUInt8(0);
        refBuffer = Buffer.alloc(4);
        fs.readSync(fd, refBuffer, 0, 4, null);  // symbol length
        refB.runLen = refBuffer.readUInt32BE(0);
        refBuffer = Buffer.alloc(4);
        fs.readSync(fd, refBuffer, 0, 4, null);  // freq
        refB.freq = refBuffer.readUInt32BE(0);

        refs.push({
            A: refA,
            B: refB
        })
    }

    for(let i=0; i<numOfRunsBuffer.readUInt32BE(0); i++) {
        run = new Run();
        tempBuffer = Buffer.alloc(1);
        fs.readSync(fd, tempBuffer, 0, 1, null);
        run.symbol = tempBuffer.readUInt8(0);

        tempBuffer = Buffer.alloc(4);
        fs.readSync(fd, tempBuffer, 0, 4, null);
        run.runLen = tempBuffer.readUInt32BE(0);

        tempBuffer = Buffer.alloc(4);
        fs.readSync(fd, tempBuffer, 0, 4, null);
        run.freq = tempBuffer.readUInt32BE(0);

        runs.push(run);
    }
    return {
        fileSize: sizeOriginalFile.readUInt32BE(0),
        fileName: fileNameBuffer.toString(),
        refs
    }
}

function encode(run, fout) {
    const fd = fs.openSync(fout, 'a');
    let possbleShiftLength;
    let temp, flag = false;

    if(!bufferPacked)
        bufferPacked = Buffer.alloc(4); // 실제 압축할바이너리데이터들은 4바이트단위(unsigned냐 sign이냐는 상관이없다)로 packing함 밑의 코드에서 >>> 0 하는이유는 4바이트이고, MSB가 1일떄 음수로바뀌는걸 방지하기위함임
    
    if(!run) { // 파일을 다 읽었다면
        if(bufferData.length) {
            for(let i=0, len=32-bufferData.length; i<len; i++) // 나머지비트는 전부 0으로 채움(padding함)
                bufferData += '0';
            
            // console.log(bufferData);
            bufferPacked.writeUInt32BE(parseInt(bufferData,2), 0);
            fs.writeSync(fd, bufferPacked);
            sizeOfData += 4;
        }
        bufferPacked = undefined;
        bufferData = '';
        fs.closeSync(fd);
        console.log(`data size : ${sizeOfData}`);
        return;
    }    
    // console.log(run.codeword)

    if(!Utilities.isSafe(bufferData.length, run.codewordLen) && bufferData.length < 32) {
        possbleShiftLength = 32 - bufferData.length;            
        bufferData = bufferData + run.codeword.substr(0, possbleShiftLength);
        // subBufferData = run.codeword.substr(possbleShiftLength);
        temp = run.codeword.substr(possbleShiftLength);

        while (temp.length > 32) {
            flag = true;
            if(bufferData.length === 32) {
                bufferPacked.writeUInt32BE(parseInt(bufferData,2), 0);
                fs.writeSync(fd, bufferPacked);
                bufferPacked = Buffer.alloc(4);
                sizeOfData += 4;
                // console.log(bufferData);
            }
            
            bufferData = temp.substr(0,32);
            bufferPacked.writeUInt32BE(parseInt(bufferData,2), 0);
            fs.writeSync(fd, bufferPacked);
            bufferPacked = Buffer.alloc(4);
            sizeOfData += 4;
            // console.log(bufferData);
            temp = temp.substr(32);
            bufferData = '';
        }
        
        if(!flag) {
            bufferPacked.writeUInt32BE(parseInt(bufferData,2), 0);
            fs.writeSync(fd, bufferPacked);
            sizeOfData += 4;
            // console.log(bufferData);
        } 

        subBufferData = temp; 
        bufferPacked = undefined;
        bufferData = subBufferData;
        subBufferData = '';
    } else {            
        // shift 연산을 하기위해서 2진수로 먼저 캐스팅해서 처리한다.
        // bufferData = String(parseInt(bufferData,2) << run.codewordLen >>> 0) + run.codeword;
        bufferData += run.codeword;

        if(bufferData.length === 32) {
            // console.log(bufferData)
            bufferPacked.writeUInt32BE(parseInt(bufferData,2), 0);
            fs.writeSync(fd, bufferPacked);
            sizeOfData += 4;
            bufferPacked = undefined;
            bufferData = '';
        } else if(bufferData.length > 32) {
            let tmp = bufferData;
            while(tmp.length > 32) {
                bufferData = tmp.substr(0,32);
                tmp = tmp.substr(32);
                bufferPacked.writeUInt32BE(parseInt(bufferData,2), 0);
                fs.writeSync(fd, bufferPacked);
                sizeOfData += 4;
                // console.log(bufferData)
                bufferPacked = Buffer.alloc(4);
            }
            bufferData = tmp;
        }
    }        
    fs.closeSync(fd);
}

function decode(fd, fileInfo, root) {
    let numOfByteRead = 0;
    let run = root;
    let bufferRead = Buffer.alloc(4);
    let bufferWritten;
    let data;
    let temp = '';
    let bitCnt = 0, mask = 2147483648;
     // 10000000 00000000 00000000 00000000 = 2147483648
     // 01111111 11111111 11111111 11111111 = 2147483647
    const bits = 32;
    let fOut = '';
    let progress = 0;
    let sizeOfencoding = 0;
    let count =0 ;

    // null byte 제거
    for(let i=0; i<fileInfo.fileName.length; i++) {
        if(fileInfo.fileName.charCodeAt(i) !== 0) fOut += fileInfo.fileName[i];
        else break;
    }

    fOut = fs.openSync(fOut, 'w');

    while(fs.readSync(fd, bufferRead, 0, 4, null) && numOfByteRead < fileInfo.fileSize) {
        sizeOfencoding+=4;
        data = bufferRead.readUInt32BE(0).toString(2);
        temp = '';
        if(data.length < 32) {
            for(let i=0,len=32 - data.length; i<len; i++)
                temp += '0';

            data = temp + data;
        }
            

        while(1) {
            if(!run.left && !run.right) {
                for(let i=0; i<run.runLen; i++) {
                    
                    bufferWritten = Buffer([run.symbol]);
                    // console.log(String.fromCharCode(run.symbol));
                    fs.writeSync(fOut, bufferWritten);
                }
                numOfByteRead += run.runLen;
                run = root;
            } 
            
            if(data[bitCnt] === '1') 
                run = run.right
            else 
                run = run.left;

            if(bitCnt++ == bits-1 || numOfByteRead >= fileInfo.fileSize) {
                // bitCnt가 32가됫을떄 루프를 탈출하고 그다음에 읽을게없으면 함수를끝내버리는데 이때 런을 발견한다하더라도 써주는작업이 없으므로 따로 밑에 추가함.
                if(!run.left && !run.right && numOfByteRead < fileInfo.fileSize) {
                    for(let i=0; i<run.runLen; i++) {
                        bufferWritten = Buffer([run.symbol]);
                        // console.log(String.fromCharCode(run.symbol));
                        fs.writeSync(fOut, bufferWritten);
                    }
                    numOfByteRead += run.runLen;
                    run = root;
                } 
                bitCnt = 0;
                break;
            }
            
            if(numOfByteRead > progress) {
                progress += fileInfo.fileSize/100;
                // console.log(`progress : ${numOfByteRead/fileInfo.fileSize * 100}`);
            }
        }
        bufferRead = Buffer.alloc(4);
    }
    // console.log('progress : 100')
    console.log(`data of size : ${sizeOfencoding}`)
    console.log(count)
}


function bufferGenerator(value, symbolFlag) {
    if(symbolFlag) {
        const buffer = Buffer.from([value]);
        buffer.writeUInt8(value, 0);
        return  buffer;
    }

    switch(typeof value) {
        case 'number': {
            const buffer = Buffer.alloc(4);
            buffer.writeUInt32BE(value, 0);
            return buffer;
        }
    }
}


module.exports = {
    openAndRead,
    writeHeader,
    readHeader,
    encode,
    decode
};
