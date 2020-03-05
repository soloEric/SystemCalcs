export {Wire, WireScheduleItem};

class WireScheduleItem {
    /**
     * 
     * @param {Integer} tagNum tag label
     * @param {Array} wires array of wire objects
     * @param {String} altInput string to hold additional information for the over all tag 
     */
    constructor(tagNum, wires, altInput) {
        this.tagNum = tagNum;
        this.wires = wires;
        this.altInput = fixNull(altInput);
    }
    _fixNull(item) {
        if (item == null || item == undefined) return "";
        else return item;
    }
}

class Wire {
    /**
     * toString to print out line
     * @param {Integer} number 
     * @param {String} gauge calculated by the sysCalc getSegmentWireSize
     * @param {String} wireType wire descriptor such as AWG THWN-2 or THHN
     * @param {String} wireTypeAlt alt wire descriptor such as 10/2 NM-B
     * @param {String} material copper or aluminum
     * @param {String} label POSITIVE, NEGATIVE, GROUND
     */
    constructor(number, gauge, wireType, wireTypeAlt, material, label) {
        this.number = fixNull(number);
        this.gauge = fixNull(gauge);
        this.wireType = fixNull(wireType);
        this.wireTypeAlt = fixNull(wireTypeAlt);
        this.material = fixNull(material);
        this.label = fixNull(label);
    }
    
    _fixNull(item) {
        if (item == null || item == undefined) return "";
        else return item;
    }

    toString() {
        if (this.wireTypeAlt) {
            this.wireTypeAlt = `or ${this.wireTypeAlt}`;
        } else {
            this.wireTypeAlt = "";
        }
        return `(${this.number})\t${this.gauge} ${this.wireType}, ${this.wireTypeAlt}, ${this.material}, - (${this.label})`;
    }
}

