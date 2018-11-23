const Heap = (() => {
    let comp = undefined;
    let numOfData = 0;
    let heapArr = [];

    return class {
        static setCompFunc(func) {
            comp = func;
        }
        static isEmpty() {
            return numOfData === 0;
        }
        static getParentIdx(idx) {
            return parseInt(idx/2);
        }
        static getLChildIdx(idx) {
            return parseInt(idx*2);
        }
        static getRChildIdx(idx) {
            return parseInt(idx*2)+1;
        }
        static getHiPriChildIdx(idx) {
            if(Heap.getLChildIdx(idx) > numOfData)
                return 0;
            else if(Heap.getLChildIdx(idx) === numOfData)
                return Heap.getLChildIdx(idx);
            else {
                if(comp(heapArr[Heap.getLChildIdx(idx)].freq, heapArr[Heap.getRChildIdx(idx)].freq))
                    return Heap.getRChildIdx(idx);
                else 
                    return Heap.getLChildIdx(idx);
            }
        }
        static insert(run) {
            let idx = numOfData+1;

            while(idx !== 1) {
                if(comp(run.freq, heapArr[Heap.getParentIdx(idx)].freq) > 0) {
                    heapArr[idx] = heapArr[Heap.getParentIdx(idx)];
                    idx = Heap.getParentIdx(idx);
                } else 
                    break;
            }

            heapArr[idx] = run;
            numOfData++;
        }
        static delete() {
            let parentIdx = 1, childIdx;
            let lastRun = heapArr[numOfData];
            let retRun = heapArr[1];

            while(childIdx = Heap.getHiPriChildIdx(parentIdx)) {
                if(comp(lastRun.freq, heapArr[childIdx].freq) >= 0)
                    break;

                heapArr[parentIdx] = heapArr[childIdx];
                parentIdx = childIdx;
            }

            heapArr[parentIdx] = lastRun;
            numOfData--;

            return retRun;
        }
        static combineTwoTree(run1, run2, newRun) {
            newRun.freq = run1.freq + run2.freq;
            newRun.symbol = newRun.runLen = undefined;
            newRun.left = run1;
            newRun.right = run2;
            return newRun;
        }
        static getHeap() {
            return heapArr;
        }
        static getHeapSize() {
            return numOfData;
        }
    }
})();

module.exports = Heap;