class Run {
    constructor(symbol=undefined, runLen=undefined, freq=1) {
        this.symbol = symbol;
        this.runLen = runLen;
        this.freq = freq;
        this.left = undefined;
        this.right = undefined;
        this.codeword = undefined;
        this.codewordLen = undefined;
        this.ref = undefined;
    }
    static isEqual(symbol, runLen, runs) {
        for(let i=0; i<runs.length; i++) {
            if(runs[i].symbol === symbol && runs[i].runLen === runLen) 
                return true;
        }
        return false;
    }
}

module.exports = Run;