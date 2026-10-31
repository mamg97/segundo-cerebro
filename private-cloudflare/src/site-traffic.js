// Generic, private-only traffic data store. No hardcoded organization, site or external URL.
export class TrafficDataError extends Error {
  constructor(code, status=400){super(code);this.code=code;this.status=status;}
}
const isDay=s=>typeof s==="string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s+"T00:00:00Z")) && new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
const cleanCount=value=>{
  if(value===null || value===undefined || value==="")return null;
  if(!Number.isSafeInteger(value) || value<0 || value>1000000000)throw new TrafficDataError("INVALID_COUNT");
  return value;
};
export function cleanSiteInput(body) {
  const label=String(body?.label??"").trim();
  const prefix=String(body?.pathPrefix??"").trim();
  if(!label || label.length>90 || /[<>\x00-\x1f]/.test(label))throw new TrafficDataError("INVALID_LABEL");
  if(!/^\/[A-Za-z0-9_-]+\/$/.test(prefix) || prefix.length>110)throw new TrafficDataError("INVALID_PATH");
  return {label,pathPrefix:prefix};
}
export function cleanDailyInput(body) {
  const siteId=String(body?.siteId??"");
  const day=body?.day;
  if(!/^[0-9a-f-]{36}$/i.test(siteId))throw new TrafficDataError("INVALID_SITE");
  if(!isDay(day))throw new TrafficDataError("INVALID_DAY");
  const visits=cleanCount(body.visits),pageViews=cleanCount(body.pageViews);
  if(visits===null && pageViews===null)throw new TrafficDataError("MISSING_COUNTS");
  return {siteId,day,visits,pageViews};
}
export async function readSiteTraffic(env,days=30) {
  const windowDays=Math.min(90,Math.max(7,Number.isFinite(days)?Math.trunc(days):30));
  const sites=(await env.DB.prepare("SELECT id,label,path_prefix AS pathPrefix,updated_at AS updatedAt FROM web_traffic_sites ORDER BY created_at,id").all()).results||[];
  const daily=(await env.DB.prepare("SELECT site_id AS siteId,day,visits,page_views AS pageViews,source,updated_at AS updatedAt FROM web_traffic_daily WHERE day>=date('now', ? || ' days') ORDER BY day,site_id")
    .bind(String(-windowDays)).all()).results||[];
  return {sites,daily,windowDays,source:"private_manual",lastUpdated:daily.map(x=>x.updatedAt).sort().at(-1)||null};
}
export async function writeSiteTraffic(env,body) {
  if(body?.type==="site"){
    const {label,pathPrefix}=cleanSiteInput(body);
    const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO web_traffic_sites(id,label,path_prefix) VALUES(?,?,?)").bind(id,label,pathPrefix).run();
    return {id};
  }
  if(body?.type==="daily"){
    const {siteId,day,visits,pageViews}=cleanDailyInput(body);
    const exists=await env.DB.prepare("SELECT id FROM web_traffic_sites WHERE id=?").bind(siteId).first();
    if(!exists)throw new TrafficDataError("UNKNOWN_SITE",404);
    await env.DB.prepare("INSERT INTO web_traffic_daily(site_id,day,visits,page_views,source) VALUES(?,?,?,?,'manual') ON CONFLICT(site_id,day) DO UPDATE SET visits=excluded.visits,page_views=excluded.page_views,updated_at=datetime('now')")
      .bind(siteId,day,visits,pageViews).run();
    return {siteId,day};
  }
  throw new TrafficDataError("INVALID_ACTION");
}
