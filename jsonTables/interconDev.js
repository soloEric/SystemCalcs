const subPanelAddIn = 'Subpanel Add In';
const supplySideBreaker = 'Supply Side Breaker';
const mainPanelUpgrade = 'Main Panel Upgrade';
const deratedMain = 'Derated Main Load Side Breaker';
const loadSideBreakerFile = 'Load Side Breaker';
const subPanelBreaker = 'Subpanel Breaker';
const redirectedMain = 'Re-directed Main';
const meterCanTapFile = 'Meter Can Tap';
const supplyTap = 'Supply Side Tap';
const loadSideTapFile = 'Load Side Tap';
const solarReady = 'Solar Ready Breaker';
const withSmartManagementModule = 'with Smart Management Module';
const withSixDisco = '6 disco';
const db = require('../../db');
const standard_sizes = [
  15,
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  60,
  70,
  80,
  90,
  100,
  110,
  125,
  150,
  175,
  200,
  225,
  250,
  300,
  350,
  400,
  450,
  500,
  600,
  700,
  800,
  1000,
  1200,
  1600,
  2000,
  2500,
  3000,
  4000,
  5000,
  6000,
];
// solarAvailabilityDifference
//FIX: add pvBreaker from sysCalcs.calculateSolarOCPD, as an input
function maxPvBreakerCalculator(busbar, mainBreaker, factorInput, pvBreaker) { //changed
  if (mainBreaker === 0) {
    return busbar;
  } else if (mainBreaker > 1) {
    return (busbar * factorInput) - (mainBreaker + pvBreaker); // changed
  }
  return;
}
// NOTE: pvBreaker here is the same as pvBreaker from sysCalcs.calculateSolarOCPD
function calculateDerate(busbarRating, mainBreaker, factorInput, pvBreaker) {
  let i = standard_sizes.indexOf(mainBreaker);
  let myOcpd = standard_sizes[i];
  // do sad calc on ocpd, if less than 0
  // decrement the index until sad calc returns greater than 0
  // if sad returns false exit the loop
  let success = false;
  while (myOcpd > 100 && i >= 0) { // changed to prevent invalid access index
    if (
      maxPvBreakerCalculator(busbarRating, myOcpd, factorInput, pvBreaker) >= 0 //changed
    ) {
      success = true;
      break;
    } else {
      // decrement index
      --i;
      myOcpd = standard_sizes[i];
    }
  }
  return success; // changed
}

// NOTE: pvBreaker here is the same as pvBreaker from sysCalcs.calculateSolarOCPD
const interconnectionCalculator = async ({
  busbarRating,
  mainBreaker,
  factorInput,
  pvBreaker,
  breakerSpaceAvailable,
  mmc,
  ahjTaps,
  utilityTaps,
  meterCanTap,
  quad,
  hasSub,
  subBreakerSpaceAvailable,
  subBusbar,
  subMainBreaker,
  mainBreakerOnly,
  wireSizeAmpacity,
  hasGenerator,
  solarSlotReady,
}) => {
  let interconnections = [];
  function findAndModifyFile(fileName, addition) {
    const index = interconnections.indexOf(fileName);
    if (index === -1) return;
    interconnections.splice(index, 1, `${fileName} ${addition}`);
  }
  const solarAvailablityDifference =
    maxPvBreakerCalculator(busbarRating, mainBreaker, factorInput, pvBreaker) >= //changed
    0;
  const subSolarAvailablityDifference =
    hasSub &&
    maxPvBreakerCalculator(subBusbar, subMainBreaker, factorInput, pvBreaker) >= //changed
      0;
  const mainBreakerIsZero = mainBreaker === 0;
  // change name
  const mainBreakerIsOneHundred = mainBreaker > 100;
  const deRate = calculateDerate(
    busbarRating,
    mainBreaker,
    factorInput,
    pvBreaker
  );
  const loadSideTap =
    wireSizeAmpacity === undefined
      ? false
      : pvBreaker + mainBreaker < wireSizeAmpacity;
  if (mainBreakerOnly) breakerSpaceAvailable = true;
  if (solarSlotReady) interconnections.push(solarReady);
  if (mainBreaker === 0) {
    const breakerFile =
      pvBreaker > busbarRating
        ? mainPanelUpgrade
        : breakerSpaceAvailable && mainBreakerIsZero // changed
        ? supplySideBreaker
        : subPanelAddIn;
    interconnections.push(breakerFile);
  }
  if (breakerSpaceAvailable) {
    if (solarAvailablityDifference) interconnections.push(loadSideBreakerFile);
    else {
      if (mainBreakerIsOneHundred && deRate) interconnections.push(deratedMain);
      if (mainBreakerIsOneHundred && !deRate)
        interconnections.push(mainPanelUpgrade);
      if (!mainBreakerIsOneHundred) interconnections.push(mainPanelUpgrade);
      if (!mainBreakerIsZero) interconnections.push(mainPanelUpgrade);
    }
  } else {
    if (quad) {
      interconnections.push(loadSideBreakerFile);
    } else {
      if (subBreakerSpaceAvailable && subSolarAvailablityDifference && !mmc) {
        const fileName = ahjTaps && utilityTaps ? supplyTap : subPanelBreaker; // changed
        interconnections.push(fileName);
      }
      if (subBreakerSpaceAvailable && subSolarAvailablityDifference && mmc)
        interconnections.push(subPanelBreaker); // changed
      if (subBreakerSpaceAvailable && !subSolarAvailablityDifference)
        interconnections.push(subPanelAddIn);
      if (subBreakerSpaceAvailable && subSolarAvailablityDifference)
        interconnections.push(subPanelBreaker);
      if (!subBreakerSpaceAvailable && mainBreakerOnly)
        interconnections.push(redirectedMain);
      if (
        !subBreakerSpaceAvailable &&
        !mainBreakerOnly &&
        !mmc &&
        ahjTaps &&
        utilityTaps
      )
        interconnections.push(supplyTap);
      if (
        !subBreakerSpaceAvailable &&
        !mainBreakerOnly &&
        !mmc &&
        ahjTaps &&
        !utilityTaps
      )
        interconnections.push(mainPanelUpgrade);
      if (!subBreakerSpaceAvailable && !mainBreakerOnly && !mmc && !ahjTaps)
        interconnections.push(mainPanelUpgrade);
    }
    if (!solarAvailablityDifference) {
      interconnections.push(subPanelAddIn);
    } else {
      interconnections.push(mainPanelUpgrade);
    }
  }
  if (!breakerSpaceAvailable && ahjTaps && utilityTaps && loadSideTap)
    interconnections.push(loadSideTapFile);
  if (meterCanTap) interconnections.push(meterCanTapFile);
  if (!meterCanTap && !mmc && ahjTaps && utilityTaps)
    interconnections.push(supplyTap);
  if (hasGenerator) {
    findAndModifyFile(loadSideBreakerFile, withSmartManagementModule);
    findAndModifyFile(deratedMain, withSmartManagementModule);
    findAndModifyFile(redirectedMain, withSmartManagementModule);
    findAndModifyFile(subPanelAddIn, withSmartManagementModule);
    findAndModifyFile(loadSideTapFile, withSmartManagementModule);
  }
  if (mainBreakerIsZero) {
    findAndModifyFile(supplyTap, withSixDisco);
    findAndModifyFile(subPanelAddIn, withSixDisco);
    findAndModifyFile(meterCanTapFile, withSixDisco);
  }
  const interconnectionOptions = interconnections.map(file => {
    const option = {
      $and: [
        {
          $iLike: `%${file}%`,
        },
      ],
    };
    if (!file.includes('6 disco')) {
      option.$and.push({ $notILike: '%6 disco%' });
    }
    if (!file.includes('Smart Management')) {
      option.$and.push({ $notILike: '%Smart Management%' });
    }
    if (!file.includes('Derate Main')) {
      option.$and.push({ $notILike: '%Derated Main%' });
    }
    return option;
  });
  const options = {
    where: {
      name: {
        $or: interconnectionOptions,
      },
      type: 'interconnection',
    },
    attributes: ['id', 'name', 'display_url'],
  };
  let fileChoices = await db.solo.models.cad_electrical_diagram.findAll(
    options
  );
  if (!fileChoices.length) {
    fileChoices = await db.solo.models.cad_electrical_diagram.findAll({
      where: {
        type: 'interconnection',
      },
    });
  }
  return fileChoices;
};
module.exports = {
  interconnectionCalculator,
};