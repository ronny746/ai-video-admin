'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Send, Play, FileText, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Use environment variable or fallback to the current domain's IP on port 8000
const API_URL = typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:8000` 
  : 'http://localhost:8000';

export default function Home() {
  const [title, setTitle] = useState('')
  const [segments, setSegments] = useState([
    { character: 'Narrator', text: '', emotion: 'Neutral' }
  ])
  const [stories, setStories] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    fetchStories()
    const interval = setInterval(fetchStories, 5000) // Poll for updates
    return () => clearInterval(interval)
  }, [])

  const fetchStories = async () => {
    try {
      const res = await fetch(`${API_URL}/stories`)
      const data = await res.json()
      setStories(data)
    } catch (err) {
      console.error('Failed to fetch stories:', err)
    }
  }

  const addSegment = () => {
    setSegments([...segments, { character: '', text: '', emotion: 'Neutral' }])
  }

  const removeSegment = (index) => {
    setSegments(segments.filter((_, i) => i !== index))
  }

  const updateSegment = (index, field, value) => {
    const newSegments = [...segments]
    newSegments[index][field] = value
    setSegments(newSegments)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title || segments.some(s => !s.text)) {
      alert('Please fill all fields')
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch(`${API_URL}/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, segments })
      })
      const data = await res.json()
      console.log('Story submitted:', data)
      setTitle('')
      setSegments([{ character: 'Narrator', text: '', emotion: 'Neutral' }])
      fetchStories()
    } catch (err) {
      alert('Error generating story')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="container">
      <h1>AI कहानी जनरेटर (Hindi)</h1>
      
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>नई कहानी लिखें</h2>
        <form onSubmit={handleSubmit}>
          <input 
            placeholder="कहानी का शीर्षक (Title)" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontSize: '1.2rem', fontWeight: '700' }}
          />
          
          <AnimatePresence>
            {segments.map((segment, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="segment-editor"
              >
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <input 
                    placeholder="पात्र (Character name)" 
                    value={segment.character} 
                    onChange={(e) => updateSegment(index, 'character', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <select 
                    value={segment.emotion} 
                    onChange={(e) => updateSegment(index, 'emotion', e.target.value)}
                    style={{ flex: 0.5 }}
                  >
                    <option>Neutral</option>
                    <option>Happy</option>
                    <option>Sad</option>
                    <option>Angry</option>
                    <option>Excited</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => removeSegment(index)}
                    style={{ background: '#ef4444', padding: '0.5rem' }}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <textarea 
                  placeholder="कहानी का हिस्सा हिंदी में लिखें..." 
                  value={segment.text} 
                  onChange={(e) => updateSegment(index, 'text', e.target.value)}
                  rows={3}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={addSegment} style={{ background: 'var(--glass)', border: '1px solid var(--primary)' }}>
              <Plus size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
              अगला भाग जोड़ें
            </button>
            <button type="submit" disabled={isGenerating} style={{ flex: 1 }}>
              {isGenerating ? <RefreshCcw className="animate-spin" size={20} /> : <Send size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />}
              {isGenerating ? 'बना रहा है...' : 'कहानी तैयार करें'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>आपकी कहानियाँ</h2>
        <div className="story-list">
          {stories.map((story) => (
            <div key={story.id} className="story-item">
              <div>
                <h3 style={{ fontSize: '1.3rem' }}>{story.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {new Date(story.created_at * 1000).toLocaleString()}
                </p>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className={`status-badge status-${story.status}`}>
                    {story.status === 'completed' ? 'तैयार है' : story.status === 'processing' ? 'आवाज़ बन रही है...' : 'फ़ेल हो गया'}
                  </span>
                  {story.error && (
                    <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      Error: {story.error}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {story.status === 'completed' && (
                  <button onClick={() => window.open(`${API_URL}/story/${story.id}`, '_blank')} style={{ background: 'var(--glass)' }}>
                    <Play size={20} />
                  </button>
                )}
                <button style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <FileText size={20} />
                </button>
              </div>
            </div>
          ))}
          {stories.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>कोई कहानी नहीं मिली।</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
