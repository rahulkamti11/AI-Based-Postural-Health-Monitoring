import React from 'react';
import { PlayCircle, PauseCircle, Volume2, VolumeX, Bell, BellOff, Video, VideoOff, Wifi, WifiOff, BellRing, RefreshCw, ChevronDown } from 'lucide-react';

export function Header({
  systemActive,
  onToggleSystem,
  audioAlertEnabled,
  onToggleAudioAlert,
  visualAlertEnabled,
  onToggleVisualAlert,
  visualThreshold,
  onVisualThresholdChange,
  audioThreshold,
  onAudioThresholdChange,
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

  const [isAlertMenuOpen, setIsAlertMenuOpen] = React.useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 shadow-sm z-50 flex items-center justify-between px-6">
      
      {/* Left Area - Alert Controls */}
      <div className="relative">
        <button 
          onClick={() => setIsAlertMenuOpen(!isAlertMenuOpen)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
            (audioAlertEnabled || visualAlertEnabled) 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' 
              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BellRing size={16} />
          <span>Alert Settings</span>
          <ChevronDown size={14} className={`transition-transform ${isAlertMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isAlertMenuOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 p-4">
            <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Notification Preferences</h4>
            
            <div className="flex items-center justify-between mb-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
               <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Volume2 size={14}/> Audio Alarm</span>
                  <select 
                    value={audioThreshold} 
                    onChange={(e) => onAudioThresholdChange(Number(e.target.value))}
                    className="mt-1 text-xs text-slate-600 bg-white border border-slate-200 rounded px-1 py-0.5 outline-none cursor-pointer hover:border-indigo-300"
                  >
                    <option value={15}>After 15s</option>
                    <option value={30}>After 30s</option>
                    <option value={60}>After 1m</option>
                    <option value={120}>After 2m</option>
                    <option value={180}>After 3m</option>
                    <option value={300}>After 5m</option>
                  </select>
               </div>
               <button 
                 onClick={onToggleAudioAlert}
                 className={`w-11 h-6 rounded-full relative transition-colors ${audioAlertEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
               >
                 <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${audioAlertEnabled ? 'left-6' : 'left-1'}`} />
               </button>
            </div>

            <div className="flex items-center justify-between mb-4 p-2 rounded-lg hover:bg-slate-50 transition-colors">
               <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Bell size={14}/> Visual Popup</span>
                  <select 
                    value={visualThreshold} 
                    onChange={(e) => onVisualThresholdChange(Number(e.target.value))}
                    className="mt-1 text-xs text-slate-600 bg-white border border-slate-200 rounded px-1 py-0.5 outline-none cursor-pointer hover:border-indigo-300"
                  >
                    <option value={15}>After 15s</option>
                    <option value={30}>After 30s</option>
                    <option value={60}>After 1m</option>
                    <option value={120}>After 2m</option>
                    <option value={180}>After 3m</option>
                    <option value={300}>After 5m</option>
                  </select>
               </div>
               <button 
                 onClick={onToggleVisualAlert}
                 className={`w-11 h-6 rounded-full relative transition-colors ${visualAlertEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
               >
                 <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${visualAlertEnabled ? 'left-6' : 'left-1'}`} />
               </button>
            </div>
          </div>
        )}
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
