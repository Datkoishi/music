import {create} from 'zustand';
import {api,type Song} from './api';
type Likes={ids:Set<string>;load:()=>Promise<void>;toggle:(id:string)=>Promise<void>;reset:()=>void};
export const useLikes=create<Likes>((set,get)=>({
  ids:new Set(),
  load:async()=>{const data=await api<{items:Song[]}>('/users/me/liked-songs');set({ids:new Set(data.items.map(s=>s.id))});},
  toggle:async(id)=>{const liked=get().ids.has(id);await api(`/songs/${id}/like`,{method:liked?'DELETE':'POST'});const ids=new Set(get().ids);if(liked)ids.delete(id);else ids.add(id);set({ids});},
  reset:()=>set({ids:new Set()}),
}));
