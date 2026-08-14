import type { CSSProperties, ReactNode } from "react";

export interface ChartItemDetail { name:string; value:number; observation:string; unit?:string; session?:string; treatment?:string; replication?:string; plot?:string; count?:number }

export function ItemTooltip({item}:{item?:ChartItemDetail}){
  if(!item)return null;
  return <div role="status" aria-live="polite" style={{left:"var(--chart-tooltip-x, 50%)",top:"var(--chart-tooltip-y, 12px)",transform:"translate(var(--chart-tooltip-shift-x, -50%), var(--chart-tooltip-shift-y, 0))"}} className="pointer-events-none absolute z-10 max-w-64 rounded-xl border bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
    <p className="font-semibold text-foreground">{item.plot||item.name}</p>
    {item.treatment&&<p className="text-muted-foreground">{item.treatment}{item.replication?` · ${item.replication}`:""}</p>}
    <p className="mt-1 text-foreground">{item.observation}: {item.value}{item.unit?` ${item.unit}`:""}</p>
    {item.count!=null&&<p className="text-muted-foreground">N {item.count}</p>}
    {item.session&&<p className="mt-1 text-muted-foreground">{item.session}</p>}
  </div>;
}

export function InteractiveChart({tooltip,clear,children}:{tooltip?:ChartItemDetail;clear:()=>void;children:ReactNode}){
  const positionTooltip=(event:React.PointerEvent<HTMLDivElement>)=>{const box=event.currentTarget.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top,style=event.currentTarget.style;style.setProperty("--chart-tooltip-x",`${x+(x>box.width/2?-12:12)}px`);style.setProperty("--chart-tooltip-y",`${y+(y>box.height/2?-12:12)}px`);style.setProperty("--chart-tooltip-shift-x",x>box.width/2?"-100%":"0");style.setProperty("--chart-tooltip-shift-y",y>box.height/2?"-100%":"0")};
  const moveTooltip=(event:React.PointerEvent<HTMLDivElement>)=>{if(!(event.target as Element).closest?.("[data-chart-item], .recharts-line-curve")){if(tooltip)clear();return}if(tooltip&&event.pointerType!=="touch")positionTooltip(event)};
  return <div className="relative h-full" style={{"--chart-tooltip-x":"50%","--chart-tooltip-y":"12px","--chart-tooltip-shift-x":"-50%"} as CSSProperties} onPointerMove={moveTooltip} onPointerDown={event=>{if((event.target as Element).closest?.("[data-chart-item]"))positionTooltip(event);else clear()}} onMouseLeave={clear}>
    <ItemTooltip item={tooltip}/>{children}
  </div>;
}

export const selectHandlers=(select:(item:ChartItemDetail)=>void,item:ChartItemDetail)=>({
  onMouseEnter:()=>select(item),onFocus:()=>select(item),onClick:(event:any)=>{event.stopPropagation();select(item)},tabIndex:0,role:"button" as const,"aria-label":`${item.name}, ${item.observation}: ${item.value}${item.unit?` ${item.unit}`:""}`,"data-chart-item":"true",
});
