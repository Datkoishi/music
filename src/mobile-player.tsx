import { useEffect, useRef, useState } from 'react';
import { Heart, ListMusic, Pause, Play, Repeat2, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { art, time } from './api';
import { useAuth } from './auth';
import { useLikes } from './likes';
import { usePlayer } from './player';
import { useToast } from './components';

export function MobilePlayer() {
  const state = usePlayer();
  const { user } = useAuth();
  const toast = useToast();
  const liked = useLikes(likes => !!state.song && likes.ids.has(state.song.id));
  const [expanded, setExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
      if (event.key !== 'Tab') return;
      const dialog = closeButton.current?.closest('[role="dialog"]');
      const controls = [...(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])') || [])];
      if (!controls.length) return;
      const first = controls[0]!, last = controls.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
      openButton.current?.focus();
    };
  }, [expanded]);

  if (!state.song) return null;
  const song = state.song;
  const duration = state.duration || song.durationSeconds || 1;
  const toggleLike = async () => {
    if (!user) { toast('Sign in to save songs'); return; }
    try { await useLikes.getState().toggle(song.id); }
    catch (error) { toast((error as Error).message); }
  };

  return <div className={`mobile-player ${expanded ? 'expanded' : ''}`}>
    <div className="mini">
      <button className="mini-open" ref={openButton} onClick={() => setExpanded(true)} aria-label={`Open player for ${song.title}`}>
        <img src={art(song.coverPath)} alt="" />
        <span><strong>{song.title}</strong><small>{song.artistName}</small></span>
      </button>
      <button onClick={state.toggle} aria-label={state.playing ? 'Pause' : 'Play'}>{state.playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
      <button onClick={state.next} aria-label="Next"><SkipForward fill="currentColor" /></button>
    </div>
    {expanded && <div className="mobile-player-sheet" role="dialog" aria-modal="true" aria-label="Now playing">
      <header><span>NOW PLAYING</span><button ref={closeButton} onClick={() => setExpanded(false)} aria-label="Close player"><X /></button></header>
      <img className="mobile-player-cover" src={art(song.coverPath)} alt={`${song.title} cover`} />
      <div className="mobile-player-title"><div><h2>{song.title}</h2><p>{song.artistName}</p></div><button onClick={() => void toggleLike()} aria-label={liked ? 'Unlike song' : 'Like song'} aria-pressed={liked}><Heart fill={liked ? 'currentColor' : 'none'} /></button></div>
      <div className="mobile-player-progress"><input type="range" min="0" max={Math.max(1, duration)} value={Math.min(state.currentTime, duration)} onChange={event => state.seek(Number(event.target.value))} aria-label="Seek playback" /><div><span>{time(state.currentTime)}</span><span>{time(duration)}</span></div></div>
      <div className="mobile-player-controls">
        <button onClick={state.toggleShuffle} aria-label="Shuffle" aria-pressed={state.shuffle} className={state.shuffle ? 'active' : ''}><Shuffle /></button>
        <button onClick={state.previous} aria-label="Previous"><SkipBack fill="currentColor" /></button>
        <button className="play-main" onClick={state.toggle} aria-label={state.playing ? 'Pause' : 'Play'}>{state.playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
        <button onClick={state.next} aria-label="Next"><SkipForward fill="currentColor" /></button>
        <button onClick={state.toggleRepeat} aria-label="Repeat" aria-pressed={state.repeat} className={state.repeat ? 'active' : ''}><Repeat2 /></button>
      </div>
      <div className="mobile-player-extra"><button onClick={state.toggleMute} aria-label={state.muted ? 'Unmute' : 'Mute'}>{state.muted ? <VolumeX /> : <Volume2 />}</button><input type="range" min="0" max="1" step="0.01" value={state.volume} onChange={event => state.setVolume(Number(event.target.value))} aria-label="Volume" /><button onClick={() => setShowQueue(!showQueue)} aria-label="Toggle queue" aria-expanded={showQueue}><ListMusic /></button></div>
      {state.error && <p className="player-error" role="alert">{state.error}</p>}
      {showQueue && <div className="mobile-player-queue"><h3>Up next</h3>{state.queue.map((queued, index) => <button key={`${queued.id}-${index}`} className={index === state.index ? 'current' : ''} onClick={() => state.play(queued, state.queue)}><img src={art(queued.coverPath)} alt="" /><span>{queued.title}<small>{queued.artistName}</small></span></button>)}</div>}
    </div>}
  </div>;
}
