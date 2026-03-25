document.addEventListener('DOMContentLoaded', () => {
    const activitiesBody = document.getElementById('activities-body');
    const seasonalSummary = document.getElementById('seasonal-summary');
    const sendBtn = document.getElementById('send-btn');
    const voiceInput = document.getElementById('voice-input');
    const parseResultDiv = document.getElementById('parse-result');

    // 1. Initial Data Fetch
    fetchRecords();
    fetchSeasonalSummary();

    // 2. Fetch all expenses
    async function fetchRecords() {
        try {
            const res = await fetch('/api/expenses');
            const data = await res.json();
            renderActivities(data);
        } catch (e) { console.error('Error fetching records:', e.message); }
    }

    // 3. Fetch seasonal summary
    async function fetchSeasonalSummary() {
        try {
            const res = await fetch('/api/reports/seasonal');
            const data = await res.json();
            renderSeasonal(data);
        } catch (e) { console.error('Error fetching summary:', e.message); }
    }

    // 4. Render Activities
    function renderActivities(records) {
        if (!records || records.length === 0) {
            activitiesBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No records found.</td></tr>';
            return;
        }

        activitiesBody.innerHTML = records.map(r => `
            <tr>
                <td style="font-size: 0.8rem; opacity: 0.7;">${new Date(r.date).toLocaleDateString()}</td>
                <td><strong style="color: #4ade80;">${r.farm_name}</strong></td>
                <td><span class="status-badge badge-${r.category.toLowerCase()}">${r.category}</span></td>
                <td>
                  <div style="font-weight: 600;">${r.item_name || r.activity_type || 'General'}</div>
                  <div style="font-size: 0.8rem; opacity: 0.6;">${r.description || ''}</div>
                </td>
                <td><span style="color: #fbbf24; font-weight: 700;">₹${r.total_amount || '-'}</span></td>
            </tr>
        `).join('');
    }

    // 5. Render Seasonal
    function renderSeasonal(summary) {
        if (!summary || summary.length === 0) {
            seasonalSummary.innerHTML = '<p style="opacity:0.5">No data available.</p>';
            return;
        }

        seasonalSummary.innerHTML = summary.map(s => `
            <div style="margin-bottom: 1rem; border-left: 2px solid #4CAF50; padding-left: 1rem;">
                <div style="font-weight: 700; color: #f8fafc;">${s.farm}</div>
                <div style="font-size: 0.85rem; color: #94a3b8;">${s.item_name} usage</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: #4ade80;">${s.total_bags} Bags</div>
            </div>
        `).join('');
    }

    // 6. Voice Command Simulator
    sendBtn.addEventListener('click', async () => {
        const text = voiceInput.value.trim();
        if (!text) return;

        sendBtn.disabled = true;
        sendBtn.innerHTML = 'Parsing...';
        parseResultDiv.style.display = 'block';
        parseResultDiv.innerHTML = '<pre style="color: #60a5fa;">Processing with Gemini AI...</pre>';

        try {
            // Step 1: Parse
            const parseRes = await fetch('/api/parse-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const parsedData = await parseRes.json();
            
            parseResultDiv.innerHTML = `
                <pre style="color: #4ade80;">Parsed Success:</pre>
                <div style="color: #94a3b8;">${JSON.stringify(parsedData, null, 2)}</div>
                <div style="margin-top: 1rem; color: #fbbf24;">Saving to database...</div>
            `;

            // Step 2: Save
            const saveRes = await fetch('/api/save-record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedData)
            });
            const savedData = await saveRes.json();

            if (savedData.success) {
                parseResultDiv.innerHTML += `<div style="color: #4ade80; font-weight: 700;">Record Saved! Row ID: ${savedData.record.id}</div>`;
                voiceInput.value = '';
                fetchRecords();
                fetchSeasonalSummary();
            } else {
                throw new Error(savedData.error);
            }

        } catch (e) {
            parseResultDiv.innerHTML = `<pre style="color: #ef4444;">Error: ${e.message}</pre>`;
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span>Parse & Save</span>';
        }
    });

    // Handle health check indicator
    const healthPill = document.getElementById('server-status');
    setInterval(async () => {
        try {
            const res = await fetch('/health');
            if (res.ok) {
                healthPill.innerHTML = 'System Online';
                healthPill.style.color = '#4ade80';
            }
        } catch (e) {
            healthPill.innerHTML = 'System Offline';
            healthPill.style.color = '#ef4444';
        }
    }, 10000);
});
