// minified bigInt
var bigInt=function(undefined){"use strict";var BASE=1e7,LOG_BASE=7,MAX_INT=9007199254740992,MAX_INT_ARR=smallToArray(MAX_INT),DEFAULT_ALPHABET="0123456789abcdefghijklmnopqrstuvwxyz";var supportsNativeBigInt=typeof BigInt==="function";function Integer(v,radix,alphabet,caseSensitive){if(typeof v==="undefined")return Integer[0];if(typeof radix!=="undefined")return+radix===10&&!alphabet?parseValue(v):parseBase(v,radix,alphabet,caseSensitive);return parseValue(v)}function BigInteger(value,sign){this.value=value;this.sign=sign;this.isSmall=false}BigInteger.prototype=Object.create(Integer.prototype);function SmallInteger(value){this.value=value;this.sign=value<0;this.isSmall=true}SmallInteger.prototype=Object.create(Integer.prototype);function NativeBigInt(value){this.value=value}NativeBigInt.prototype=Object.create(Integer.prototype);function isPrecise(n){return-MAX_INT<n&&n<MAX_INT}function smallToArray(n){if(n<1e7)return[n];if(n<1e14)return[n%1e7,Math.floor(n/1e7)];return[n%1e7,Math.floor(n/1e7)%1e7,Math.floor(n/1e14)]}function arrayToSmall(arr){trim(arr);var length=arr.length;if(length<4&&compareAbs(arr,MAX_INT_ARR)<0){switch(length){case 0:return 0;case 1:return arr[0];case 2:return arr[0]+arr[1]*BASE;default:return arr[0]+(arr[1]+arr[2]*BASE)*BASE}}return arr}function trim(v){var i=v.length;while(v[--i]===0);v.length=i+1}function createArray(length){var x=new Array(length);var i=-1;while(++i<length){x[i]=0}return x}function truncate(n){if(n>0)return Math.floor(n);return Math.ceil(n)}function add(a,b){var l_a=a.length,l_b=b.length,r=new Array(l_a),carry=0,base=BASE,sum,i;for(i=0;i<l_b;i++){sum=a[i]+b[i]+carry;carry=sum>=base?1:0;r[i]=sum-carry*base}while(i<l_a){sum=a[i]+carry;carry=sum===base?1:0;r[i++]=sum-carry*base}if(carry>0)r.push(carry);return r}function addAny(a,b){if(a.length>=b.length)return add(a,b);return add(b,a)}function addSmall(a,carry){var l=a.length,r=new Array(l),base=BASE,sum,i;for(i=0;i<l;i++){sum=a[i]-base+carry;carry=Math.floor(sum/base);r[i]=sum-carry*base;carry+=1}while(carry>0){r[i++]=carry%base;carry=Math.floor(carry/base)}return r}BigInteger.prototype.add=function(v){var n=parseValue(v);if(this.sign!==n.sign){return this.subtract(n.negate())}var a=this.value,b=n.value;if(n.isSmall){return new BigInteger(addSmall(a,Math.abs(b)),this.sign)}return new BigInteger(addAny(a,b),this.sign)};BigInteger.prototype.plus=BigInteger.prototype.add;SmallInteger.prototype.add=function(v){var n=parseValue(v);var a=this.value;if(a<0!==n.sign){return this.subtract(n.negate())}var b=n.value;if(n.isSmall){if(isPrecise(a+b))return new SmallInteger(a+b);b=smallToArray(Math.abs(b))}return new BigInteger(addSmall(b,Math.abs(a)),a<0)};SmallInteger.prototype.plus=SmallInteger.prototype.add;NativeBigInt.prototype.add=function(v){return new NativeBigInt(this.value+parseValue(v).value)};NativeBigInt.prototype.plus=NativeBigInt.prototype.add;function subtract(a,b){var a_l=a.length,b_l=b.length,r=new Array(a_l),borrow=0,base=BASE,i,difference;for(i=0;i<b_l;i++){difference=a[i]-borrow-b[i];if(difference<0){difference+=base;borrow=1}else borrow=0;r[i]=difference}for(i=b_l;i<a_l;i++){difference=a[i]-borrow;if(difference<0)difference+=base;else{r[i++]=difference;break}r[i]=difference}for(;i<a_l;i++){r[i]=a[i]}trim(r);return r}function subtractAny(a,b,sign){var value;if(compareAbs(a,b)>=0){value=subtract(a,b)}else{value=subtract(b,a);sign=!sign}value=arrayToSmall(value);if(typeof value==="number"){if(sign)value=-value;return new SmallInteger(value)}return new BigInteger(value,sign)}function subtractSmall(a,b,sign){var l=a.length,r=new Array(l),carry=-b,base=BASE,i,difference;for(i=0;i<l;i++){difference=a[i]+carry;carry=Math.floor(difference/base);difference%=base;r[i]=difference<0?difference+base:difference}r=arrayToSmall(r);if(typeof r==="number"){if(sign)r=-r;return new SmallInteger(r)}return new BigInteger(r,sign)}BigInteger.prototype.subtract=function(v){var n=parseValue(v);if(this.sign!==n.sign){return this.add(n.negate())}var a=this.value,b=n.value;if(n.isSmall)return subtractSmall(a,Math.abs(b),this.sign);return subtractAny(a,b,this.sign)};BigInteger.prototype.minus=BigInteger.prototype.subtract;SmallInteger.prototype.subtract=function(v){var n=parseValue(v);var a=this.value;if(a<0!==n.sign){return this.add(n.negate())}var b=n.value;if(n.isSmall){return new SmallInteger(a-b)}return subtractSmall(b,Math.abs(a),a>=0)};SmallInteger.prototype.minus=SmallInteger.prototype.subtract;NativeBigInt.prototype.subtract=function(v){return new NativeBigInt(this.value-parseValue(v).value)};NativeBigInt.prototype.minus=NativeBigInt.prototype.subtract;BigInteger.prototype.negate=function(){return new BigInteger(this.value,!this.sign)};SmallInteger.prototype.negate=function(){var sign=this.sign;var small=new SmallInteger(-this.value);small.sign=!sign;return small};NativeBigInt.prototype.negate=function(){return new NativeBigInt(-this.value)};BigInteger.prototype.abs=function(){return new BigInteger(this.value,false)};SmallInteger.prototype.abs=function(){return new SmallInteger(Math.abs(this.value))};NativeBigInt.prototype.abs=function(){return new NativeBigInt(this.value>=0?this.value:-this.value)};function multiplyLong(a,b){var a_l=a.length,b_l=b.length,l=a_l+b_l,r=createArray(l),base=BASE,product,carry,i,a_i,b_j;for(i=0;i<a_l;++i){a_i=a[i];for(var j=0;j<b_l;++j){b_j=b[j];product=a_i*b_j+r[i+j];carry=Math.floor(product/base);r[i+j]=product-carry*base;r[i+j+1]+=carry}}trim(r);return r}function multiplySmall(a,b){var l=a.length,r=new Array(l),base=BASE,carry=0,product,i;for(i=0;i<l;i++){product=a[i]*b+carry;carry=Math.floor(product/base);r[i]=product-carry*base}while(carry>0){r[i++]=carry%base;carry=Math.floor(carry/base)}return r}function shiftLeft(x,n){var r=[];while(n-- >0)r.push(0);return r.concat(x)}function multiplyKaratsuba(x,y){var n=Math.max(x.length,y.length);if(n<=30)return multiplyLong(x,y);n=Math.ceil(n/2);var b=x.slice(n),a=x.slice(0,n),d=y.slice(n),c=y.slice(0,n);var ac=multiplyKaratsuba(a,c),bd=multiplyKaratsuba(b,d),abcd=multiplyKaratsuba(addAny(a,b),addAny(c,d));var product=addAny(addAny(ac,shiftLeft(subtract(subtract(abcd,ac),bd),n)),shiftLeft(bd,2*n));trim(product);return product}function useKaratsuba(l1,l2){return-.012*l1-.012*l2+15e-6*l1*l2>0}BigInteger.prototype.multiply=function(v){var n=parseValue(v),a=this.value,b=n.value,sign=this.sign!==n.sign,abs;if(n.isSmall){if(b===0)return Integer[0];if(b===1)return this;if(b===-1)return this.negate();abs=Math.abs(b);if(abs<BASE){return new BigInteger(multiplySmall(a,abs),sign)}b=smallToArray(abs)}if(useKaratsuba(a.length,b.length))return new BigInteger(multiplyKaratsuba(a,b),sign);return new BigInteger(multiplyLong(a,b),sign)};BigInteger.prototype.times=BigInteger.prototype.multiply;function multiplySmallAndArray(a,b,sign){if(a<BASE){return new BigInteger(multiplySmall(b,a),sign)}return new BigInteger(multiplyLong(b,smallToArray(a)),sign)}SmallInteger.prototype._multiplyBySmall=function(a){if(isPrecise(a.value*this.value)){return new SmallInteger(a.value*this.value)}return multiplySmallAndArray(Math.abs(a.value),smallToArray(Math.abs(this.value)),this.sign!==a.sign)};BigInteger.prototype._multiplyBySmall=function(a){if(a.value===0)return Integer[0];if(a.value===1)return this;if(a.value===-1)return this.negate();return multiplySmallAndArray(Math.abs(a.value),this.value,this.sign!==a.sign)};SmallInteger.prototype.multiply=function(v){return parseValue(v)._multiplyBySmall(this)};SmallInteger.prototype.times=SmallInteger.prototype.multiply;NativeBigInt.prototype.multiply=function(v){return new NativeBigInt(this.value*parseValue(v).value)};NativeBigInt.prototype.times=NativeBigInt.prototype.multiply;function square(a){var l=a.length,r=createArray(l+l),base=BASE,product,carry,i,a_i,a_j;for(i=0;i<l;i++){a_i=a[i];carry=0-a_i*a_i;for(var j=i;j<l;j++){a_j=a[j];product=2*(a_i*a_j)+r[i+j]+carry;carry=Math.floor(product/base);r[i+j]=product-carry*base}r[i+l]=carry}trim(r);return r}BigInteger.prototype.square=function(){return new BigInteger(square(this.value),false)};SmallInteger.prototype.square=function(){var value=this.value*this.value;if(isPrecise(value))return new SmallInteger(value);return new BigInteger(square(smallToArray(Math.abs(this.value))),false)};NativeBigInt.prototype.square=function(v){return new NativeBigInt(this.value*this.value)};function divMod1(a,b){var a_l=a.length,b_l=b.length,base=BASE,result=createArray(b.length),divisorMostSignificantDigit=b[b_l-1],lambda=Math.ceil(base/(2*divisorMostSignificantDigit)),remainder=multiplySmall(a,lambda),divisor=multiplySmall(b,lambda),quotientDigit,shift,carry,borrow,i,l,q;if(remainder.length<=a_l)remainder.push(0);divisor.push(0);divisorMostSignificantDigit=divisor[b_l-1];for(shift=a_l-b_l;shift>=0;shift--){quotientDigit=base-1;if(remainder[shift+b_l]!==divisorMostSignificantDigit){quotientDigit=Math.floor((remainder[shift+b_l]*base+remainder[shift+b_l-1])/divisorMostSignificantDigit)}carry=0;borrow=0;l=divisor.length;for(i=0;i<l;i++){carry+=quotientDigit*divisor[i];q=Math.floor(carry/base);borrow+=remainder[shift+i]-(carry-q*base);carry=q;if(borrow<0){remainder[shift+i]=borrow+base;borrow=-1}else{remainder[shift+i]=borrow;borrow=0}}while(borrow!==0){quotientDigit-=1;carry=0;for(i=0;i<l;i++){carry+=remainder[shift+i]-base+divisor[i];if(carry<0){remainder[shift+i]=carry+base;carry=0}else{remainder[shift+i]=carry;carry=1}}borrow+=carry}result[shift]=quotientDigit}remainder=divModSmall(remainder,lambda)[0];return[arrayToSmall(result),arrayToSmall(remainder)]}function divMod2(a,b){var a_l=a.length,b_l=b.length,result=[],part=[],base=BASE,guess,xlen,highx,highy,check;while(a_l){part.unshift(a[--a_l]);trim(part);if(compareAbs(part,b)<0){result.push(0);continue}xlen=part.length;highx=part[xlen-1]*base+part[xlen-2];highy=b[b_l-1]*base+b[b_l-2];if(xlen>b_l){highx=(highx+1)*base}guess=Math.ceil(highx/highy);do{check=multiplySmall(b,guess);if(compareAbs(check,part)<=0)break;guess--}while(guess);result.push(guess);part=subtract(part,check)}result.reverse();return[arrayToSmall(result),arrayToSmall(part)]}function divModSmall(value,lambda){var length=value.length,quotient=createArray(length),base=BASE,i,q,remainder,divisor;remainder=0;for(i=length-1;i>=0;--i){divisor=remainder*base+value[i];q=truncate(divisor/lambda);remainder=divisor-q*lambda;quotient[i]=q|0}return[quotient,remainder|0]}function divModAny(self,v){var value,n=parseValue(v);if(supportsNativeBigInt){return[new NativeBigInt(self.value/n.value),new NativeBigInt(self.value%n.value)]}var a=self.value,b=n.value;var quotient;if(b===0)throw new Error("Cannot divide by zero");if(self.isSmall){if(n.isSmall){return[new SmallInteger(truncate(a/b)),new SmallInteger(a%b)]}return[Integer[0],self]}if(n.isSmall){if(b===1)return[self,Integer[0]];if(b==-1)return[self.negate(),Integer[0]];var abs=Math.abs(b);if(abs<BASE){value=divModSmall(a,abs);quotient=arrayToSmall(value[0]);var remainder=value[1];if(self.sign)remainder=-remainder;if(typeof quotient==="number"){if(self.sign!==n.sign)quotient=-quotient;return[new SmallInteger(quotient),new SmallInteger(remainder)]}return[new BigInteger(quotient,self.sign!==n.sign),new SmallInteger(remainder)]}b=smallToArray(abs)}var comparison=compareAbs(a,b);if(comparison===-1)return[Integer[0],self];if(comparison===0)return[Integer[self.sign===n.sign?1:-1],Integer[0]];if(a.length+b.length<=200)value=divMod1(a,b);else value=divMod2(a,b);quotient=value[0];var qSign=self.sign!==n.sign,mod=value[1],mSign=self.sign;if(typeof quotient==="number"){if(qSign)quotient=-quotient;quotient=new SmallInteger(quotient)}else quotient=new BigInteger(quotient,qSign);if(typeof mod==="number"){if(mSign)mod=-mod;mod=new SmallInteger(mod)}else mod=new BigInteger(mod,mSign);return[quotient,mod]}BigInteger.prototype.divmod=function(v){var result=divModAny(this,v);return{quotient:result[0],remainder:result[1]}};NativeBigInt.prototype.divmod=SmallInteger.prototype.divmod=BigInteger.prototype.divmod;BigInteger.prototype.divide=function(v){return divModAny(this,v)[0]};NativeBigInt.prototype.over=NativeBigInt.prototype.divide=function(v){return new NativeBigInt(this.value/parseValue(v).value)};SmallInteger.prototype.over=SmallInteger.prototype.divide=BigInteger.prototype.over=BigInteger.prototype.divide;BigInteger.prototype.mod=function(v){return divModAny(this,v)[1]};NativeBigInt.prototype.mod=NativeBigInt.prototype.remainder=function(v){return new NativeBigInt(this.value%parseValue(v).value)};SmallInteger.prototype.remainder=SmallInteger.prototype.mod=BigInteger.prototype.remainder=BigInteger.prototype.mod;BigInteger.prototype.pow=function(v){var n=parseValue(v),a=this.value,b=n.value,value,x,y;if(b===0)return Integer[1];if(a===0)return Integer[0];if(a===1)return Integer[1];if(a===-1)return n.isEven()?Integer[1]:Integer[-1];if(n.sign){return Integer[0]}if(!n.isSmall)throw new Error("The exponent "+n.toString()+" is too large.");if(this.isSmall){if(isPrecise(value=Math.pow(a,b)))return new SmallInteger(truncate(value))}x=this;y=Integer[1];while(true){if(b&1===1){y=y.times(x);--b}if(b===0)break;b/=2;x=x.square()}return y};SmallInteger.prototype.pow=BigInteger.prototype.pow;NativeBigInt.prototype.pow=function(v){var n=parseValue(v);var a=this.value,b=n.value;var _0=BigInt(0),_1=BigInt(1),_2=BigInt(2);if(b===_0)return Integer[1];if(a===_0)return Integer[0];if(a===_1)return Integer[1];if(a===BigInt(-1))return n.isEven()?Integer[1]:Integer[-1];if(n.isNegative())return new NativeBigInt(_0);var x=this;var y=Integer[1];while(true){if((b&_1)===_1){y=y.times(x);--b}if(b===_0)break;b/=_2;x=x.square()}return y};BigInteger.prototype.modPow=function(exp,mod){exp=parseValue(exp);mod=parseValue(mod);if(mod.isZero())throw new Error("Cannot take modPow with modulus 0");var r=Integer[1],base=this.mod(mod);if(exp.isNegative()){exp=exp.multiply(Integer[-1]);base=base.modInv(mod)}while(exp.isPositive()){if(base.isZero())return Integer[0];if(exp.isOdd())r=r.multiply(base).mod(mod);exp=exp.divide(2);base=base.square().mod(mod)}return r};NativeBigInt.prototype.modPow=SmallInteger.prototype.modPow=BigInteger.prototype.modPow;function compareAbs(a,b){if(a.length!==b.length){return a.length>b.length?1:-1}for(var i=a.length-1;i>=0;i--){if(a[i]!==b[i])return a[i]>b[i]?1:-1}return 0}BigInteger.prototype.compareAbs=function(v){var n=parseValue(v),a=this.value,b=n.value;if(n.isSmall)return 1;return compareAbs(a,b)};SmallInteger.prototype.compareAbs=function(v){var n=parseValue(v),a=Math.abs(this.value),b=n.value;if(n.isSmall){b=Math.abs(b);return a===b?0:a>b?1:-1}return-1};NativeBigInt.prototype.compareAbs=function(v){var a=this.value;var b=parseValue(v).value;a=a>=0?a:-a;b=b>=0?b:-b;return a===b?0:a>b?1:-1};BigInteger.prototype.compare=function(v){if(v===Infinity){return-1}if(v===-Infinity){return 1}var n=parseValue(v),a=this.value,b=n.value;if(this.sign!==n.sign){return n.sign?1:-1}if(n.isSmall){return this.sign?-1:1}return compareAbs(a,b)*(this.sign?-1:1)};BigInteger.prototype.compareTo=BigInteger.prototype.compare;SmallInteger.prototype.compare=function(v){if(v===Infinity){return-1}if(v===-Infinity){return 1}var n=parseValue(v),a=this.value,b=n.value;if(n.isSmall){return a==b?0:a>b?1:-1}if(a<0!==n.sign){return a<0?-1:1}return a<0?1:-1};SmallInteger.prototype.compareTo=SmallInteger.prototype.compare;NativeBigInt.prototype.compare=function(v){if(v===Infinity){return-1}if(v===-Infinity){return 1}var a=this.value;var b=parseValue(v).value;return a===b?0:a>b?1:-1};NativeBigInt.prototype.compareTo=NativeBigInt.prototype.compare;BigInteger.prototype.equals=function(v){return this.compare(v)===0};NativeBigInt.prototype.eq=NativeBigInt.prototype.equals=SmallInteger.prototype.eq=SmallInteger.prototype.equals=BigInteger.prototype.eq=BigInteger.prototype.equals;BigInteger.prototype.notEquals=function(v){return this.compare(v)!==0};NativeBigInt.prototype.neq=NativeBigInt.prototype.notEquals=SmallInteger.prototype.neq=SmallInteger.prototype.notEquals=BigInteger.prototype.neq=BigInteger.prototype.notEquals;BigInteger.prototype.greater=function(v){return this.compare(v)>0};NativeBigInt.prototype.gt=NativeBigInt.prototype.greater=SmallInteger.prototype.gt=SmallInteger.prototype.greater=BigInteger.prototype.gt=BigInteger.prototype.greater;BigInteger.prototype.lesser=function(v){return this.compare(v)<0};NativeBigInt.prototype.lt=NativeBigInt.prototype.lesser=SmallInteger.prototype.lt=SmallInteger.prototype.lesser=BigInteger.prototype.lt=BigInteger.prototype.lesser;BigInteger.prototype.greaterOrEquals=function(v){return this.compare(v)>=0};NativeBigInt.prototype.geq=NativeBigInt.prototype.greaterOrEquals=SmallInteger.prototype.geq=SmallInteger.prototype.greaterOrEquals=BigInteger.prototype.geq=BigInteger.prototype.greaterOrEquals;BigInteger.prototype.lesserOrEquals=function(v){return this.compare(v)<=0};NativeBigInt.prototype.leq=NativeBigInt.prototype.lesserOrEquals=SmallInteger.prototype.leq=SmallInteger.prototype.lesserOrEquals=BigInteger.prototype.leq=BigInteger.prototype.lesserOrEquals;BigInteger.prototype.isEven=function(){return(this.value[0]&1)===0};SmallInteger.prototype.isEven=function(){return(this.value&1)===0};NativeBigInt.prototype.isEven=function(){return(this.value&BigInt(1))===BigInt(0)};BigInteger.prototype.isOdd=function(){return(this.value[0]&1)===1};SmallInteger.prototype.isOdd=function(){return(this.value&1)===1};NativeBigInt.prototype.isOdd=function(){return(this.value&BigInt(1))===BigInt(1)};BigInteger.prototype.isPositive=function(){return!this.sign};SmallInteger.prototype.isPositive=function(){return this.value>0};NativeBigInt.prototype.isPositive=SmallInteger.prototype.isPositive;BigInteger.prototype.isNegative=function(){return this.sign};SmallInteger.prototype.isNegative=function(){return this.value<0};NativeBigInt.prototype.isNegative=SmallInteger.prototype.isNegative;BigInteger.prototype.isUnit=function(){return false};SmallInteger.prototype.isUnit=function(){return Math.abs(this.value)===1};NativeBigInt.prototype.isUnit=function(){return this.abs().value===BigInt(1)};BigInteger.prototype.isZero=function(){return false};SmallInteger.prototype.isZero=function(){return this.value===0};NativeBigInt.prototype.isZero=function(){return this.value===BigInt(0)};BigInteger.prototype.isDivisibleBy=function(v){var n=parseValue(v);if(n.isZero())return false;if(n.isUnit())return true;if(n.compareAbs(2)===0)return this.isEven();return this.mod(n).isZero()};NativeBigInt.prototype.isDivisibleBy=SmallInteger.prototype.isDivisibleBy=BigInteger.prototype.isDivisibleBy;function isBasicPrime(v){var n=v.abs();if(n.isUnit())return false;if(n.equals(2)||n.equals(3)||n.equals(5))return true;if(n.isEven()||n.isDivisibleBy(3)||n.isDivisibleBy(5))return false;if(n.lesser(49))return true}function millerRabinTest(n,a){var nPrev=n.prev(),b=nPrev,r=0,d,t,i,x;while(b.isEven())b=b.divide(2),r++;next:for(i=0;i<a.length;i++){if(n.lesser(a[i]))continue;x=bigInt(a[i]).modPow(b,n);if(x.isUnit()||x.equals(nPrev))continue;for(d=r-1;d!=0;d--){x=x.square().mod(n);if(x.isUnit())return false;if(x.equals(nPrev))continue next}return false}return true}BigInteger.prototype.isPrime=function(strict){var isPrime=isBasicPrime(this);if(isPrime!==undefined)return isPrime;var n=this.abs();var bits=n.bitLength();if(bits<=64)return millerRabinTest(n,[2,3,5,7,11,13,17,19,23,29,31,37]);var logN=Math.log(2)*bits.toJSNumber();var t=Math.ceil(strict===true?2*Math.pow(logN,2):logN);for(var a=[],i=0;i<t;i++){a.push(bigInt(i+2))}return millerRabinTest(n,a)};NativeBigInt.prototype.isPrime=SmallInteger.prototype.isPrime=BigInteger.prototype.isPrime;BigInteger.prototype.isProbablePrime=function(iterations){var isPrime=isBasicPrime(this);if(isPrime!==undefined)return isPrime;var n=this.abs();var t=iterations===undefined?5:iterations;for(var a=[],i=0;i<t;i++){a.push(bigInt.randBetween(2,n.minus(2)))}return millerRabinTest(n,a)};NativeBigInt.prototype.isProbablePrime=SmallInteger.prototype.isProbablePrime=BigInteger.prototype.isProbablePrime;BigInteger.prototype.modInv=function(n){var t=bigInt.zero,newT=bigInt.one,r=parseValue(n),newR=this.abs(),q,lastT,lastR;while(!newR.isZero()){q=r.divide(newR);lastT=t;lastR=r;t=newT;r=newR;newT=lastT.subtract(q.multiply(newT));newR=lastR.subtract(q.multiply(newR))}if(!r.isUnit())throw new Error(this.toString()+" and "+n.toString()+" are not co-prime");if(t.compare(0)===-1){t=t.add(n)}if(this.isNegative()){return t.negate()}return t};NativeBigInt.prototype.modInv=SmallInteger.prototype.modInv=BigInteger.prototype.modInv;BigInteger.prototype.next=function(){var value=this.value;if(this.sign){return subtractSmall(value,1,this.sign)}return new BigInteger(addSmall(value,1),this.sign)};SmallInteger.prototype.next=function(){var value=this.value;if(value+1<MAX_INT)return new SmallInteger(value+1);return new BigInteger(MAX_INT_ARR,false)};NativeBigInt.prototype.next=function(){return new NativeBigInt(this.value+BigInt(1))};BigInteger.prototype.prev=function(){var value=this.value;if(this.sign){return new BigInteger(addSmall(value,1),true)}return subtractSmall(value,1,this.sign)};SmallInteger.prototype.prev=function(){var value=this.value;if(value-1>-MAX_INT)return new SmallInteger(value-1);return new BigInteger(MAX_INT_ARR,true)};NativeBigInt.prototype.prev=function(){return new NativeBigInt(this.value-BigInt(1))};var powersOfTwo=[1];while(2*powersOfTwo[powersOfTwo.length-1]<=BASE)powersOfTwo.push(2*powersOfTwo[powersOfTwo.length-1]);var powers2Length=powersOfTwo.length,highestPower2=powersOfTwo[powers2Length-1];function shift_isSmall(n){return Math.abs(n)<=BASE}BigInteger.prototype.shiftLeft=function(v){var n=parseValue(v).toJSNumber();if(!shift_isSmall(n)){throw new Error(String(n)+" is too large for shifting.")}if(n<0)return this.shiftRight(-n);var result=this;if(result.isZero())return result;while(n>=powers2Length){result=result.multiply(highestPower2);n-=powers2Length-1}return result.multiply(powersOfTwo[n])};NativeBigInt.prototype.shiftLeft=SmallInteger.prototype.shiftLeft=BigInteger.prototype.shiftLeft;BigInteger.prototype.shiftRight=function(v){var remQuo;var n=parseValue(v).toJSNumber();if(!shift_isSmall(n)){throw new Error(String(n)+" is too large for shifting.")}if(n<0)return this.shiftLeft(-n);var result=this;while(n>=powers2Length){if(result.isZero()||result.isNegative()&&result.isUnit())return result;remQuo=divModAny(result,highestPower2);result=remQuo[1].isNegative()?remQuo[0].prev():remQuo[0];n-=powers2Length-1}remQuo=divModAny(result,powersOfTwo[n]);return remQuo[1].isNegative()?remQuo[0].prev():remQuo[0]};NativeBigInt.prototype.shiftRight=SmallInteger.prototype.shiftRight=BigInteger.prototype.shiftRight;function bitwise(x,y,fn){y=parseValue(y);var xSign=x.isNegative(),ySign=y.isNegative();var xRem=xSign?x.not():x,yRem=ySign?y.not():y;var xDigit=0,yDigit=0;var xDivMod=null,yDivMod=null;var result=[];while(!xRem.isZero()||!yRem.isZero()){xDivMod=divModAny(xRem,highestPower2);xDigit=xDivMod[1].toJSNumber();if(xSign){xDigit=highestPower2-1-xDigit}yDivMod=divModAny(yRem,highestPower2);yDigit=yDivMod[1].toJSNumber();if(ySign){yDigit=highestPower2-1-yDigit}xRem=xDivMod[0];yRem=yDivMod[0];result.push(fn(xDigit,yDigit))}var sum=fn(xSign?1:0,ySign?1:0)!==0?bigInt(-1):bigInt(0);for(var i=result.length-1;i>=0;i-=1){sum=sum.multiply(highestPower2).add(bigInt(result[i]))}return sum}BigInteger.prototype.not=function(){return this.negate().prev()};NativeBigInt.prototype.not=SmallInteger.prototype.not=BigInteger.prototype.not;BigInteger.prototype.and=function(n){return bitwise(this,n,function(a,b){return a&b})};NativeBigInt.prototype.and=SmallInteger.prototype.and=BigInteger.prototype.and;BigInteger.prototype.or=function(n){return bitwise(this,n,function(a,b){return a|b})};NativeBigInt.prototype.or=SmallInteger.prototype.or=BigInteger.prototype.or;BigInteger.prototype.xor=function(n){return bitwise(this,n,function(a,b){return a^b})};NativeBigInt.prototype.xor=SmallInteger.prototype.xor=BigInteger.prototype.xor;var LOBMASK_I=1<<30,LOBMASK_BI=(BASE&-BASE)*(BASE&-BASE)|LOBMASK_I;function roughLOB(n){var v=n.value,x=typeof v==="number"?v|LOBMASK_I:typeof v==="bigint"?v|BigInt(LOBMASK_I):v[0]+v[1]*BASE|LOBMASK_BI;return x&-x}function integerLogarithm(value,base){if(base.compareTo(value)<=0){var tmp=integerLogarithm(value,base.square(base));var p=tmp.p;var e=tmp.e;var t=p.multiply(base);return t.compareTo(value)<=0?{p:t,e:e*2+1}:{p:p,e:e*2}}return{p:bigInt(1),e:0}}BigInteger.prototype.bitLength=function(){var n=this;if(n.compareTo(bigInt(0))<0){n=n.negate().subtract(bigInt(1))}if(n.compareTo(bigInt(0))===0){return bigInt(0)}return bigInt(integerLogarithm(n,bigInt(2)).e).add(bigInt(1))};NativeBigInt.prototype.bitLength=SmallInteger.prototype.bitLength=BigInteger.prototype.bitLength;function max(a,b){a=parseValue(a);b=parseValue(b);return a.greater(b)?a:b}function min(a,b){a=parseValue(a);b=parseValue(b);return a.lesser(b)?a:b}function gcd(a,b){a=parseValue(a).abs();b=parseValue(b).abs();if(a.equals(b))return a;if(a.isZero())return b;if(b.isZero())return a;var c=Integer[1],d,t;while(a.isEven()&&b.isEven()){d=min(roughLOB(a),roughLOB(b));a=a.divide(d);b=b.divide(d);c=c.multiply(d)}while(a.isEven()){a=a.divide(roughLOB(a))}do{while(b.isEven()){b=b.divide(roughLOB(b))}if(a.greater(b)){t=b;b=a;a=t}b=b.subtract(a)}while(!b.isZero());return c.isUnit()?a:a.multiply(c)}function lcm(a,b){a=parseValue(a).abs();b=parseValue(b).abs();return a.divide(gcd(a,b)).multiply(b)}function randBetween(a,b){a=parseValue(a);b=parseValue(b);var low=min(a,b),high=max(a,b);var range=high.subtract(low).add(1);if(range.isSmall)return low.add(Math.floor(Math.random()*range));var digits=toBase(range,BASE).value;var result=[],restricted=true;for(var i=0;i<digits.length;i++){var top=restricted?digits[i]:BASE;var digit=truncate(Math.random()*top);result.push(digit);if(digit<top)restricted=false}return low.add(Integer.fromArray(result,BASE,false))}var parseBase=function(text,base,alphabet,caseSensitive){alphabet=alphabet||DEFAULT_ALPHABET;text=String(text);if(!caseSensitive){text=text.toLowerCase();alphabet=alphabet.toLowerCase()}var length=text.length;var i;var absBase=Math.abs(base);var alphabetValues={};for(i=0;i<alphabet.length;i++){alphabetValues[alphabet[i]]=i}for(i=0;i<length;i++){var c=text[i];if(c==="-")continue;if(c in alphabetValues){if(alphabetValues[c]>=absBase){if(c==="1"&&absBase===1)continue;throw new Error(c+" is not a valid digit in base "+base+".")}}}base=parseValue(base);var digits=[];var isNegative=text[0]==="-";for(i=isNegative?1:0;i<text.length;i++){var c=text[i];if(c in alphabetValues)digits.push(parseValue(alphabetValues[c]));else if(c==="<"){var start=i;do{i++}while(text[i]!==">"&&i<text.length);digits.push(parseValue(text.slice(start+1,i)))}else throw new Error(c+" is not a valid character")}return parseBaseFromArray(digits,base,isNegative)};function parseBaseFromArray(digits,base,isNegative){var val=Integer[0],pow=Integer[1],i;for(i=digits.length-1;i>=0;i--){val=val.add(digits[i].times(pow));pow=pow.times(base)}return isNegative?val.negate():val}function stringify(digit,alphabet){alphabet=alphabet||DEFAULT_ALPHABET;if(digit<alphabet.length){return alphabet[digit]}return"<"+digit+">"}function toBase(n,base){base=bigInt(base);if(base.isZero()){if(n.isZero())return{value:[0],isNegative:false};throw new Error("Cannot convert nonzero numbers to base 0.")}if(base.equals(-1)){if(n.isZero())return{value:[0],isNegative:false};if(n.isNegative())return{value:[].concat.apply([],Array.apply(null,Array(-n.toJSNumber())).map(Array.prototype.valueOf,[1,0])),isNegative:false};var arr=Array.apply(null,Array(n.toJSNumber()-1)).map(Array.prototype.valueOf,[0,1]);arr.unshift([1]);return{value:[].concat.apply([],arr),isNegative:false}}var neg=false;if(n.isNegative()&&base.isPositive()){neg=true;n=n.abs()}if(base.isUnit()){if(n.isZero())return{value:[0],isNegative:false};return{value:Array.apply(null,Array(n.toJSNumber())).map(Number.prototype.valueOf,1),isNegative:neg}}var out=[];var left=n,divmod;while(left.isNegative()||left.compareAbs(base)>=0){divmod=left.divmod(base);left=divmod.quotient;var digit=divmod.remainder;if(digit.isNegative()){digit=base.minus(digit).abs();left=left.next()}out.push(digit.toJSNumber())}out.push(left.toJSNumber());return{value:out.reverse(),isNegative:neg}}function toBaseString(n,base,alphabet){var arr=toBase(n,base);return(arr.isNegative?"-":"")+arr.value.map(function(x){return stringify(x,alphabet)}).join("")}BigInteger.prototype.toArray=function(radix){return toBase(this,radix)};SmallInteger.prototype.toArray=function(radix){return toBase(this,radix)};NativeBigInt.prototype.toArray=function(radix){return toBase(this,radix)};BigInteger.prototype.toString=function(radix,alphabet){if(radix===undefined)radix=10;if(radix!==10)return toBaseString(this,radix,alphabet);var v=this.value,l=v.length,str=String(v[--l]),zeros="0000000",digit;while(--l>=0){digit=String(v[l]);str+=zeros.slice(digit.length)+digit}var sign=this.sign?"-":"";return sign+str};SmallInteger.prototype.toString=function(radix,alphabet){if(radix===undefined)radix=10;if(radix!=10)return toBaseString(this,radix,alphabet);return String(this.value)};NativeBigInt.prototype.toString=SmallInteger.prototype.toString;NativeBigInt.prototype.toJSON=BigInteger.prototype.toJSON=SmallInteger.prototype.toJSON=function(){return this.toString()};BigInteger.prototype.valueOf=function(){return parseInt(this.toString(),10)};BigInteger.prototype.toJSNumber=BigInteger.prototype.valueOf;SmallInteger.prototype.valueOf=function(){return this.value};SmallInteger.prototype.toJSNumber=SmallInteger.prototype.valueOf;NativeBigInt.prototype.valueOf=NativeBigInt.prototype.toJSNumber=function(){return parseInt(this.toString(),10)};function parseStringValue(v){if(isPrecise(+v)){var x=+v;if(x===truncate(x))return supportsNativeBigInt?new NativeBigInt(BigInt(x)):new SmallInteger(x);throw new Error("Invalid integer: "+v)}var sign=v[0]==="-";if(sign)v=v.slice(1);var split=v.split(/e/i);if(split.length>2)throw new Error("Invalid integer: "+split.join("e"));if(split.length===2){var exp=split[1];if(exp[0]==="+")exp=exp.slice(1);exp=+exp;if(exp!==truncate(exp)||!isPrecise(exp))throw new Error("Invalid integer: "+exp+" is not a valid exponent.");var text=split[0];var decimalPlace=text.indexOf(".");if(decimalPlace>=0){exp-=text.length-decimalPlace-1;text=text.slice(0,decimalPlace)+text.slice(decimalPlace+1)}if(exp<0)throw new Error("Cannot include negative exponent part for integers");text+=new Array(exp+1).join("0");v=text}var isValid=/^([0-9][0-9]*)$/.test(v);if(!isValid)throw new Error("Invalid integer: "+v);if(supportsNativeBigInt){return new NativeBigInt(BigInt(sign?"-"+v:v))}var r=[],max=v.length,l=LOG_BASE,min=max-l;while(max>0){r.push(+v.slice(min,max));min-=l;if(min<0)min=0;max-=l}trim(r);return new BigInteger(r,sign)}function parseNumberValue(v){if(supportsNativeBigInt){return new NativeBigInt(BigInt(v))}if(isPrecise(v)){if(v!==truncate(v))throw new Error(v+" is not an integer.");return new SmallInteger(v)}return parseStringValue(v.toString())}function parseValue(v){if(typeof v==="number"){return parseNumberValue(v)}if(typeof v==="string"){return parseStringValue(v)}if(typeof v==="bigint"){return new NativeBigInt(v)}return v}for(var i=0;i<1e3;i++){Integer[i]=parseValue(i);if(i>0)Integer[-i]=parseValue(-i)}Integer.one=Integer[1];Integer.zero=Integer[0];Integer.minusOne=Integer[-1];Integer.max=max;Integer.min=min;Integer.gcd=gcd;Integer.lcm=lcm;Integer.isInstance=function(x){return x instanceof BigInteger||x instanceof SmallInteger||x instanceof NativeBigInt};Integer.randBetween=randBetween;Integer.fromArray=function(digits,base,isNegative){return parseBaseFromArray(digits.map(parseValue),parseValue(base||10),isNegative)};return Integer}();if(typeof module!=="undefined"&&module.hasOwnProperty("exports")){module.exports=bigInt}if(typeof define==="function"&&define.amd){define("big-integer",[],function(){return bigInt})}

const ROUNDS = 220;
const p = bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const c = [
  "0",
  "7120861356467848435263064379192047478074060781135320967663101236819528304084",
  "5024705281721889198577876690145313457398658950011302225525409148828000436681",
  "17980351014018068290387269214713820287804403312720763401943303895585469787384",
  "19886576439381707240399940949310933992335779767309383709787331470398675714258",
  "1213715278223786725806155661738676903520350859678319590331207960381534602599",
  "18162138253399958831050545255414688239130588254891200470934232514682584734511",
  "7667462281466170157858259197976388676420847047604921256361474169980037581876",
  "7207551498477838452286210989212982851118089401128156132319807392460388436957",
  "9864183311657946807255900203841777810810224615118629957816193727554621093838",
  "4798196928559910300796064665904583125427459076060519468052008159779219347957",
  "17387238494588145257484818061490088963673275521250153686214197573695921400950",
  "10005334761930299057035055370088813230849810566234116771751925093634136574742",
  "11897542014760736209670863723231849628230383119798486487899539017466261308762",
  "16771780563523793011283273687253985566177232886900511371656074413362142152543",
  "749264854018824809464168489785113337925400687349357088413132714480582918506",
  "3683645737503705042628598550438395339383572464204988015434959428676652575331",
  "7556750851783822914673316211129907782679509728346361368978891584375551186255",
  "20391289379084797414557439284689954098721219201171527383291525676334308303023",
  "18146517657445423462330854383025300323335289319277199154920964274562014376193",
  "8080173465267536232534446836148661251987053305394647905212781979099916615292",
  "10796443006899450245502071131975731672911747129805343722228413358507805531141",
  "5404287610364961067658660283245291234008692303120470305032076412056764726509",
  "4623894483395123520243967718315330178025957095502546813929290333264120223168",
  "16845753148201777192406958674202574751725237939980634861948953189320362207797",
  "4622170486584704769521001011395820886029808520586507873417553166762370293671",
  "16688277490485052681847773549197928630624828392248424077804829676011512392564",
  "11878652861183667748838188993669912629573713271883125458838494308957689090959",
  "2436445725746972287496138382764643208791713986676129260589667864467010129482",
  "1888098689545151571063267806606510032698677328923740058080630641742325067877",
  "148924106504065664829055598316821983869409581623245780505601526786791681102",
  "18875020877782404439294079398043479420415331640996249745272087358069018086569",
  "15189693413320228845990326214136820307649565437237093707846682797649429515840",
  "19669450123472657781282985229369348220906547335081730205028099210442632534079",
  "5521922218264623411380547905210139511350706092570900075727555783240701821773",
  "4144769320246558352780591737261172907511489963810975650573703217887429086546",
  "10097732913112662248360143041019433907849917041759137293018029019134392559350",
  "1720059427972723034107765345743336447947522473310069975142483982753181038321",
  "6302388219880227251325608388535181451187131054211388356563634768253301290116",
  "6745410632962119604799318394592010194450845483518862700079921360015766217097",
  "10858157235265583624235850660462324469799552996870780238992046963007491306222",
  "20241898894740093733047052816576694435372877719072347814065227797906130857593",
  "10165780782761211520836029617746977303303335603838343292431760011576528327409",
  "2832093654883670345969792724123161241696170611611744759675180839473215203706",
  "153011722355526826233082383360057587249818749719433916258246100068258954737",
  "20196970640587451358539129330170636295243141659030208529338914906436009086943",
  "3180973917010545328313139835982464870638521890385603025657430208141494469656",
  "17198004293191777441573635123110935015228014028618868252989374962722329283022",
  "7642160509228669138628515458941659189680509753651629476399516332224325757132",
  "19346204940546791021518535594447257347218878114049998691060016493806845179755",
  "11501810868606870391127866188394535330696206817602260610801897042898616817272",
  "3113973447392053821824427670386252797811804954746053461397972968381571297505",
  "6545064306297957002139416752334741502722251869537551068239642131448768236585",
  "5203908808704813498389265425172875593837960384349653691918590736979872578408",
  "2246692432011290582160062129070762007374502637007107318105405626910313810224",
  "11760570435432189127645691249600821064883781677693087773459065574359292849137",
  "5543749482491340532547407723464609328207990784853381797689466144924198391839",
  "8837549193990558762776520822018694066937602576881497343584903902880277769302",
  "12855514863299373699594410385788943772765811961581749194183533625311486462501",
  "5363660674689121676875069134269386492382220935599781121306637800261912519729",
  "13162342403579303950549728848130828093497701266240457479693991108217307949435",
  "916941639326869583414469202910306428966657806899788970948781207501251816730",
  "15618589556584434434009868216186115416835494805174158488636000580759692174228",
  "8959562060028569701043973060670353733575345393653685776974948916988033453971",
  "16390754464333401712265575949874369157699293840516802426621216808905079127650",
  "168282396747788514908709091757591226095443902501365500003618183905496160435",
  "8327443473179334761744301768309008451162322941906921742120510244986704677004",
  "17213012626801210615058753489149961717422101711567228037597150941152495100640",
  "10394369641533736715250242399198097296122982486516256408681925424076248952280",
  "17784386835392322654196171115293700800825771210400152504776806618892170162248",
  "16533189939837087893364000390641148516479148564190420358849587959161226782982",
  "18725396114211370207078434315900726338547621160475533496863298091023511945076",
  "7132325028834551397904855671244375895110341505383911719294705267624034122405",
  "148317947440800089795933930720822493695520852448386394775371401743494965187",
  "19001050671757720352890779127693793630251266879994702723636759889378387053056",
  "18824274411769830274877839365728651108434404855803844568234862945613766611460",
  "12771414330193951156383998390424063470766226667986423961689712557338777174205",
  "11332046574800279729678603488745295198038913503395629790213378101166488244657",
  "9607550223176946388146938069307456967842408600269548190739947540821716354749",
  "8756385288462344550200229174435953103162307705310807828651304665320046782583",
  "176061952957067086877570020242717222844908281373122372938833890096257042779",
  "12200212977482648306758992405065921724409841940671166017620928947866825250857",
  "10868453624107875516866146499877130701929063632959660262366632833504750028858",
  "2016095394399807253596787752134573207202567875457560571095586743878953450738",
  "21815578223768330433802113452339488275704145896544481092014911825656390567514",
  "4923772847693564777744725640710197015181591950368494148029046443433103381621",
  "1813584943682214789802230765734821149202472893379265320098816901270224589984",
  "10810123816265612772922113403831964815724109728287572256602010709288980656498",
  "1153669123397255702524721206511185557982017410156956216465120456256288427021",
  "5007518659266430200134478928344522649876467369278722765097865662497773767152",
  "2511432546938591792036639990606464315121646668029252285288323664350666551637",
  "32883284540320451295484135704808083452381176816565850047310272290579727564",
  "10484856914279112612610993418405543310546746652738541161791501150994088679557",
  "2026733759645519472558796412979210009170379159866522399881566309631434814953",
  "14731806221235869882801331463708736361296174006732553130708107037190460654379",
  "14740327483193277147065845135561988641238516852487657117813536909482068950652",
  "18787428285295558781869865751953016580493190547148386433580291216673009884554",
  "3804047064713122820157099453648459188816376755739202017447862327783289895072",
  "16709604795697901641948603019242067672006293290826991671766611326262532802914",
  "11061717085931490100602849654034280576915102867237101935487893025907907250695",
  "2821730726367472966906149684046356272806484545281639696873240305052362149654",
  "17467794879902895769410571945152708684493991588672014763135370927880883292655",
  "1571520786233540988201616650622796363168031165456869481368085474420849243232",
  "10041051776251223165849354194892664881051125330236567356945669006147134614302",
  "3981753758468103976812813304477670033098707002886030847251581853700311567551",
  "4365864398105436789177703571412645548020537580493599380018290523813331678900",
  "2391801327305361293476178683853802679507598622000359948432171562543560193350",
  "214219368547551689972421167733597094823289857206402800635962137077096090722",
  "18192064100315141084242006659317257023098826945893371479835220462302399655674",
  "15487549757142039139328911515400805508248576685795694919457041092150651939253",
  "10142447197759703415402259672441315777933858467700579946665223821199077641122",
  "11246573086260753259993971254725613211193686683988426513880826148090811891866",
  "6574066859860991369704567902211886840188702386542112593710271426704432301235",
  "11311085442652291634822798307831431035776248927202286895207125867542470350078",
  "20977948360215259915441258687649465618185769343138135384346964466965010873779",
  "792781492853909872425531014397300057232399608769451037135936617996830018501",
  "5027602491523497423798779154966735896562099398367163998686335127580757861872",
  "14595204575654316237672764823862241845410365278802914304953002937313300553572",
  "13973538843621261113924259058427434053808430378163734641175100160836376897004",
  "16395063164993626722686882727042150241125309409717445381854913964674649318585",
  "8465768840047024550750516678171433288207841931251654898809033371655109266663",
  "21345603324471810861925019445720576814602636473739003852898308205213912255830",
  "21171984405852590343970239018692870799717057961108910523876770029017785940991",
  "10761027113757988230637066281488532903174559953630210849190212601991063767647",
  "6678298831065390834922566306988418588227382406175769592902974103663687992230",
  "4993662582188632374202316265508850988596880036291765531885657575099537176757",
  "18364168158495573675698600238443218434246806358811328083953887470513967121206",
  "3506345610354615013737144848471391553141006285964325596214723571988011984829",
  "248732676202643792226973868626360612151424823368345645514532870586234380100",
  "10090204501612803176317709245679152331057882187411777688746797044706063410969",
  "21297149835078365363970699581821844234354988617890041296044775371855432973500",
  "16729368143229828574342820060716366330476985824952922184463387490091156065099",
  "4467191506765339364971058668792642195242197133011672559453028147641428433293",
  "8677548159358013363291014307402600830078662555833653517843708051504582990832",
  "1022951765127126818581466247360193856197472064872288389992480993218645055345",
  "1888195070251580606973417065636430294417895423429240431595054184472931224452",
  "4221265384902749246920810956363310125115516771964522748896154428740238579824",
  "2825393571154632139467378429077438870179957021959813965940638905853993971879",
  "19171031072692942278056619599721228021635671304612437350119663236604712493093",
  "10780807212297131186617505517708903709488273075252405602261683478333331220733",
  "18230936781133176044598070768084230333433368654744509969087239465125979720995",
  "16901065971871379877929280081392692752968612240624985552337779093292740763381",
  "146494141603558321291767829522948454429758543710648402457451799015963102253",
  "2492729278659146790410698334997955258248120870028541691998279257260289595548",
  "2204224910006646535594933495262085193210692406133533679934843341237521233504",
  "16062117410185840274616925297332331018523844434907012275592638570193234893570",
  "5894928453677122829055071981254202951712129328678534592916926069506935491729",
  "4947482739415078212217504789923078546034438919537985740403824517728200332286",
  "16143265650645676880461646123844627780378251900510645261875867423498913438066",
  "397690828254561723549349897112473766901585444153303054845160673059519614409",
  "11272653598912269895509621181205395118899451234151664604248382803490621227687",
  "15566927854306879444693061574322104423426072650522411176731130806720753591030",
  "14222898219492484180162096141564251903058269177856173968147960855133048449557",
  "16690275395485630428127725067513114066329712673106153451801968992299636791385",
  "3667030990325966886479548860429670833692690972701471494757671819017808678584",
  "21280039024501430842616328642522421302481259067470872421086939673482530783142",
  "15895485136902450169492923978042129726601461603404514670348703312850236146328",
  "7733050956302327984762132317027414325566202380840692458138724610131603812560",
  "438123800976401478772659663183448617575635636575786782566035096946820525816",
  "814913922521637742587885320797606426167962526342166512693085292151314976633",
  "12368712287081330853637674140264759478736012797026621876924395982504369598764",
  "2494806857395134874309386694756263421445039103814920780777601708371037591569",
  "16101132301514338989512946061786320637179843435886825102406248183507106312877",
  "6252650284989960032925831409804233477770646333900692286731621844532438095656",
  "9277135875276787021836189566799935097400042171346561246305113339462708861695",
  "10493603554686607050979497281838644324893776154179810893893660722522945589063",
  "8673089750662709235894359384294076697329948991010184356091130382437645649279",
  "9558393272910366944245875920138649617479779893610128634419086981339060613250",
  "19012287860122586147374214541764572282814469237161122489573881644994964647218",
  "9783723818270121678386992630754842961728702994964214799008457449989291229500",
  "15550788416669474113213749561488122552422887538676036667630838378023479382689",
  "15016165746156232864069722572047169071786333815661109750860165034341572904221",
  "6506225705710197163670556961299945987488979904603689017479840649664564978574",
  "10796631184889302076168355684722130903785890709107732067446714470783437829037",
  "19871836214837460419845806980869387567383718044439891735114283113359312279540",
  "20871081766843466343749609089986071784031203517506781251203251608363835140622",
  "5100105771517691442278432864090229416166996183792075307747582375962855820797",
  "8777887112076272395250620301071581171386440850451972412060638225741125310886",
  "5300440870136391278944213332144327695659161151625757537632832724102670898756",
  "1205448543652932944633962232545707633928124666868453915721030884663332604536",
  "5542499997310181530432302492142574333860449305424174466698068685590909336771",
  "11028094245762332275225364962905938096659249161369092798505554939952525894293",
  "19187314764836593118404597958543112407224947638377479622725713735224279297009",
  "17047263688548829001253658727764731047114098556534482052135734487985276987385",
  "19914849528178967155534624144358541535306360577227460456855821557421213606310",
  "2929658084700714257515872921366736697080475676508114973627124569375444665664",
  "15092262360719700162343163278648422751610766427236295023221516498310468956361",
  "21578580340755653236050830649990190843552802306886938815497471545814130084980",
  "1258781501221760320019859066036073675029057285507345332959539295621677296991",
  "3819598418157732134449049289585680301176983019643974929528867686268702720163",
  "8653175945487997845203439345797943132543211416447757110963967501177317426221",
  "6614652990340435611114076169697104582524566019034036680161902142028967568142",
  "19212515502973904821995111796203064175854996071497099383090983975618035391558",
  "18664315914479294273286016871365663486061896605232511201418576829062292269769",
  "11498264615058604317482574216318586415670903094838791165247179252175768794889",
  "10814026414212439999107945133852431304483604215416531759535467355316227331774",
  "17566185590731088197064706533119299946752127014428399631467913813769853431107",
  "14016139747289624978792446847000951708158212463304817001882956166752906714332",
  "8242601581342441750402731523736202888792436665415852106196418942315563860366",
  "9244680976345080074252591214216060854998619670381671198295645618515047080988",
  "12216779172735125538689875667307129262237123728082657485828359100719208190116",
  "10702811721859145441471328511968332847175733707711670171718794132331147396634",
  "6479667912792222539919362076122453947926362746906450079329453150607427372979",
  "15117544653571553820496948522381772148324367479772362833334593000535648316185",
  "6842203153996907264167856337497139692895299874139131328642472698663046726780",
  "12732823292801537626009139514048596316076834307941224506504666470961250728055",
  "6936272626871035740815028148058841877090860312517423346335878088297448888663",
  "17297554111853491139852678417579991271009602631577069694853813331124433680030",
  "16641596134749940573104316021365063031319260205559553673368334842484345864859",
  "7400481189785154329569470986896455371037813715804007747228648863919991399081",
  "2273205422216987330510475127669563545720586464429614439716564154166712854048",
  "15162538063742142685306302282127534305212832649282186184583465569986719234456",
  "5628039096440332922248578319648483863204530861778160259559031331287721255522",
  "16085392195894691829567913404182676871326863890140775376809129785155092531260",
  "14227467863135365427954093998621993651369686288941275436795622973781503444257",
  "18224457394066545825553407391290108485121649197258948320896164404518684305122",
  "274945154732293792784580363548970818611304339008964723447672490026510689427",
  "11050822248291117548220126630860474473945266276626263036056336623671308219529",
  "2119542016932434047340813757208803962484943912710204325088879681995922344971",
  "0"
].map(n => bigInt(n));

class FeistelState {
  constructor (rounds, k) {
    this.l = bigInt(0);
    this.r = bigInt(0);
    this.rounds = rounds;
    this.k = k;
  }

  inject(elt) {
    this.l = this.l.add(elt).mod(p);
  }

  mix() {
    for (let i=0; i<this.rounds-1; i++) {
      let t = this.k.add(this.l).add(c[i]).mod(p);
      let l_new = t.modPow(5, p).add(this.r).mod(p);
      this.r = this.l;
      this.l = l_new;
    }
    let t = this.k.add(this.l).add(c[this.rounds-1]).mod(p);
    this.r = t.modPow(5, p).add(this.r).mod(p);
  }
}

function mimcSponge(inputs, n_outputs, rounds){
  let state = new FeistelState(rounds, bigInt(0));
  for (let elt of inputs){
    state.inject(elt);
    state.mix();
  }
  let outputs = [state.l];
  for (let i=0; i<n_outputs-1; i++){
    state.mix();
    outputs.push(state.l);
  }
  return outputs;
}

const mimcHash = (...inputs) => {
  return mimcSponge(inputs.map(n => bigInt(n)), 1, ROUNDS)[0];
};

// this is a little not kosher apparently
if (this.document !== undefined) {
  window.mimcHash = mimcHash;
}
