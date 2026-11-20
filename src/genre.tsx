import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ListMusic, Music2, Play } from 'lucide-react';
import { api, art, type Album, type Artist, type Genre, type Song } from './api';
import { ArtistImage, Empty, Loading, SongSection } from './components';
import { usePlayer } from './player';

type GenreDetail = {
  genre: Genre;
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  playlists: { id: string; title: string; description: string; coverPath: string | null; creatorName: string; songCount: number }[];
};

export function GenrePage() {
  const { id } = useParams();
  const [data, setData] = useState<GenreDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const play = usePlayer(state => state.play);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void api<GenreDetail>(`/genres/${id}`).then(result => {
      if (active) setData(result);
    }).catch(cause => {
      if (active) setError((cause as Error).message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  if (loading) return <Loading />;
  if (error || !data) return <div className="notice error">{error || 'Genre unavailable'}</div>;

  const { genre, songs, artists, albums, playlists } = data;
  return <>
    <section className="genre-hero" style={{ background: `linear-gradient(120deg, ${genre.color || '#8050c0'}, #172637)` }}>
      <div className="eyebrow">EXPLORE A SOUND</div>
      <h1>{genre.name}</h1>
      <p>{genre.description || `Discover ${genre.name} tracks, artists, albums, and playlists.`}</p>
      <span>{songs.length} featured tracks</span>
      <div className="detail-actions">
        <button className="yellow-button" disabled={!songs.length} onClick={() => play(songs[0]!, songs)}><Play size={17} fill="currentColor" /> Play genre</button>
        <Link className="outline-button" to={`/explore?genre=${genre.id}`}>Browse all <ArrowRight size={17} /></Link>
      </div>
    </section>
    <SongSection title={`Popular in ${genre.name}`} songs={songs} more={`/explore?genre=${genre.id}`} />
    <section className="section">
      <h2>Artists</h2>
      {artists.length ? <div className="artist-grid">{artists.map(artist => <Link className="artist-card" key={artist.id} to={`/artists/${artist.id}`}>
        <ArtistImage artist={artist} className="artist-avatar" />
        <h3>{artist.name}</h3><span>{artist.songCount} tracks</span>
      </Link>)}</div> : <Empty title="No artists yet" />}
    </section>
    <section className="section">
      <h2>Albums</h2>
      {albums.length ? <div className="album-grid">{albums.map(album => <Link className="album-card" key={album.id} to={`/albums/${album.id}`}>
        {album.cover_path ? <img className="album-cover" src={art(album.cover_path)} alt="" /> : <div className="album-placeholder"><Music2 size={48} /></div>}
        <h3>{album.title}</h3><span>{album.artistName} · {album.trackCount} tracks</span>
      </Link>)}</div> : <Empty title="No albums yet" />}
    </section>
    {playlists.length > 0 && <section className="section"><h2>Public playlists</h2><div className="playlist-grid">{playlists.map(playlist => <Link className="playlist-card" key={playlist.id} to={`/playlists/${playlist.id}`}>
      <div className="playlist-art">{playlist.coverPath ? <img src={art(playlist.coverPath)} alt="" /> : <ListMusic size={52} />}</div>
      <h3>{playlist.title}</h3><p>{playlist.creatorName} · {playlist.songCount} tracks</p>
    </Link>)}</div></section>}
  </>;
}
