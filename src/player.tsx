import {create} from 'zustand';
import {Component,useEffect,useRef,type ReactNode} from 'react';
import {api,media,type Song} from './api';
import {useAuth} from './auth';
import {SoundCloudPlayer} from './soundcloud-player';

type PlayerState={song:Song|null;queue:Song[];index:number;playing:boolean;status:'idle'|'loading'|'playing'|'paused'|'buffering'|'ended'|'error';currentTime:number;duration:number;volume:number;muted:boolean;shuffle:boolean;repeat:boolean;error:string|null;play:(song:Song,queue?:Song[])=>void;toggle:()=>void;next:()=>void;previous:()=>void;seek:(time:number)=>void;setVolume:(value:number)=>void;toggleMute:()=>void;toggleShuffle:()=>void;toggleRepeat:()=>void};
const savedVolume=Number(localStorage.getItem('rhythms-volume')??'0.75');
export const usePlayer=create<PlayerState>((set,get)=>({
  song:null,queue:[],index:0,playing:false,status:'idle',currentTime:0,duration:0,volume:Number.isFinite(savedVolume)?savedVolume:.75,muted:false,shuffle:false,repeat:false,error:null,
  play:(song,queue)=>{const list=queue?.length?queue:[song],index=Math.max(0,list.findIndex(s=>s.id===song.id));set({song,queue:list,index,playing:true,status:'loading',currentTime:0,duration:0,error:null});},
  toggle:()=>set(s=>({playing:!s.playing,status:s.playing?'paused':'loading',error:null})),
  next:()=>{const s=get();if(!s.queue.length)return;const index=s.shuffle&&s.queue.length>1?(s.index+1+Math.floor(Math.random()*(s.queue.length-1)))%s.queue.length:(s.index+1)%s.queue.length;set({index,song:s.queue[index]!,playing:true,status:'loading',currentTime:0,duration:0,error:null});},
  previous:()=>{const s=get();if(s.currentTime>3){set({currentTime:0});return;}const index=(s.index-1+s.queue.length)%s.queue.length;set({index,song:s.queue[index]||null,playing:true,status:'loading',currentTime:0,duration:0,error:null});},
  seek:time=>set({currentTime:time}),
  setVolume:value=>{localStorage.setItem('rhythms-volume',String(value));set({volume:value,muted:false});},
  toggleMute:()=>set(s=>({muted:!s.muted})),toggleShuffle:()=>set(s=>({shuffle:!s.shuffle})),toggleRepeat:()=>set(s=>({repeat:!s.repeat})),
}));
/** Keeps a failing embedded player from unmounting the whole app; the player shows an error instead. */
class PlayerBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:unknown){console.error('Embedded player failed',error);usePlayer.setState({status:'error',playing:false,error:'This track could not be played'});}
  render(){return this.state.failed?null:this.props.children;}
}
const jsonPlay=(seconds:number)=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({listenedSeconds:seconds})});

export function PlayerController(){
  const audio=useRef<HTMLAudioElement|null>(null),started=useRef<number>(0),lastTime=useRef<number>(0),reported=useRef(false);
  const song=usePlayer(s=>s.song),playing=usePlayer(s=>s.playing),volume=usePlayer(s=>s.volume),muted=usePlayer(s=>s.muted),repeat=usePlayer(s=>s.repeat);
  const {user}=useAuth();
  useEffect(()=>{const el=audio.current;if(!el)return;reported.current=false;started.current=0;lastTime.current=0;if(!song?.audioPath){el.pause();el.removeAttribute('src');el.load();return;}el.src=media(song.audioPath);el.load();if(usePlayer.getState().playing)void el.play().catch(()=>usePlayer.setState({playing:false,status:'paused'}));},[song?.id,song?.audioPath]);
  useEffect(()=>{const el=audio.current;if(!el||!song?.audioPath)return;if(playing)void el.play().catch(()=>usePlayer.setState({playing:false,status:'paused'}));else el.pause();},[playing,song?.id,song?.audioPath]);
  useEffect(()=>{if(audio.current){audio.current.volume=volume;audio.current.muted=muted;}},[volume,muted]);
  useEffect(()=>usePlayer.subscribe((state,prev)=>{if(state.song?.audioPath&&state.currentTime!==prev.currentTime&&Math.abs(state.currentTime-(audio.current?.currentTime||0))>1.5&&audio.current)audio.current.currentTime=state.currentTime;}),[]);
  const onTime=()=>{const el=audio.current;if(!el)return;const delta=el.currentTime-lastTime.current;if(!el.paused&&delta>0&&delta<1.5)started.current+=delta;lastTime.current=el.currentTime;usePlayer.setState({currentTime:el.currentTime,duration:el.duration||song?.durationSeconds||0});if(user&&song&&started.current>=Math.min(30,Math.max(10,Math.round((song.durationSeconds||30)*.5)))&&!reported.current){reported.current=true;void api('/songs/'+song.id+'/plays',jsonPlay(Math.round(started.current))).catch(()=>{reported.current=false;});}};
  const onEnded=()=>{const s=usePlayer.getState();if(repeat&&audio.current){audio.current.currentTime=0;void audio.current.play();}else if(s.index<s.queue.length-1)s.next();else usePlayer.setState({status:'ended',playing:false});};
  return <><audio ref={audio} onTimeUpdate={onTime} onPlay={()=>usePlayer.setState({status:'playing',playing:true})} onPause={()=>{if(usePlayer.getState().status!=='ended')usePlayer.setState({status:'paused',playing:false});}} onWaiting={()=>usePlayer.setState({status:'buffering'})} onEnded={onEnded} onError={()=>usePlayer.setState({status:'error',playing:false,error:'Audio is unavailable'})}/>{song?.externalUrl&&<PlayerBoundary key={song.id}><SoundCloudPlayer song={song} userId={user?.id||null}/></PlayerBoundary>}</>;
}
