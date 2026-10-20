import {glossaryById,glossaryMatches} from './research-glossary.mjs?v=0.5.28';

// One delegated tooltip layer follows any dynamically rendered laboratory view.
// It works with text nodes only, never reparses or inserts untrusted HTML.
export function mountLaboratoryGlossary(root){
 if(!root||typeof document==='undefined')return ()=>{};
 const doc=root.ownerDocument;
 const popup=doc.createElement('div');
 popup.id='lab-glossary-popup';
 popup.className='lab-glossary-popover';
 popup.setAttribute('role','tooltip');
 popup.hidden=true;
 const title=doc.createElement('strong');
 const short=doc.createElement('p');
 const detail=doc.createElement('small');
 popup.append(title,short,detail);
 doc.body.appendChild(popup);
 let current=null,pinned=false,disposed=false;
 const counts=new WeakMap();
 const skip='a,button,label,select,option,textarea,input,pre,code,svg,script,style,[contenteditable],.lab-glossary-popover,.lab-glossary-term';
 function text(node){
  const parent=node.parentElement;
  if(!parent||parent.closest(skip))return;
  const block=parent.closest('section,article,.panel')||root;
  const used=counts.get(block)||0;
  if(used>=6)return;
  const content=node.nodeValue;
  const matches=glossaryMatches(content,Math.min(6-used,3));
  if(!matches.length)return;
  const fragment=doc.createDocumentFragment();
  let index=0;
  for(const hit of matches){
   fragment.appendChild(doc.createTextNode(content.slice(index,hit.start)));
   const term=doc.createElement('button');
   term.type='button';
   term.className='lab-glossary-term';
   term.dataset.glossary=hit.id;
   term.setAttribute('aria-label','Explicar '+hit.label);
   term.setAttribute('aria-describedby',popup.id);
   term.setAttribute('aria-expanded','false');
   term.textContent=hit.label;
   fragment.appendChild(term);
   index=hit.end;
  }
  fragment.appendChild(doc.createTextNode(content.slice(index)));
  counts.set(block,used+matches.length);
  node.replaceWith(fragment);
 }
 function enhance(node){
  if(disposed||!node)return;
  if(node.nodeType===3){text(node);return;}
  if(node.nodeType!==1||node.closest(skip))return;
  const walk=doc.createTreeWalker(node,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walk.nextNode())nodes.push(walk.currentNode);
  for(const n of nodes)text(n);
 }
 const termFrom=target=>target?.closest?.('.lab-glossary-term')||null;
 function reposition(){
  if(!current||popup.hidden)return;
  const anchor=current.getBoundingClientRect();
  const width=popup.offsetWidth||320,height=popup.offsetHeight||125;
  const left=Math.max(10,Math.min(anchor.left,window.innerWidth-width-10));
  const above=anchor.top-height-9;
  const top=above>=10?above:Math.min(anchor.bottom+9,window.innerHeight-height-10);
  popup.style.left=left+'px';
  popup.style.top=Math.max(10,top)+'px';
 }
 function open(b,keep=false){
  const item=glossaryById[b?.dataset.glossary];
  if(!item)return;
  if(current&&current!==b)current.setAttribute('aria-expanded','false');
  current=b;pinned=keep;
  title.textContent=item.label;short.textContent=item.short;detail.textContent=item.detail;
  popup.hidden=false;b.setAttribute('aria-expanded','true');
  reposition();
 }
 function close(force=false){
  if(pinned&&!force)return;
  if(current)current.setAttribute('aria-expanded','false');
  current=null;pinned=false;popup.hidden=true;
 }
 const over=e=>{const b=termFrom(e.target);if(b&&root.contains(b)&&!pinned)open(b);};
 const out=e=>{if(!current||pinned)return;const b=termFrom(e.target);if(b===current&&!current.contains(e.relatedTarget))close();};
 const focus=e=>{const b=termFrom(e.target);if(b&&root.contains(b))open(b,pinned&&b===current);};
 const blur=e=>{if(current&&!pinned&&!current.contains(e.relatedTarget))close();};
 const click=e=>{
  const b=termFrom(e.target);
  if(b&&root.contains(b)){
   e.preventDefault();
   if(current===b&&pinned)close(true);
   else open(b,true);
  }else close(true);
 };
 const key=e=>{if(e.key==='Escape'&&current)close(true);};
 const moved=()=>{if(current)reposition();};
 root.addEventListener('pointerover',over);
 root.addEventListener('pointerout',out);
 root.addEventListener('focusin',focus);
 root.addEventListener('focusout',blur);
 doc.addEventListener('click',click);
 doc.addEventListener('keydown',key);
 doc.addEventListener('scroll',moved,true);
 window.addEventListener('resize',moved);
 enhance(root);
 const observer=new MutationObserver(records=>{
  if(current&&!root.contains(current))close(true);
  for(const change of records)for(const node of change.addedNodes)enhance(node);
 });
 observer.observe(root,{subtree:true,childList:true});
 return ()=>{
  disposed=true;observer.disconnect();close(true);
  root.removeEventListener('pointerover',over);root.removeEventListener('pointerout',out);
  root.removeEventListener('focusin',focus);root.removeEventListener('focusout',blur);
  doc.removeEventListener('click',click);doc.removeEventListener('keydown',key);
  doc.removeEventListener('scroll',moved,true);window.removeEventListener('resize',moved);
  popup.remove();
 };
}
