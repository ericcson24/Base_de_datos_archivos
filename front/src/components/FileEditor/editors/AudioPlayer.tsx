'use client';

import React, { useState, useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import './AudioPlayer.css';

type AudioPlayerFile = {
  name: string;
};

type AudioPlayerProps = {
  fileUrl: string;
  file: AudioPlayerFile;
};

const AudioPlayer = ({ fileUrl, file }: AudioPlayerProps) => {
  const { t } = useLanguage();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolume(vol);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const formatTime = (seconds: number) => {
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
    <div className="audio-player h-full flex flex-col">

      <audio
        ref={audioRef}
        src={fileUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
      />


      <div className="toolbar glassmorphism-strong p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-3 items-center">

          <div className="tool-group flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t('audioPlayer.speed')}:
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


          <div className="flex gap-2 ml-auto">
            <button className="btn-primary" onClick={handleDownload}>
              💾 {t('audioPlayer.download')}
            </button>
          </div>
        </div>
      </div>


      <div className="flex-1 bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 flex items-center justify-center p-8">
        <div className="text-center">

          <div className="w-64 h-64 mx-auto mb-8 rounded-2xl bg-white/20 backdrop-blur-md shadow-2xl flex items-center justify-center animate-pulse">
            <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>


          <h2 className="text-2xl font-bold text-white mb-2">{file.name}</h2>
          <p className="text-white/80 mb-8">{t('audioPlayer.title')}</p>


          <button
            className="w-20 h-20 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/40 transition-all mx-auto mb-8"
            onClick={togglePlay}
          >
            {playing ? (
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>


          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 text-white">
              <span className="text-sm min-w-[45px]">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="slider flex-1"
              />
              <span className="text-sm min-w-[45px]">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
