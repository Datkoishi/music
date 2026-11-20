import {useEffect,useRef} from 'react';
import {api,type Song} from './api';
import {usePlayer} from './player';

type Progress={currentPosition?:number};
type Widget={bind:(event:string,listener:(data?:Progress)=>void)=>void;play:()=>void;pause:()=>void;seekTo:(ms:number)=>void;setVolume:(volume:number)=>void;getDuration:(callback:(ms:number)=>void)=>void};
type Factory=((iframe:HTMLIFrameElement)=>Widget)&{Events:Record<'READY'|'PLAY'|'PAUSE'|'PLAY_PROGRESS'|'FINISH'|'ERROR',string>};
declare global {interface Window {SC?:{Widget:Factory}}}

/** Widget calls throw once the iframe is detached (e.g. while switching tracks); that must never break the app. */
function safely(action:()=>void){try{action();}catch{/* The iframe is gone; nothing left to control. */}}

function loadApi():Promise<Factory>{
  if(window.SC?.Widget)return Promise.resolve(window.SC.Widget);
  return new Promise((resolve,reject)=>{
    let script=document.querySelector<HTMLScriptElement>('script[data-soundcloud-widget]');
    if(!script){script=document.createElement('script');script.src='https://w.soundcloud.com/player/api.js';script.async=true;script.dataset.soundcloudWidget='true';document.head.appendChild(script);}
    script.addEventListener('load',()=>window.SC?.Widget?resolve(window.SC.Widget):reject(new Error('SoundCloud controls unavailable')),{once:true});
    script.addEventListener('error',()=>reject(new Error('SoundCloud controls unavailable')),{once:true});
  });
}

export function SoundCloudPlayer({song,userId}:{song:Song;userId:string|null}){
  const iframe=useRef<HTMLIFrameElement>(null),widget=useRef<Widget|null>(null),ready=useRef(false),lastTime=useRef(0),started=useRef(0),reported=useRef(false);
  const playing=usePlayer(s=>s.playing),volume=usePlayer(s=>s.volume),muted=usePlayer(s=>s.muted);
  useEffect(()=>{
    let active=true;ready.current=false;lastTime.current=0;started.current=0;reported.current=false;
    void loadApi().then(Factory=>{
      if(!active||!iframe.current)return;
      const current=Factory(iframe.current);widget.current=current;
      current.bind(Factory.Events.READY,()=>{
        if(!active)return;
        ready.current=true;
        current.getDuration(ms=>{if(active&&usePlayer.getState().song?.id===song.id)usePlayer.setState({duration:ms/1000});});
        const state=usePlayer.getState();current.setVolume(state.muted?0:Math.round(state.volume*100));
        if(state.playing)current.play();
      });
      current.bind(Factory.Events.PLAY,()=>{if(active&&usePlayer.getState().song?.id===song.id)usePlayer.setState({status:'playing',playing:true,error:null});});
      current.bind(Factory.Events.PAUSE,()=>{if(active&&usePlayer.getState().song?.id===song.id&&usePlayer.getState().status!=='ended')usePlayer.setState({status:'paused',playing:false});});
      current.bind(Factory.Events.PLAY_PROGRESS,data=>{
        if(!active||usePlayer.getState().song?.id!==song.id)return;
        const seconds=(data?.currentPosition||0)/1000,delta=seconds-lastTime.current;
        if(delta>0&&delta<3)started.current+=delta;
        lastTime.current=seconds;
        usePlayer.setState({currentTime:seconds});
        if(userId&&started.current>=Math.min(30,Math.max(10,Math.round((song.durationSeconds||30)*.5)))&&!reported.current){reported.current=true;void api('/songs/'+song.id+'/plays',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({listenedSeconds:Math.round(started.current)})}).catch(()=>{reported.current=false;});}
      });
      current.bind(Factory.Events.FINISH,()=>{
        if(!active||usePlayer.getState().song?.id!==song.id)return;
        const state=usePlayer.getState();
        if(state.repeat){current.seekTo(0);current.play();}
        else if(state.index<state.queue.length-1)state.next();
        else usePlayer.setState({status:'ended',playing:false});
      });
      current.bind(Factory.Events.ERROR,()=>{if(active&&usePlayer.getState().song?.id===song.id)usePlayer.setState({status:'error',playing:false,error:'SoundCloud track is unavailable'});});
    }).catch(()=>{if(active)usePlayer.setState({status:'error',playing:false,error:'SoundCloud controls are unavailable; use the player below'});});
    const unsubscribe=usePlayer.subscribe((state,previous)=>{
      if(!active||state.song?.id!==song.id||!ready.current||!widget.current)return;
      if(state.currentTime!==previous.currentTime&&Math.abs(state.currentTime-lastTime.current)>1.5){const current=widget.current;safely(()=>current.seekTo(Math.round(state.currentTime*1000)));lastTime.current=state.currentTime;}
    });
    // React removes the iframe before this cleanup runs, so the widget can no longer post messages to it.
    return()=>{active=false;unsubscribe();safely(()=>widget.current?.pause());widget.current=null;};
  },[song.id,song.durationSeconds,userId]);
  useEffect(()=>{if(!ready.current||!widget.current)return;const current=widget.current;safely(()=>playing?current.play():current.pause());},[playing]);
  useEffect(()=>{if(ready.current)safely(()=>widget.current?.setVolume(muted?0:Math.round(volume*100)));},[volume,muted]);
  // show_teaser=false turns off SoundCloud's "Explore more music / Hear more on SoundCloud" overlay;
  // hide_related=true stops the widget showing related tracks when a song ends (the app's own queue plays next).
  const src='https://w.soundcloud.com/player/?url='+encodeURIComponent(song.externalUrl!)+'&color=%23ffc928&auto_play=false&show_artwork=true&show_teaser=false&hide_related=true';
  return <div className="soundcloud-embed"><div className="soundcloud-embed-label">SOUNDCLOUD · <a href={song.externalUrl!} target="_blank" rel="noreferrer">Open track ↗</a></div><iframe ref={iframe} src={src} title={'SoundCloud: '+song.title} allow="autoplay; encrypted-media" scrolling="no"/></div>;
}
