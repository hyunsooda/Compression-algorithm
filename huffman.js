const fs = require('fs');
const Run = require('./Run');
const fileIO = require('./fileIO');
const Heap = require('./heap');
const Utilities = require('./utilities');
const HashTable = require('./hashTable');
const Events = require('./Events');


    
class Huffman {
    constructor() {
        this.runs = [];
        this.hashTable = new HashTable();
        this.root;
        this.progress = 0;
        this.count = 0;
        this.backupRuns = [];
        this.ref = [];
    }
    compressFile(file) {
        /*
        실제로 압축하는 과정에는 파일을 2번읽어야함. 첫번째로 읽을때는 run들을 수집하고 허프만트리륾 만들고 codeword를 부여하는 과정.
        그리고 중요하게 알아야 할것이 허프만트리를 만드는 이유는 코드워드를 부여하기위함임.
        두번째로읽을때는 첫번째로읽을떄 만든 허프만트리를 바탕으로, 인코딩을 하기위함임.
        */
        
        // init
        let s = Heap.getHeapSize();
        for(let i=0; i<s; i++)
            Heap.delete();
        fileIO.init();

        this.collectRuns(file);
        this.createHuffmanTree();
        // this.printHuffmanTree(this.root,0);
        // this.assignCodeword('', this.root);
        console.log(`length of array of runs : ${this.runs.length}`);
        this.assignCodeword();
        if(this.runs.length > 10) {
            this.readyExchange();
            this.outputHeader(file); 
            this.performExchange();
        }
        this.hashTable.storeRunsIntoTable(this.root);     
        this.backupRuns = [];
        for(let i=0; i<this.runs.length; i++) 
            this.backupRuns.push(Utilities.deepClone(this.runs[i]));
        this.encode(file, file.substr(0, file.indexOf('.'))+'.z');
    }
    decompressFile(file) {
        fileIO.init();

        let refA,refB;
        const fd = fs.openSync(file, 'r');
        const originalFile = this.inputFrequencies(fd); 
        let s = Heap.getHeapSize();
        for(let i=0; i<s; i++)
            Heap.delete();
        this.createHuffmanTree(); 
        // this.printHuffmanTree(this.root,0);
        // this.assignCodeword('', this.root);
        this.assignCodeword();
        
        for(let i=0; i<originalFile.refs.length; i++) {
            for(let k=0; k<this.runs.length; k++) {
                refA = originalFile.refs[i].A;
                refB = originalFile.refs[i].B;
                if(refA.symbol === this.runs[k].symbol && refA.runLen === this.runs[k].runLen && refA.freq === this.runs[k].freq) {
                    this.runs[k].symbol = refB.symbol;
                    this.runs[k].runLen = refB.runLen;
                    this.runs[k].freq = refB.freq;
                } else if(refB.symbol === this.runs[k].symbol && refB.runLen === this.runs[k].runLen && refB.freq === this.runs[k].freq) {
                    this.runs[k].symbol = refA.symbol;
                    this.runs[k].runLen = refA.runLen;
                    this.runs[k].freq = refA.freq;
                }
            }
        }
    
        this.decode(fd, originalFile);
    }
    collectRuns(file) {
        fileIO.openAndRead(file, this.checkByteWhetherSame.bind(this));
        // console.log(this.runs);
    }
    checkByteWhetherSame(prevByte, curByte, numOfByte, EOF) {
        let run, find;

        if(prevByte !== curByte) {
            if(!Run.isEqual(prevByte, numOfByte, this.runs)) { // prevByte의 심볼에다가 개수가같은 런이 없다면 새로추가
                run = new Run(prevByte, numOfByte);
                this.runs.push(run);
                Events.trigger('discoverRun', run);

                if(EOF) {
                    find = this.runs.findIndex(element => element.symbol === curByte && element.runLen === 1);
                    if(find > -1) {
                        this.runs[find].freq++;
                        Events.trigger('discoverRun', this.runs[find]);
                    }  else {
                        run = new Run(curByte, 1);
                        this.runs.push(run);
                        Events.trigger('discoverRun', run);
                        console.log("@@@@@@@@@@@@@@@@@@")
                    }
                }
            }  
            else { // prevByte의 심볼에다가 개수가같은 런이있다면 freq만증가
                find = this.runs.findIndex(element => element.symbol === prevByte && element.runLen === numOfByte);
                if(find > -1) {
                    this.runs[find].freq++;
                    Events.trigger('discoverRun', this.runs[find]);
                } 

                if(EOF) {
                    find = this.runs.findIndex(element => element.symbol === curByte && element.runLen === 1);
                    if(find > -1) {
                        this.runs[find].freq++;
                        Events.trigger('discoverRun', this.runs[find]);
                    } else {
                        run = new Run(curByte, 1);
                        this.runs.push(run);
                        Events.trigger('discoverRun', run);
                        console.log("!!!!!!!!!!!!!!!!!!!")
                    }
                }
            }
            return true;
        } else {
            if(EOF) {
                let find = this.runs.findIndex(element => element.symbol === curByte && element.runLen === (numOfByte+1));
                if(find > -1) {
                    this.runs[find].freq++;
                    Events.trigger('discoverRun', this.runs[find]);
                }
                else {
                    run = new Run(curByte, numOfByte+1);
                    this.runs.push(run);
                    Events.trigger('discoverRun', run);
                }
            }
            return false; 
        }
    }
    printHuffmanTree(node, depth) {
        for(let i=0; i<depth; i++) {
            process.stdout.write(" ");
        }
        if(!node) console.log('null')
        else {
            console.log(`${node.symbol}:${node.runLen}(${node.freq})`)
            this.printHuffmanTree(node.left, depth + 1);
            this.printHuffmanTree(node.right, depth + 1);
        }
    }
    createHuffmanTree() {
        let run1, run2, newRun;

        Heap.setCompFunc( (d1,d2) => {
            return d2-d1;
        });
        for(let i=0; i<this.runs.length; i++) 
            Heap.insert(this.runs[i]);
        
        /*
        let h = Heap.getHeap();
        for(let i=1; i<=h.length-1; i++)
            console.log(`${i} = ${h[i].freq}`);
        */
        

        // 노드의 left,right를 달아주는 작업은 combinedTwoTree에서 실시됨
        while(Heap.getHeapSize() > 1) {
            run1 = Heap.delete();
            run2 = Heap.delete();
            // console.log(run1.freq, run2.freq);
            newRun = Heap.combineTwoTree(run1,run2,new Run());
            Heap.insert(newRun);
        }
        this.root = Heap.getHeap()[1]
    }
    /*
    assignCodeword(prefix, node) {
        if(!node.left && !node.right) {
            node.codeword = prefix;   // Utilities.convertToDecimal(prefix); 
            node.codewordLen = prefix.length;       // Utilities.determineLength(prefix);
            console.log(node)
        } else {
            this.assignCodeword(prefix+'0', node.left);
            this.assignCodeword(prefix+'1', node.right);
        }
    }
    */
    counting(node) {  // 총 노드개수
        this.count++;
        if(!node.left && !node.right) {
        } else {
            this.counting( node.left);
            this.counting( node.right);
        }
    }
   
    assignCodeword() {
        let run = this.root;
        let runStack = [], prefixStack = [];
        let prefix = '', prevPrefix;
        let flag;
        let p;

        while(1) {
            while(run) {
                runStack.unshift(run);
                prefixStack.unshift(prefix);
                prefix += '0';           
                run = run.left;
            } 
            
            if(!runStack.length) break;

            run = runStack.shift();
            p = prefixStack.shift();
            if(!run.left && !run.right) {
                run.codeword = p;
                run.codewordLen = run.codeword.length;
            }

            prefix = p;
            flag = true;
            run = run.right;
            if(run) prefix += '1';
        }
    }
    
    getAllRuns(callback) {
        for(let i=0; i<this.runs.length; i++) 
            callback(this.runs[i])
    }
    outputHeader(fin) {
        fileIO.writeHeader(fin, this.runs, this.ref);
    }
    outputBody(fin) {
        fileIO.writeBody(fin, this.runs);
    }
    inputFrequencies(fd) {
        return fileIO.readHeader(fd, this.runs);
    }
    readyExchange() {
        const count = this.runs.length;

        for(let i=0; i<this.runs.length; i++)  
            this.backupRuns.push(Utilities.deepClone(this.runs[i]));
        this.backupRuns.sort( (a,b) => a.codewordLen - b.codewordLen ); // codeword길이대로 오름차순정렬(길이가작을수록앞에배치)
        
        Heap.delete();
        for(let i=0; i<parseInt(count/4); i++) 
            Heap.insert(this.backupRuns[i])

        this.backupRuns = [];

        for(let i=0; i<parseInt(count/8); i++) 
            this.backupRuns.push(Heap.delete()); // codeword길이가 가장적으면서 빈도수가 적은애들
        
        for(let i=0; i<parseInt(count/8); i++) 
            Heap.delete();

        this.findRunMostLessHaveCodeeword(); 
    }
    performExchange() {
        let temp;
        for(let i=0; i<this.ref.length; i++) {
            this.ref[i].A.symbol = this.ref[i].A.ref.symbol;
            this.ref[i].A.runLen = this.ref[i].A.ref.runLen;
            this.ref[i].A.freq = this.ref[i].A.ref.freq;

            this.ref[i].B.symbol = this.ref[i].B.ref.symbol;
            this.ref[i].B.runLen = this.ref[i].B.ref.runLen;
            this.ref[i].B.freq = this.ref[i].B.ref.freq;
        }
    }
    findRunMostLessHaveCodeeword() {
        let lesslen = 10000000, longlen = 0;
        let lessrun, longrun, temp;
        let mostFreqRun = new Run('',0,0);
        let mostFreqRuns = [];
        let backupRuns = [];
        let msr = [];
        const count = this.runs.length;

        /*
        for(let i=0; i<this.runs.length; i++) {
            if(mostFreqRun.freq < this.runs[i].freq) 
                mostFreqRun = this.runs[i];
        }
        
        for(let i=0; i<this.runs.length; i++) {
            if(lesslen > this.runs[i].codewordLen) {
                lessrun = this.runs[i];
                lesslen = lessrun.codewordLen;
            } else if(lesslen === this.runs[i].codewordLen) {
                if(lessrun.freq > this.runs[i].codewordLen)
                    lessrun = this.runs[i];
            }
            if(longlen < this.runs[i].codewordLen) {
                longrun = this.runs[i];
                longlen = longrun.codewordLen;
            } else if(longlen === this.runs[i].codewordLen) {
                if(longrun.freq > this.runs[i].codewordLen) 
                    longrun = this.runs[i];
            }
        }

        console.log('-------------------------------');
        console.log(`the most freq codewordlen : `);
        console.log(mostFreqRun);
        console.log(`the most long codewordlen : `);
        console.log(longrun);
        console.log(`the most less codewordlen : `);
        console.log(lessrun);


        mostFreqRun.ref = {
            symbol: lessrun.symbol,
            runLen: lessrun.runLen,
            freq: lessrun.freq
        };
        lessrun.ref = {
            symbol: mostFreqRun.symbol,
            runLen: mostFreqRun.runLen,
            freq: mostFreqRun.freq
        }

        this.ref.push({A: mostFreqRun, B: lessrun});
        */

        for(let i=0; i<this.runs.length; i++)
           mostFreqRuns.push(Utilities.deepClone(this.runs[i]));
        mostFreqRuns.sort( (a,b) => b.codewordLen - a.codewordLen );   // codeword길이대로 내림차순(길이가클수록앞에배치)
        for(let i=0; i<parseInt(count/4); i++)
            Heap.insert(mostFreqRuns[i]);  // 빈도수대로 다시한번더정렬
        mostFreqRuns = [];
        for(let i=0; i<parseInt(count/8); i++)
            mostFreqRuns.push(Heap.delete());   // 즉, 빈도수가가장많고 codeword의 길이가 긴 run들을 수집
        
        for(let i=0; i<parseInt(count/8); i++)
            Heap.delete();

        for(let i=0; i<this.runs.length; i++) {  // this.backupRuns는 deepCopy된 객체이므로 원본객채(참조에의한연산을하기위해)를 찾음.
            for(let j=0; j<this.backupRuns.length; j++) {
                if(this.runs[i].symbol === this.backupRuns[j].symbol && this.runs[i].runLen === this.backupRuns[j].runLen && this.runs[i].freq === this.backupRuns[j].freq) {
                    backupRuns.push(this.runs[i]);
                }
            }
        }
        for(let i=0; i<this.runs.length; i++) {  // mostFreqRuns는 deepCopy된 객체이므로 원본객채(참조에의한연산을하기위해)를 찾음.
            for(let j=0; j<mostFreqRuns.length; j++) {
                if(this.runs[i].symbol === mostFreqRuns[j].symbol && this.runs[i].runLen === mostFreqRuns[j].runLen && this.runs[i].freq === mostFreqRuns[j].freq) {
                    msr.push(this.runs[i]);
                }
            }
        }


        for(let i=0; i<backupRuns.length; i++) {
            backupRuns[i].ref = {
                symbol: msr[i].symbol,
                runLen: msr[i].runLen,
                freq: msr[i].freq
            };
            msr[i].ref = {
                symbol: backupRuns[i].symbol,
                runLen: backupRuns[i].runLen,
                freq: backupRuns[i].freq
            };
            this.ref.push({A: msr[i], B: backupRuns[i]});
        }
    }
    encode(fin, fout) {
        let progress = 0, count = 0, n = 0;
        let totalLength = 0;

        for(let i=0; i<this.runs.length; i++) 
            progress += this.runs[i].freq;
            
        for(let i=0; i<this.runs.length; i++) 
            totalLength += this.runs[i].codewordLen; 
        
        Events.on('discoverRun', run => {
            const r = this.hashTable.findRun(run.symbol, run.runLen);
            fileIO.encode(r, fout);
            count++;
            if(count > n)  {
                n += parseInt(progress/100);
                console.log(`progress : ${ count/progress*100 }` );
            }
        });
        Events.on('completedReadFile', () => {
            fileIO.encode.bind(null, null, fout)();
            console.log(`average of codeword length : ${totalLength/this.runs.length}`);

            this.backupRuns.sort( (a,b) => b.freq - a.freq );
            /*
            for(let i=0; i<this.backupRuns.length; i++) 
                console.log(`${i+1}th high freq run = freq : ${this.backupRuns[i].freq} symbol : ${this.backupRuns[i].symbol}, symbolLength : ${this.backupRuns[i].runLen}  codeword : ${this.backupRuns[i].codeword} codwordLen : ${this.backupRuns[i].codewordLen}`);
            console.log(`${this.backupRuns.length-1}th high freq run = freq : ${this.backupRuns[this.backupRuns.length-1].freq} symbol : ${this.backupRuns[this.backupRuns.length-1].symbol}, symbolLength : ${this.backupRuns[this.backupRuns.length-1].runLen}  codeword : ${this.backupRuns[this.backupRuns.length-1].codeword} codwordLen : ${this.backupRuns[this.backupRuns.length-1].codewordLen}`);
            */
        });
        this.runs = []; // 다시 run들을 수집하기위해서 초기화
        this.collectRuns(fin);
    }
    decode(fd, fileInfo) {
        let total = 0;
        for(let i=0; i<this.runs.length; i++) 
            total += this.runs[i].codewordLen;

        fileIO.decode(fd, fileInfo, this.root);
        console.log(`average of codeword length : ${total/this.runs.length}`);
    }
}


module.exports = Huffman;
