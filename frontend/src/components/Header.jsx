import React from 'react';
import { PlayCircle, PauseCircle, Volume2, VolumeX, Bell, BellOff, Video, VideoOff, Wifi, WifiOff, BellRing, RefreshCw } from 'lucide-react';

export function Header({
  systemActive,
  onToggleSystem,
  audioAlertEnabled,
  onToggleAudioAlert,
  visualAlertEnabled,
  onToggleVisualAlert,
  showVideoFeeds,
  onToggleVideoFeeds,
  isConnected,
  onRefreshDevices,
  availableDevicesCount,
  isScanning
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const hoverTimer = React.useRef(null);

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => {
      setIsHovered(true);
    }, 1500);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 shadow-sm z-50 flex items-center justify-between px-6">
      
      {/* Left Area - Alert Controls */}
      <div 
        className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        
        {/* Hover Tooltip */}
        <div className={`absolute top-full left-0 mt-3 w-72 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl transition-opacity duration-300 pointer-events-none z-50 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <p className="font-bold text-sm mb-1 text-slate-100">Alert Controls</p>
          <ul className="space-y-1 text-slate-300">
            <li><strong className="text-white">Audio:</strong> Plays a chime sound when bad posture is maintained continuously for &gt; 60 seconds.</li>
            <li><strong className="text-white">Visual:</strong> Displays a warning popup modal when bad posture is maintained for &gt; 30 seconds.</li>
          </ul>
        </div>

        <div className="px-3 py-1 flex items-center space-x-1.5 border-r border-slate-300">
          <BellRing size={14} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Alerts</span>
        </div>
        
        <button
          className={`flex items-center space-x-1.5 px-3 py-1.5 ml-1 rounded-md text-xs font-semibold transition-colors ${
            audioAlertEnabled ? 'bg-slate-800 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200'
          }`}
          onClick={onToggleAudioAlert}
        >
          {audioAlertEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>Audio</span>
        </button>

        <button
          className={`flex items-center space-x-1.5 px-3 py-1.5 ml-1 rounded-md text-xs font-semibold transition-colors ${
            visualAlertEnabled ? 'bg-slate-800 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200'
          }`}
          onClick={onToggleVisualAlert}
        >
          {visualAlertEnabled ? <Bell size={14} /> : <BellOff size={14} />}
          <span>Visual</span>
        </button>
      </div>

      {/* Right Area - System Controls */}
      <div className="flex items-center space-x-4">
        
        {/* Rescan Cameras */}
        <button
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
            isScanning ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
          onClick={onRefreshDevices}
          disabled={isScanning}
          title="Rescan connected USB/Mobile cameras"
        >
          <RefreshCw size={14} className={isScanning ? 'animate-spin text-slate-500' : ''} />
          <span>{isScanning ? 'Scanning...' : `Rescan Devices (${availableDevicesCount || 0})`}</span>
        </button>

        {/* Camera Preview Toggle */}
        <button
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
            showVideoFeeds ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
          onClick={onToggleVideoFeeds}
        >
          {showVideoFeeds ? <Video size={14} /> : <VideoOff size={14} />}
          <span>{showVideoFeeds ? 'Hide Preview' : 'Show Preview'}</span>
        </button>

        {/* Monitoring ON/OFF */}
        <button
          className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-colors border text-white shadow-sm ${
            systemActive 
              ? 'bg-rose-600 border-rose-600 hover:bg-rose-700' 
              : 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700'
          }`}
          onClick={onToggleSystem}
        >
          {systemActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
          <span>{systemActive ? 'Stop Monitoring' : 'Start Monitoring'}</span>
        </button>

        {/* Right Most - Status */}
        <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
          systemActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'
        }`}>
          {systemActive ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{systemActive ? 'Online' : 'Offline'}</span>
        </div>
        
      </div>
    </nav>
  );
}

export default Header;
