const assert=require('node:assert/strict');
const engine=require('../dist/scenarios-v02.js');

const start=new Date(2025,0,1),ac=[],pv=[];
for(let i=0;i<365*24;i++){
 const date=new Date(start.getTime()+i*3600000),hour=date.getHours();
 ac.push({date,value:1});
 pv.push({date,value:hour>=9&&hour<16?2:0});
}
const series=engine.prepareHourly(ac,pv,60);
assert.equal(series.coverage,1);
assert.equal(series.peakKw,1);
assert.equal(series.peakRecord.energyKwh,1);
assert.equal(series.peakRecord.intervalMinutes,60);
assert.equal(series.peakRecord.date.getHours(),9);

const fiveMinuteAC=[...ac.map(point=>({date:point.date,value:0.1})),{date:new Date(2026,0,1,0,5),value:0.6025}];
const fiveMinutePV=fiveMinuteAC.map(point=>({date:point.date,value:0.01}));
const fiveMinutePeak=engine.prepareHourly(fiveMinuteAC,fiveMinutePV,5);
assert.ok(Math.abs(fiveMinutePeak.peakKw-7.23)<1e-9);
assert.ok(Math.abs(fiveMinutePeak.typicalPeakKw-1.2)<1e-9);

const nightSpike=ac.map((point,index)=>({...point,value:index===1?20:1}));
assert.equal(engine.prepareHourly(nightSpike,pv,60).peakKw,1);

const common={areaM2:12,panelAreaM2:3,panelWp:630,designFactor:.8,dcLimitKw:null,reserveHours:6,dod:.9,chargeEff:.95,dischargeEff:.95,chargeKw:2,dischargeKw:2,panelCost:100,batteryCost:200,converterCost:100,otherCapex:0,annualOpex:0,wearRate:.01,batteryKwh:4.8,existingBatteries:1,siteLoadKw:1,pvReferenceKwp:1,energyRate:1,fixedRate:5,otherRate:0,taxRate:.18};
const result=engine.evaluate(series,common);
assert.equal(result.nA,2);
assert.equal(result.nArea,4);
assert.equal(result.rows[0].feasible,true);
assert.equal(result.rows[0].dischargedAnnual,0);
const directA=engine.directSeries(series.hours,result.rows[0].panels,common.panelWp/1000,common.pvReferenceKwp,Infinity);
assert.ok(Math.abs(result.rows[0].unusedSolarAnnual-directA.surplus*series.annualFactor)<1e-6);
assert.equal(result.rows[1].feasible,false);
assert.equal(result.rows[2].feasible,true);
assert.ok(result.rows[2].newBatteries>=2);
assert.ok(result.rows[2].cyclingPacks>=1);
assert.ok(result.rows[2].dischargedAnnual>0);
assert.ok(result.rows[2].chargedAnnual>result.rows[2].dischargedAnnual);
for(const row of result.rows.filter(item=>item.key==='C1'||item.key==='C2')){
 const direct=engine.directSeries(series.hours,row.panels,common.panelWp/1000,common.pvReferenceKwp,Infinity);
 assert.ok(Math.abs(row.unusedSolarAnnual+row.chargedAnnual-direct.surplus*series.annualFactor)<1e-6);
}
assert.ok(result.rows[2].backupHours>=6);
assert.equal(result.rows[3].feasible,true);
assert.equal(result.rows[3].cyclingPacks,common.existingBatteries);
assert.ok(result.rows[3].backupHours<6);
assert.ok(result.warnings.some(warning=>warning.includes('C2 reduce el respaldo')));
assert.notEqual(result.recommended?.key,'C2');

const scenarioCapacity=result.rows[0].kwp;
const scaledPV=pv.map(point=>({date:point.date,value:point.value*scenarioCapacity}));
const scaledSeries=engine.prepareHourly(ac,scaledPV,60);
const scaledResult=engine.evaluate(scaledSeries,{...common,pvReferenceKwp:scenarioCapacity});
assert.ok(Math.abs(scaledResult.rows[0].annualGrid-result.rows[0].annualGrid)<1e-6);

const flowDates=[0,1,2,3].map(hour=>new Date(2025,0,1,hour));
const flowAC=flowDates.map(date=>({date,value:1}));
const flowPV=[3,0,3,0].map((value,index)=>({date:flowDates[index],value}));
const flow=engine.traceIntervals(flowAC,flowPV,{...common,intervalMinutes:60},1);
assert.ok(flow.charged>0);
assert.ok(flow.discharged>0);
assert.equal(flow.trace[0].charge>0,true);
assert.equal(flow.trace[1].discharge>0,true);
assert.ok(flow.trace.every(row=>Math.abs(row.net-(row.gridWithoutBattery-row.discharge))<1e-9));
assert.ok(flow.trace.every(row=>row.charge<=row.excess+1e-9));
assert.ok(flow.trace.every(row=>Math.abs(row.load-(row.direct+row.discharge+row.net))<1e-9));
assert.ok(flow.trace.every(row=>Math.abs(row.pv-(row.direct+row.charge+row.curtailed))<1e-9));

const solarCycleDates=[12,13,18,19].map(hour=>new Date(2025,0,2,hour));
const solarCycleAC=solarCycleDates.map(date=>({date,value:1}));
const solarCyclePV=[4,.5,0,0].map((value,index)=>({date:solarCycleDates[index],value}));
const solarCycle=engine.traceIntervals(solarCycleAC,solarCyclePV,{...common,chargeKw:4,intervalMinutes:60},1);
assert.ok(solarCycle.charged>0);
assert.ok(solarCycle.dayDischarged>0);
assert.ok(solarCycle.nightDischarged>0);
assert.ok(Math.abs(solarCycle.dayDischarged+solarCycle.nightDischarged-solarCycle.discharged)<1e-9);
assert.ok(solarCycle.trace.every(row=>row.charge<=row.excess+1e-9));
assert.ok(solarCycle.trace.every(row=>row.soc>=-1e-9&&row.soc<=common.batteryKwh*common.dod+1e-9));

const limited=engine.evaluate(series,{...common,areaM2:3});
assert.equal(limited.rows[0].feasible,false);
assert.equal(limited.rows[1].feasible,true);
assert.equal(limited.rows[2].feasible,false);

const noPrices=engine.evaluate(series,{...common,panelCost:null,batteryCost:null});
assert.equal(noPrices.rows[2].payback,null);
assert.equal(noPrices.recommended,null);

const underpoweredConverter=engine.evaluate(series,{...common,dcLimitKw:.5});
assert.equal(underpoweredConverter.rows[0].feasible,false);
assert.equal(underpoweredConverter.rows[2].feasible,false);

assert.throws(()=>engine.prepareHourly(ac.slice(0,24*10),pv.slice(0,24*10),60),/300 días/);
assert.throws(()=>engine.prepareHourly(ac,pv.map(point=>({date:new Date(point.date.getTime()+60000),value:point.value})),60),/98 %/);
console.log('Escenarios A, B, C1 y C2: OK');
