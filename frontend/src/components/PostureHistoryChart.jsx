import React, { useMemo, useState, useRef } from 'react';
import { Activity, Clock, Download, ChevronDown } from 'lucide-react';

export function PostureHistoryChart({ historyData = [], sessionSeconds = 0, goodSeconds = 0, badSeconds = 0 }) {
  const [hoveredSeg, setHoveredSeg] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const timelineRef = useRef(null);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  // Convert continuous 1-second history data into aggregated contiguous segments
  const segments = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];
    
    const aggregated = [];
    let currentSegment = null;

    historyData.forEach((item, index) => {
      let status = 'gray'; // offline / no person
      if (item.overall_quality === 'good') status = 'green';
      if (item.overall_quality === 'bad') status = 'red';

      const front = item.front_label?.replace(/([A-Z])/g, ' $1').trim() || 'Normal';
      const side = item.side_label?.replace(/([A-Z])/g, ' $1').trim() || 'Normal';
      const timeString = new Date(item.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (!currentSegment) {
        currentSegment = { status, startIdx: index, endIdx: index, frontLabel: front, sideLabel: side, timeString, endTimeString: timeString };
        aggregated.push(currentSegment);
      } else if (currentSegment.status === status && currentSegment.frontLabel === front && currentSegment.sideLabel === side) {
        // If status and specific pose labels are exactly the same, extend the current segment
        currentSegment.endIdx = index;
        currentSegment.endTimeString = timeString;
      } else {
        // State changed, start a new block
        currentSegment = { status, startIdx: index, endIdx: index, frontLabel: front, sideLabel: side, timeString, endTimeString: timeString };
        aggregated.push(currentSegment);
      }
    });

    return aggregated;
  }, [historyData]);

  const handleMouseMove = (e) => {
    if (!timelineRef.current || historyData.length === 0 || segments.length === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    const totalDataPoints = historyData.length;
    const index = Math.floor(percentage * (totalDataPoints - 1));
    
    const seg = segments.find(s => index >= s.startIdx && index <= s.endIdx);
    if (seg) {
      setHoveredSeg({ ...seg, duration: Math.max(seg.endIdx - seg.startIdx + 1, 1) });
    }
  };

    const handleDownloadReport = (format = 'txt') => {
      setShowExportMenu(false);

      if (historyData.length === 0) {
        alert("No session data available to download yet.");
        return;
      }
      
      let content = "";
      let mimeType = "text/plain";
      
      if (format === 'csv') {
        mimeType = "text/csv";
        content = "Start Time,End Time,Duration (s),Overall Status,Front View,Side View\n";
        segments.forEach((seg) => {
            const duration = Math.max(seg.endIdx - seg.startIdx + 1, 1);
            let overall = seg.status === 'green' ? 'GOOD' : (seg.status === 'red' ? 'BAD' : 'STANDBY');
            let front = seg.status === 'gray' ? 'N/A' : seg.frontLabel;
            let side = seg.status === 'gray' ? 'N/A' : seg.sideLabel;
            content += `"${seg.timeString}","${seg.endTimeString}",${duration},"${overall}","${front}","${side}"\n`;
        });
      } else {
        content = "========================================\n";
        content += "       POSTURE HEALTH SESSION REPORT    \n";
        content += "========================================\n\n";
        content += `Date: ${new Date().toLocaleDateString()}\n\n`;
        content += `Total Session Time: ${formatTime(sessionSeconds)}\n`;
        content += `Good Posture Time: ${formatTime(goodSeconds)}\n`;
        content += `Bad Posture Time: ${formatTime(badSeconds)}\n\n`;
        
        content += "----------------------------------------\n";
        content += "          TIMELINE BREAKDOWN            \n";
        content += "----------------------------------------\n\n";
        
        segments.forEach((seg) => {
            const duration = Math.max(seg.endIdx - seg.startIdx + 1, 1);
            content += `[${seg.timeString} to ${seg.endTimeString}] (${duration}s)\n`;
            content += `Status: ${seg.status === 'green' ? 'GOOD' : (seg.status === 'red' ? 'BAD' : 'STANDBY')}\n`;
            if (seg.status !== 'gray') {
                content += `Front View: ${seg.frontLabel}\n`;
                content += `Side View: ${seg.sideLabel}\n`;
            }
            content += `\n`;
        });
      }
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Posture_Report_${new Date().toISOString().slice(0,10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      {/* Top Header Row */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Activity className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Session Report</h3>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Continuous posture timeline tracking</p>
          </div>
        </div>
        
        <div className="relative">
          <button 
             onClick={() => setShowExportMenu(!showExportMenu)}
             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md"
          >
             <Download size={16} /> Export Data <ChevronDown size={14} />
          </button>
          
          {showExportMenu && (
             <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 overflow-hidden">
                <button onClick={() => handleDownloadReport('txt')} className="block w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors">
                  📄 Text Summary (.txt)
                </button>
                <button onClick={() => handleDownloadReport('csv')} className="block w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors">
                  📊 Spreadsheet (.csv)
                </button>
             </div>
          )}
        </div>
      </div>
      
      {/* Session Stats Banner */}
      <div className="flex bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-8">
        <div className="flex-1 text-center py-3 px-6 border-r border-slate-200">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Time</p>
             <p className="text-2xl font-black text-slate-800">{formatTime(sessionSeconds)}</p>
          </div>
          <div className="flex-1 text-center py-3 px-6 border-r border-slate-200">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Correct Pose</p>
             <p className="text-2xl font-black text-emerald-600">{formatTime(goodSeconds)}</p>
          </div>
          <div className="flex-1 text-center py-3 px-6">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Bad Pose</p>
             <p className="text-2xl font-black text-rose-600">{formatTime(badSeconds)}</p>
          </div>
        </div>

      {/* 1D Timeline Bar */}
      <div 
        className="relative pt-4 pb-2" 
        onMouseLeave={() => setHoveredSeg(null)}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseMove}
        ref={timelineRef}
      >
        {historyData.length > 0 ? (
          <div className="flex h-12 w-full rounded-md overflow-hidden bg-slate-100 shadow-inner">
            {segments.map((seg, idx) => {
              const duration = Math.max(seg.endIdx - seg.startIdx + 1, 1);
              
              let bgColor = 'bg-slate-300';
              if (seg.status === 'green') bgColor = 'bg-emerald-500';
              if (seg.status === 'red') bgColor = 'bg-rose-500';
              
              return (
                <div 
                  key={idx} 
                  className={`h-full ${bgColor} cursor-crosshair border-r border-black/10`}
                  style={{ flexGrow: duration }}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex h-12 w-full rounded-md items-center justify-center bg-slate-50 border border-dashed border-slate-300">
             <p className="text-slate-400 font-medium text-sm tracking-wide">Monitoring started... awaiting data.</p>
          </div>
        )}
        
        {/* Graph-style X-Axis */}
        {historyData.length > 0 && (
          <div className="relative h-8 mt-1 border-t border-slate-300">
            {(() => {
              const startTs = historyData[0].timestamp;
              const endTs = historyData[historyData.length - 1].timestamp;
              const duration = Math.max(endTs - startTs, 1);
              
              const ticks = [];
              const numTicks = 30; // High density grooves (ruler effect)
              
              for(let i = 0; i <= numTicks; i++) {
                const ts = startTs + (duration * (i / numTicks));
                const timeStr = new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const leftPercent = (i / numTicks) * 100;
                
                const isFirst = i === 0;
                const isLast = i === numTicks;
                const transform = isFirst ? 'translateX(0)' : (isLast ? 'translateX(-100%)' : 'translateX(-50%)');
                const alignItems = isFirst ? 'items-start' : (isLast ? 'items-end' : 'items-center');
                const showText = isFirst || isLast;
                
                ticks.push(
                  <div key={i} className={`absolute flex flex-col ${alignItems}`} style={{ left: `${leftPercent}%`, transform }}>
                     <div className={`w-px ${showText ? 'h-2' : 'h-1.5'} bg-slate-300`}></div>
                     {showText && <span className="text-[11px] text-slate-400 mt-1 font-medium">{timeStr}</span>}
                  </div>
                );
              }
              return ticks;
            })()}
          </div>
        )}

        {/* Hover Details Panel */}
        <div className="mt-6 h-14 flex items-center justify-center">
           {hoveredSeg ? (
              <div className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm flex items-center space-x-6 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                 {hoveredSeg.status === 'gray' ? (
                   <span className="font-semibold tracking-wide text-slate-300">System Standby / No Person Detected</span>
                 ) : (
                   <>
                     <div className="flex items-center">
                        <span className="text-slate-400 mr-2 text-xs uppercase tracking-widest font-bold">Front:</span> 
                        <span className={`font-bold capitalize ${hoveredSeg.status === 'green' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {hoveredSeg.frontLabel === 'no_person' ? 'Standby' : hoveredSeg.frontLabel}
                        </span>
                     </div>
                     <div className="w-px h-4 bg-slate-600 rounded"></div>
                     <div className="flex items-center">
                        <span className="text-slate-400 mr-2 text-xs uppercase tracking-widest font-bold">Side:</span> 
                        <span className={`font-bold capitalize ${hoveredSeg.status === 'green' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {hoveredSeg.sideLabel === 'no_person' ? 'Standby' : hoveredSeg.sideLabel}
                        </span>
                     </div>
                   </>
                 )}
                 <div className="w-px h-4 bg-slate-600 rounded"></div>
                 <div className="flex items-center text-slate-300">
                    <span className="mr-2 text-xs uppercase tracking-widest font-bold">Time:</span> 
                    <span className="font-bold">{hoveredSeg.timeString} to {hoveredSeg.endTimeString}</span>
                    <span className="mx-2 text-slate-500">•</span>
                    <span className="font-bold">{hoveredSeg.duration}s</span>
                 </div>
              </div>
           ) : (
              <p className="text-slate-400 text-sm font-medium">Hover over the timeline bar to view exact posture details</p>
           )}
        </div>
      </div>
    </div>
  );
}
