// Nine stable destination IDs behind one home and three navigation groups.
export const LAB_GROUPS=Object.freeze({
 forecast:Object.freeze({defaultView:'futures',views:Object.freeze(['futures','shadow2027'])}),
 research:Object.freeze({defaultView:'overview',views:Object.freeze(['overview','science','operations','roadmap'])}),
 create:Object.freeze({defaultView:'ideas',views:Object.freeze(['ideas','video'])}),
});
export const LAB_VIEWS=Object.freeze(['brief',...Object.values(LAB_GROUPS).flatMap(group=>group.views)]);
export function labGroupForView(view){
 if(view==='brief')return 'brief';
 for(const [id,g] of Object.entries(LAB_GROUPS))if(g.views.includes(view))return id;
 return null;
}
export function labDefaultView(id){return LAB_GROUPS[id]?.defaultView||null;}
