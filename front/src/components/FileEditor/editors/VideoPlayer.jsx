import React, { useState, useRef } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ fileUrl, file }) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolume(vol);
    }
  };

  const handlePlaybackRateChange = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = file.name;
    link.click();
  };

  return (
    <div className="video-player h-full flex flex-col" ref={containerRef}>
      {/* Toolbar */}
      <div className="toolbar glassmorphism-strong p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Playback Rate */}
          <div className="tool-group flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Velocidad:
            </label>
            <div className="flex gap-1">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                <button
                  key={rate}
                  className={`btn-speed ${playbackRate === rate ? 'active' : ''}`}
                  onClick={() => handlePlaybackRateChange(rate)}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="tool-group flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              🔊 {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="slider w-24"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 ml-auto">
            <button className="btn-secondary" onClick={toggleFullscreen}>
              {isFullscreen ? '🗗' : '⛶'} Pantalla completa
            </button>
            <button className="btn-primary" onClick={handleDownload}>
              💾 Descargar
            </button>
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 bg-black flex items-center justify-center relative">
        <video
          ref={videoRef}
          src={fileUrl}
          className="max-w-full max-h-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setPlaying(false)}
        />

        {/* Play/Pause Overlay */}
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          {!playing && (
            <div className="w-20 h-20 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/40 transition-all">
              <svg className="w-12 h-12 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="video-controls glassmorphism-strong p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button className="btn-icon" onClick={togglePlay}>
            {playing ? '⏸️' : '▶️'}
          </button>

          {/* Progress */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[45px]">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="slider flex-1"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[45px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
