import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import {
  Mic, MicOff, LayoutDashboard, ClipboardList, TrendingUp,
  Leaf, Tractor, Users, ShoppingBag, RefreshCw, CheckCircle, AlertCircle,
  User, Settings, CloudRain, Sun, Snowflake, History, Plus, Home
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

import { SpeechRecognition as CapSpeech } from '@capacitor-community/speech-recognition'
import { CapacitorHttp } from '@capacitor/core'

// ─── API Base URL ─────────────────────────────────────────────────────────────
// When running as Android APK (Capacitor), there is no Vite proxy,
// so we must use the full backend IP address directly.
// When running in browser dev mode, we use relative /api (proxied by Vite).
const isCapacitor = window.location.protocol === 'capacitor:' || window.Capacitor !== undefined
const API_BASE = isCapacitor ? 'http://10.146.186.148:3000' : ''

const categoryIcon = (cat) => {
  switch (cat) {
    case 'Fertilizer': return <Leaf size={16} className="text-emerald-400" />
    case 'Labour':     return <Users size={16} className="text-blue-400" />
    case 'Machine':    return <Tractor size={16} className="text-amber-400" />
    default:           return <ShoppingBag size={16} className="text-purple-400" />
  }
}

const categoryColor = (cat) => {
  switch (cat) {
    case 'Fertilizer': return '#34d399'
    case 'Labour':     return '#60a5fa'
    case 'Machine':    return '#fbbf24'
    default:           return '#a78bfa'
  }
}

// ─── Components ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl`}
           style={{ background: `${color}22` }}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  )
}

// ─── Pages ───────────────────────────────────────────────────────────────────

// ---- VOICE PAGE ----
function VoicePage() {
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle') // idle | recording | processing | success | error
  const [errMsg, setErrMsg] = useState('')
  const recognitionRef = useRef(null)

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  const startRecording = async () => {
    const transcriptRef = { current: '' }

    if (isCapacitor) {
      try {
        const hasPerms = await CapSpeech.checkPermissions()
        if (hasPerms.speechRecognition !== 'granted') {
          await CapSpeech.requestPermissions()
        }

        setRecording(true)
        setStatus('recording')
        setTranscript('')
        setResult(null)

        const result = await CapSpeech.start({
          language: 'gu-IN',
          maxResults: 1,
          prompt: 'Speak in Gujarati',
          popup: true,
          partialResults: false,
        })

        setRecording(false)
        if (result && result.matches && result.matches.length > 0) {
          const text = result.matches[0]
          setTranscript(text)
          submitTranscript(text)
        } else {
          setStatus('idle')
        }
      } catch (err) {
        setRecording(false)
        setStatus('error')
        setErrMsg(String(err))
      }
      return
    }

    if (!SpeechRecognition) {
      setErrMsg('Your browser does not support voice recognition. Please use Chrome.')
      setStatus('error')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'gu-IN'          // Gujarati
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    
    recognition.onstart = () => { 
      setRecording(true); 
      setStatus('recording'); 
      setTranscript(''); 
      setResult(null);
    }
    
    recognition.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      transcriptRef.current = t
      setTranscript(t)
    }
    
    recognition.onerror = (e) => { 
      setStatus('error'); 
      setErrMsg(e.error); 
      setRecording(false);
    }
    
    recognition.onend = () => { 
      setRecording(false); 
      if (transcriptRef.current.trim().length > 0) {
        submitTranscript(transcriptRef.current) 
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopRecording = async () => {
    if (isCapacitor) {
      try { await CapSpeech.stop() } catch (e) {}
    } else {
      recognitionRef.current?.stop()
    }
  }

  const submitTranscript = async (text) => {
    if (!text.trim()) return
    setStatus('processing')
    try {
      let data = null;
      if (isCapacitor) {
        const options = {
          url: `${API_BASE}/api/parse-voice`,
          headers: { 'Content-Type': 'application/json' },
          data: { text: text },
        };
        const response = await CapacitorHttp.post(options);
        data = response.data;
        if (response.status !== 200) {
          throw new Error(data.error || 'Network error from backend')
        }
      } else {
        const response = await fetch(`${API_BASE}/api/parse-voice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ text: text })
        })
        data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Network Error')
        }
      }
      
      setResult(data)
      setStatus('review') // Wait for user to confirm before saving!
    } catch (err) {
      setErrMsg(err.message || String(err))
      setStatus('error')
    }
  }

  const saveConfirmedRecord = async () => {
    setStatus('saving')
    try {
      let data = null;
      if (isCapacitor) {
        const response = await CapacitorHttp.post({
          url: `${API_BASE}/api/save-record`,
          headers: { 'Content-Type': 'application/json' },
          data: result,
        });
        data = response.data;
        if (response.status !== 200) throw new Error(data.error || 'Save failed')
      } else {
        const response = await fetch(`${API_BASE}/api/save-record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        })
        data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Save failed')
      }
      
      setStatus('success')
    } catch (err) {
      setErrMsg(err.message || String(err))
      setStatus('error')
    }
  }

  const reset = () => { setStatus('idle'); setTranscript(''); setResult(null); setErrMsg('') }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto">
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold gradient-text">Voice Entry</h1>
        <p className="text-slate-400 text-sm mt-1">Speak in Gujarati to record expense</p>
      </div>

      {/* Big Mic Button */}
      <div className="flex flex-col items-center gap-4 py-6">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
            ${recording
              ? 'bg-red-500 pulse-ring'
              : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95'}`}
        >
          {recording
            ? <MicOff size={44} className="text-white" />
            : <Mic size={44} className="text-white" />}
        </button>
        <p className="text-slate-400 text-sm">
          {recording ? '🔴 Recording... tap to stop' : 'Tap to speak'}
        </p>
      </div>

      {/* Transcript box */}
      {transcript && (
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1">Heard:</p>
          <p className="text-white leading-relaxed">{transcript}</p>
        </div>
      )}

      {/* Processing */}
      {status === 'processing' && (
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <RefreshCw size={20} className="text-emerald-400 animate-spin" />
          <p className="text-slate-300">AI parsing your entry...</p>
        </div>
      )}

      {/* Review before save */}
      {status === 'review' && result && (
        <div className="glass rounded-2xl p-4 space-y-3 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={18} className="text-blue-400" />
            <span className="text-blue-400 font-semibold text-sm">Review AI Entry</span>
          </div>
          {/* Read-only Beautiful List */}
          <div className="space-y-1.5 mt-2">
            {[
              ['Farm', result.farm_name],
              ['Category', result.category],
              ['Activity/Item', result.activity_type || result.item_name],
              ['Bags', result.bag_count],
              ['Workers', result.worker_count],
              ['Rate (₹)', result.rate],
              ['Total Amount (₹)', result.total_amount],
            ].map(([label, val]) => {
              if (val === null || val === undefined) return null;
              
              return (
                <div key={label} className="flex justify-between items-center text-sm pb-1 border-b border-white/5 last:border-0">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-emerald-400 font-bold">{val}</span>
                </div>
              );
            })}
            
            <div className="flex justify-between items-start text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Notes</span>
              <span className="text-emerald-300/80 text-xs text-right max-w-[60%]">{result.notes || 'Parsed by AI'}</span>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={reset}
              className="flex-1 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors">
              Cancel
            </button>
            <button onClick={saveConfirmedRecord}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">
              Confirm & Save
            </button>
          </div>
        </div>
      )}

      {/* Saving */}
      {status === 'saving' && (
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <RefreshCw size={20} className="text-emerald-400 animate-spin" />
          <p className="text-slate-300">Saving to database...</p>
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="glass rounded-2xl p-4 space-y-3 border border-emerald-500/30 text-center">
          <div className="flex flex-col items-center gap-2 mb-2">
            <CheckCircle size={40} className="text-emerald-400 mb-2" />
            <span className="text-emerald-400 font-bold text-lg">Saved to DB!</span>
          </div>
          <button onClick={reset}
            className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors shadow-lg">
            Record Another
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="glass rounded-2xl p-4 border border-red-500/30">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={18} className="text-red-400" />
            <span className="text-red-400 font-semibold text-sm">Error</span>
          </div>
          <p className="text-slate-300 text-sm">{errMsg}</p>
          <button onClick={reset} className="mt-3 text-sm text-emerald-400 underline">Try again</button>
        </div>
      )}
    </div>
  )
}

// ---- DASHBOARD PAGE ----
function DashboardPage() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFarm, setSelectedFarm] = useState('All')

  useEffect(() => {
    axios.get(`${API_BASE}/api/expenses`).then(({ data }) => {
      setExpenses(Array.isArray(data) ? data : (data.data || []))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filteredExpenses = selectedFarm === 'All' 
    ? expenses 
    : expenses.filter(e => e.farm_name === selectedFarm)

  const total = filteredExpenses.reduce((s, e) => s + (parseFloat(e.total_amount) || 0), 0)
  const catTotal = (cat) => filteredExpenses.filter(e => e.category === cat).reduce((s, e) => s + (parseFloat(e.total_amount) || 0), 0)

  // Get unique farm names for the filter
  const farms = ['All', ...new Set(expenses.map(e => e.farm_name).filter(Boolean))]

  return (
    <div className="flex flex-col gap-6 p-5 pb-32 min-h-screen text-white bg-gradient-to-b from-[#1c4d32] to-[#0a1e12]">
      
      {/* Top Header */}
      <div className="flex justify-between items-center py-2 relative z-10 w-full">
        <div className="w-10 h-10 rounded-full bg-slate-100/20 flex items-center justify-center backdrop-blur-md shadow-inner shadow-white/10">
          <User size={20} className="text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-wide">ફાર્મર વોઇસ</h1>
        <div className="w-10 h-10 flex items-center justify-center">
          <Settings size={22} className="text-white/80" />
        </div>
      </div>

      {/* Farm Selector (New Option) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 relative z-10">
        {farms.map(farm => (
          <button 
            key={farm}
            onClick={() => setSelectedFarm(farm)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              selectedFarm === farm 
              ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
              : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            {farm === 'All' ? 'બધા ખેતર' : farm}
          </button>
        ))}
      </div>

      {/* Season Selector */}
      <div className="flex justify-between gap-2 overflow-x-auto no-scrollbar scroll-smooth relative z-10">
        <button className="flex-1 py-1.5 px-2 rounded-full border border-emerald-400/60 bg-white/10 shadow-[0_0_15px_rgba(52,211,153,0.3)] flex justify-center items-center gap-2 backdrop-blur-sm">
          <Snowflake size={14} className="text-blue-300" /> <span className="text-sm font-semibold text-white">શિયાળો</span>
        </button>
        <button className="flex-1 py-1.5 px-2 rounded-full border border-transparent bg-white/5 flex justify-center items-center gap-2 text-white/50">
          <Sun size={14} className="text-yellow-400 opacity-60" /> <span className="text-sm font-medium">ઉનાળો</span>
        </button>
        <button className="flex-1 py-1.5 px-2 rounded-full border border-transparent bg-white/5 flex justify-center items-center gap-2 text-white/50">
          <CloudRain size={14} className="text-white/70 opacity-60" /> <span className="text-sm font-medium">ચોમાસું</span>
        </button>
      </div>

      {/* Total Card */}
      <div className="rounded-3xl p-5 border border-white/10 flex justify-between items-end relative overflow-hidden bg-white/5 backdrop-blur-md">
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium tracking-wide">કુલ ખર્ચ {selectedFarm !== 'All' && `(${selectedFarm})`}</p>
          <p className="text-3xl font-extrabold mt-1 tracking-wider">₹{total.toLocaleString()}</p>
        </div>
        <div className="flex items-end gap-1.5 opacity-80 h-10 relative z-10">
          {[12, 18, 14, 30, 22, 16, 26].map((h, i) => (
            <div key={i} className={`w-2.5 rounded-t-sm ${i === 3 ? 'bg-emerald-400' : 'bg-white/40'}`} style={{ height: `${h}px` }} />
          ))}
        </div>
      </div>

      {/* 3x2 Grid */}
      <div className="grid grid-cols-3 gap-3 relative z-10">
        {[
          { icon: '🌾', label: 'FERTILIZER', val: catTotal('Fertilizer') },
          { icon: '👷', label: 'LABOR', val: catTotal('Labour') },
          { icon: '🌱', label: 'LEDA', val: catTotal('Seeds') },
          { icon: '✊', label: 'SEEDS', val: catTotal('Seeds') },
          { icon: '💧', label: 'IRRIGATION', val: catTotal('Irrigation') },
          { icon: '🚜', label: 'TRANSPORT', val: catTotal('Machine') },
        ].map((item, i) => (
          <div key={i} className="rounded-2xl p-3 flex flex-col justify-between border border-white/5 h-28 bg-white/5 backdrop-blur-md shadow-lg">
            <div className="text-3xl drop-shadow-lg mb-1">{item.icon}</div>
            <div>
              <p className="text-[9px] font-bold text-white/50 tracking-wider mb-0.5">{item.label}</p>
              <p className="text-[13px] font-bold">₹{item.val.toLocaleString()}</p>
              <div className="w-6 h-[3px] bg-emerald-500 rounded-full mt-1.5 opacity-90 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="relative z-10 mt-2">
        <p className="text-xs text-white/60">Recent Activity</p>
        <p className="text-lg font-bold mb-3">તાજેતરની પ્રવૃત્તિ</p>
        
        <div className="space-y-4">
          {filteredExpenses.length === 0 ? (
            <p className="text-white/40 text-sm italic">નોંધ જોવા મળી નથી...</p>
          ) : (
            filteredExpenses.slice(0, 10).map(e => (
              <div key={e.id} className="flex justify-between border-b border-white/10 pb-3 items-center">
                <div className="flex flex-col">
                  <span className="text-white/70 text-sm font-medium">
                    {e.date ? new Date(e.date).getDate() : '20'} {e.date ? new Date(e.date).toLocaleString('default', { month: 'short' }) : 'Mar'} - {e.item_name || e.category || 'ખાતર'}
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-bold uppercase">{e.farm_name || 'ખેતર'}</span>
                </div>
                <span className="font-semibold text-base">₹{parseFloat(e.total_amount).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ---- REPORT PAGE ----
function ReportPage() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API_BASE}/api/expenses`).then(({ data }) => {
      setExpenses(Array.isArray(data) ? data : (data.data || []))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 max-w-md mx-auto">
      <div className="pt-4">
        <h1 className="text-2xl font-bold gradient-text">All Records</h1>
        <p className="text-slate-400 text-sm">{expenses.length} total entries</p>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading...</p>}

      <div className="space-y-3">
        {expenses.map((e) => (
          <div key={e.id} className="glass rounded-xl p-4">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                {categoryIcon(e.category)}
                <span className="text-sm font-semibold text-white">{e.farm_name || 'General Farm'}</span>
              </div>
              <span className="text-base font-bold text-emerald-400">
                {e.total_amount ? `₹${parseFloat(e.total_amount).toLocaleString()}` : '-'}
              </span>
            </div>
            <p className="text-xs text-slate-400 pl-6">{e.description?.slice(0, 80)}</p>
            <div className="flex gap-3 mt-2 pl-6 text-xs text-slate-500">
              {e.worker_count && <span>👷 {e.worker_count} workers</span>}
              {e.rate && <span>@ ₹{e.rate}</span>}
              {e.date && <span>📅 {e.date?.slice(0,10)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── App Shell ───────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('dashboard') // Open perfectly to Dashboard!

  return (
    <div className={`min-h-screen ${page === 'dashboard' ? 'bg-[#0a1e12]' : 'bg-slate-900'} relative`}>
      {/* Page */}
      {page === 'dashboard' && <DashboardPage />}
      {page === 'voice'     && <VoicePage />}
      {page === 'report'    && <ReportPage />}

      {/* Floating Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pb-2 px-6 pointer-events-none">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 w-full max-w-sm rounded-[2rem] h-16 flex justify-between items-center px-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-auto relative">
          
          <button onClick={() => setPage('dashboard')} className={`transition-all ${page === 'dashboard' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
            <Home size={22} strokeWidth={page === 'dashboard' ? 2.5 : 2} />
          </button>
          
          <button onClick={() => setPage('report')} className={`transition-all ${page === 'report' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
            <History size={22} strokeWidth={page === 'report' ? 2.5 : 2} />
          </button>
          
          {/* Floating Mic Center Button */}
          <div className="relative -top-6 flex flex-col items-center justify-center">
            <button 
              onClick={() => setPage('voice')} 
              className={`w-[68px] h-[68px] rounded-full flex items-center justify-center border-4 border-[#0a1e12] transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(52,211,153,0.4)]
                ${page === 'voice' ? 'bg-emerald-400 scale-110 shadow-emerald-400/50' : 'bg-emerald-500'}`}
            >
              <Mic size={30} className="text-white" fill="white" />
            </button>
            {page === 'dashboard' && <span className="absolute -bottom-5 text-[9px] font-bold text-white/50 tracking-wider w-max">વાત કરવા માટે દબાવો</span>}
          </div>

          <button onClick={() => {}} className="text-white/40 hover:text-white/70 transition-colors">
            <Plus size={22} />
          </button>
          
          <button onClick={() => {}} className="text-white/40 hover:text-white/70 transition-colors">
            <Settings size={22} />
          </button>
        </div>
      </div>
    </div>
  )
}
