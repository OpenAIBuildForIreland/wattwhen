import type { Household } from "./types";
import { monthlyPV } from "./sources/pvgis";
import { tariff } from "./tariffs";
export async function solarYear(h:Household,sample=false) {
  if(!h.solar)throw new Error("Enable solar to see your year");
  const pv=await monthlyPV(h,sample),share=h.battery?0.65:0.35;
  const weights=[1.2,1.1,1.05,0.95,0.85,0.8,0.8,0.85,0.95,1.05,1.15,1.25];
  const weightSum=weights.reduce((a,b)=>a+b,0),rate=tariff.rates.day*0.6+tariff.rates.night*0.3+tariff.rates.peak*0.1;
  const days=[31,28,31,30,31,30,31,31,30,31,30,31];
  let balance=0;
  const months=Array.from({length:12},(_,i)=>{
    const m=(i+3)%12,generation=pv.months[m],usage=h.annualKWh*weights[m]/weightSum,selfUse=Math.min(usage,generation*share),exported=generation-selfUse,imported=Math.max(0,usage-selfUse),bill=imported*rate+days[m]*tariff.standingPerDay,credit=exported*tariff.exportRate,net=bill-credit;
    balance-=net;
    return {month:m,label:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m],generation,usage,selfUse,exported,imported,bill,credit,net,balance};
  });
  const total=(key:'generation'|'credit'|'bill'|'net'|'selfUse')=>months.reduce((s,m)=>s+m[key],0);
  const baseline=h.annualKWh*rate+365*tariff.standingPerDay;
  return {months,annual:{generation:total('generation'),credit:total('credit'),bill:total('bill'),net:total('net'),savings:baseline-total('net')},source:pv.source,assumptions:{selfUseShare:share,averageRate:rate,exportRate:tariff.exportRate,creditCarries:tariff.creditCarries,note:'Synthetic monthly demand; 60% day, 30% night, 10% peak imports. Sample tariff. Balance starts at €0 in April; positive means credit, negative means amount owed. Battery changes self-use assumption only; no dispatch simulation.'}};
}
export type SolarResult=Awaited<ReturnType<typeof solarYear>>;
