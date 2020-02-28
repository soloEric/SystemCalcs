const system = require('../sysCalcs');
const chai = require('chai');
var expect = chai.expect;

describe("System Calc Tests:", () => {

    it("OCPD Fused Calc", done => {
        expect(system.solarOCPDCalc(1, 47.5, true, false)).equals(60); // 1 SolarEdge SE11400H-US (240V)
        expect(system.solarOCPDCalc(33, 1.21, true, false)).equals(50); // 33 Enphase IQ7PLUS-72-2-US
        expect(system.solarOCPDCalc(1, 12.5, true, false)).equals(20); // 1 SolarEdge SE3800H-US (240V)
        expect(system.solarOCPDCalc(8, 1, true, false)).equals(20); // 8 Enphase IQ7-60-2-US
        expect(system.solarOCPDCalc(8, 1, false, true)).equals(20); // 8 Enphase IQ7-60-2-US

        done();
    });

    it("OCPD nonfused , noncommon calc", done => {
        expect(system.solarOCPDCalc(8, 1, false, false)).equals(15); // 8 Enphase IQ7-60-2-US, pulls from Standard Breakers list
        expect(system.solarOCPDCalc(10, 1, false, false)).equals(15); // 8 Enphase IQ7-60-2-US, pulls from Standard Breakers list
        expect(system.solarOCPDCalc(15, 1, false, false)).equals(20); // 8 Enphase IQ7-60-2-US, pulls from Standard Breakers list
        expect(system.solarOCPDCalc(18, 1, false, false)).equals(25); // 8 Enphase IQ7-60-2-US, pulls from Standard Breakers list
        done();
    });

    it("Get AC Disco Size for Tap", done =>{
        expect(system.getACDiscoSize(8, 1, true)).equals(60); // 8 Enphase IQ7-60-2-US
        expect(system.getACDiscoSize(50, 1, true)).equals(100); // 50 Enphase IQ7-60-2-US
        done();
    });

    it("Get AC Disco Size non Tap", done => {
        expect(system.getACDiscoSize(8, 1, false)).equals(30); // 8 Enphase IQ7-60-2-US
        expect(system.getACDiscoSize(24, 1, false)).equals(30); // 24 Enphase IQ7-60-2-US
        expect(system.getACDiscoSize(25, 1, false)).equals(60); // 25 Enphase IQ7-60-2-US
        done();
    });

});