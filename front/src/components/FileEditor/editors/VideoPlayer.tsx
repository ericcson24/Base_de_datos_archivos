'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { BiPlay, BiPause, BiRewind, BiFastForward, BiVolumeFull, BiVolumeMute, BiExpand, BiCollapse, BiEdit, BiSave, BiX, BiCut } from 'react-icons/bi';
import './VideoPlayer.css';

type VideoPlayerFile = {
  name: string;
  path?: string;
};

type VideoPlayerProps = {
  fileUrl: string;
  file: VideoPlayerFile;
};

type EditParams = {
  trimStart: number;
  trimEnd: number;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
};

const VideoPlayer = ({ fileUrl, file }: VideoPlayerProps) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const volumeBeforeMute = useRef(1);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editParams, setEditParams] = useState<EditParams>({
    trimStart: 0,
    trimEnd: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    rotation: 0
  });
  const [trimDragging, setTrimDragging] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      setLoading(true);
      setPlaying(false);
      setCurrentTime(0);
      setIsEditing(false);
      setEditParams(p => ({ ...p, trimStart: 0, trimEnd: 0 }));
    }
  }, [fileUrl]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (playing && !isEditing) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing, isEditing]);

  useEffect(() => {
    const handleMouseMove = () => resetControlsTimeout();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('click', handleMouseMove);
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('click', handleMouseMove);
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (playing) videoRef.current.pause();
      else videoRef.current.play();
      setPlaying(!playing);
    }
  }, [playing]);

  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  }, []);

  const handleVolumeChange = useCallback((e: { target: { value: number | string } }) => {
    const val = parseFloat(String(e.target.value));
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setMuted(val === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (muted) {
      setVolume(volumeBeforeMute.current);
      if (videoRef.current) videoRef.current.volume = volumeBeforeMute.current;
      setMuted(false);
    } else {
      volumeBeforeMute.current = volume;
      setVolume(0);
      if (videoRef.current) videoRef.current.volume = 0;
      setMuted(true);
    }
  }, [muted, volume]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  }, []);

  const togglePiP = useCallback(async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (videoRef.current && videoRef.current.requestPictureInPicture) {
      await videoRef.current.requestPictureInPicture();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          skip(-5);
          break;
        case 'arrowright':
          skip(5);
          break;
        case 'j':
          skip(-10);
          break;
        case 'l':
          skip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.min(1, volume + 0.1) } });
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.max(0, volume - 0.1) } });
          break;
        case 'p':
          togglePiP();
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playing, volume, isEditing, togglePlay, toggleFullscreen, toggleMute, skip, handleVolumeChange, togglePiP]);

  const onTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (isEditing && videoRef.current.currentTime >= editParams.trimEnd && editParams.trimEnd > 0) {
        videoRef.current.currentTime = editParams.trimStart;
      }
    }
  };

  const onLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    setLoading(false);
    setEditParams(p => ({ ...p, trimEnd: videoRef.current!.duration }));
  };

  const onProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }
  };

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const handleSpeedSelect = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setShowSpeedMenu(false);
  };

  const toggleEditMode = () => {
    if (isEditing) {
      setIsEditing(false);
      setEditParams(p => ({
        ...p,
        trimStart: 0,
        trimEnd: duration,
        brightness: 100,
        contrast: 100,
        saturation: 100
      }));
    } else {
      setIsEditing(true);
      videoRef.current?.pause();
      setPlaying(false);
    }
  };

  const handleTrimDragStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    setTrimDragging(handle);
    if (playing) { videoRef.current?.pause(); setPlaying(false); }
  };

  const handleTrimMouseMove = (e: React.MouseEvent) => {
    if (!trimDragging || !containerRef.current) return;
    const track = document.getElementById('vp-trim-track');
    if (track && videoRef.current) {
      const trackRect = track.getBoundingClientRect();
      let percent = (e.clientX - trackRect.left) / trackRect.width;
      percent = Math.max(0, Math.min(1, percent));
      const time = percent * duration;

      if (trimDragging === 'start') {
        const newStart = Math.min(time, editParams.trimEnd - 1);
        setEditParams(p => ({ ...p, trimStart: newStart }));
        videoRef.current.currentTime = newStart;
      } else {
        const newEnd = Math.max(time, editParams.trimStart + 1);
        setEditParams(p => ({ ...p, trimEnd: newEnd }));
        videoRef.current.currentTime = newEnd;
      }
    }
  };

  const handleTrimMouseUp = () => {
    setTrimDragging(null);
  };

  const handleSaveVideo = async (saveAsCopy: boolean) => {
    setShowSaveModal(false);
    setProcessing(true);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/files/video/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          path: file.path,
          startTime: editParams.trimStart,
          endTime: editParams.trimEnd,
          filters: {
            brightness: editParams.brightness,
            contrast: editParams.contrast,
            saturation: editParams.saturation,
            rotation: editParams.rotation
          },
          saveAsCopy
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(t('videoPlayer.saveSuccess') || 'Video processed successfully');
        if (!saveAsCopy) {
          videoRef.current?.load();
        }
        setIsEditing(false);
      } else {
        alert(t('videoPlayer.saveError') + ': ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert(t('videoPlayer.saveErrorGeneric') || 'Error processing video');
    } finally {
      setProcessing(false);
    }
  };

  const videoStyle = {
    filter: `brightness(${editParams.brightness}%) contrast(${editParams.contrast}%) saturate(${editParams.saturation}%)`,
    transform: `rotate(${editParams.rotation}deg)`
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const trimStartPct = duration > 0 ? (editParams.trimStart / duration) * 100 : 0;
  const trimEndPct = duration > 0 ? (editParams.trimEnd / duration) * 100 : 100;

  return (
    <div
      className={`vp-container ${isFullscreen ? 'vp-fullscreen' : ''} ${isEditing ? 'vp-editing' : ''}`}
      ref={containerRef}
      onMouseMove={isEditing ? handleTrimMouseMove : undefined}
      onMouseUp={isEditing ? handleTrimMouseUp : undefined}
    >


      {(loading || processing) && (
        <div className="vp-spinner-overlay">
          <div className="vp-spinner"></div>
          {processing && <span>{t('common.processing') || 'Processing...'}</span>}
        </div>
      )}


      <video
        ref={videoRef}
        src={fileUrl}
        className="vp-video"
        onClick={isEditing ? undefined : togglePlay}
        onDoubleClick={toggleFullscreen}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onProgress={onProgress}
        onEnded={() => setPlaying(false)}
        style={videoStyle}
      />


      {!loading && !processing && (
        <button className="vp-edit-toggle" onClick={toggleEditMode}>
          {isEditing ? <BiX size={20} /> : <BiEdit size={20} />}
          {isEditing ? t('common.cancel') : t('videoPlayer.edit')}
        </button>
      )}


      {!isEditing && (
        <>

          {!playing && !loading && (
            <div className="vp-big-play" onClick={togglePlay}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </div>
          )}


          <div className={`vp-controls-wrapper ${showControls || !playing ? 'visible' : ''}`}>


            <div className="vp-progress-container" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              if (videoRef.current) {
                videoRef.current.currentTime = percent * duration;
                setCurrentTime(percent * duration);
              }
            }}>
              <div className="vp-progress-bar">
                <div className="vp-progress-buffered" style={{ width: `${bufferedPercent}%` }} />
                <div className="vp-progress-played" style={{ width: `${progressPercent}%` }}>
                  <div className="vp-progress-thumb" />
                </div>
              </div>
            </div>

            <div className="vp-controls">
              <div className="vp-controls-left">
                <button className="vp-btn" onClick={togglePlay} title={playing ? t('videoPlayer.pause') : t('videoPlayer.play')}>
                  {playing ? <BiPause size={24} /> : <BiPlay size={24} />}
                </button>

                <button className="vp-btn vp-btn-skip" onClick={() => skip(-10)} title={t('videoPlayer.rewind')}>
                  <BiRewind size={20} />
                  <span className="vp-skip-label">10</span>
                </button>
                <button className="vp-btn vp-btn-skip" onClick={() => skip(10)} title={t('videoPlayer.forward')}>
                  <BiFastForward size={20} />
                  <span className="vp-skip-label">10</span>
                </button>

                <div className="vp-volume-group">
                  <button className="vp-btn" onClick={toggleMute} title={muted ? t('videoPlayer.unmute') : t('videoPlayer.mute')}>
                    {muted || volume === 0 ? <BiVolumeMute size={20} /> : <BiVolumeFull size={20} />}
                  </button>
                  <div className="vp-volume-slider-wrap">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="vp-volume-slider"
                    />
                  </div>
                </div>

                <span className="vp-time">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="vp-controls-right">
                <div className="vp-speed-control">
                  <button className="vp-btn vp-speed-btn" onClick={() => setShowSpeedMenu(!showSpeedMenu)}>
                    {playbackRate}x
                  </button>
                  {showSpeedMenu && (
                    <div className="vp-speed-menu">
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                        <div
                          key={rate}
                          className={`vp-speed-item ${playbackRate === rate ? 'active' : ''}`}
                          onClick={() => handleSpeedSelect(rate)}
                        >
                          {rate}x
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button className="vp-btn" onClick={togglePiP} title={t('videoPlayer.pip')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="14" rx="2" />
                    <rect x="12" y="11" width="8" height="5" rx="1" fill="currentColor" fillOpacity="0.3" stroke="none" />
                  </svg>
                </button>

                <button className="vp-btn" onClick={toggleFullscreen} title={t('videoPlayer.fullscreen')}>
                  {isFullscreen ? <BiCollapse size={20} /> : <BiExpand size={20} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}


      {isEditing && (
        <div className="vp-edit-overlay">
          <div className="vp-edit-panel">

            <div className="vp-edit-header">
              <div className="vp-edit-title">
                <BiCut /> {t('videoPlayer.trim')}
              </div>
              <div className="vp-edit-actions">
                <button className="vp-btn-secondary" style={{ padding: '6px 12px' }} onClick={togglePlay}>
                  {playing ? <BiPause /> : <BiPlay />}
                </button>
              </div>
            </div>


            <div className="vp-trim-track" id="vp-trim-track">

              <div
                className="vp-trim-fill"
                style={{ left: `${trimStartPct}%`, width: `${trimEndPct - trimStartPct}%` }}
              />


              <div
                className="vp-trim-handle"
                style={{ left: `${trimStartPct}%` }}
                onMouseDown={(e) => handleTrimDragStart(e, 'start')}
              >
                <div className="vp-trim-time">{formatTime(editParams.trimStart)}</div>
              </div>


              <div
                className="vp-trim-handle"
                style={{ left: `${trimEndPct}%`, transform: 'translateX(-100%)' }}
                onMouseDown={(e) => handleTrimDragStart(e, 'end')}
              >
                <div className="vp-trim-time">{formatTime(editParams.trimEnd)}</div>
              </div>
            </div>


            <div className="vp-filters-grid">
              <div className="vp-filter-item">
                <div className="vp-filter-label">
                  <span>{t('imageEditor.brightness')}</span>
                  <span>{editParams.brightness}%</span>
                </div>
                <input
                  type="range" className="vp-filter-slider"
                  min="0" max="200" value={editParams.brightness}
                  onChange={(e) => setEditParams({ ...editParams, brightness: parseInt(e.target.value) })}
                />
              </div>
              <div className="vp-filter-item">
                <div className="vp-filter-label">
                  <span>{t('imageEditor.contrast')}</span>
                  <span>{editParams.contrast}%</span>
                </div>
                <input
                  type="range" className="vp-filter-slider"
                  min="0" max="200" value={editParams.contrast}
                  onChange={(e) => setEditParams({ ...editParams, contrast: parseInt(e.target.value) })}
                />
              </div>
              <div className="vp-filter-item">
                <div className="vp-filter-label">
                  <span>{t('imageEditor.saturation')}</span>
                  <span>{editParams.saturation}%</span>
                </div>
                <input
                  type="range" className="vp-filter-slider"
                  min="0" max="200" value={editParams.saturation}
                  onChange={(e) => setEditParams({ ...editParams, saturation: parseInt(e.target.value) })}
                />
              </div>
            </div>


            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button className="vp-btn-secondary" style={{ padding: '8px 16px', borderRadius: 6 }} onClick={toggleEditMode}>
                {t('common.cancel')}
              </button>
              <button className="vp-btn-primary" style={{ padding: '8px 16px', borderRadius: 6 }} onClick={() => setShowSaveModal(true)}>
                <BiSave style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
                {t('imageEditor.save')}
              </button>
            </div>
          </div>


          {showSaveModal && (
            <div className="vp-save-modal">
              <h3>{t('imageEditor.saveOptions')}</h3>
              <div className="vp-save-options">
                <button className="vp-save-btn" onClick={() => handleSaveVideo(false)}>
                  <b>{t('imageEditor.overwrite')}</b>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{t('imageEditor.overwriteDesc')}</div>
                </button>
                <button className="vp-save-btn" onClick={() => handleSaveVideo(true)}>
                  <b>{t('imageEditor.saveAsCopy')}</b>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{t('imageEditor.saveAsCopyDesc')}</div>
                </button>
                <button className="vp-save-btn" style={{ textAlign: 'center', marginTop: 10 }} onClick={() => setShowSaveModal(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default VideoPlayer;
