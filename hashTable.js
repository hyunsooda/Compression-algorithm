class HashTable {
    constructor() {
        this.table = [];
    }
    /* 
    체이닝에서 다음노드를 가리키는 프로퍼티는 right로 정함.
    run에는 left프로퍼티가있지만 이제 left프로퍼티는 필요없으므로 무시함
    */
    hash(symbol) {
        return Math.abs(parseInt(symbol));
    }
    // 리프노드(run)들을 전부다 해쉬테이블에넣음(나중에 빠르게찾기위해서)
    storeRunsIntoTable(run) {
        if(!run.left && !run.right) 
            this.insertToTable(run);
        else {
            this.storeRunsIntoTable(run.left);
            this.storeRunsIntoTable(run.right);
        }
    }
    insertToTable(run) {
        const key = this.hash(run.symbol);
        run.right = undefined;

        if(!this.table[key]) 
            this.table[key] = run;
        else {
            if(!this.table[key].right) 
                this.table[key].right = run;
            else {
                let traverse = this.table[key].right;
                while(traverse.right) {
                    traverse = traverse.right;
                }
                
                traverse.right = run;
            }
        }
    }
    findRun(symbol, runLen) {
        let flag = false;
        const key = this.hash(symbol);
        let traverse = this.table[key];

        while(traverse) {
            if(traverse.runLen === runLen) {
                flag = !flag;
                break;
            }
            traverse = traverse.right;
        }

        if(flag) return traverse;
        else return undefined;
    }
}

module.exports = HashTable;