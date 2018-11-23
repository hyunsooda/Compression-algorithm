class utilities {
    static convertToDecimal(str) {
        let sum = 0, cnt = 0;
        for(let i=str.length-1; i>=0; i--) {
            if(parseInt(str[i])) 
                sum += 2**cnt;
            cnt++;
        }
        return sum;
    }
    static determineLength(prefix) {
        let digits = prefix.length;

        for(let i=0; i<prefix.length; i++) {
            if(prefix[i] === '1') return digits;
            digits--;
        }

        if(prefix === '0') return 1;
    }
    static extractMSB(num) {
        return 2**(num.toString(2).length-1);
    }
    static isSafe(len1, len2) {
        if(len1 + len2 > 32) return false;
        else return true;
    }
    static existy(x) {  // !==가 아니라 !=를 한 이유는 값만 검사하기 위함이다.
        return x != null;
    }
    static deepClone(obj) {
        if(!utilities.existy(obj) || (typeof obj !== 'object')) return obj;

        let temp = new obj.constructor();
        for(let prop in obj) {
            if(obj.hasOwnProperty(prop)) 
                temp[prop] = utilities.deepClone(obj[prop]); 
        }
        
        return temp; 
    }
}

/*
2147483647 와 2147483648은 다르다...왜?? 
function a() {
    var a = 0;
    for(let i=0; i<31; i++) {
        a = (a<<1| 1) >>> 0;
        console.log(a);
    }
    return a;
} 
*/




module.exports = utilities;