// Assignment display is shared across Kanban, planning and editing.
// Values are stable role keys; third-party assignee names are stored only in private D1.
export const WEDDING_ASSIGNEES=[
 ["","Sin asignar"],["miguel","Miguel"],["andrea","Andrea"],["otro","Otra persona"]
];
export function weddingAssigneeLabel(item){
 const kind=item?.assigneeKind||"";
 if(kind==="otro")return item?.assigneeName?.trim()||"Otra persona";
 return WEDDING_ASSIGNEES.find(([key])=>key===kind)?.[1]||"Sin asignar";
}
