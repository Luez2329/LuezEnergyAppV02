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
assert.equal(series.excludedCount,0);

const fiveMinuteAC=[...ac.map(point=>({date:point.date,value:0.1})),{date:new Date(2026,0,1,0,5),value:0.6025}];
const fiveMinutePV=fiveMinuteAC.map(point=>({date:point.date,value:0.01}));
const fiveMinutePeak=engine.prepareHourly(fiveMinuteAC,fiveMinutePV,5);
assert.ok(Math.abs(fiveMinutePeak.peakKw-1.2)<1e-9);
assert.equal(fiveMinutePeak.excludedCount,1);
assert.ok(fiveMinutePeak.peakLimitKw<7.23);

const nightSpike=ac.map((point,index)=>({...point,value:index===1?20:1}));
assert.equal(engine.prepareHourly(nightSpike,pv,60).peakKw,1);

const common={areaM2:12,panelAreaM2:3,panelWp:630,designFactor:.8,dcLimitKw:null,reserveHours:6,dod:.9,chargeEff:.95,dischargeEff:.95,chargeKw:2,dischargeKw:2,panelCost:100,batteryCost:200,converterCost:100,otherCapex:0,annualOpex:0,wearRate:.01,batteryKwh:4.8,existingBatteries:1,siteLoadKw:1,pvReferenceKwp:1,energyRate:1,fixedRate:5,otherRate:0,taxRate:.18};
const result=engine.evaluate(series,common);
assert.equal(result.nA,2);
assert.equal(result.nArea,4);
assert.equal(result.rows[0].feasible,true);
assert.equal(result.rows[1].feasible,false);
assert.equal(result.rows[2].feasible,true);
assert.ok(result.rows[2].newBatteries>=2);
assert.ok(result.rows[2].backupHours>=6);
assert.equal(result.rows[3].feasible,true);
assert.ok(result.rows[3].backupHours<6);
assert.ok(result.warnings.some(warning=>warning.includes('C2 reduce el respaldo')));
assert.notEqual(result.recommended?.key,'C2');

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
