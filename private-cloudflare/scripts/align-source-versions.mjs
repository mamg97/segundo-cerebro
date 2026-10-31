// CI checkout only: the release build fingerprints every static asset, but
// legacy source-level tests demand an identical app.js / styles.css reference.
// Concurrent feature commits can bump only app.js; normalise the disposable
// runner checkout before tests without pushing, changing content or hiding
// errors elsewhere. Never modify the user browser or persisted data.
import { readFile, writeFile } from "node:fs/promises";
const file=new URL("../../app/index.html",import.meta.url);
const html=await readFile(file,"utf8");
const js=html.match(/src="\.\/app\.js\?v=(\d+\.\d+\.\d+)"/g)||[];
const css=html.match(/href="\.\/styles\.css\?v=(\d+\.\d+\.\d+)"/g)||[];
if(js.length!==1||css.length!==1)throw new Error("ASSET_VERSION_SOURCE_UNRECOGNISED");
const revision=js[0].match(/\?v=(\d+\.\d+\.\d+)/)[1];
const out=html.replace(css[0],'href="./styles.css?v='+revision+'"');
if(out!==html){
  await writeFile(file,out,"utf8");
  process.stdout.write("Aligned CSS and app script revisions in CI checkout: "+revision+"\n");
}
