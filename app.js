document.addEventListener('DOMContentLoaded', () => {

    // ============================
    // TAB SWITCHING (Generic)
    // ============================
    const setupTabs = (groupId) => {
        const btns = document.querySelectorAll(`.tab-btn[data-group="${groupId}"]`);
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Deactivate all buttons and content in this group
                btns.forEach(b => b.classList.remove('active'));
                document.querySelectorAll(`[id^="${groupId}-"][id$="-tab"]`).forEach(c => c.classList.remove('active'));
                // Activate clicked
                btn.classList.add('active');
                const target = document.getElementById(`${btn.dataset.tab}-tab`);
                if (target) target.classList.add('active');
            });
        });
    };

    setupTabs('jd');
    setupTabs('cv');

    // ============================
    // FILE UPLOAD HANDLESR (Generic)
    // ============================
    const setupFileUpload = ({ dropZoneId, fileInputId, browseLinkId, filePreviewId, fileNameId, removeFileBtnId, onFile, onRemove }) => {
        const dropZone = document.getElementById(dropZoneId);
        const fileInput = document.getElementById(fileInputId);
        const browseLink = document.getElementById(browseLinkId);
        const filePreview = document.getElementById(filePreviewId);
        const fileNameEl = document.getElementById(fileNameId);
        const removeBtn = document.getElementById(removeFileBtnId);

        const handleFile = (file) => {
            if (!file) return;
            dropZone.classList.add('hidden');
            filePreview.classList.remove('hidden');
            fileNameEl.textContent = file.name;
            // Show correct icon based on type
            const icon = filePreview.querySelector('i');
            icon.className = file.type === 'application/pdf' ? 'ph ph-file-pdf' : 'ph ph-file';
            if (onFile) onFile(file);
        };

        const removeFile = () => {
            fileInput.value = '';
            filePreview.classList.add('hidden');
            dropZone.classList.remove('hidden');
            if (onRemove) onRemove();
        };

        browseLink.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('click', (e) => {
            if (e.target !== browseLink) fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFile(e.target.files[0]);
        });

        removeBtn.addEventListener('click', removeFile);

        // Drag & Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
            dropZone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); });
        });
        ['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.add('dragover')));
        ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.remove('dragover')));
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer?.files;
            if (files?.length > 0) handleFile(files[0]);
        });
    };

    // ---- JD File Upload ----
    let jdFile = null;
    setupFileUpload({
        dropZoneId: 'jdDropZone',
        fileInputId: 'jdFileInput',
        browseLinkId: 'jdBrowseLink',
        filePreviewId: 'jdFilePreview',
        fileNameId: 'jdFileName',
        removeFileBtnId: 'jdRemoveFileBtn',
        onFile: (f) => { jdFile = f; },
        onRemove: () => { jdFile = null; }
    });

    // ---- CV File Upload ----
    let cvFile = null;
    setupFileUpload({
        dropZoneId: 'cvDropZone',
        fileInputId: 'cvFileInput',
        browseLinkId: 'cvBrowseLink',
        filePreviewId: 'cvFilePreview',
        fileNameId: 'cvFileName',
        removeFileBtnId: 'cvRemoveFileBtn',
        onFile: (f) => { cvFile = f; },
        onRemove: () => { cvFile = null; }
    });

    // ============================
    // VALIDATION
    // ============================
    const getActiveTab = (group) => document.querySelector(`.tab-btn[data-group="${group}"].active`)?.dataset.tab;

    const validateInputs = () => {
        const jdTab = getActiveTab('jd');
        const cvTab = getActiveTab('cv');

        const hasJd = jdTab === 'jd-paste'
            ? document.getElementById('jdInput').value.trim().length > 0
            : jdFile !== null;

        const hasCv = cvTab === 'cv-paste'
            ? document.getElementById('cvInput').value.trim().length > 0
            : cvFile !== null;

        if (!hasJd) {
            alert('Vui lòng nhập hoặc tải lên Mô tả công việc (JD)!');
            return false;
        }
        if (!hasCv) {
            alert('Vui lòng nhập hoặc tải lên CV ứng viên!');
            return false;
        }
        return true;
    };

    // ============================
    // ANALYZE ACTION
    // ============================
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const resultsSection = document.getElementById('resultsSection');
    const scoreList = document.getElementById('scoreList');
    const conclusionBadge = document.getElementById('conclusionBadge');
    const mainReasonsList = document.getElementById('mainReasonsList');
    const redFlagsList = document.getElementById('redFlagsList');

    const GEMINI_API_KEY = 'AIzaSyDi4UdoejP9U9sGJaMzCPZAZI47E6cavow';

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ base64: reader.result.split(',')[1], mime: file.type || 'application/pdf' });
        reader.onerror = error => reject(error);
    });

    const callGeminiAPI = async (jdText, cvText, jdBase64, jdMime, cvBase64, cvMime) => {
        const parts = [
            { text: "Bạn là một chuyên gia nhân sự (HR) cấp cao tại M12 Sorting Centers. Hãy phân tích CV của ứng viên so với Mô tả công việc (JD) sau đây và trả về KẾT QUẢ DƯỚI DẠNG JSON TUYỆT ĐỐI THEO FORMAT BÊN DƯỚI, KHÔNG CÓ BẤT KỲ VĂN BẢN NÀO KHÁC BÊN NGOÀI JSON.\n\n" }
        ];

        if (jdText) {
            parts.push({ text: "--- MÔ TẢ CÔNG VIỆC (JD) ---\n" + jdText + "\n\n" });
        } else if (jdBase64) {
            parts.push({ text: "--- MÔ TẢ CÔNG VIỆC (JD) đính kèm ---\n\n" });
            parts.push({ inlineData: { mimeType: jdMime, data: jdBase64 } });
        }

        if (cvText) {
            parts.push({ text: "--- HỒ SƠ ỨNG VIÊN (CV) ---\n" + cvText + "\n\n" });
        } else if (cvBase64) {
            parts.push({ text: "--- HỒ SƠ ỨNG VIÊN (CV) đính kèm ---\n\n" });
            parts.push({ inlineData: { mimeType: cvMime, data: cvBase64 } });
        }

        parts.push({ text: `
Hãy đánh giá theo 4 tiêu chí sau (điểm từ 0 đến 5):
1. Mức độ phù hợp với JD (Kinh nghiệm match core requirement, Ngành/scale công ty có liên quan, Vai trò thực tế vs title)
2. Tính ổn định & logic career path (Nhảy việc, Career progression có rõ không, Có dấu hiệu đi ngang bất thường không)
3. Kết quả & impact công việc (Có số liệu cụ thể không, Làm vận hành hay cải tiến, Có ownership không)
4. Fit với bối cảnh công ty (Môi trường tương tự, chịu áp lực/cường độ cao)

Đưa ra Kết luận cuối cùng dựa vào tổng điểm và Red flags: "✅ Gọi điện phỏng vấn", "⚠️ Cân nhắc", "❌ Không phù hợp".

Format JSON bắt buộc (Chỉ trả về JSON, không kèm bất kỳ đoạn text nào khác ngoài JSON):
{
  "conclusion": {
    "status": "goidien",
    "text": "✅ Gọi điện phỏng vấn",
    "badgeClass": "success"
  },
  "scores": [
    {
      "title": "1. Mức độ phù hợp với JD",
      "score": 4,
      "maxScore": 5,
      "details": ["Lý do 1", "Lý do 2"]
    },
    {
      "title": "2. Tính ổn định & logic career path",
      "score": 3,
      "maxScore": 5,
      "details": ["Lý do 1"]
    },
    {
      "title": "3. Kết quả & impact công việc",
      "score": 4,
      "maxScore": 5,
      "details": ["Lý do 1"]
    },
    {
      "title": "4. Fit với bối cảnh công ty",
      "score": 5,
      "maxScore": 5,
      "details": ["Lý do 1"]
    }
  ],
  "mainReasons": ["Lý do tổng quan 1", "Lý do tổng quan 2", "Lý do tổng quan 3"],
  "redFlags": ["Red flag 1", "Red flag 2"]
}
`});

        const requestBody = {
            contents: [{ parts: parts }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errDetails = await response.text();
            throw new Error('API Error: ' + errDetails);
        }

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        return JSON.parse(textResponse);
    };

    analyzeBtn.addEventListener('click', async () => {
        if (!validateInputs()) return;

        loadingOverlay.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        analyzeBtn.disabled = true;

        try {
            const jdTab = getActiveTab('jd');
            const cvTab = getActiveTab('cv');
            
            let jdText = "", cvText = "", jdBase64 = null, jdMime = "", cvBase64 = null, cvMime = "";

            if (jdTab === 'jd-paste') {
                jdText = document.getElementById('jdInput').value.trim();
            } else if (jdFile) {
                const res = await fileToBase64(jdFile);
                jdBase64 = res.base64;
                jdMime = res.mime;
            }

            if (cvTab === 'cv-paste') {
                cvText = document.getElementById('cvInput').value.trim();
            } else if (cvFile) {
                const res = await fileToBase64(cvFile);
                cvBase64 = res.base64;
                cvMime = res.mime;
            }

            const result = await callGeminiAPI(jdText, cvText, jdBase64, jdMime, cvBase64, cvMime);
            renderResults(result);
        } catch (err) {
            console.error(err);
            alert('Có lỗi xảy ra trong quá trình phân tích API: ' + err.message);
        } finally {
            loadingOverlay.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            analyzeBtn.disabled = false;
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    // ============================
    // RENDER RESULTS
    // ============================
    const renderResults = (data) => {
        // Conclusion
        conclusionBadge.className = `conclusion-badge ${data.conclusion.badgeClass}`;
        conclusionBadge.innerHTML = data.conclusion.text;

        // Scores
        scoreList.innerHTML = '';
        data.scores.forEach(item => {
            const pct = (item.score / item.maxScore) * 100;
            let colorClass = 'high';
            if (item.score < 3) colorClass = 'low';
            else if (item.score < 4) colorClass = 'medium';

            scoreList.insertAdjacentHTML('beforeend', `
                <div class="score-item">
                    <div class="score-header">
                        <span class="score-title">${item.title}</span>
                        <span class="score-value ${colorClass}">${item.score}/${item.maxScore}</span>
                    </div>
                    <div class="score-bar-bg">
                        <div class="score-bar-fill ${colorClass}" style="width:0%"></div>
                    </div>
                    <ul class="score-details">
                        ${item.details.map(d => `<li>${d}</li>`).join('')}
                    </ul>
                </div>
            `);
            setTimeout(() => {
                const bar = scoreList.lastElementChild.querySelector('.score-bar-fill');
                if (bar) bar.style.width = `${pct}%`;
            }, 50);
        });

        // Main Reasons
        mainReasonsList.innerHTML = data.mainReasons.map(r => `<li>${r}</li>`).join('');

        // Red Flags
        if (data.redFlags?.length > 0) {
            redFlagsList.innerHTML = data.redFlags.map(f => `<li>${f}</li>`).join('');
        } else {
            redFlagsList.innerHTML = '<div class="redflags-empty"><i class="ph ph-check-circle"></i> Không phát hiện Red Flag đáng kể.</div>';
        }
    };
});
