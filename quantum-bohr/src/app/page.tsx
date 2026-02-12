'use client'

import { useState, useEffect, useRef } from 'react'

export default function Home() {
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState('study')
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)

    const [words, setWords] = useState([
        { en: 'Success', ko: '성공', prompt: 'reaching the mountain top' },
        { en: 'Adventure', ko: '모험', prompt: 'exploring a wild jungle' },
        { en: 'Coffee', ko: '커피', prompt: 'hot cup of coffee' }
    ])

    const [dailyCount, setDailyCount] = useState(0)
    const [totalCount, setTotalCount] = useState(0)
    const [studyHistory, setStudyHistory] = useState<Record<string, boolean>>({})
    const [isCompletedToday, setIsCompletedToday] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // OCR New Word States
    const [newEn, setNewEn] = useState('')
    const [newKo, setNewKo] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setMounted(true)
        const savedWords = localStorage.getItem('voca_list')
        if (savedWords) setWords(JSON.parse(savedWords))

        const savedDaily = localStorage.getItem('voca_daily') || '0'
        const savedTotal = localStorage.getItem('voca_total') || '0'
        const savedHistory = localStorage.getItem('voca_history') || '{}'
        const savedDate = localStorage.getItem('voca_date')

        const todayStr = new Date().toDateString()
        const todayKey = new Date().toISOString().split('T')[0]
        const history = JSON.parse(savedHistory)

        if (savedDate !== todayStr) {
            setDailyCount(0)
            localStorage.setItem('voca_daily', '0')
            localStorage.setItem('voca_date', todayStr)
        } else {
            setDailyCount(parseInt(savedDaily))
        }

        setTotalCount(parseInt(savedTotal))
        setStudyHistory(history)
        if (history[todayKey]) setIsCompletedToday(true)
    }, [])

    if (!mounted) return null

    const saveToLocal = (updatedWords: typeof words) => {
        setWords(updatedWords)
        localStorage.setItem('voca_list', JSON.stringify(updatedWords))
    }

    const handleNext = () => {
        setIsFlipped(false)
        setTimeout(() => {
            const nextIdx = (currentIndex + 1) % words.length
            setCurrentIndex(nextIdx)

            const newD = dailyCount + 1
            const newT = totalCount + 1
            setDailyCount(newD)
            setTotalCount(newT)
            localStorage.setItem('voca_daily', newD.toString())
            localStorage.setItem('voca_total', newT.toString())

            // Check Completion
            if (nextIdx === 0 && !isCompletedToday && words.length > 0) {
                const todayKey = new Date().toISOString().split('T')[0]
                const newHistory = { ...studyHistory, [todayKey]: true }
                setStudyHistory(newHistory)
                localStorage.setItem('voca_history', JSON.stringify(newHistory))
                setIsCompletedToday(true)
            }
        }, 300)
    }

    const addWord = () => {
        if (!newEn || !newKo) return alert('단어와 뜻을 입력해주세요!')
        const updated = [...words, { en: newEn, ko: newKo, prompt: newEn }]
        saveToLocal(updated)
        setNewEn('')
        setNewKo('')
        alert('추가되었습니다!')
    }

    const deleteWord = (idx: number) => {
        const updated = words.filter((_, i) => i !== idx)
        saveToLocal(updated)
    }

    const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsLoading(true)

        // Dynamically load Tesseract to keep bundle small
        const Tesseract = (await import('tesseract.js')).default
        try {
            const { data: { text } } = await Tesseract.recognize(file, 'eng')
            const found = text.match(/[a-zA-Z]+/g)
            if (found && found.length > 0) {
                const word = found.find(w => w.length > 2) || found[0]
                setNewEn(word)
                alert(`발견된 단어: ${word}\n뜻을 입력하고 등록해주세요!`)
            }
        } catch (err) {
            alert('분석 실패')
        } finally {
            setIsLoading(false)
        }
    }

    const renderCalendar = () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const firstDay = new Date(year, month, 1).getDay()

        const days = []
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />)
        for (let i = 1; i <= daysInMonth; i++) {
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
            days.push(
                <div key={i} className={`calendar-day ${studyHistory[key] ? 'completed' : ''}`}>
                    {i}
                </div>
            )
        }
        return days
    }

    const currentWord = words[currentIndex % words.length]

    return (
        <div className="app-container">
            <header className="header">
                <h1>AI Word Master</h1>
            </header>

            <nav className="nav-tabs">
                <button className={activeTab === 'study' ? 'active' : ''} onClick={() => setActiveTab('study')}>학습</button>
                <button className={activeTab === 'calendar' ? 'active' : ''} onClick={() => setActiveTab('calendar')}>기록</button>
                <button className={activeTab === 'manage' ? 'active' : ''} onClick={() => setActiveTab('manage')}>관리</button>
            </nav>

            {/* STUDY SECTION */}
            {activeTab === 'study' && (
                <div className="section">
                    <div className="stats-grid">
                        <div className="glass-card">
                            <span className="label">오늘</span>
                            <div className="value">{dailyCount}</div>
                        </div>
                        <div className="glass-card">
                            <span className="label">누적</span>
                            <div className="value">{totalCount}</div>
                        </div>
                    </div>

                    <div className={`card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                        <div className="card-inner">
                            <div className="card-front">
                                <div className="word-text">{currentWord?.en || '단어 없음'}</div>
                                {currentWord && (
                                    <div className="image-box">
                                        <img src={`https://pollinations.ai/p/${encodeURIComponent(currentWord.prompt)}?width=400&height=400&nologo=true`} alt="word" />
                                    </div>
                                )}
                                <p className="hint">터치해서 확인</p>
                            </div>
                            <div className="card-back">
                                <div className="meaning-text">{currentWord?.ko || '-'}</div>
                                <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleNext() }}>다음 단어</button>
                            </div>
                        </div>
                    </div>
                    <p className="progress">{words.length > 0 ? (currentIndex % words.length) + 1 : 0} / {words.length}</p>
                </div>
            )}

            {/* CALENDAR SECTION */}
            {activeTab === 'calendar' && (
                <div className="section">
                    <div className="glass-card calendar-view">
                        <h3>{new Date().getFullYear()}년 {new Date().getMonth() + 1}월</h3>
                        <div className="calendar-grid">
                            {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d} className="day-label">{d}</div>)}
                            {renderCalendar()}
                        </div>
                    </div>
                </div>
            )}

            {/* MANAGE SECTION */}
            {activeTab === 'manage' && (
                <div className="section">
                    <div className="glass-card manage-form">
                        <button className="btn-ocr" onClick={() => fileInputRef.current?.click()}>
                            📸 사진에서 영단어 추출
                        </button>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleOCR} />

                        <input type="text" placeholder="영어 단어" value={newEn} onChange={e => setNewEn(e.target.value)} />
                        <input type="text" placeholder="한글 뜻" value={newKo} onChange={e => setNewKo(e.target.value)} />
                        <button className="btn-primary" onClick={addWord} style={{ marginTop: '1rem' }}>등록하기</button>

                        <div className="word-scroll-list">
                            {words.map((w, i) => (
                                <div key={i} className="word-item">
                                    <span><b>{w.en}</b>: {w.ko}</span>
                                    <button onClick={() => deleteWord(i)}>삭제</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isCompletedToday && activeTab === 'study' && (
                <div className="completion-toast">오늘 목표 완료! 🏆</div>
            )}

            <style jsx>{`
        .app-container { max-width: 450px; margin: 0 auto; padding: 20px; color: white; }
        .header h1 { text-align: center; font-weight: 800; background: linear-gradient(to right, #6366f1, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; }
        .nav-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
        .nav-tabs button { flex: 1; padding: 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; cursor: pointer; transition: 0.3s; }
        .nav-tabs button.active { background: #6366f1; border-color: #6366f1; box-shadow: 0 4px 15px rgba(99,102,241,0.3); }
        
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .glass-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 15px; text-align: center; }
        .label { font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; }
        .value { font-size: 1.5rem; font-weight: 800; color: #22d3ee; }

        .card-container { perspective: 1000px; aspect-ratio: 3/4; cursor: pointer; margin-bottom: 15px; }
        .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
        .card-container.flipped .card-inner { transform: rotateY(180deg); }
        .card-front, .card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; background: rgba(255,255,255,0.03); }
        .card-back { transform: rotateY(180deg); background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1)); }
        .word-text { font-size: 3rem; font-weight: 800; margin-bottom: 10px; }
        .meaning-text { font-size: 2.5rem; font-weight: 700; }
        .image-box { width: 100%; aspect-ratio: 1; border-radius: 16px; overflow: hidden; margin: 10px 0; background: #000; }
        .image-box img { width: 100%; height: 100%; object-fit: cover; }
        .hint { font-size: 0.8rem; opacity: 0.4; }

        .btn-primary { background: linear-gradient(135deg, #6366f1, #a855f7); border: none; color: white; padding: 15px; border-radius: 16px; font-weight: 700; width: 100%; cursor: pointer; }
        .btn-ocr { background: rgba(34, 211, 238, 0.1); border: 1px dashed #22d3ee; color: #22d3ee; padding: 12px; border-radius: 12px; width: 100%; margin-bottom: 15px; cursor: pointer; font-weight: 600; }
        
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-top: 15px; }
        .day-label { font-size: 0.7rem; opacity: 0.4; }
        :global(.calendar-day) { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
        :global(.calendar-day.completed) { background: #6366f1; color: white; font-weight: 800; border: none; }

        input { width: 100%; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; margin-top: 10px; }
        .word-scroll-list { margin-top: 20px; max-height: 200px; overflow-y: auto; text-align: left; }
        .word-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem; }
        .word-item button { background: none; border: none; color: #ff5555; cursor: pointer; }

        .completion-toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #22d3ee; color: #000; padding: 10px 20px; border-radius: 20px; font-weight: 800; box-shadow: 0 4px 15px rgba(34,211,238,0.4); animation: slideUp 0.5s; }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      `}</style>
        </div>
    )
}
