const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
// 🌟 IMPORT BOTH COMPLIANT FUNCTIONS FROM KIMI.JS
const { analyzeBrowsingNode, analyzeSessionTrail } = require('./kimi.js');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nxkatskdnxkaupydveuj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54a2F0c2tkbnhrYXVweWR2ZXVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQzNjQ5NiwiZXhwIjoyMDk5MDEyNDk2fQ.BJR0GRp52KEmF1szl_Oago_x-xsQGrTv8MlvK41a6NE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const ADMIN_USER_ID = 'ce8fdcb7-138f-4f5a-907d-4df76b26a8be'; 

app.post('/api/pages', async (req, res) => {
  try {
    const { title, url } = req.body;

    console.log(`[INGEST] Received trail stream element: "${title}"`);

    // 1. Fetch the most recent active session entry for your user
    const { data: latestSession, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, title')
      .eq('user_id', ADMIN_USER_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionErr) {
      console.error('[SYS_WARN] Error fetching active session tracking context:', sessionErr.message);
    }

    const targetSessionId = latestSession ? latestSession.id : 1;

    // 2. INSERT STEP: Instantly pop placeholder node on user's frontend layout canvas
    const { data: newPage, error: insertError } = await supabase
      .from('pages')
      .insert([{ 
        title, 
        url, 
        summary: 'Context processing...', 
        tags: [], 
        user_id: ADMIN_USER_ID,
        session_id: targetSessionId
      }])
      .select()
      .single();

    if (insertError) throw insertError;
    
    res.status(200).json({ success: true, message: 'Node ingested. Processing AI context in background.' });

    // 3. BACKGROUND WORKER: Run Gemini parsing with resilient error handling fallbacks
    (async () => {
      let nodeSummary = '';
      let nodeTags = [];
      let targetSessionPages = [];

      // --- STEP 3A: TELEMETRY ANALYSIS FALLBACK SAFEGUARD ---
      try {
        console.log(`[AI_ASYNC] Dispatching node #${newPage.id} to Gemini Flash...`);
        const aiPayload = await analyzeBrowsingNode(title, url);
        nodeSummary = aiPayload.summary;
        nodeTags = aiPayload.tags;
      } catch (aiProcessingErr) {
        console.warn(`[AI_QUOTA_WALL] Telemetry analysis blocked for node #${newPage.id}. Generating local fallback:`, aiProcessingErr.message);
        
        // Dynamic fallback summary generation using incoming metadata
        nodeSummary = `Visited "${title || 'Unknown Resource'}" via workspace stream. Automatic AI deep-analysis is paused due to standard API rate limits.`;
        
        // Parse a fallback keyword tag gracefully from the host domain string
        try {
          const parsedUrl = new URL(url);
          const baseDomain = parsedUrl.hostname.replace('www.', '').split('.')[0];
          nodeTags = [baseDomain, 'workspace-track'];
        } catch {
          nodeTags = ['web-resource', 'workspace-track'];
        }
      }

      // Commit individual page changes securely to Supabase
      await supabase
        .from('pages')
        .update({ summary: nodeSummary, tags: nodeTags })
        .eq('id', newPage.id);


      // --- STEP 3B: SESSION TRAIL OVERVIEW RESILIENT SAFEGUARD ---
      try {
        // Fetch all sibling nodes to summarize the whole session structure
        const { data: allSessionPages } = await supabase
          .from('pages')
          .select('title')
          .eq('session_id', targetSessionId);
        
        targetSessionPages = allSessionPages || [];

        if (targetSessionPages.length > 0) {
          const uniqueTitlesList = targetSessionPages.map(p => p.title).join(', ');
          const sessionTitle = latestSession?.title || 'Research Log';
          
          console.log(`[AI_ASYNC] Compiling absolute session synthesis for Chain #${targetSessionId}...`);
          
          let generalizedSessionSummary = '';
          
          try {
            // Attempt live session optimization summary
            generalizedSessionSummary = await analyzeSessionTrail(sessionTitle, uniqueTitlesList);
          } catch (sessionAiErr) {
            console.warn(`[AI_QUOTA_WALL] Session overview synthesis blocked for Session #${targetSessionId}. Using structural fallback.`);
            // Fallback summary format when the master synthesis query hits quota walls
            generalizedSessionSummary = `Active research session tracking ${targetSessionPages.length} development nodes. Automatic cross-trail synthesis is paused due to standard API limits.`;
          }

          // Push the synthesized overview directly to the parent session row matrix
          await supabase
            .from('sessions')
            .update({ session_overview: generalizedSessionSummary })
            .eq('id', targetSessionId);

          console.log(`[SUCCESS] Master session summary matrix processed.`);
        }
      } catch (globalAsyncErr) {
        console.error(`[CRITICAL_ASYNC_FAIL] Structural failure in pipeline worker loop:`, globalAsyncErr.message);
      }
    })();

  } catch (err) {
    console.error('[SERVER_ERROR]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ONLINE', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`[SYSTEM] RabbitHole Backend Engine active on port ${PORT}`);
});