/*
const Huffman = require('./huffman');
const FILENAME = process.argv[2];

const huffman = new Huffman();


if(process.argv[3] === '1')
    huffman.compressFile(FILENAME);
else if(process.argv[3] === '2')
    huffman.decompressFile(FILENAME);
else 
    console.log('error parmeter');
*/


let Huffman = require('./huffman');
let Events = require('./Events');
let huffman; 

module.exports = function (filename) {
    let isZ = filename.split('.');
    isZ = isZ[isZ.length - 1];
    huffman = new Huffman();
    Events.init();

    if(isZ == 'z') {
        huffman.decompressFile(filename);
        console.log("de")
    }
    else {
        huffman.compressFile(filename);
        console.log("co")
    }
}

