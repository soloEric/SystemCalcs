

class WireScheduleItem {
    /**
     * 
     * @param {Integer} tagNum tag label
     * @param {Array} wires array of wire objects
     * @param {String} conduitCallout string to hold additional information for the over all tag 
     */
    constructor(tagNum, wires, conduitCallout) {
        this.tagNum = tagNum;
        this.wires = wires;
        this.conduitCallout = this._fixNull(conduitCallout);
        if (this.conduitCallout != "") {
            this.conduitCallout += " (OR CODE APPROVED EQUIVALENT)";
        }
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
        this.number = this._fixNull(number);
        this.gauge = this._fixNull(gauge);
        this.wireType = this._fixNull(wireType);
        this.wireTypeAlt = this._fixNull(wireTypeAlt);
        this.material = this._fixNull(material);
        this.label = this._fixNull(label);
    }

    _fixNull(item) {
        if (item == null || item == undefined) return "";
        else return item;
    }

    getString() {
        if (this.wireTypeAlt) {
            this.wireTypeAlt = `or ${this.wireTypeAlt}, `;
        } else {
            this.wireTypeAlt = "";
        }
        return `(${this.number})\t${this.gauge.gauge} ${this.wireType}, ${this.wireTypeAlt}${this.material} - (${this.label})`;
    }
}

module.exports =  {Wire, WireScheduleItem};