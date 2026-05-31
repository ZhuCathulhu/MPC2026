import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './db.js'
import dialogueRouter from './routes/dialogue.js'
import voiceRouter    from './routes/voice.js'
import saveRouter     from './routes/save.js'

const app  = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Routes
app.use('/api/dialogue', dialogueRouter)
app.use('/api/voice',    voiceRouter)
app.use('/api/save',     saveRouter)

app.get('/api/health', (_, res) => res.json({ ok: true }))

// Boot — listen immediately, connect DB in background
app.listen(PORT, () => console.log(`[Server] http://localhost:${PORT}`))
connectDB().catch(err => console.error('[DB] Connection error:', err))