'use client'

import { useState, useEffect, useRef } from 'react'
import { MASTER_WORDS, type Word } from '@/data/words'

const LEVELS = ['ALL', 'KID', 'ELEM', 'MID', 'HIGH', 'TRAVEL'] as const
type Level = typeof LEVELS[number]

const LEVEL_LABELS: Record<Level, string> = {
    ALL: '전체', KID: '어린이', ELEM: '초등', MID: '중등', HIGH: '고등', TRAVEL: '여행',
}

async function translateToKorean(text: string): Promise<string> {
    const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ko`
    )
    const data = await res.json()
    return data.responseData?.translatedText || ''
}

export default function Home() {
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState('study')
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [currentFilter, setCurrentFilter] = useState<Level>('ALL')

    const [words, setWords] = useState<Word[]>(MASTER_WORDS)
    const [dailyCount, setDailyCount] = useState(0)
    const [totalCount, setTotalCount] = useState(0)
    const [studyHistory, setStudyHistory] = useState<Record<string, boolean>>({})
    const [isCompletedToday, setIsCompletedToday] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)

    const [newEn, setNewEn] = useState('')
    const [newKo, setNewKo] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const filteredWords = currentFilter === 'ALL'
        ? words
        : words.filter(w => w.day === currentFilter)
    const safeLen = Math.max(filteredWords.length, 1)
    const currentWord = filteredWords[currentIndex % safeLen]

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

    const saveToLocal = (updated: Word[]) => {
        setWords(updated)
        localStorage.setItem('voca_list', JSON.stringify(updated))
    }

    const handleNext = () => {
        setIsFlipped(false)
        setTimeout(() => {
            const nextIdx = (currentIndex + 1) % safeLen
            setCurrentIndex(nextIdx)
            const newD = dailyCount + 1
            const newT = totalCount + 1
            setDailyCount(newD)
            setTotalCount(newT)
            localStorage.setItem('voca_daily', newD.toString())
            localStorage.setItem('voca_total', newT.toString())

            if (nextIdx === 0 && !isCompletedToday && filteredWords.length > 0) {
                const todayKey = new Date().toISOString().split('T')[0]
                const newHistory = { ...studyHistory, [todayKey]: true }
                setStudyHistory(newHistory)
                localStorage.setItem('voca_history', JSON.stringify(newHistory))
                setIsCompletedToday(true)
            }
        }, 300)
    }

    const handleAutoTranslate = async () => {
        if (!newEn.trim() || newKo) return
        setIsTranslating(true)
        try {
            setNewKo(await translateToKorean(newEn.trim()))
        } catch {}
        setIsTranslating(false)
    }

    const addWord = () => {
        if (!newEn || !newKo) return alert('단어와 뜻을 입력해주세요!')
        const updated = [{ en: newEn.trim(), ko: newKo.trim(), day: 'User' as string }, ...words]
        saveToLocal(updated)
        setNewEn('')
        setNewKo('')
        alert('추가되었습니다!')
    }

    const deleteWord = (idx: number) => saveToLocal(words.filter((_, i) => i !== idx))

    const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsLoading(true)
        const Tesseract = (await import('tesseract.js')).default
        try {
            const { data: { text } } = await Tesseract.recognize(file, 'eng')
            const found = text.match(/[a-zA-Z]+/g)
            if (found) {
                const word = found.find(w => w.length > 2) || found[0]
                setNewEn(word)
                const translated = await translateToKorean(word)
                setNewKo(translated)
            }
        } catch {
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
        for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} />)
        for (let i = 1; i <= daysInMonth; i++) {
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
            days.push(
                <div key={i} className={`calendar-day ${studyHistory[key] ? 'completed' : ''}`}>{i}</div>
            )
        }
        return days
    }

    const imageUrl = currentWord
        ? `https://image.pollinations.ai/prompt/${encodeURIComponent(currentWord.en + ' object visual')}?width=400&height=400&nologo=true&seed=${currentWord.en.length * 7}`
        : ''

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

            {activeTab === 'study' && (
                <div className="section">
                    <div className="level-row">
                        {LEVELS.map(lv => (
                            <button
                                key={lv}
                                className={`lv-btn ${currentFilter === lv ? 'active' : ''}`}
                                onClick={() => { setCurrentFilter(lv); setCurrentIndex(0); setIsFlipped(false) }}
                            >
                                {LEVEL_LABELS[lv]}
                            </button>
                        ))}
                    </div>

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

                    {filteredWords.length === 0 ? (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                            이 레벨의 단어가 없습니다.
                        </div>
                    ) : (
                        <>
                            <div
                                className={`card-container ${isFlipped ? 'flipped' : ''}`}
                                onClick={() => setIsFlipped(!isFlipped)}
                            >
                                <div className="card-inner">
                                    <div className="card-front">
                                        <div className="day-badge">
                                            {typeof currentWord?.day === 'number'
                                                ? `Day ${String(currentWord.day).padStart(2, '0')}`
                                                : currentWord?.day}
                                        </div>
                                        <div className="word-text">{currentWord?.en || '...'}</div>
                                        <div className="image-box">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={imageUrl} alt={currentWord?.en} />
                                        </div>
                                        <p className="hint">터치해서 확인</p>
                                    </div>
                                    <div className="card-back">
                                        <div className="meaning-text">{currentWord?.ko || '-'}</div>
                                        <button className="btn-primary" onClick={e => { e.stopPropagation(); handleNext() }}>
                                            다음 단어 ➔
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="progress">
                                {(currentIndex % safeLen) + 1} / {filteredWords.length}
                            </p>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'calendar' && (
                <div className="section">
                    <div className="glass-card calendar-view">
                        <h3>{new Date().getFullYear()}년 {new Date().getMonth() + 1}월</h3>
                        <div className="calendar-grid">
                            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                                <div key={d} className="day-label">{d}</div>
                            ))}
                            {renderCalendar()}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'manage' && (
                <div className="section">
                    <div className="glass-card manage-form">
                        <button className="btn-ocr" onClick={() => fileInputRef.current?.click()}>
                            {isLoading ? '⏳ 분석 중...' : '📸 사진에서 영단어 추출 (OCR)'}
                        </button>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleOCR} />

                        <input
                            type="text"
                            placeholder="영어 단어"
                            value={newEn}
                            onChange={e => setNewEn(e.target.value)}
                            onBlur={handleAutoTranslate}
                        />
                        <input
                            type="text"
                            placeholder={isTranslating ? '번역 중...' : '한글 뜻 (영단어 입력 후 자동번역)'}
                            value={newKo}
                            onChange={e => setNewKo(e.target.value)}
                        />
                        <button className="btn-primary" onClick={addWord} style={{ marginTop: '1rem' }}>
                            단어장에 추가
                        </button>

                        <p className="manage-count">{words.length}개 보유 중</p>
                        <div className="word-scroll-list">
                            {words.map((w, i) => (
                                <div key={i} className="word-item">
                                    <span><b>{w.en}</b>: {w.ko} <span className="word-day">[{w.day}]</span></span>
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
        .app-container { max-width: 450px; margin: 0 auto; padding: 20px; color: white; background: #09090b; min-height: 100vh; }
        .header h1 { text-align: center; font-weight: 800; font-size: 1.8rem; background: linear-gradient(to right, #6366f1, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 16px; cursor: pointer; }
        .nav-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .nav-tabs button { flex: 1; padding: 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); cursor: pointer; transition: 0.3s; font-size: 0.85rem; font-weight: 700; }
        .nav-tabs button.active { background: #6366f1; border-color: #6366f1; color: white; box-shadow: 0 4px 15px rgba(99,102,241,0.3); }

        .level-row { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px; scrollbar-width: none; }
        .lv-btn { flex-shrink: 0; padding: 6px 14px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-size: 0.78rem; color: #ccc; cursor: pointer; font-weight: 700; }
        .lv-btn.active { background: #6366f1; color: #fff; border-color: transparent; }

        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        .glass-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 15px; text-align: center; }
        .label { font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; display: block; }
        .value { font-size: 1.5rem; font-weight: 800; color: #22d3ee; }

        .card-container { perspective: 1000px; aspect-ratio: 3/4.2; cursor: pointer; margin-bottom: 10px; }
        .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4,0,0.2,1); transform-style: preserve-3d; }
        .card-container.flipped .card-inner { transform: rotateY(180deg); }
        .card-front, .card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; background: rgba(255,255,255,0.03); }
        .card-back { transform: rotateY(180deg); background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1)); }
        .day-badge { background: #6366f1; padding: 3px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; margin-bottom: 8px; }
        .word-text { font-size: clamp(2rem, 8vw, 2.8rem); font-weight: 800; margin-bottom: 10px; color: #22d3ee; }
        .meaning-text { font-size: 2.4rem; font-weight: 700; margin-bottom: 1.5rem; }
        .image-box { width: 100%; aspect-ratio: 1; border-radius: 16px; overflow: hidden; margin: 8px 0; background: #111; }
        .image-box img { width: 100%; height: 100%; object-fit: cover; }
        .hint { font-size: 0.75rem; opacity: 0.4; margin-top: 8px; }
        .progress { text-align: center; font-size: 0.78rem; opacity: 0.4; font-weight: 700; }

        .btn-primary { background: linear-gradient(135deg, #6366f1, #a855f7); border: none; color: white; padding: 14px; border-radius: 16px; font-weight: 700; width: 100%; cursor: pointer; font-size: 1rem; transition: 0.2s; }
        .btn-primary:active { transform: scale(0.97); }
        .btn-ocr { background: rgba(34,211,238,0.1); border: 1px dashed #22d3ee; color: #22d3ee; padding: 12px; border-radius: 12px; width: 100%; margin-bottom: 12px; cursor: pointer; font-weight: 600; }

        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-top: 15px; }
        .day-label { font-size: 0.7rem; opacity: 0.4; text-align: center; }
        :global(.calendar-day) { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
        :global(.calendar-day.completed) { background: #6366f1; color: white; font-weight: 800; border: none; }

        input[type="text"] { width: 100%; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; margin-top: 10px; font-size: 1rem; outline: none; }
        input[type="text"]:focus { border-color: #6366f1; }
        .manage-count { font-size: 0.75rem; opacity: 0.4; margin-top: 16px; margin-bottom: 4px; text-align: left; }
        .word-scroll-list { max-height: 220px; overflow-y: auto; text-align: left; }
        .word-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; }
        .word-day { font-size: 0.7rem; opacity: 0.4; }
        .word-item button { background: none; border: none; color: #ff5555; cursor: pointer; font-weight: 700; }

        .completion-toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #22d3ee; color: #000; padding: 10px 20px; border-radius: 20px; font-weight: 800; box-shadow: 0 4px 15px rgba(34,211,238,0.4); animation: slideUp 0.5s; z-index: 100; }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      `}</style>
        </div>
    )
}
