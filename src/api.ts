export type Song = { id:string; title:string; description?:string; durationSeconds:number; audioPath:string|null; externalUrl:string|null; coverPath:string|null; artistName:string|null; artistIds:string|null; genreName:string|null; genreIds:string|null; albumId:string|null; albumTitle:string|null; playCount:number; averageRating:number|null; ratingCount:number; reason?:string; score?:number; status?:string };
export type Artist = {id:string;name:string;bio?:string;image_path?:string;imagePath?:string;songCount?:number};
export type Album = {id:string;title:string;artist_id?:string;artistId?:string;artistName?:string;cover_path?:string;coverPath?:string;description?:string;release_date?:string;trackCount?:number};
export type Genre = {id:string;name:string;color:string;description?:string;songCount?:number};
export type User = {id:string;email:string;displayName:string;avatarUrl?:string|null;role:'USER'|'ADMIN';status:string;onboardingCompleted:boolean};
export type Playlist = {id:string;user_id?:string;title:string;description:string;visibility:'PRIVATE'|'PUBLIC';songCount?:number;cover_path?:string;creatorName?:string};

export async function api<T>(path:string, options:RequestInit={}):Promise<T>{
  const response=await fetch(path.startsWith('/api')?path:`/api${path}`,{credentials:'include',...options,headers:{...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...options.headers}});
  const data=await response.json().catch(()=>({error:'Server did not return JSON'}));
  if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);
  return data as T;
}
export const json=(method:string,body:unknown):RequestInit=>({method,body:JSON.stringify(body)});
const MEDIA_BASE=(import.meta.env.VITE_MEDIA_BASE||'').replace(/\/$/,'');
export function media(path:string):string;
export function media(path:string|null|undefined):string|null|undefined;
export function media(path:string|null|undefined){return path&&path.startsWith('/media/')?`${MEDIA_BASE}${path}`:path;}
export function art(path:string|null|undefined){return media(path)||'/fallback.svg';}
export function artistPicture(artist:Pick<Artist,'imagePath'|'image_path'>){return media(artist.imagePath||artist.image_path)||null;}
export function time(seconds:number){const n=Math.floor(seconds||0);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
